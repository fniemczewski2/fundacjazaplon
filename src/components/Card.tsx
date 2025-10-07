import React from 'react'

export default function Card({ children }: { children: React.ReactNode }) {
  return <div className="card p-4 md:p-8 bg-base-200 flex flex-col items-center">{children}</div>
}