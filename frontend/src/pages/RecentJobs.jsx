import { useEffect, useState, useCallback } from 'react'
import {
  Search, MapPin, Filter, ChevronLeft, ChevronRight, Briefcase, Calendar,
} from 'lucide-react'
import { getRecentJobs } from '../lib/api'
import { JobCardSkeleton } from '../components/Skeleton'

export default function RecentJobs() {
  const [jobs, setJobs] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [skill, setSkill] = useState('')
  const [location, setLocation] = useState('')
  const [source, setSource] = useState('')

  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [debouncedSkill, setDebouncedSkill] = useState('')
  const [debouncedLocation, setDebouncedLocation] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSkill(skill), 400)
    return () => clearTimeout(t)
  }, [skill])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLocation(location), 400)
    return () => clearTimeout(t)
  }, [location])

  const loadJobs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getRecentJobs(page, 20, source, debouncedSearch, debouncedSkill, debouncedLocation)
      setJobs(data.jobs || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, source, debouncedSearch, debouncedSkill, debouncedLocation])

  useEffect(() => { setPage(1) }, [debouncedSearch, debouncedSkill, debouncedLocation, source])
  useEffect(() => { loadJobs() }, [loadJobs])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Job Postings</h1>
        <p className="text-gray-500 text-sm mt-1">Browse and search {total.toLocaleString()} job postings from multiple sources</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search title or company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by skill (e.g., Python)"
              value={skill}
              onChange={e => setSkill(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by location..."
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="">All Sources</option>
            <option value="naukri">Naukri (Historical)</option>
            <option value="adzuna">Adzuna (Live)</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No jobs match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 hover:border-indigo-200 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{job.title}</h3>
                  <div className="flex items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-500 flex-wrap">
                    <span className="text-indigo-600 font-medium">{job.company}</span>
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />{job.location}
                      </span>
                    )}
                    {job.category && <span className="text-gray-400 hidden sm:inline">{job.category}</span>}
                  </div>
                  {job.normalized_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {job.normalized_skills.slice(0, 5).map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{s}</span>
                      ))}
                      {job.normalized_skills.length > 5 && (
                        <span className="text-xs text-gray-400">+{job.normalized_skills.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1.5 shrink-0">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    job.source === 'adzuna' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                  }`}>{job.source}</span>
                  {job.posted_date && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(job.posted_date).toLocaleDateString()}
                    </span>
                  )}
                  {job.salary && <span className="text-xs text-gray-500">{job.salary}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500">
            <span className="hidden sm:inline">Page </span>{page}/{totalPages}<span className="hidden sm:inline"> ({total.toLocaleString()} jobs)</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let n
              if (totalPages <= 5) {
                n = i + 1
              } else if (page <= 3) {
                n = i + 1
              } else if (page >= totalPages - 2) {
                n = totalPages - 4 + i
              } else {
                n = page - 2 + i
              }
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium ${
                    n === page ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {n}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
