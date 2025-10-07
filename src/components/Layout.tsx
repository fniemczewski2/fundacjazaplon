import React from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-base-100 text-text-color">
      <Navbar />
        <main className="flex-1 container-max py-6 text-text-black">
          <Outlet />
        </main>
      <Footer />
    </div>
  )
}