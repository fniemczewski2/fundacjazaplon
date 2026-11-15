import { FaArrowRight, FaInstagram } from 'react-icons/fa6';
import Reveal from './Reveal';
import { SkeletonList } from './Skeleton';
import { useInstagramPosts, useSocialLinks } from '../hooks/useAppData';

const MAX_POSTS = 4;

const isHttpsUrl = (value: string | null | undefined): value is string => {
  try {
    return typeof value === 'string' && new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** Ostatnie posty z Instagrama. Sekcja jest opcjonalna: bez konfiguracji lub przy błędzie API w ogóle się nie wyświetla. */
export default function InstagramFeed() {
  const { data, isPending } = useInstagramPosts();
  const { data: social } = useSocialLinks();
  const posts = (data ?? []).slice(0, MAX_POSTS);
  const profileUrl = isHttpsUrl(social?.instagram) ? social.instagram : null;

  if (!isPending && posts.length === 0) return null;

  return (
    <section id="instagram" aria-labelledby="instagram-title" className="section-gap container-max">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-4">Na bieżąco</p>
            <h2 id="instagram-title" className="section-title">
              Ostatnie posty na Instagramie
            </h2>
          </div>

          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link-accent inline-flex items-center gap-2"
            >
              Zobacz profil
              <FaArrowRight aria-hidden="true" />
              <span className="sr-only">(otwiera się w nowej karcie)</span>
            </a>
          )}
        </div>
      </Reveal>

      {isPending ? (
        <div className="mt-10">
          <SkeletonList count={MAX_POSTS} label="Wczytywanie postów z Instagrama" />
        </div>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((post, i) => (
            <Reveal as="li" key={post.id} delay={i * 110} className="h-full">
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="card card-interactive flex h-full flex-col gap-3 overflow-hidden p-0"
              >
                {post.image && (
                  <div
                    aria-hidden="true"
                    className="aspect-square w-full overflow-hidden panel-cool"
                  >
                    <img
                      src={post.image}
                      alt=""
                      width={400}
                      height={400}
                      className="size-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="muted flex items-center gap-2 text-xs tracking-wide uppercase">
                    <FaInstagram aria-hidden="true" />
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString('pl-PL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                  </p>
                  {post.caption && (
                    <p className="line-clamp-4 text-sm leading-relaxed">{post.caption}</p>
                  )}
                  <span className="sr-only">(otwiera się w nowej karcie)</span>
                </div>
              </a>
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}
