import React from 'react'

type Props = { title?: string; description?: string; image?: string }
export default function Seo({ title, description, image }: Props) {
  React.useEffect(() => {
    if (title) document.title = title
    if (description) {
      const meta = document.querySelector('meta[name="description"]')
      if (meta) meta.setAttribute('content', description)
    }
    if (image) {
      const meta = document.querySelector('meta[property="og:image"]')
      if (meta) meta.setAttribute('content', image)
    }
  }, [title, description, image])
  return null
}