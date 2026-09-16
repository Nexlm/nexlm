import { Component } from 'react';

/**
 * Last line of defence for a render crash. Without it a thrown error unmounts
 * the whole app and leaves a blank page — which, in the middle of a trade, looks
 * like the money vanished.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render failed', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div role="alert" className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="eyebrow">Something broke</p>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-paper">
          This screen failed to load.
        </h1>
        <p className="mt-3 text-soft">
          Your XLM is unaffected — trades and escrow live on Stellar, not in this page. Reload to carry on.
        </p>
        <p className="mono mt-4 break-words text-moss">{error.message}</p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded bg-leaf px-5 py-2.5 text-sm font-semibold text-ink hover:bg-mint"
          >
            Reload
          </button>
          <a href="/" className="rounded border border-line px-5 py-2.5 text-sm font-semibold text-paper hover:border-leaf">
            Back to the market
          </a>
        </div>
      </div>
    );
  }
}
