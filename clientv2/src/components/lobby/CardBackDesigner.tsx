/**
 * CardBackDesigner — the dedicated "Your card back" modal (opened from the
 * lobby invite pane). The ONLY place ps_style items are bought; equipping
 * happens here too (the player-list pickers stay equip-only).
 *
 * One ps_style item unlocks the style EVERYWHERE: the lobby player-card frame
 * (cardStyle) and the card backs everyone sees across the table (gameSkin).
 * Equipping here sets cardStyle to the pick and gameSkin to '' (follow), so
 * one tap themes both; the player-list pickers still allow splitting them.
 *
 * Live preview: a fan of REAL DynamicCard backs (the exact component the table
 * renders, hg-back-<style> overlay) + the "Your player card" roster/dock mini.
 * HYBRID GP economy: Premium keeps everything free; locked styles can be TRIED
 * ON before the bottom-sheet confirmation commits the buy.
 */
import { useEffect, useState } from 'react';
import { X, Crown, Lock, Coins, Check } from 'lucide-react';
import type { Player } from '../../types';
import socketService from '../../services/socketService';
import { useCosmeticsShop, requestCosmeticsState, buyCosmetic } from '../../services/cosmeticsShop';
import { Avatar } from '../core/Avatar';
import DynamicCard from '../hearts-gambit/DynamicCard';

/** Mirrors the server (games/hearts-gambit PS_STYLE_ITEM_IDS) + platform catalog. */
const CARD_STYLES: Array<{ id: string; label: string; price: number }> = [
  { id: '', label: 'Classic', price: 0 },
  { id: 'neon', label: 'Neon', price: 250 },
  { id: 'gold', label: 'Gold', price: 250 },
  { id: 'holo', label: 'Holo', price: 250 },
  { id: 'ink', label: 'Ink', price: 250 },
];
const ITEM_IDS: Record<string, string> = {
  neon: 'ps_style_neon', gold: 'ps_style_gold', holo: 'ps_style_holo', ink: 'ps_style_ink',
};

interface Props {
  players: Player[];
  mySocketId: string;
  onClose: () => void;
}

