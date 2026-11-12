// Motyw ustawiany przed pierwszym malowaniem strony (bez błysku złego motywu).
// Plik zewnętrzny zamiast skryptu w index.html, żeby CSP mogło zabronić skryptów inline.
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var theme = saved || (globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {
    /* localStorage niedostępny: zostaje motyw domyślny */
  }
})();
