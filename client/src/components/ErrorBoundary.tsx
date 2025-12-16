import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch JavaScript errors anywhere in the child component tree.
 * Prevents the entire app from crashing when a component throws an error.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console (could also send to error reporting service)
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });
  }

  handleRetry = (): void => {
    // Reset error state to allow retry
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-xl p-6 border border-red-500/30 shadow-xl">
            <div className="text-center">
              <div className="text-4xl mb-4">!</div>
              <h2 className="text-xl font-bold text-red-400 mb-2">
                Something went wrong
              </h2>
              <p className="text-slate-300 mb-4">
                An error occurred while rendering this component.
              </p>

              {this.state.error && (
                <details className="mb-4 text-left">
                  <summary className="cursor-pointer text-slate-400 hover:text-slate-200 transition-colors">
                    Show error details
                  </summary>
                  <div className="mt-2 p-3 bg-slate-900 rounded-lg overflow-auto max-h-48">
                    <code className="text-xs text-red-300 whitespace-pre-wrap">
                      {this.state.error.toString()}
                    </code>
                    {this.state.errorInfo && (
                      <code className="block mt-2 text-xs text-slate-400 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </code>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
