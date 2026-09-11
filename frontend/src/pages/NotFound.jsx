import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200 mb-2">404</p>
        <p className="text-gray-700 font-medium">Page not found</p>
        <p className="text-sm text-gray-400 mt-1 mb-6">The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Home className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
