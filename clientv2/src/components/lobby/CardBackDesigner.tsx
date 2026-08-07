/**
 * CardBackDesigner — the dedicated identity designer (opened from the lobby
 * invite pane). Sells + equips the PLATFORM identity cosmetics (avatar frames
 * + username flairs — one economy, prices from the platform catalog, one
 * equip shows on gamebuddies.io and in every game).
 *
 * Your equipped FRAME themes the card backs everyone sees across the table
 * (DynamicCard fr-theme token rule) and rings your avatar on the roster/dock.
 *
 * Live preview: a fan of REAL DynamicCard backs (the exact component the table
 * renders) tinted by the tried-on frame + the "Your player card" roster/dock
 * mini with the frame ring + name flair. Premium includes every platform item;
 * locked items can be TRIED ON before the bottom-sheet confirmation commits
 * the buy.
 */
import React, { useEffect, useState } from 'react';
import { X, Crown, Lock, Coins, Check, LogIn } from 'lucide-react';
import type { Player } from '../../types';
import { t, getTranslations } from '../../utils/translations';
import ScrollHint from '../../shell/ScrollHint';
import {
  usePlatformCosmetics, requestPlatformCosmetics, buyPlatformCosmetic, equipPlatformCosmetic,
  type IdentityCatalogItem,
} from '../../services/platformCosmetics';
import { usePlayerProfile } from '../../services/playerProfiles';
import { cosmeticClass } from '../../utils/cosmetics';
import { FRAME_THEMES, frameThemeClass } from '../../utils/frameThemes';
import { Avatar } from '../core/Avatar';
import GameAuthModal from '../core/GameAuthModal';
import DynamicCard from '../hearts-gambit/DynamicCard';

type Slot = 'frame' | 'flair';

/**
 * Optional copy lookup — returns '' (instead of the raw key + a console warn)
 * when a key has not been added to the locale tables yet, so a label that is
 * still awaiting copy simply doesn't render rather than printing its key.
 */
