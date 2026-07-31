import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * Bez tego komponentu KAŻDY nieobsłużony błąd renderowania (np. odwołanie się
 * do pola na `null`, patrz bug w dawnym `Links.jsx`) odmontowuje całe drzewo
 * React i zostawia użytkownikowi pusty, biały ekran bez żadnego komunikatu.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Nieobsłużony błąd renderowania:', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center p-6 text-center bg-base-100">
          <div>
            <h1 className="text-2xl font-semibold mb-2 text-text-black">Coś poszło nie tak.</h1>
            <p className="mb-6 text-text-black/70">
              Przepraszamy za utrudnienia — spróbuj odświeżyć stronę lub wrócić na stronę główną.
            </p>
            <a href="/" className="btn btn-primary inline-flex">
              Strona główna
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
