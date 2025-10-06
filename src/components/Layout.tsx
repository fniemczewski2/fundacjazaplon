import React from 'react'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-base-100 text-text-color">
      <Navbar />
      <main className="flex-1 container-max py-8 text-text-black">{children}</main>
      <Footer />
    </div>
  )
}