import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-slate-700 text-white px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          <Link to="/" className="text-white no-underline hover:opacity-80">
            Wilco Shop
          </Link>
        </h1>
        <nav>
          <a
            href="/admin"
            className="text-white no-underline opacity-80 hover:opacity-100"
          >
            Admin
          </a>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto py-8 px-4">
        {children}
      </main>
    </div>
  )
}

export default Layout
