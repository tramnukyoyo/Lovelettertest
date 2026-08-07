/**
 * Error Boundary
 *
 * Catches React errors and displays a fallback UI.
 */

import React, { Component, type ErrorInfo } from 'react';
import { FileWarning, RotateCcw, Home } from 'lucide-react';
import { reportError } from '../../services/errorReporter';
import { t } from '../../utils/translations';

/** t() returns the key itself on a miss, so `t(k) || fallback` NEVER fires. */
function tr(key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retries: number;
}

const MAX_RETRIES = 2;

class ErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retries: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    reportError(
      `[React] ${error.name}: ${error.message}`,
      error.stack,
      'critical',
      { componentStack: errorInfo.componentStack?.slice(0, 1000) }
    );

    // Auto-retry transient errors
    if (this.state.retries < MAX_RETRIES) {
      this.retryTimer = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          retries: prev.retries + 1,
        }));
      }, 1500);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary" role="alertdialog" aria-modal="true" aria-labelledby="error-boundary-title">
          <div className="error-boundary-content">
            <span className="error-boundary-seal" aria-hidden="true">
              <FileWarning size={38} strokeWidth={1.5} />
            </span>
            <p className="error-boundary-eyebrow">
              {tr('errorBoundary.overline', 'Evidence room')}
            </p>
            <h1 className="error-boundary-title" id="error-boundary-title">{t('errorBoundary.title')}</h1>
            <p className="error-boundary-message">
              {t('errorBoundary.message')}
            </p>
            {this.state.error && (
              <pre className="error-boundary-details">
                {this.state.error.message}
              </pre>
            )}
            <div className="error-boundary-actions">
              <button
                type="button"
                onClick={this.handleRefresh}
                className="error-boundary-btn primary"
              >
                <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
                {t('errorBoundary.refresh')}
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="error-boundary-btn secondary"
              >
                <Home size={16} strokeWidth={1.75} aria-hidden="true" />
                {t('errorBoundary.goHome')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
