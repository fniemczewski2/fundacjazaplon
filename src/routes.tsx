import React from 'react'
import { RouteObject } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import Projects from './pages/Projects'
import Team from './pages/Team'
import Blog from './pages/Blog'
import Post from './pages/Post'

export const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
  { path: '/o-nas', element: <About /> },
  { path: '/projekty', element: <Projects /> },
  { path: '/zespol', element: <Team /> },
  { path: '/aktualnosci', element: <Blog /> },
  { path: '/aktualnosci/:slug', element: <Post /> },
]