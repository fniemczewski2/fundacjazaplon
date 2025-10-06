import React from 'react'
import Seo from '../components/Seo'
import { useParams, Link } from 'react-router-dom'

export default function Post() {
  const { slug } = useParams()
  const [content, setContent] = React.useState<string>('')

  React.useEffect(() => {
    if (!slug) return
    import(`/content/posts/${slug}.md?raw`).then(mod => setContent(mod.default as string))
  }, [slug])

  const title = content.split('\n')[0]?.replace(/^#\s+/, '') || 'Wpis'

  return (
    <>
      <Seo title={`${title}`} />
      <article className="prose max-w-none">
        <Link to="/aktualnosci" className="opacity-70">← Wróć</Link>
        <div dangerouslySetInnerHTML={{ __html: markedToHtml(content) }} />
      </article>
    </>
  )
}

function markedToHtml(md: string) {
  // bardzo lekki konwerter – dla pełnego wsparcia możesz podmienić na marked/markdown-it
  let html = md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n$/gim, '<br />')
  return html
}