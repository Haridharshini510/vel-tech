import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid,
} from 'recharts'
import {
  Briefcase, GraduationCap, Building2, Cpu, AlertTriangle,
  TrendingUp, RefreshCw, Database, ArrowRight, MapPin, Calendar,
  Zap,
} from 'lucide-react'
import {
  getStats, getTrendingSkills, getSourceStats, getJobTrends,
  getCategoryDistribution, getRecentJobs, syncBroadJobs,
  getEmergingSkills, getCurriculumOverview,
} from '../lib/api'

const BAR_COLORS = [
  '#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe',
  '#4338ca', '#3730a3', '#312e81', '#4f46e5', '#6366f1',
  '#818cf8', '#a5b4fc', '#c7d2fe', '#4338ca', '#3730a3',
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [trending, setTrending] = useState([])
  const [sources, setSources] = useState({})
  const [trends, setTrends] = useState([])
  const [categories, setCategories] = useState([])
  const [recentJobs, setRecentJobs] = useState([])
  const [emerging, setEmerging] = useState([])
  const [curriculumOverview, setCurriculumOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  const loadData = () => {
    Promise.all([
      getStats(),
      getTrendingSkills(),
      getSourceStats(),
      getJobTrends(),
      getCategoryDistribution(),
      getRecentJobs(1, 5),
      getEmergingSkills(),
      getCurriculumOverview(),
    ])
      .then(([s, t, src, tr, cat, rj, em, co]) => {
        setStats(s)
        setTrending(t)
        setSources(src)
        setTrends(tr)
        setCategories(cat)
        setRecentJobs(rj.jobs || [])
        setEmerging(em || [])
        setCurriculumOverview(co)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await syncBroadJobs()
      setSyncResult(result)
      loadData()
    } catch (e) {
      setSyncResult({ message: 'Sync failed: ' + e.message })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const statCards = [
    { label: 'Jobs Analyzed', value: stats?.total_jobs ?? 0, icon: Briefcase, color: 'bg-blue-50 text-blue-700' },
    { label: 'Companies', value: stats?.total_companies ?? 0, icon: Building2, color: 'bg-green-50 text-green-700' },
    { label: 'Skills Mapped', value: stats?.total_skills ?? 0, icon: Cpu, color: 'bg-purple-50 text-purple-700' },
    { label: 'Courses Tracked', value: stats?.total_courses ?? 0, icon: GraduationCap, color: 'bg-amber-50 text-amber-700' },
    { label: 'Skill Gaps Found', value: stats?.total_gaps ?? 0, icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
    { label: 'Jobs with Skills', value: stats?.jobs_with_skills ?? 0, icon: TrendingUp, color: 'bg-teal-50 text-teal-700' },
  ]

  const sourceData = Object.entries(sources).map(([name, count]) => ({ name, count }))

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome to IndustryPulse</h1>
          <p className="text-gray-500 text-sm mt-1">Curriculum-job market alignment for Maharashtra institutions</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors self-start shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Live Jobs'}
        </button>
      </div>

      {syncResult && (
        <div className={`mb-6 p-4 rounded-lg text-sm ${
          syncResult.new_jobs > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {syncResult.message}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Data Sources + Job Trends row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Data Sources */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-400" /> Data Sources
          </h2>
          <div className="space-y-3">
            {sourceData.map(({ name, count }) => (
              <div key={name} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">{name}</span>
                  <span className="text-sm font-bold text-gray-900">{count.toLocaleString()}</span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${name === 'adzuna' ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${(count / (stats?.total_jobs || 1)) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {name === 'naukri' ? 'Historical base dataset' : 'Live job postings'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Job Posting Trends */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-400" /> Job Posting Trends
          </h2>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No trend data available.</p>
          )}
        </div>
      </div>

      {/* Trending Skills + Categories row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Trending Skills */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Trending Skills</h2>
          {trending.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={trending} layout="vertical" margin={{ left: 130 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="skill" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v, n, p) => [`${v} jobs`, p.payload.category || 'Skill']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {trending.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No skill data yet.</p>
          )}
        </div>

        {/* Job Categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Job Categories</h2>
          <div className="space-y-3">
            {categories.map((cat, i) => (
              <div key={cat.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 truncate mr-2">{cat.category}</span>
                  <span className="text-gray-400 shrink-0">{cat.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full"
                    style={{ width: `${(cat.count / (categories[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Curriculum Overview */}
      {curriculumOverview && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-amber-500" /> Curriculum Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{curriculumOverview.total_courses ?? 0}</p>
              <p className="text-sm text-amber-600 mt-1">Total Courses</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{curriculumOverview.average_relevance != null ? `${Math.round(curriculumOverview.average_relevance)}%` : 'N/A'}</p>
              <p className="text-sm text-green-600 mt-1">Avg Relevance</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{curriculumOverview.courses_needing_review ?? 0}</p>
              <p className="text-sm text-red-600 mt-1">Need Review</p>
            </div>
          </div>
          {curriculumOverview.courses && curriculumOverview.courses.length > 0 && (
            <div className="space-y-3">
              {curriculumOverview.courses.map((course) => (
                <div key={course.id || course.name} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-48 truncate shrink-0">{course.name}</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (course.relevance ?? 0) >= 70 ? 'bg-green-500' : (course.relevance ?? 0) >= 40 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(course.relevance ?? 0, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-12 text-right shrink-0">{course.relevance != null ? `${Math.round(course.relevance)}%` : 'N/A'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Emerging Skills */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" /> Emerging Skills
        </h2>
        <p className="text-sm text-gray-500 mb-4">Skills trending in recent postings vs historical data</p>
        {emerging.length > 0 ? (
          <div className="space-y-3">
            {emerging.map((skill) => (
              <div key={skill.skill} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium text-gray-900">{skill.skill}</span>
                  {skill.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 shrink-0">{skill.category}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {skill.adzuna_count != null && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Adzuna: {skill.adzuna_count}</span>
                  )}
                  {skill.naukri_count != null && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Naukri: {skill.naukri_count}</span>
                  )}
                  {skill.emergence_ratio != null && (
                    <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">{skill.emergence_ratio}x</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No significant emerging skills detected</p>
        )}
      </div>

      {/* Recent Jobs Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Job Postings</h2>
          <Link to="/recent-jobs" className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {recentJobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 text-sm truncate">{job.title}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span className="text-indigo-600 font-medium">{job.company}</span>
                  {job.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{job.location}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {job.posted_date && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{new Date(job.posted_date).toLocaleDateString()}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  job.source === 'adzuna' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                }`}>{job.source}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/courses"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-sm transition-all"
        >
          <GraduationCap className="w-8 h-8 text-indigo-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Analyze a Course</h3>
          <p className="text-sm text-gray-500 mt-1">Compare curriculum against employer demand and find skill gaps</p>
        </Link>
        <Link
          to="/companies"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-sm transition-all"
        >
          <Building2 className="w-8 h-8 text-indigo-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Explore Company Requirements</h3>
          <p className="text-sm text-gray-500 mt-1">See what specific employers expect for each role</p>
        </Link>
      </div>
    </div>
  )
}
