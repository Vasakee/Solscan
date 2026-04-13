import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Optional label shown in the fallback UI */
  label?: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-sol-card border border-red-500/30 rounded-2xl p-6 text-center">
          <div className="text-red-400 text-2xl mb-2">⚠</div>
          <div className="text-white text-sm font-medium mb-1">
            {this.props.label ?? 'Something went wrong'}
          </div>
          <div className="text-gray-500 text-xs mb-4 font-num break-all">
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-xs text-sol-purple hover:text-violet-300 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