export default function CardBackDesigner({ players, mySocketId, onClose }: Props) {
  const me = players.find(p => p.socketId === mySocketId);
  const shop = useCosmeticsShop();
  useEffect(() => { requestCosmeticsState(); }, []);
  const sessionPremium = !!me?.premiumTier && me.premiumTier !== 'free';
  const premium = shop.status === 'ready' ? shop.premium : sessionPremium;
  const unlocked = (id: string) => !id || premium || shop.owned.includes(ITEM_IDS[id]);

  // Optimistic equip reconciled against the room broadcast. One tap themes
  // BOTH slots: cardStyle = pick, gameSkin = '' (follow).
  const [pending, setPending] = useState<string | null>(null);
  const equipped = pending ?? me?.cardStyle ?? '';
  useEffect(() => { if (pending !== null && (me?.cardStyle ?? '') === pending) setPending(null); }, [me, pending]);
  const equip = (id: string) => {
    setPending(id);
    const socket = socketService.getSocket();
    socket?.emit('player:set-card-style', { style: id });
    socket?.emit('player:set-game-skin', { style: '' });
  };

  // Try-on + purchase confirmation.
  const [tryOn, setTryOn] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  useEffect(() => {
    if (confirm && unlocked(confirm)) {
      equip(confirm);
      setConfirm(null); setTryOn(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.owned]);

  const previewId = tryOn ?? equipped;
  const previewDef = CARD_STYLES.find(s => s.id === previewId) ?? CARD_STYLES[0];

  const pick = (id: string) => {
    if (unlocked(id)) { setTryOn(null); equip(id); }
    else { setTryOn(id); setConfirm(id); }
  };

  const confirmDef = confirm ? CARD_STYLES.find(s => s.id === confirm) : undefined;
  const confirmItemId = confirm ? ITEM_IDS[confirm] : undefined;
  const confirmPrice = confirmDef?.price ?? 0;

  return (
    <div className="psshop-backdrop" onClick={onClose}>
      <div className="psshop-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Your card back">
        <button className="psshop-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="psshop-head">
          <h2 className="psshop-title">Your card back</h2>
          {shop.status === 'ready' && !premium && (
            <span className="psshop-balance" title="Your Gabu Points"><Coins size={12} aria-hidden="true" /> {shop.balance.toLocaleString()} GP</span>
          )}
        </div>

        {/* Live preview — the REAL card backs the table renders (DynamicCard
            hg-back-<style> overlay), fanned like an opponent's hand. */}
        <div className="psshop-preview">
          <div className="psshop-fan">
            {[0, 1, 2].map((i) => (
              <DynamicCard
                key={i}
                cardType={0}
                showFace={false}
                ownerCardStyle={previewId}
                className={`psshop-fan-card psshop-fan-card-${i}`}
              />
            ))}
          </div>
          <span className="psshop-prev-caption">{previewDef.label} — how your hand looks to the table</span>
        </div>

        {/* "Your player card" mini — the same style frames your roster row +
            dock chip; real themed classes, follows try-ons. */}
        <div className="psshop-pcard">
          <span className="psshop-pcard-caption">Your player card</span>
          <div className="psshop-pcard-row">
            <div className="player-list-items">
              <div className={`player-list-item is-me ${previewId ? `lr-cardstyle-${previewId}` : ''}`}>
                <div className="player-avatar-container"><Avatar src={me?.avatarUrl} className="player-avatar" /></div>
                <div className="player-info"><span className="player-name">{me?.name ?? 'You'}</span></div>
              </div>
            </div>
            <span className={`gs-chip is-me ${previewId ? `lr-cardstyle-${previewId}` : ''}`} title={me?.name}>
              <span className="gs-chip-av"><Avatar src={me?.avatarUrl} /></span>
              <span className="gs-chip-name">{me?.name ?? 'You'}</span>
            </span>
          </div>
        </div>

        {premium && (
          <p className="psshop-note psshop-note-premium"><Crown size={12} aria-hidden="true" /> Premium — everything is included for you.</p>
        )}

        <div className="psshop-section">
          <div className="psshop-section-title">Card style <span className="psshop-hint">· one style for your player card AND your card backs</span></div>
          <div className="psshop-chips">
            {CARD_STYLES.map((opt) => {
              const locked = !!opt.id && !unlocked(opt.id);
              const active = (tryOn ?? equipped) === opt.id;
              const isEquipped = tryOn === null && equipped === opt.id;
              return (
                <button
                  key={opt.id || 'classic'}
                  type="button"
                  className={`psshop-chip ${opt.id ? `lr-cardstyle-${opt.id}` : ''} ${active ? 'selected' : ''} ${locked ? 'locked' : ''}`}
                  onClick={() => pick(opt.id)}
                  title={locked ? `${opt.label} — ${opt.price} GP (or free with Premium)` : opt.label}
                >
                  {!!opt.id && <Crown size={9} aria-hidden="true" />}
                  {locked ? <Lock size={9} aria-hidden="true" /> : isEquipped ? <Check size={10} aria-hidden="true" /> : null}
                  {opt.label}
                  {locked && <span className="psshop-price" aria-hidden="true">{opt.price}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Purchase confirmation — bottom sheet so the live preview stays visible. */}
        {confirm && confirmDef && confirmItemId && (() => {
          const buying = shop.buyingItemId === confirmItemId;
          const affordable = shop.balance >= confirmPrice;
          return (
            <div className="psshop-confirm-backdrop" onClick={() => { if (!buying) { setConfirm(null); setTryOn(null); } }}>
              <div className="psshop-confirm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Buy ${confirmDef.label}`}>
                <div className="psshop-confirm-title">Buy {confirmDef.label}?</div>
                {shop.status === 'guest' ? (
                  <p className="psshop-note">Sign in with your GameBuddies account to buy cosmetics with Gabu Points.</p>
                ) : (
                  <>
                    <div className="psshop-crow"><span>Price</span><span className="psshop-gold"><Coins size={12} aria-hidden="true" /> {confirmPrice} GP</span></div>
                    <div className="psshop-crow"><span>Your Gabu Points</span><span>{shop.balance.toLocaleString()} GP</span></div>
                    <div className="psshop-crow">
                      <span>After purchase</span>
                      <span className={affordable ? 'psshop-ok' : 'psshop-short'}>
                        {affordable ? `${(shop.balance - confirmPrice).toLocaleString()} GP` : `${confirmPrice - shop.balance} GP short`}
                      </span>
                    </div>
                    <p className="psshop-note">{confirmDef.label} is yours forever, in every Prime Suspect game.</p>
                    {shop.lastError && <p className="psshop-error" role="alert">{shop.lastError}</p>}
                  </>
                )}
                <div className="psshop-confirm-actions">
                  <button type="button" className="psshop-cancel" onClick={() => { setConfirm(null); setTryOn(null); }} disabled={buying}>Cancel</button>
                  {shop.status !== 'guest' && (
                    <button type="button" className="psshop-buy" disabled={buying || shop.status !== 'ready' || !affordable} onClick={() => buyCosmetic('ps_style', confirmItemId)}>
                      <Coins size={12} aria-hidden="true" />{buying ? 'Buying…' : `Buy · ${confirmPrice} GP`}
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
