import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen" style={{ background: '#0f0f23', fontFamily: "'VT323', 'Courier New', monospace" }}>
      <header
        className="text-white px-8 flex justify-between items-center"
        style={{
          background: '#102C5F',
          padding: '0.8rem 2rem',
          borderBottom: '3px solid #FFB73F',
          boxShadow: '0 2px 0 #0a1a3a, 0 4px 8px rgba(0,0,0,0.5)',
        }}
      >
        <h1
          className="flex items-center"
          style={{
            fontFamily: "'VT323', monospace",
            fontSize: '1.5rem',
            gap: '0.75rem',
            letterSpacing: '1px',
          }}
        >
          <span
            className="inline-block shrink-0"
            style={{
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '16px solid #FFB73F',
              filter: 'drop-shadow(0 0 4px rgba(255,183,63,0.4))',
            }}
          />
          <Link to="/" className="no-underline" style={{ color: '#e8edf3' }}>
            Wilco Shop | FastAPI
          </Link>
        </h1>
        <nav>
          <a
            href="/admin"
            className="no-underline"
            style={{
              color: '#c8d6e5',
              fontFamily: "'VT323', monospace",
              fontSize: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              padding: '0.4rem 0.8rem',
              border: '1px solid rgba(255,183,63,0.3)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,183,63,0.15)'
              e.currentTarget.style.borderColor = '#FFB73F'
              e.currentTarget.style.color = '#FFB73F'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(255,183,63,0.3)'
              e.currentTarget.style.color = '#c8d6e5'
            }}
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
