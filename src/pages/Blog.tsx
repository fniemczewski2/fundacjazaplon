import React from 'react'
import Seo from '../components/Seo'
import { Link } from 'react-router-dom'
import { getPosts } from '../lib/content'

export default function Blog() {
  const [posts, setPosts] = React.useState<any[]>([])
  React.useEffect(() => { getPosts().then(setPosts) }, [])

  return (
    <>
      <Seo title="Aktualności" />
      <h1 className="section-title">Aktualności</h1>
      <ul className="mt-6 grid gap-4">
        {posts.map(p => (
          <li key={p.slug} className="card p-5">
            <Link to={`/aktualnosci/${p.slug}`} className="text-xl font-semibold hover:underline">{p.title}</Link>
            <p className="text-sm opacity-70 mt-1">{new Date(p.date).toLocaleDateString('pl-PL')}</p>
          </li>
        ))}
      </ul>
    </>
  )
}