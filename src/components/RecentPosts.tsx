// src/components/RecentPosts.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPosts, type Post } from '../lib/post';
import { FaArrowRight } from 'react-icons/fa6';
import Loader from './Loader';

const MAX_POSTS = 3;

export default function RecentPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const all = await listPosts();
        const published = all
          .filter((p) => p.published_at)
          .slice(0, MAX_POSTS);
        setPosts(published);
      } catch {
        // Sekcja jest opcjonalna — przy błędzie po prostu nic nie renderuj
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Nie renderuj sekcji gdy nie ma wpisów (nowa fundacja)
  if (!loading && posts.length === 0) return null;

  return (
    <section aria-labelledby="recent-posts-title" className="mt-10">
    <div className='card p-8 text-center'>
      <div className="flex items-center justify-between mb-6">
        <div className='hidden md:flex md:flex-1 w-[90px]'/>
        <h2 id="recent-posts-title" className="section-title flex-1 mb-0">
          Aktualności
        </h2>
        <Link
          to="/aktualnosci"
          className="flex-1 hidden text-sm text-brand dark:text-accent-orange hover:underline md:flex items-center justify-end gap-1"
        >
          Wszystkie <FaArrowRight aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <article className="card overflow-hidden rounded-xl shadow-md transition h-full flex flex-col">
                <Link to={`/aktualnosci/${post.slug}`} tabIndex={-1} aria-hidden="true">
                  {post.cover_url ? (
                    <img
                      src={post.cover_url}
                      alt=""
                      className="w-full h-44 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-44 bg-base-200 flex items-center justify-center text-text-black/30 text-sm">
                      Brak zdjęcia
                    </div>
                  )}
                </Link>

                <div className="p-5 flex flex-col gap-2 flex-1">
                  {post.published_at && (
                    <p className="text-xs text-text-black/50">
                      {new Date(post.published_at).toLocaleDateString('pl-PL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                  <Link
                    to={`/aktualnosci/${post.slug}`}
                    className="text-lg font-semibold hover:underline leading-snug"
                  >
                    {post.title}
                  </Link>
                  {post.excerpt && (
                    <p className="text-sm opacity-70 leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      </div>
    </section>
  );
}