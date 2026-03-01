import { useEffect, useState } from 'react';
import { getJoinLink } from '../lib/join';
import { FaArrowRight } from 'react-icons/fa6';

export default function JoinUsCard() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    getJoinLink().then(data => setUrl(data?.survey_url ?? null));
  }, []);

  if (!url) return null; 

  return (
    <div className="card p-8 text-center">
      <h2 className="section-title">Dołącz do nas</h2>
      <p className="mt-5 mb-2">Chcesz działać z&nbsp;nami? Wypełnij krótką ankietę i&nbsp;zostań częścią zespołu!</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary mt-4 inline-flex"
      >
        Wypełnij ankietę <FaArrowRight />
      </a>
    </div>

  );
}
