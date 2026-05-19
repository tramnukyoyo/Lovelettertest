/**
 * Error Boundary
 *
 * Catches React errors and displays a fallback UI.
 */

import React, { Component, type ErrorInfo } from 'react';
import { reportError } from '../../services/errorReporter';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';

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

      const language = getCurrentLanguage();
      const t = (key: string) => getTranslation(key as keyof typeof import('../../utils/translations').translations.en, language);
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h1 className="error-boundary-title">{t('errorBoundary.somethingWentWrong')}</h1>
            <p className="error-boundary-message">
              {t('errorBoundary.errorOccurred')}
            </p>
            {this.state.error && (
              <pre className="error-boundary-details">
                {this.state.error.message}
              </pre>
            )}
            <div className="error-boundary-actions">
              <button
                onClick={this.handleRefresh}
                className="error-boundary-btn primary"
              >
                {t('errorBoundary.reload')}
              </button>
              <button
                onClick={this.handleGoHome}
                className="error-boundary-btn secondary"
              >
                {t('common.back')}
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
