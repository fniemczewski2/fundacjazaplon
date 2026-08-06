import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import Loader from '../components/Loader';

export default function WizytowkaRedirect() {
  const { slug } = useParams<{ slug?: string }>();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (slug) {
      setLocation(`/zespol#${slug}`);
    } else {
      setLocation('/zespol');
    }
  }, [slug, setLocation]);

  return <Loader />;
}