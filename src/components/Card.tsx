import React from 'react'

export default function Card({ children }: { children: React.ReactNode }) {
  return <div className="card p-5 bg-base-200">{children}</div>
}