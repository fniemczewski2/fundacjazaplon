import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { listPublishedPosts, type Post } from '../lib/post';
import { FaArrowRight } from 'react-icons/fa6';
import Loader from './Loader';
import Reveal from './Reveal';

const MAX_POSTS = 3;

export default function RecentPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const published = await listPublishedPosts();
        if (alive) setPosts(published.slice(0, MAX_POSTS));
      } catch {
        // Sekcja jest opcjonalna - przy błędzie po prostu jej nie pokazujemy.
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!loading && posts.length === 0) return null;

  return (
    <section
      id="aktualnosci"
      aria-labelledby="recent-posts-title"
      className="section-gap container-max"
    >
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-4">Co u nas</p>
            <h2 id="recent-posts-title" className="section-title">
              Aktualności
            </h2>
          </div>

          <Link to="/aktualnosci" className="link-accent inline-flex items-center gap-2">
            Wszystkie wpisy
            <FaArrowRight aria-hidden="true" />
          </Link>
        </div>
      </Reveal>

      {loading ? (
        <Loader />
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <Reveal as="li" key={post.id} delay={i * 110} className="h-full">
              <article className="card card-interactive flex h-full flex-col overflow-hidden p-0">
                <div aria-hidden="true" className="aspect-video w-full overflow-hidden panel-cool">
                  {post.cover_url ? (
                    <img
                      src={`${post.cover_url}?width=560&height=315&resize=cover&quality=75`}
                      alt=""
                      width={560}
                      height={315}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="muted grid size-full place-items-center text-sm">
                      Brak zdjęcia
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-6">
                  {post.published_at && (
                    <p className="muted text-xs tracking-wide uppercase">
                      {new Date(post.published_at).toLocaleDateString('pl-PL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}

                  <h3 className="font-heading text-lg leading-snug font-semibold">
                    <Link
                      to={`/aktualnosci/${post.slug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {post.title}
                    </Link>
                  </h3>

                  {post.excerpt && (
                    <p className="muted line-clamp-3 text-sm leading-relaxed">{post.excerpt}</p>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}
