import { useJoinLink } from '../hooks/useAppData';
import { FaArrowRight } from 'react-icons/fa6';

export default function JoinUsCard() {
  const { data, isLoading } = useJoinLink();
  const url = data?.survey_url ?? null;

  // Rozróżniamy jawnie "jeszcze ładuję" od "naprawdę nie ma ankiety" — wcześniej
  // oba stany wyglądały identycznie (komponent po prostu nic nie renderował),
  // co powodowało niewielki, ale zauważalny "skok" layoutu po wczytaniu danych.
  if (isLoading) {
    return (
      <div className="card p-8 text-center animate-pulse">
        <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-4" />
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
      </div>
    );
  }

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
