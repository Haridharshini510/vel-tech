import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, ArrowRight, ArrowUpDown } from 'lucide-react'
import { getCourses } from '../lib/api'

function RelevanceRing({ score, size = 64 }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const filled = score != null ? (score / 100) * circumference : 0
  const color = score >= 50 ? '#16a34a' : score >= 25 ? '#d97706' : '#dc2626'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#f3f4f6" strokeWidth={4}
        />
        {score != null && (
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={4}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {score != null ? (
          <span className="text-sm font-bold" style={{ color }}>{Math.round(score)}%</span>
        ) : (
          <span className="text-[10px] text-gray-400">N/A</span>
        )}
      </div>
    </div>
  )
}

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => {
    getCourses()
      .then(setCourses)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...courses].sort((a, b) => {
    const sa = a.relevance_score ?? -1
    const sb = b.relevance_score ?? -1
    return sortAsc ? sa - sb : sb - sa
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Analysis</h1>
          <p className="text-gray-500 mt-1">Select a course to analyze its alignment with employer demand</p>
        </div>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          {sortAsc ? 'Lowest first' : 'Highest first'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sorted.map((course) => {
          const score = course.relevance_score
          const skillCount = course.normalized_skills?.length || course.skills?.length || 0

          return (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="flex items-center gap-5 bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
            >
              <RelevanceRing score={score} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{course.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{course.institution_type} &middot; {course.duration}</p>
                <div className="flex items-center gap-4 mt-2">
                  {skillCount > 0 && (
                    <span className="text-xs text-gray-400">{skillCount} curriculum skills</span>
                  )}
                  {score != null && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      score >= 50 ? 'bg-green-50 text-green-700' :
                      score >= 25 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {score >= 50 ? 'Good alignment' : score >= 25 ? 'Moderate gaps' : 'Significant gaps'}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
