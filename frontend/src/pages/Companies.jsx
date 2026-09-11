import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ArrowRight, Search, Briefcase, ArrowUpDown, Inbox } from 'lucide-react'
import { getCompanies } from '../lib/api'
import { CompanyCardSkeleton, EmptyState } from '../components/Skeleton'

export default function Companies() {
  const [companies, setCompanies] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('jobs')

  useEffect(() => {
    getCompanies(100)
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = companies
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'jobs' ? b.job_count - a.job_count : a.name.localeCompare(b.name))

  if (loading) {
    return (
      <div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-72 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <CompanyCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Company Analysis</h1>
          <p className="text-gray-500 text-sm mt-1">Explore what {companies.length} employers expect from candidates</p>
        </div>
        <button
          onClick={() => setSortBy(s => s === 'jobs' ? 'name' : 'jobs')}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          {sortBy === 'jobs' ? 'Most postings' : 'A–Z'}
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search companies..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No companies match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(company => (
            <Link
              key={company.name}
              to={`/companies/${encodeURIComponent(company.name)}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
            >
              <div className="w-11 h-11 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 group-hover:text-indigo-700 transition-colors truncate">{company.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> {company.job_count} postings
                  </span>
                  {company.top_skills?.length > 0 && (
                    <div className="flex gap-1 overflow-hidden">
                      {company.top_skills.map(s => (
                        <span key={s} className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded truncate max-w-[80px]">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
