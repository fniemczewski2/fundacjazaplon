import { useEffect, useState } from 'react';
import { getContact, type ContactInfo } from '../lib/contact';
import { FiCopy, FiCheck } from 'react-icons/fi';
import { FaArrowRight } from 'react-icons/fa6';

type Props = {
  donateUrl?: string; 
  title?: string;
};

export default function DonateCard({ donateUrl = '#', title = 'Wesprzyj nas' }: Props) {
  const [data, setData] = useState<ContactInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getContact().then(setData);
  }, []);

  const acct = data?.account_number?.trim();
  if (!acct) return null; 

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(acct);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  return (
    <section id="donate" className="mt-16 card p-8 text-center flex flex-col items-center">
      <h2 className="section-title">{title}</h2>

      <p className="mt-5 mb-2">Przelew tradycyjny:</p>

      <div className="inline-flex items-center gap-4 text-lg button-primary">
        <span>{acct}</span>
        <button
          onClick={copy}
          className="text-text-black/70 hover:text-text-black"
          aria-label="Skopiuj numer konta"
          title={copied ? 'Skopiowano!' : 'Skopiuj'}
        >
          {copied ? <FiCheck /> : <FiCopy />}
        </button>
      </div>

      {donateUrl && donateUrl !== '#' && (
        <a className="btn btn-secondary mt-4" href={donateUrl} target="_blank" rel="noopener noreferrer">
          Przekaż darowiznę <FaArrowRight />
        </a>
      )}
    </section>
  );
}
