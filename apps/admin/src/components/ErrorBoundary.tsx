import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Application-level boundary: an unexpected render error shows a recoverable
 * screen instead of a blank page. Error details stay in the console; nothing
 * sensitive is rendered.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <main id="main-content" tabIndex={-1} style={{ padding: 32 }}>
        <Result
          status="error"
          title={<h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>}
          subTitle="The admin interface hit an unexpected error. Reload the page to continue; if it keeps happening, report it with the time it occurred."
          extra={
            <Button type="primary" onClick={this.reload}>
              Reload page
            </Button>
          }
        />
      </main>
    );
  }
}
