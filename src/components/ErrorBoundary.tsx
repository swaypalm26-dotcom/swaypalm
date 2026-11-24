import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, WifiOff } from 'lucide-react';
import { checkFirestoreConnection } from '../lib/firebase';
import { getFriendlyNetworkErrorMessage, isNetworkError } from '../lib/network';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isNetworkFailure: boolean;
  retrying: boolean;
  retryHint: string | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      isNetworkFailure: false,
      retrying: false,
      retryHint: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const rawMsg = error?.message || 'An unexpected error occurred.';
    let isNet = isNetworkError(error);

    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed && parsed.error && isNetworkError(parsed.error)) {
        isNet = true;
      }
    } catch {
      // plain error string
    }

    return {
      hasError: true,
      message: rawMsg,
      isNetworkFailure: isNet,
      retrying: false,
      retryHint: null,
    };
  }

  private handleRetryConnection = async () => {
    this.setState({ retrying: true, retryHint: null });
    try {
      const result = await checkFirestoreConnection(true);
      if (!result.ok) {
        this.setState({
          retrying: false,
          retryHint:
            result.error ||
            'Still unable to connect. Please check Wi-Fi or mobile data and try again.',
        });
        return;
      }
      this.setState({
        hasError: false,
        message: '',
        isNetworkFailure: false,
        retrying: false,
        retryHint: null,
      });
    } catch (err) {
      this.setState({
        retrying: false,
        retryHint: getFriendlyNetworkErrorMessage(err),
      });
    }
  };

  render() {
    if (this.state.hasError) {
      let readableMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && parsed.error) {
          readableMessage = this.state.isNetworkFailure
            ? getFriendlyNetworkErrorMessage(parsed.error)
            : `${parsed.error} (${parsed.operationType} on ${parsed.path || 'database'})`;
        }
      } catch {
        if (this.state.isNetworkFailure) {
          readableMessage = getFriendlyNetworkErrorMessage(this.state.message);
        }
      }

      return (
        <div className="min-h-screen bg-[#F3F5F4] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-neutral-200 rounded-xl p-8 shadow-sm">
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center mb-4 ${
                this.state.isNetworkFailure
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-[#0A4D2E]/10 text-[#0A4D2E]'
              }`}
            >
              {this.state.isNetworkFailure ? (
                <WifiOff className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">
              {this.state.isNetworkFailure
                ? 'Network connection interrupted'
                : 'Unable to complete this action'}
            </h2>
            <p className="text-sm text-neutral-600 mb-5 break-words leading-relaxed">
              {readableMessage}
            </p>

            {this.state.retryHint && (
              <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {this.state.retryHint}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              {this.state.isNetworkFailure ? (
                <button
                  type="button"
                  disabled={this.state.retrying}
                  onClick={() => void this.handleRetryConnection()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0A4D2E] text-white text-sm font-semibold hover:bg-[#083D24] transition-colors disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${this.state.retrying ? 'animate-spin' : ''}`}
                  />
                  {this.state.retrying ? 'Reconnecting…' : 'Retry Connection'}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  this.setState({
                    hasError: false,
                    message: '',
                    isNetworkFailure: false,
                    retrying: false,
                    retryHint: null,
                  })
                }
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  this.state.isNetworkFailure
                    ? 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50'
                    : 'bg-[#0A4D2E] text-white hover:bg-[#083D24]'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                Return to SwayPalm
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
