import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';

export default function WizytowkaRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (slug) {
      navigate(`/zespol#${slug}`, { replace: true });
    } else {
      navigate('/zespol', { replace: true });
    }
  }, [slug, navigate]);

  return (
    <Loader />
  );
}