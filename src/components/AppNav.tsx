import { Link, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { path: '/reading', label: 'Reading', icon: '☉' },
  { path: '/chart', label: 'Chart', icon: '◎' },
  { path: '/oracle', label: 'Oracle', icon: '☽' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

export default function AppNav() {
  const location = useLocation()

  return (
    <>
      {/* Desktop: top nav bar */}
      <nav className="hidden md:block border-b border-merciless-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/reading">
            <img src="/merciless%20orange%20icon.png" alt="Merciless" className="h-7 w-7" />
          </Link>
          <div className="flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.path}
                to={l.path}
                className={`text-xs tracking-widest font-medium transition-colors ${
                  location.pathname === l.path ? 'text-merciless-gold' : 'text-merciless-muted hover:text-merciless-gold'
                }`}
              >
                {l.label.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile: minimal top bar (logo only) */}
      <nav className="md:hidden border-b border-merciless-border px-5 py-3">
        <div className="flex items-center justify-center">
          <Link to="/reading">
            <img src="/merciless%20orange%20icon.png" alt="Merciless" className="h-6 w-6" />
          </Link>
        </div>
      </nav>

      {/* Mobile: bottom tab bar */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-merciless-black border-t border-merciless-border"
      >
        <div className="flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {NAV_LINKS.map((l) => {
            const isActive = location.pathname === l.path
            return (
              <Link
                key={l.path}
                to={l.path}
                aria-label={l.label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-merciless-gold rounded ${
                  isActive ? 'text-merciless-gold' : 'text-merciless-muted'
                }`}
              >
                <span className="text-lg" aria-hidden="true">{l.icon}</span>
                <span className="text-[9px] tracking-wider font-medium">{l.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
