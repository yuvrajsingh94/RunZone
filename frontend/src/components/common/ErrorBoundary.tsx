import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  isWidget?: boolean;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log error to console with full stack trace for development & observability
    console.error('[RunZone ErrorBoundary Caught Error]:', error, errorInfo);
  }

  handleReload = () => {
    if (this.props.onReset) {
      this.setState({ hasError: false, error: null, errorInfo: null });
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Widget-level compact fallback UI
      if (this.props.isWidget) {
        return (
          <div className="bg-panel border border-[#C1432E]/30 p-4 flex flex-col items-center justify-center text-center space-y-2.5 min-h-[160px] font-sans">
            <AlertTriangle className="w-5 h-5 text-[#C1432E]" />
            <div className="space-y-0.5">
              <h4 className="font-display font-bold text-xs text-chalk">
                {this.props.fallbackTitle || 'Widget Temporarily Unavailable'}
              </h4>
              <p className="text-[11px] text-chalk-muted max-w-sm">
                {this.props.fallbackMessage || 'A rendering issue occurred in this telemetry module.'}
              </p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="px-3 py-1 bg-night hover:bg-panel-light border border-hairline text-[11px] text-chalk transition-colors flex items-center gap-1.5 font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Module</span>
            </button>
          </div>
        );
      }

      // Full application-level fallback UI (prevents black screen)
      return (
        <div className="min-h-screen bg-night text-chalk flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-panel border border-hairline p-6 space-y-5 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-cinder/15 border border-cinder/30 flex items-center justify-center mx-auto text-cinder">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h1 className="font-display text-lg font-bold text-chalk">
                {this.props.fallbackTitle || 'Something went wrong'}
              </h1>
              <p className="text-xs text-chalk-muted leading-relaxed">
                {this.props.fallbackMessage ||
                  'An unexpected rendering error occurred. Your athlete data is safe and synced to the server.'}
              </p>
            </div>

            {/* Error Details (Collapsible) */}
            {this.state.error && (
              <div className="text-left bg-night border border-hairline p-3 text-[11px] text-chalk-dim font-display overflow-x-auto max-h-32">
                <div className="font-bold text-[#C1432E] mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </div>
                {this.state.errorInfo && (
                  <pre className="text-[10px] text-chalk-muted overflow-x-auto whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-cinder hover:bg-cinder-hover text-chalk text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="px-4 py-2 bg-panel-light hover:bg-panel border border-hairline text-chalk-muted hover:text-chalk text-xs font-medium transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
