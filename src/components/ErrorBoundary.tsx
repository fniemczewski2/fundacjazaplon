import React from 'react';
import { logger } from '../lib/logger';

type Props = {
  children: React.ReactNode;
  /** `page` zajmuje cały ekran (poziom aplikacji), `route` tylko obszar treści (poziom trasy). */
  variant?: 'page' | 'route';
  /** Zmiana wartości (np. adresu trasy) czyści stan błędu, więc przejście na inną stronę naprawia widok. */
  resetKey?: string;
};
type State = { hasError: boolean };

/**
 * Bez tego komponentu każdy nieobsłużony błąd renderowania odmontowuje całe drzewo React
 * i zostawia użytkownikowi pusty ekran bez komunikatu.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: React.ErrorInfo) {
    logger.error('ErrorBoundary', 'Nieobsłużony błąd renderowania:', error, info.componentStack);
  }

  override componentDidUpdate(prev: Props) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) this.setState({ hasError: false });
  }

  override render() {
    if (!this.state.hasError) return this.props.children;

    const height = this.props.variant === 'route' ? 'min-h-[60vh]' : 'min-h-screen';
    return (
      <div className={`${height} grid place-items-center bg-surface p-6 text-center`}>
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-ink">Coś poszło nie tak.</h1>
          <p className="muted mb-6">Przepraszamy za utrudnienia. Spróbuj odświeżyć stronę lub wrócić na stronę główną.</p>
          <a href="/" className="btn btn-primary inline-flex">
            Strona główna
          </a>
        </div>
      </div>
    );
  }
}
