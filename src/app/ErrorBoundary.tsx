import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * The last line of defence for render-time crashes.
 *
 * Still a class component: `getDerivedStateFromError` and `componentDidCatch`
 * have no hook equivalent, so this is one of the few places where a class is
 * the correct tool rather than a legacy one.
 *
 * Errors thrown inside a query are handled far more specifically by the
 * per-card error states; this catches the ones nothing else expected.
 *
 * Recovery on navigation is handled by giving this a `key` of the current
 * pathname, so React remounts it with fresh state. That is cleaner than
 * comparing props in `componentDidUpdate` and calling `setState`, which costs
 * an extra render pass and is easy to get subtly wrong.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Where a real deployment would call Sentry. Logging the component stack
    // is what makes these reports actionable rather than just a message.
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <ErrorState
        title="Something broke on this page"
        error={error}
        onRetry={() => this.setState({ error: null })}
      />
    );
  }
}

/** Shown when the router matches nothing. */
export function NotFound() {
  return (
    <ErrorState
      title="Page not found"
      error={new Error('That route does not exist.')}
      onRetry={undefined}
    />
  );
}

export function ReloadButton() {
  return (
    <Button variant="secondary" iconBefore="refresh" onClick={() => window.location.reload()}>
      Reload
    </Button>
  );
}
