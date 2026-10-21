import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from './Button';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  /** Called with the error so the host can log it without a console call. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  failed: boolean;
}

/** The "Misprint" panel: a broken section never blanks the page (docs/06 §7.11). */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <div role="alert" className={styles.misprint}>
        <p className={styles.headline}>This page came off the press smudged.</p>
        <p>Your plan is safe on this device.</p>
        <Button
          onClick={() => {
            this.setState({ failed: false });
          }}
        >
          Try again
        </Button>
      </div>
    );
  }
}