const optionalCopy = (path: string): string => {
  let value: unknown = getTranslations();
  for (const key of path.split('.')) {
    if (typeof value === 'object' && value !== null && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else return '';
  }
  return typeof value === 'string' ? value : '';
};

interface Props {
  players: Player[];
  mySocketId: string;
  onClose: () => void;
}

export default function CardBackDesigner({ players, mySocketId, onClose }: Props) {
  const me = players.find(p => p.socketId === mySocketId);
  const platform = usePlatformCosmetics();
  useEffect(() => { requestPlatformCosmetics(); }, []);
  const sessionPremium = !!me?.premiumTier && me.premiumTier !== 'free';
  const premium = platform.status === 'ready' ? platform.premium : sessionPremium;

  const catalogOf = (slot: Slot): IdentityCatalogItem[] =>
    slot === 'frame' ? platform.catalog.frames : platform.catalog.flairs;
  const unlocked = (slot: Slot, id: string) => {
    if (!id) return true;
    const item = catalogOf(slot).find(c => c.id === id);
    if (item?.premiumOnly) return premium;
    return premium || platform.owned[slot].includes(id);
  };

  // Equipped state from the platform store (echoed live via gb:player:profile).
  const myProfile = usePlayerProfile(me?.id);
  const [pendingFrame, setPendingFrame] = useState<string | null>(null);
  const [pendingFlair, setPendingFlair] = useState<string | null>(null);
  const frame = pendingFrame ?? platform.equipped.frame ?? myProfile?.cosmetics.frameId ?? '';
  const flair = pendingFlair ?? platform.equipped.flair ?? myProfile?.cosmetics.flairId ?? '';
  useEffect(() => { if (pendingFrame !== null && (myProfile?.cosmetics.frameId ?? '') === pendingFrame) setPendingFrame(null); }, [myProfile?.cosmetics.frameId, pendingFrame]);
  useEffect(() => { if (pendingFlair !== null && (myProfile?.cosmetics.flairId ?? '') === pendingFlair) setPendingFlair(null); }, [myProfile?.cosmetics.flairId, pendingFlair]);
  const equip = (slot: Slot, id: string) => {
    if (slot === 'frame') { setPendingFrame(id); equipPlatformCosmetic('frame', id || null); }
    else { setPendingFlair(id); equipPlatformCosmetic('flair', id || null); }
  };

  // Try-on + purchase confirmation.
  /* The guest branch of the buy sheet used to offer exactly one button: CANCEL.
     Signing in happens in-place (same modal the header/roster use) so the buy
     can continue without leaving the room. */
  const [authOpen, setAuthOpen] = useState(false);
  const [tryOn, setTryOn] = useState<{ slot: Slot; id: string } | null>(null);
  const [confirm, setConfirm] = useState<{ slot: Slot; id: string } | null>(null);
  const ownedNow = confirm ? unlocked(confirm.slot, confirm.id) : false;
  useEffect(() => {
    if (confirm && ownedNow) {
      equip(confirm.slot, confirm.id);
      setConfirm(null); setTryOn(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedNow]);

  const previewFrameId = tryOn?.slot === 'frame' ? tryOn.id : frame;
  const previewFlairId = tryOn?.slot === 'flair' ? tryOn.id : flair;
  const previewFrameWrap = cosmeticClass(previewFrameId || null);
  const previewFlairClass = cosmeticClass(previewFlairId || null);
  const previewFrameName = previewFrameId
    ? (catalogOf('frame').find(c => c.id === previewFrameId)?.name ?? previewFrameId)
    : t('designer.classic');
  const previewCaption = optionalCopy('designer.cardBackPreviewCaption') || 'how your hand looks to the table';

  const pick = (slot: Slot, id: string) => {
    if (unlocked(slot, id)) { setTryOn(null); equip(slot, id); }
    else { setTryOn({ slot, id }); setConfirm({ slot, id }); }
  };

  const priceOf = (slot: Slot, id: string): number => catalogOf(slot).find(c => c.id === id)?.costGp ?? 0;
  const labelOf = (slot: Slot, id: string): string => {
    if (!id) return t('designer.classic');
    return catalogOf(slot).find(c => c.id === id)?.name ?? id;
  };
  const confirmPremiumOnly = confirm ? !!catalogOf(confirm.slot).find(c => c.id === confirm.id)?.premiumOnly : false;
  const confirmPrice = confirm ? priceOf(confirm.slot, confirm.id) : 0;
  const confirmBusy = confirm ? platform.busyItemId === confirm.id : false;

  /** Copy still awaiting the locale tables — renders only once it lands. */
  const equippedLabel = optionalCopy('designer.equipped');
  const premiumSectionTitle = optionalCopy('designer.premiumTitle');
  /* Receipt stamp on the buy sheet, so the money moment reads as a filed
     document rather than a floating web dialog. Copy request pending — the
     literal is the EN fallback until the key lands in all 6 locales. */
  const confirmEyebrow = optionalCopy('designer.confirmEyebrow') || 'PURCHASE ORDER';
  /* Micro-labels for the two identity samples — same reason: literals are the
     EN fallback until the keys land in all 6 locales. */
  const pcardRosterLabel = optionalCopy('designer.pcardRosterLabel') || 'in the case file';
  const pcardDockLabel = optionalCopy('designer.pcardDockLabel') || 'on the dock';
  const catalogueLoading = optionalCopy('designer.catalogueLoading') || 'Opening the evidence locker…';
  const catalogueError = optionalCopy('designer.catalogueError') || 'The evidence locker would not open. Check your connection and reopen this panel.';

  const renderChips = (slot: Slot, current: string, tier: 'standard' | 'premium' | 'all' = 'all') => {
    const all: Array<{ id: string; name: string; premiumOnly?: boolean }> = [
      { id: '', name: t('designer.classic') },
      ...catalogOf(slot),
    ];
    const defs = tier === 'all'
      ? all
      : all.filter((o) => (tier === 'premium' ? !!o.premiumOnly : !o.premiumOnly));
    return defs.map((opt) => {
      const locked = !!opt.id && !unlocked(slot, opt.id);
      const active = (tryOn?.slot === slot ? tryOn.id : current) === opt.id;
      const isEquipped = !tryOn && current === opt.id;
      const price = opt.id ? priceOf(slot, opt.id) : 0;
      const theme = slot === 'frame' && opt.id ? FRAME_THEMES[opt.id] : undefined;
      // Three separable tiers: locked (velvet + price tag) · owned (gold
      // hairline) · equipped (engraved gold face + check).
      const state = locked ? 'locked' : isEquipped ? 'equipped' : 'owned';
      return (
        <button
          key={opt.id || 'classic'}
          type="button"
          className={`psshop-chip is-${state}${active ? ' selected' : ''}${locked ? ' locked' : ''}`}
          /* Frame accent travels as custom props so the tier borders/rings
             below stay in charge — an inline `border-color`/`box-shadow` would
             out-rank every state rule. */
          style={theme ? ({ ['--psshop-accent']: theme.accent, ['--psshop-glow']: theme.glow } as React.CSSProperties) : undefined}
          onClick={() => pick(slot, opt.id)}
          title={opt.name}
          aria-pressed={isEquipped}
        >
          {/* Frame chips SHOW the ring they sell: the same avatar-frame-wrap the
              roster row + dock chip render, at swatch size. A frame was
              otherwise sold as a word and a price tag. Flair chips already
              preview themselves — the gradient rides their label. */}
          {slot === 'frame' && (
            <span
              className={`psshop-chip-swatch avatar-frame-wrap ${cosmeticClass(opt.id)}`.trim()}
              style={{ ['--frame-ring' as string]: '2px' }}
              aria-hidden="true"
            >
              <Avatar src={me?.avatarUrl} />
            </span>
          )}
          {opt.premiumOnly && <Crown size={11} aria-hidden="true" className="psshop-chip-glyph" />}
          {locked && (opt.premiumOnly || !price)
            ? <Lock size={11} aria-hidden="true" className="psshop-chip-glyph" />
            : isEquipped ? <Check size={12} aria-hidden="true" className="psshop-chip-glyph" /> : null}
          {/* The flair gradient lives on the LABEL, never on the button: the
              gradient recipe sets -webkit-text-fill-color:transparent, which
              would clip the label to the button's own background. */}
          <span className={`psshop-chip-label ${slot === 'flair' && opt.id && !isEquipped ? cosmeticClass(opt.id) : ''}`.trim()}>
            {opt.name}
          </span>
          {/* Lock folds onto the price pill — one "locked, costs X" token. */}
          {locked && !opt.premiumOnly && !!price && (
            <span className="psshop-price" aria-hidden="true"><Lock size={9} />{price}</span>
          )}
          {isEquipped && equippedLabel && <span className="psshop-chip-state" aria-hidden="true">{equippedLabel}</span>}
        </button>
      );
    });
  };

  /** Premium-exclusive items get their own crown-ruled block per slot. */
  const hasPremiumTier = (slot: Slot) => catalogOf(slot).some((c) => c.premiumOnly);
  const renderSlotSection = (slot: Slot, current: string, title: string, hint: string) => (
    <div className="psshop-section">
      <div className="psshop-section-title">
        {title}
        <span className="psshop-hint">{hint}</span>
      </div>
      <div className="psshop-chips">{renderChips(slot, current, 'standard')}</div>
      {hasPremiumTier(slot) && (
        <>
          <div className="psshop-crownrule" aria-hidden="true">
            <Crown size={12} />
            {premiumSectionTitle && <span>{premiumSectionTitle}</span>}
          </div>
          <div className="psshop-chips psshop-chips--premium">{renderChips(slot, current, 'premium')}</div>
        </>
      )}
    </div>
  );

  return (
    <div className="psshop-backdrop" onClick={onClose}>
      <div className="psshop-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('designer.cardBackTitle')}>
        <button className="psshop-close" onClick={onClose} aria-label={t('common.close')}><X size={18} /></button>
        {/* Masthead + live preview never scroll: the balance and the dismiss
            control must stay reachable while reading prices further down. */}
        <div className="psshop-stage">
          <div className="psshop-head">
            <div className="psshop-headline">
              <span className="psshop-eyebrow">{t('designer.title')}</span>
              <h2 className="psshop-title">{t('designer.cardBackTitle')}</h2>
            </div>
            {platform.status === 'ready' && !premium && (
              <span className="psshop-balance" title={t('designer.yourGp')}><Coins size={12} aria-hidden="true" /> {platform.balance.toLocaleString()} GP</span>
            )}
          </div>

          {/* Live preview — the REAL card backs the table renders (DynamicCard
              fr-theme token rule), fanned like an opponent's hand. */}
          <div className="psshop-preview">
            <div className="psshop-fan">
              {[0, 1, 2].map((i) => (
                <DynamicCard
                  key={i}
                  cardType={0}
                  showFace={false}
                  ownerFrameClass={frameThemeClass(previewFrameId || null)}
                  className={`psshop-fan-card psshop-fan-card-${i}`}
                />
              ))}
            </div>
            <span className="psshop-prev-caption">
              <strong>{previewFrameName}</strong>
              <span>{previewCaption}</span>
            </span>
          </div>

          {/* "Your player card" mini — frame ring + name flair exactly as the
              roster row + dock chip render them; follows try-ons. */}
          <div className="psshop-pcard">
            <span className="psshop-pcard-caption">{t('designer.playerCardCaption')}</span>
            {/* Two SAMPLES of one identity, not one sample twice: each carries
                its own micro-label so the pair reads as a comparison of the
                two places the frame + flair show up. */}
            <div className="psshop-pcard-row">
              <div className="psshop-pcard-sample">
                <span className="psshop-pcard-microlabel">{pcardRosterLabel}</span>
                <div className="player-list-items">
                  <div className="player-list-item is-me">
                    <div className="player-avatar-container">
                      <span className={previewFrameWrap ? `avatar-frame-wrap ${previewFrameWrap}` : undefined} style={previewFrameWrap ? { ['--frame-ring' as string]: '2px' } : undefined}>
                        <Avatar src={me?.avatarUrl} className="player-avatar" />
                      </span>
                    </div>
                    <div className="player-info"><span className={`player-name ${previewFlairClass}`.trim()}>{me?.name ?? 'You'}</span></div>
                  </div>
                </div>
              </div>
              <div className="psshop-pcard-sample">
                <span className="psshop-pcard-microlabel">{pcardDockLabel}</span>
                <span className="gs-chip is-me" title={me?.name}>
                  <span className={`gs-chip-av ${previewFrameWrap ? `avatar-frame-wrap ${previewFrameWrap}` : ''}`.trim()}>
                    <Avatar src={me?.avatarUrl} />
                  </span>
                  <span className={`gs-chip-name ${previewFlairClass}`.trim()}>{me?.name ?? 'You'}</span>
                </span>
              </div>
            </div>
          </div>

          {premium && (
            <p className="psshop-note psshop-note-premium"><Crown size={12} aria-hidden="true" /> {t('designer.premiumIncluded')}</p>
          )}
          {platform.status === 'guest' && (
            <p className="psshop-note">{t('playerList.signInToBuyStyles')}</p>
          )}
        </div>

        <div className="psshop-body">
          {/* Loading + failure are DESIGNED here: with an empty catalogue the
              shop otherwise collapses to a single "Classic" chip under a
              heading — visually identical to "there is nothing to buy". */}
          {platform.status === 'loading' || platform.status === 'idle' ? (
            <div className="psshop-section">
              <div className="psshop-section-title">
                {t('designer.framesTitle')}
                <span className="psshop-hint">{catalogueLoading}</span>
              </div>
              <div className="psshop-chips" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="psshop-chip-skeleton" />)}
              </div>
            </div>
          ) : (
            <>
              {platform.status === 'error' && (
                <p className="psshop-error" role="alert">{catalogueError}</p>
              )}
              {renderSlotSection('frame', frame, t('designer.framesTitle'), t('designer.framesHint'))}
              {renderSlotSection('flair', flair, t('designer.flairsTitle'), t('designer.flairsHint'))}
            </>
          )}
          <ScrollHint />
        </div>

        {/* Purchase confirmation — bottom sheet so the live preview stays visible. */}
        {confirm && (() => {
          const label = labelOf(confirm.slot, confirm.id);
          const affordable = platform.balance >= confirmPrice;
          return (
            <div className="psshop-confirm-backdrop" onClick={() => { if (!confirmBusy) { setConfirm(null); setTryOn(null); } }}>
              <div className="psshop-confirm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${t('designer.buy')} ${label}`}>
                <span className="psshop-eyebrow">{confirmEyebrow}</span>
                <div className="psshop-confirm-title">{t('designer.buyQuestion', { name: label })}</div>
                {confirmPremiumOnly ? (
                  <p className="psshop-note">{t('designer.premiumExclusive')}</p>
                ) : platform.status === 'guest' ? (
                  <p className="psshop-note">{t('playerList.signInToBuyStyles')}</p>
                ) : (
                  <>
                    <div className="psshop-crow"><span>{t('designer.price')}</span><span className="psshop-gold"><Coins size={12} aria-hidden="true" /> {confirmPrice} GP</span></div>
                    <div className="psshop-crow"><span>{t('designer.yourGp')}</span><span>{platform.balance.toLocaleString()} GP</span></div>
                    <div className="psshop-crow">
                      <span>{t('designer.afterPurchase')}</span>
                      <span className={affordable ? 'psshop-ok' : 'psshop-short'}>
                        {affordable ? `${(platform.balance - confirmPrice).toLocaleString()} GP` : t('designer.gpShort', { gp: confirmPrice - platform.balance })}
                      </span>
                    </div>
                    <p className="psshop-note">{t('designer.foreverEverywhere', { name: label })}</p>
                    {platform.lastError && <p className="psshop-error" role="alert">{platform.lastError}</p>}
                  </>
                )}
                <div className="psshop-confirm-actions">
                  <button type="button" className="psshop-cancel" onClick={() => { setConfirm(null); setTryOn(null); }} disabled={confirmBusy}>{t('playerList.cancel')}</button>
                  {/* The money moment always offers a WAY FORWARD. Without these
                      three, a signed-out player who taps a locked frame, a free
                      player who taps a Premium exclusive — and a signed-in player
                      who is simply SHORT ON GP — got a sheet whose only live
                      button was CANCEL. Premium includes every platform item, so
                      it is the honest answer to "you can't afford this" too. */}
                  {confirmPremiumOnly || (platform.status !== 'guest' && !affordable) ? (
                    <button
                      type="button"
                      className="psshop-buy"
                      onClick={() => window.open('https://gamebuddies.io/premium', '_blank', 'noopener,noreferrer')}
                    >
                      <Crown size={12} aria-hidden="true" />{t('premiumUpsell.getPremium')}
                    </button>
                  ) : platform.status === 'guest' ? (
                    <button type="button" className="psshop-buy" onClick={() => setAuthOpen(true)}>
                      <LogIn size={12} aria-hidden="true" />{t('header.login')}
                    </button>
                  ) : null}
                  {platform.status !== 'guest' && !confirmPremiumOnly && affordable && (
                    <button type="button" className="psshop-buy" disabled={confirmBusy} onClick={() => buyPlatformCosmetic(confirm.slot, confirm.id)}>
                      <Coins size={12} aria-hidden="true" />{confirmBusy ? t('designer.buying') : t('designer.buyFor', { gp: confirmPrice })}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {authOpen && <GameAuthModal onClose={() => setAuthOpen(false)} playerName={me?.name} />}
      </div>
    </div>
  );
}
