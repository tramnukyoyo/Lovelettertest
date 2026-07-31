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
import { useEffect, useState } from 'react';
import { X, Crown, Lock, Coins, Check } from 'lucide-react';
import type { Player } from '../../types';
import { t } from '../../utils/translations';
import {
  usePlatformCosmetics, requestPlatformCosmetics, buyPlatformCosmetic, equipPlatformCosmetic,
  type IdentityCatalogItem,
} from '../../services/platformCosmetics';
import { usePlayerProfile } from '../../services/playerProfiles';
import { cosmeticClass } from '../../utils/cosmetics';
import { FRAME_THEMES, frameThemeClass } from '../../utils/frameThemes';
import { Avatar } from '../core/Avatar';
import DynamicCard from '../hearts-gambit/DynamicCard';

type Slot = 'frame' | 'flair';

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

  const renderChips = (slot: Slot, current: string) => {
    const defs: Array<{ id: string; name: string; premiumOnly?: boolean }> = [
      { id: '', name: t('designer.classic') },
      ...catalogOf(slot),
    ];
    return defs.map((opt) => {
      const locked = !!opt.id && !unlocked(slot, opt.id);
      const active = (tryOn?.slot === slot ? tryOn.id : current) === opt.id;
      const isEquipped = !tryOn && current === opt.id;
      const price = opt.id ? priceOf(slot, opt.id) : 0;
      const theme = slot === 'frame' && opt.id ? FRAME_THEMES[opt.id] : undefined;
      return (
        <button
          key={opt.id || 'classic'}
          type="button"
          className={`psshop-chip ${slot === 'flair' && opt.id ? cosmeticClass(opt.id) : ''} ${active ? 'selected' : ''} ${locked ? 'locked' : ''}`}
          style={theme ? { borderColor: theme.accent, boxShadow: `inset 0 0 6px ${theme.glow}` } : undefined}
          onClick={() => pick(slot, opt.id)}
          title={opt.name}
        >
          {opt.premiumOnly && <Crown size={9} aria-hidden="true" />}
          {locked ? <Lock size={9} aria-hidden="true" /> : isEquipped ? <Check size={10} aria-hidden="true" /> : null}
          {opt.name}
          {locked && !opt.premiumOnly && <span className="psshop-price" aria-hidden="true">{price}</span>}
        </button>
      );
    });
  };

  return (
    <div className="psshop-backdrop" onClick={onClose}>
      <div className="psshop-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('designer.title')}>
        <button className="psshop-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="psshop-head">
          <h2 className="psshop-title">{t('designer.title')}</h2>
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
          <span className="psshop-prev-caption">{previewFrameName} — how your hand looks to the table</span>
        </div>

        {/* "Your player card" mini — frame ring + name flair exactly as the
            roster row + dock chip render them; follows try-ons. */}
        <div className="psshop-pcard">
          <span className="psshop-pcard-caption">{t('designer.playerCardCaption')}</span>
          <div className="psshop-pcard-row">
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
            <span className="gs-chip is-me" title={me?.name}>
              <span className={`gs-chip-av ${previewFrameWrap ? `avatar-frame-wrap ${previewFrameWrap}` : ''}`.trim()}>
                <Avatar src={me?.avatarUrl} />
              </span>
              <span className={`gs-chip-name ${previewFlairClass}`.trim()}>{me?.name ?? 'You'}</span>
            </span>
          </div>
        </div>

        {premium && (
          <p className="psshop-note psshop-note-premium"><Crown size={12} aria-hidden="true" /> {t('designer.premiumIncluded')}</p>
        )}
        {platform.status === 'guest' && (
          <p className="psshop-note">{t('playerList.signInToBuyStyles')}</p>
        )}

        <div className="psshop-section">
          <div className="psshop-section-title">{t('designer.framesTitle')} <span className="psshop-hint">· {t('designer.framesHint')}</span></div>
          <div className="psshop-chips">{renderChips('frame', frame)}</div>
        </div>

        <div className="psshop-section">
          <div className="psshop-section-title">{t('designer.flairsTitle')} <span className="psshop-hint">· {t('designer.flairsHint')}</span></div>
          <div className="psshop-chips">{renderChips('flair', flair)}</div>
        </div>

        {/* Purchase confirmation — bottom sheet so the live preview stays visible. */}
        {confirm && (() => {
          const label = labelOf(confirm.slot, confirm.id);
          const affordable = platform.balance >= confirmPrice;
          return (
            <div className="psshop-confirm-backdrop" onClick={() => { if (!confirmBusy) { setConfirm(null); setTryOn(null); } }}>
              <div className="psshop-confirm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${t('designer.buy')} ${label}`}>
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
                  {platform.status !== 'guest' && !confirmPremiumOnly && (
                    <button type="button" className="psshop-buy" disabled={confirmBusy || !affordable} onClick={() => buyPlatformCosmetic(confirm.slot, confirm.id)}>
                      <Coins size={12} aria-hidden="true" />{confirmBusy ? t('designer.buying') : t('designer.buyFor', { gp: confirmPrice })}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
