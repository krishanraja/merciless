import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4 relative z-10">
        <p className="text-merciless-gold text-sm tracking-[0.3em] uppercase">404</p>
        <h1 className="text-3xl font-semibold">The stars do not map this path.</h1>
        <p className="text-merciless-muted text-sm">
          Whatever you were looking for is not here. Return to your reading.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-block px-5 py-2 bg-merciless-gold text-merciless-black rounded text-sm font-medium"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  )
}
