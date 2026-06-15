/**
 * Game-log message translation.
 *
 * Server `game:log` events (and the persisted `room.messages`) carry a raw
 * JSON payload `{"key":"game.playerDrew","params":{...}}`. The persisted raw
 * messages flow back into `lobby.messages` on every room-state sync, so any
 * UI that shows them (the Case Log, mobile notes) must translate at RENDER
 * time rather than relying on a one-shot translated copy. This helper does
 * that, with an English fallback so a key missing in the active locale shows
 * readable text instead of raw JSON.
 */
import { getTranslation, getCurrentLanguage } from './gameTranslations';

export function translateGameMessage(rawMessage: string): string {
  try {
    if (!rawMessage || !rawMessage.startsWith('{')) return rawMessage;
    const { key, params } = JSON.parse(rawMessage) as {
      key: string;
      params?: Record<string, string>;
    };
    const lang = getCurrentLanguage();
    let text = getTranslation(key as any, lang);
    if (text === key) text = getTranslation(key as any, 'en'); // fall back to English
    if (text === key) return rawMessage; // truly unknown key — last resort
    for (const [k, v] of Object.entries(params || {})) {
      let translated = v;
      if (typeof v === 'string' && v.startsWith('card.')) {
        translated = getTranslation(v as any, lang);
      }
      text = text.replace(`{${k}}`, translated);
    }
    return text;
  } catch {
    return rawMessage;
  }
}
