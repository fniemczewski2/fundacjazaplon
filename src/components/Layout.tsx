import Navbar from './Navbar';
import Footer from './Footer';
import BackToTop from './BackToTop';

/**
 * Rama wszystkich stron publicznych. Ma jeden landmark `<main>` (widoki nie dokładają własnego)
 * oraz link „Przejdź do treści” na początku, żeby osoby korzystające z klawiatury nie przechodziły przez całe menu.
 * `<main>` nie ma kontenera ani paddingu, dzięki czemu strona główna może puszczać sekcje na pełną szerokość;
 * podstrony opakowują treść w komponent `<Page>`.
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
