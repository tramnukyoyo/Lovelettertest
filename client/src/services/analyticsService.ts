/**
 * Analytics Service — Lightweight PostHog wrapper for game clients.
 *
 * Reuses the same PostHog project as Gamebuddies.Io (same domain, same cookies).
 * Respects GDPR consent stored in localStorage['gb-cookie-consent'] by the main site.
 *
 * Usage:
 *   import { initAnalytics, trackEvent, trackShare } from '../services/analyticsService';
 *   // Call initAnalytics() once in App.tsx useEffect
 *   // Call trackShare('whatsapp') in share handlers
 */

import posthog from 'posthog-js';
import { GAME_META } from '../config/gameMeta';

const POSTHOG_KEY = 'phc_lXhLxEeir5ZB9MjrDuvKiZsj6A0VGvZIIgduZsL20ji';
const POSTHOG_HOST = 'https://eu.i.posthog.com';
const CONSENT_KEY = 'gb-cookie-consent';

let initialized = false;

function hasConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'all';
}

function doInit(): void {
  if (initialized) return;
  if (!hasConsent()) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    persistence: 'localStorage+cookie',
    capture_pageview: false,
    capture_pageleave: false,
    person_profiles: 'identified_only',
    property_denylist: ['sessionToken', 'inviteToken', 'password', 'email', 'access_token', 'refresh_token'],
  });
  initialized = true;
}

/** Call once from App.tsx. Inits PostHog if consent exists, listens for future consent changes. */
export function initAnalytics(): void {
  doInit();

  window.addEventListener('gb-consent-changed', ((e: CustomEvent<string>) => {
    if (e.detail === 'all') {
      doInit();
    } else if (initialized) {
      posthog.opt_out_capturing();
    }
  }) as EventListener);
}

/** Fire a custom event to PostHog. No-op if not initialized or no consent. */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (!initialized || !hasConsent()) return;
  posthog.capture(name, { game: GAME_META.name, ...properties });
}

/** Convenience: track a share action. */
export function trackShare(method: string, extra?: Record<string, unknown>): void {
  trackEvent('share_clicked', { method, ...extra });
}

/** Track a game round completing. */
export function trackGameRound(roundNumber: number, durationSeconds: number, extra?: Record<string, unknown>): void {
  trackEvent('game_round_completed', { round_number: roundNumber, duration_seconds: durationSeconds, ...extra });
}

/** Track a game finishing (all rounds done). */
export function trackGameFinished(totalRounds: number, gameDurationSeconds: number, extra?: Record<string, unknown>): void {
  trackEvent('game_finished', { total_rounds: totalRounds, game_duration_seconds: gameDurationSeconds, ...extra });
}

/** Track a reconnection attempt. */
export function trackReconnect(success: boolean, method: string): void {
  trackEvent('reconnection_attempted', { success, method });
}

/** Track when the server sends an error to the client. */
export function trackGameError(errorMessage: string): void {
  trackEvent('game_error_shown', { error_message: errorMessage });
}
