import { useEffect, useState } from 'react';
import { getContact, type ContactInfo } from '../lib/contact';
import { FiCopy, FiCheck } from 'react-icons/fi';
import { FaArrowRight, FaCreditCard, FaArrowLeft, FaHeart } from 'react-icons/fa6';

type Props = {
  donateUrl?: string; 
  title?: string;
};

export default function DonateCard({ donateUrl = '#', title = 'Wspieram' }: Props) {
  const [data, setData] = useState<ContactInfo | null>(null);
  const [copied, setCopied] = useState(false);
  
  // --- Stany dla formularza darowizny ---
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState<number>(50);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');

  const predefinedAmounts = [20, 50, 100];

  useEffect(() => {
    getContact().then(setData);
  }, []);

  const acct = data?.account_number?.trim();

  const copy = async () => {
    if (!acct) return;
    try {
      await navigator.clipboard.writeText(acct);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;

    setIsStripeLoading(true);
    setStripeError('');
    
    try {
      const response = await fetch('/api/create-stripe-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, isRecurring, name, email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Wystąpił błąd podczas łączenia z operatorem płatności.');
      }

      // Przekierowanie do bezpiecznej bramki Stripe
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      console.error(err);
      setStripeError(err.message);
      setIsStripeLoading(false);
    }
  };

  return (
    <section id="donate" className="card p-8 text-center flex flex-col items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
      <h2 className="section-title mb-4">{title}</h2>  
      <p className="mb-8 text-gray-600 dark:text-gray-300">
        Podoba Ci się to, co robimy? Pomóż nam wspierać młode osoby w realizacji swoich projektów.
      </p>

      {/* --- SEKCJA STRIPE (2 KROKI) --- */}
      <div className="w-full max-w-md transition-all">
        
        {step === 1 && (
          <form onSubmit={handleNextStep} className="animate-fade-in">
            <h3 className="font-semibold mb-4 text-text-black dark:text-white">Wybierz formę wsparcia</h3>
            
            {/* Przełącznik: Jednorazowo / Co miesiąc */}
            <div className="relative flex p-1 bg-gray-200 dark:bg-gray-800 rounded-full mb-2 shadow-inner overflow-hidden border border-white/20">
              
              {/* Animowane tło (Pigułka) */}
              <div 
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-brand rounded-full transition-transform duration-300 ease-out shadow-md"
                style={{ 
                  transform: isRecurring ? 'translateX(100%)' : 'translateX(0)',
                  left: '4px'
                }}
              />

              {/* Przycisk: Jednorazowo */}
              <button
                type="button"
                onClick={() => setIsRecurring(false)}
                className={`relative flex-1 py-2.5 text-sm font-semibold rounded-full z-10 transition-colors duration-300 ${
                  !isRecurring 
                    ? 'text-white' 
                    : 'text-text-black/60 hover:text-text-black dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                Jednorazowo
              </button>

              {/* Przycisk: Co miesiąc */}
              <button
                type="button"
                onClick={() => setIsRecurring(true)}
                className={`relative flex-1 py-2.5 text-sm font-semibold rounded-full z-10 transition-colors duration-300 flex justify-center items-center gap-1.5 ${
                  isRecurring 
                    ? 'text-white' 
                    : 'text-text-black/60 hover:text-text-black dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                Co miesiąc
              </button>
            </div>

            {/* Wybór kwoty */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {predefinedAmounts.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`btn justify-center py-2 rounded-lg font-medium transition-colors border ${
                    amount === val 
                      ? 'bg-brand text-white border-brand shadow-md' 
                      : 'btn-secondary '
                  }`}
                >
                  {val} zł
                </button>
              ))}
            </div>

            <button type="submit" className="w-full btn btn-primary flex justify-center items-center gap-2">
              Dalej <FaArrowRight />
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStripePayment} className="animate-fade-in text-left">
            <button 
              type="button" 
              onClick={() => setStep(1)}
              className="text-sm text-gray-500 hover:text-brand-primary flex items-center gap-1 mb-4 transition-colors"
            >
              <FaArrowLeft /> Wróć do wyboru kwoty
            </button>
            
            <h3 className="font-semibold mb-2 text-text-black dark:text-white">Pozostańmy w kontakcie</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Zostaw nam swoje dane, abyśmy mogli podziękować Ci za wpłatę i&nbsp;informować o&nbsp;tym, co udało nam się dzięki Tobie zrealizować.
            </p>

            <div className="space-y-3 mb-6">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Twoje imię"
                className="input-text"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Twój adres e-mail"
                className="input-text"
              />
            </div>

            <button
              type="submit"
              disabled={isStripeLoading}
              className="w-full btn btn-primary flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {isStripeLoading ? 'Przekierowywanie...' : <>Przekaż {amount} zł {isRecurring ? 'miesięcznie' : ''} <FaCreditCard /></>}
            </button>
            
            {stripeError && <p className="text-red-500 text-sm mt-3 text-center">{stripeError}</p>}
          </form>
        )}
      </div>

      {/* --- SEKCJA PRZELEWU TRADYCYJNEGO --- */}
      {acct && (
        <>
          <div className="w-full flex items-center gap-4 my-6">
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">LUB PRZELEW TRADYCYJNY</span>
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
          </div>

          <div className="inline-flex items-center gap-4 text-lg bg-gray-100 dark:bg-gray-700 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600">
            <span className="font-mono tracking-wider dark:text-white">{acct}</span>
            <button
              onClick={copy}
              className="text-gray-500 hover:text-brand-primary transition-colors p-2"
              aria-label="Skopiuj numer konta"
              title={copied ? 'Skopiowano!' : 'Skopiuj'}
            >
              {copied ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
            </button>
          </div>
        </>
      )}
    </section>
  );
}