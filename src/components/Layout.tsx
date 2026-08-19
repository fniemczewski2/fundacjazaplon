import Navbar from './Navbar';
import Footer from './Footer';
import BackToTop from './BackToTop';

/**
 * Rama wszystkich stron publicznych.
 *
 * Dwie zmiany względem poprzedniej wersji, obie z powodów dostępności:
 *
 * • Jest tu dokładnie jeden landmark `<main>`. Wcześniej Layout renderował
 *   `<main>`, a widoki Home i Team dokładały własny - zagnieżdżone landmarki
 *   mylą nawigację czytników ekranu.
 * • Na starcie stoi „Przejdź do treści”. Bez niego osoba korzystająca
 *   z klawiatury musi przetabować całe menu na każdej podstronie.
 *
 * `<main>` nie ma już własnego kontenera ani paddingu - dzięki temu strona
 * główna może puścić sekcje na pełną szerokość. Podstrony opakowują treść
 * w komponent `<Page>`.
 */
export default function Layout({ children }: Readonly<{ children?: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <a href="#main-content" className="skip-link">
        Przejdź do treści
      </a>

      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
