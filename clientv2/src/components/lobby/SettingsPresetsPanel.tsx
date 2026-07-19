/**
 * SettingsPresetsPanel — save/apply named snapshots of the room's game
 * settings (cross-game, FREE for registered users — feedback 2026-07-18).
 *
 * Talks to the CORE game-server events (settings:preset:list|save|apply|
 * delete) — the server snapshots room.settings.gameSpecific itself, so this
 * panel never needs to know a game's settings shape. Registration is decided
 * server-side: a guest host gets REGISTERED_REQUIRED on list and sees a
 * sign-in hint instead of the controls.
 *
 * Host-only surface — mount near the game's host settings UI. Direct-copy
 * template component: keep identical across games (styling is self-contained
 * in SettingsPresetsPanel.css on shared CSS variables).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Bookmark, Save, Play, Trash2, LogIn } from 'lucide-react';
import socketService from '../../services/socketService';
import { t } from '../../utils/translations';
import './SettingsPresetsPanel.css';

interface PresetMeta {
  id: string;
  name: string;
  updatedAt: string;
}

interface SettingsPresetsPanelProps {
  isHost: boolean;
  /** Disable inputs while the lobby is busy (e.g. countdown running). */
  disabled?: boolean;
}

function errorText(code?: string): string {
  switch (code) {
    case 'DUPLICATE_NAME': return t('presets.errorDuplicate');
    case 'PACK_LIMIT_REACHED': return t('presets.errorLimit');
    case 'REGISTERED_REQUIRED': return t('presets.signInHint');
    case 'NOT_IN_LOBBY': return t('presets.errorNotInLobby');
    default: return t('presets.errorGeneric');
  }
}

const SettingsPresetsPanel: React.FC<SettingsPresetsPanelProps> = ({ isHost, disabled = false }) => {
  const [presets, setPresets] = useState<PresetMeta[]>([]);
  const [locked, setLocked] = useState(false); // guest host — registered-only feature
  const [presetName, setPresetName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const refresh = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('settings:preset:list', {}, (r: { success: boolean; presets?: PresetMeta[]; error?: string }) => {
      if (r?.success) {
        setLocked(false);
        setPresets(r.presets || []);
      } else if (r?.error === 'REGISTERED_REQUIRED') {
        setLocked(true);
      }
    });
  }, []);

  useEffect(() => { if (isHost) refresh(); }, [isHost, refresh]);

  const save = useCallback(() => {
    const socket = socketService.getSocket();
    const name = presetName.trim();
    if (!socket || !name || busy) return;
    setBusy(true);
    socket.emit(
      'settings:preset:save',
      { name },
      (r: { success: boolean; preset?: PresetMeta; error?: string }) => {
        setBusy(false);
        if (r?.success && r.preset) {
          setPresets((prev) => [r.preset!, ...prev.filter((p) => p.id !== r.preset!.id)]);
          setPresetName('');
          setNotice({ kind: 'ok', text: t('presets.saved') });
        } else {
          setNotice({ kind: 'err', text: errorText(r?.error) });
        }
      }
    );
  }, [presetName, busy]);

  const apply = useCallback((presetId: string) => {
    const socket = socketService.getSocket();
    if (!socket || busy) return;
    setBusy(true);
    socket.emit(
      'settings:preset:apply',
      { presetId },
      (r: { success: boolean; error?: string }) => {
        setBusy(false);
        if (r?.success) {
          setNotice({ kind: 'ok', text: t('presets.applied') });
        } else {
          setNotice({ kind: 'err', text: errorText(r?.error) });
        }
      }
    );
  }, [busy]);

  const remove = useCallback((presetId: string) => {
    const socket = socketService.getSocket();
    if (!socket) return;
    socket.emit('settings:preset:delete', { presetId }, (r: { success: boolean }) => {
      if (r?.success) setPresets((prev) => prev.filter((p) => p.id !== presetId));
    });
  }, []);

  if (!isHost) return null;

  return (
    <div className="gb-presets">
      <h4 className="gb-presets-title">
        <Bookmark className="gb-presets-icon" /> {t('presets.title')}
      </h4>

      {locked ? (
        <p className="gb-presets-locked">
          <LogIn className="gb-presets-icon" /> {t('presets.signInHint')}
        </p>
      ) : (
        <>
          <div className="gb-presets-save">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
              placeholder={t('presets.namePlaceholder')}
              maxLength={60}
              disabled={disabled || busy}
            />
            <button
              type="button"
              className="gb-presets-btn"
              onClick={save}
              disabled={disabled || busy || !presetName.trim()}
              title={t('presets.save')}
            >
              <Save className="gb-presets-icon" /> {t('presets.save')}
            </button>
          </div>

          {notice && (
            <p className={`gb-presets-notice ${notice.kind}`}>{notice.text}</p>
          )}

          {presets.length === 0 ? (
            <p className="gb-presets-hint">{t('presets.empty')}</p>
          ) : (
            <ul className="gb-presets-list">
              {presets.map((p) => (
                <li key={p.id} className="gb-presets-item">
                  <span className="gb-presets-name">{p.name}</span>
                  <button
                    type="button"
                    className="gb-presets-btn"
                    onClick={() => apply(p.id)}
                    disabled={disabled || busy}
                    title={t('presets.apply')}
                  >
                    <Play className="gb-presets-icon" />
                  </button>
                  <button
                    type="button"
                    className="gb-presets-btn gb-presets-btn-danger"
                    onClick={() => remove(p.id)}
                    disabled={busy}
                    title={t('presets.delete')}
                  >
                    <Trash2 className="gb-presets-icon" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default SettingsPresetsPanel;
