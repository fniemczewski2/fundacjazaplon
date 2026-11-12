import LegalDocument from '../components/LegalDocument';
import { PRIVACY_SECTIONS } from '../content/legal';

export default function PrivacyPolicy() {
  return (
    <LegalDocument
      title="Polityka prywatności"
      path="/polityka-prywatnosci"
      description="Zasady przetwarzania danych osobowych i plików cookie w serwisie Fundacji „Zapłon”."
      lead="Kto przetwarza Twoje dane, w jakim celu i jakie prawa Ci przysługują."
      sections={PRIVACY_SECTIONS}
    />
  );
}
