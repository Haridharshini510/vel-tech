import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  ArrowLeft, CheckCircle2, XCircle, Search, AlertTriangle, MapPin,
  BookOpen, Target, TrendingUp, ChevronLeft, ChevronRight, GraduationCap,
  RefreshCw, Clock, BookMarked, Rocket, ExternalLink, Sparkles,
} from 'lucide-react'
import { getCourse, getCourseAnalysis, getSkillPostings, generateRoadmap } from '../lib/api'

function RelevanceGauge({ score }) {
  const radius = 50
  const circumference = Math.PI * radius
  const filled = score != null ? (score / 100) * circumference : 0
  const color = score >= 50 ? '#16a34a' : score >= 25 ? '#d97706' : '#dc2626'

  return (
    <div className="relative w-[120px] h-[68px] overflow-hidden">
      <svg width={120} height={68} viewBox="0 0 120 68">
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none" stroke="#f3f4f6" strokeWidth={6} strokeLinecap="round"
        />
        {score != null && (
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            className="transition-all duration-700"
          />
        )}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 text-center">
        {score != null ? (
          <>
            <span className="text-2xl font-bold" style={{ color }}>{Math.round(score)}%</span>
            <p className="text-[10px] text-gray-400 -mt-0.5">Market Relevance</p>
          </>
        ) : (
          <span className="text-sm text-gray-400">Not analyzed</span>
        )}
      </div>
    </div>
  )
}

export default function CourseDetail() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('comparison')

  const [selectedSkill, setSelectedSkill] = useState(null)
  const [evidence, setEvidence] = useState(null)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidencePage, setEvidencePage] = useState(1)

  const [roadmap, setRoadmap] = useState(null)
  const [roadmapLoading, setRoadmapLoading] = useState(false)
  const [roadmapSection, setRoadmapSection] = useState('modules')

  useEffect(() => {
    Promise.all([getCourse(id), getCourseAnalysis(id)])
      .then(([c, a]) => { setCourse(c); setAnalysis(a) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const loadEvidence = (skillName, page = 1) => {
    setSelectedSkill(skillName)
    setActiveTab('evidence')
    setEvidencePage(page)
    setEvidenceLoading(true)
    getSkillPostings(skillName, page)
      .then(setEvidence)
      .catch(console.error)
      .finally(() => setEvidenceLoading(false))
  }

  const handleGenerateRoadmap = async (regenerate = false) => {
    setRoadmapLoading(true)
    try {
      const result = await generateRoadmap(id, null, null, regenerate)
      setRoadmap(result)
    } catch (e) {
      console.error(e)
    } finally {
      setRoadmapLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!course) return <p>Course not found.</p>

  const tabs = [
    { key: 'comparison', label: 'Curriculum vs Demand', icon: BookOpen },
    { key: 'gaps', label: `Skill Gaps${analysis?.skill_gaps?.length ? ` (${analysis.skill_gaps.length})` : ''}`, icon: Target },
    { key: 'evidence', label: 'Evidence', icon: Search },
    { key: 'roadmap', label: 'Training Roadmap', icon: GraduationCap },
  ]

  const gapChartData = analysis?.skill_gaps?.slice(0, 15).map(g => ({
    skill: g.skill_name,
    count: g.posting_count || g.demand_frequency || 0,
    priority: g.priority,
  })) || []

  const gapBarColor = (priority) => {
    if (priority === 'high') return '#dc2626'
    if (priority === 'medium') return '#d97706'
    return '#6b7280'
  }

  return (
    <div>
      <Link to="/courses" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to courses
      </Link>

      {/* Header with gauge and stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{course.institution_type} &middot; {course.duration}</p>
          </div>
          <RelevanceGauge score={analysis?.relevance_score} />
        </div>

        {analysis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
            <div>
              <p className="text-2xl font-bold text-gray-900">{analysis.curriculum_skills.length}</p>
              <p className="text-xs text-gray-500">Curriculum Skills</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{analysis.covered_skills.length}</p>
              <p className="text-xs text-gray-500">In-Demand & Covered</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{analysis.skill_gaps.length}</p>
              <p className="text-xs text-gray-500">Skill Gaps</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{analysis.low_demand_skills.length}</p>
              <p className="text-xs text-gray-500">Low Market Demand</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          )
        })}
      </div>

      {/* Tab: Curriculum vs Demand */}
      {activeTab === 'comparison' && analysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Curriculum skills */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Current Curriculum</h3>
                  <p className="text-xs text-gray-500">{analysis.curriculum_skills.length} skills taught</p>
                </div>
                <BookOpen className="w-5 h-5 text-gray-300" />
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.curriculum_skills.map((skill) => {
                  const isCovered = analysis.covered_skills.some(s => s.toLowerCase() === skill.toLowerCase())
                  return (
                    <span
                      key={skill}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${
                        isCovered
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {isCovered && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {skill}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Demanded skills */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Employer Demanded Skills</h3>
                  <p className="text-xs text-gray-500">Top skills across job postings</p>
                </div>
                <TrendingUp className="w-5 h-5 text-gray-300" />
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.demanded_skills.slice(0, 25).map(({ skill, count }) => {
                  const isCovered = analysis.covered_skills.some(s => s.toLowerCase() === skill.toLowerCase())
                  return (
                    <button
                      key={skill}
                      onClick={() => !isCovered && loadEvidence(skill)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        isCovered
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 cursor-pointer'
                      }`}
                    >
                      {isCovered ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {skill}
                      <span className="text-xs opacity-60">({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {analysis.low_demand_skills?.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Low Market Demand
              </h3>
              <p className="text-xs text-amber-700 mb-3">These curriculum skills have low representation in current job postings</p>
              <div className="flex flex-wrap gap-2">
                {analysis.low_demand_skills.map(skill => (
                  <span key={skill} className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-full">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Skill Gaps */}
      {activeTab === 'gaps' && analysis && (
        <div className="space-y-6">
          {/* Gap chart */}
          {gapChartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Skill Gap Demand (Top 15)</h3>
              <ResponsiveContainer width="100%" height={Math.max(300, gapChartData.length * 32)}>
                <BarChart data={gapChartData} layout="vertical" margin={{ left: 140 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="skill" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v} postings`, 'Demand']} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {gapChartData.map((entry, i) => (
                      <Cell key={i} fill={gapBarColor(entry.priority)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gap list */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Skills Missing from Curriculum</h3>
            {analysis.skill_gaps.length === 0 ? (
              <p className="text-gray-400 text-sm">No significant skill gaps found.</p>
            ) : (
              <div className="space-y-2">
                {analysis.skill_gaps.map((gap) => {
                  const maxDemand = analysis.skill_gaps[0]?.demand_frequency || 1
                  const barWidth = ((gap.demand_frequency || gap.posting_count || 0) / maxDemand) * 100
                  return (
                    <button
                      key={gap.id}
                      onClick={() => loadEvidence(gap.skill_name)}
                      className="w-full flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">{gap.skill_name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                            gap.priority === 'high'   ? 'bg-red-50 text-red-700' :
                            gap.priority === 'medium' ? 'bg-amber-50 text-amber-700' :
                                                        'bg-gray-100 text-gray-600'
                          }`}>{gap.priority}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              gap.priority === 'high' ? 'bg-red-400' :
                              gap.priority === 'medium' ? 'bg-amber-400' : 'bg-gray-400'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {gap.posting_count || gap.demand_frequency || 0} job postings demand this skill
                          {gap.category && <span className="ml-2 text-gray-400">({gap.category})</span>}
                        </p>
                      </div>
                      <Search className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Evidence */}
      {activeTab === 'evidence' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {!selectedSkill ? (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Select a skill gap to see evidence</p>
              <p className="text-gray-400 text-sm mt-1">Click any red skill tag or gap item to trace it to real job postings</p>
            </div>
          ) : evidenceLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : evidence ? (
            <div>
              {/* Evidence header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedSkill}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {evidence.category && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{evidence.category}</span>
                    )}
                    {evidence.sources?.map(s => (
                      <span key={s.source} className={`text-xs px-2 py-0.5 rounded-full ${
                        s.source === 'adzuna' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                      }`}>{s.source}: {s.count}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{evidence.total_postings}</p>
                  <p className="text-xs text-gray-500">job postings</p>
                </div>
              </div>

              {/* Companies and roles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Top Companies</p>
                  <div className="space-y-2">
                    {evidence.companies.slice(0, 10).map((c) => (
                      <div key={c.name} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 truncate mr-2">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-400 rounded-full"
                              style={{ width: `${(c.count / (evidence.companies[0]?.count || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-6 text-right">{c.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Top Roles</p>
                  <div className="space-y-2">
                    {evidence.roles.slice(0, 10).map((r) => (
                      <div key={r.title} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 truncate mr-2">{r.title}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-400 rounded-full"
                              style={{ width: `${(r.count / (evidence.roles[0]?.count || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-6 text-right">{r.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Job postings */}
              <h4 className="font-medium text-gray-900 mb-3">Sample Job Postings</h4>
              <div className="space-y-3">
                {evidence.jobs.map((job) => (
                  <div key={job.id} className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{job.title}</p>
                        <p className="text-sm text-indigo-600">{job.company}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          {job.location && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                          )}
                          {job.posted_date && <span>{new Date(job.posted_date).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        job.source === 'adzuna' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                      }`}>{job.source}</span>
                    </div>
                    {job.normalized_skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {job.normalized_skills.slice(0, 10).map(s => (
                          <span key={s} className={`text-xs px-2 py-0.5 rounded-full ${
                            s.toLowerCase() === selectedSkill.toLowerCase()
                              ? 'bg-indigo-100 text-indigo-700 font-medium'
                              : 'bg-gray-100 text-gray-500'
                          }`}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Evidence pagination */}
              {evidence.pages > 1 && (
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Page {evidencePage} of {evidence.pages} ({evidence.total_postings} postings)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadEvidence(selectedSkill, evidencePage - 1)}
                      disabled={evidencePage <= 1}
                      className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => loadEvidence(selectedSkill, evidencePage + 1)}
                      disabled={evidencePage >= evidence.pages}
                      className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Tab: Roadmap */}
      {activeTab === 'roadmap' && (
        <div>
          {!roadmap && !roadmapLoading && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Sparkles className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
              <p className="text-gray-700 font-semibold mb-1">Generate Training Roadmap</p>
              <p className="text-gray-400 text-sm mb-5">
                AI-powered roadmap addressing {analysis?.skill_gaps?.length || 0} verified skill gaps with modules, timeline, resources, and capstone projects
              </p>
              <button
                onClick={() => handleGenerateRoadmap(false)}
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Generate Training Roadmap
              </button>
            </div>
          )}

          {roadmapLoading && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
              <p className="text-gray-700 font-medium">Generating your training roadmap...</p>
              <p className="text-gray-400 text-sm mt-1">Analyzing skill gaps and building a structured learning path</p>
            </div>
          )}

          {roadmap && !roadmapLoading && (
            <div className="space-y-6">
              {/* Roadmap header */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Training Roadmap</h3>
                    {roadmap.summary && <p className="text-sm text-gray-500 mt-1">{roadmap.summary}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                        {roadmap.modules?.length || 0} modules
                      </span>
                      <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                        {roadmap.timeline?.length || 0} weeks
                      </span>
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                        {roadmap.capstone_projects?.length || 0} projects
                      </span>
                      {roadmap.source && (
                        <span className="text-xs text-gray-400">
                          Generated via {roadmap.source === 'llm' ? 'AI' : 'template engine'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerateRoadmap(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </button>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-2">
                {[
                  { key: 'modules', label: 'Modules', icon: BookOpen },
                  { key: 'timeline', label: 'Timeline', icon: Clock },
                  { key: 'resources', label: 'Resources', icon: BookMarked },
                  { key: 'projects', label: 'Capstone Projects', icon: Rocket },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setRoadmapSection(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      roadmapSection === key
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>

              {/* Modules */}
              {roadmapSection === 'modules' && roadmap.modules?.length > 0 && (
                <div className="space-y-4">
                  {roadmap.modules.map((mod, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-indigo-600">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{mod.title}</h4>
                            {mod.duration_weeks && (
                              <span className="text-xs text-gray-400">{mod.duration_weeks} weeks</span>
                            )}
                          </div>
                          {mod.description && <p className="text-sm text-gray-500 mt-1">{mod.description}</p>}
                          {mod.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {mod.skills.map(s => (
                                <span key={s} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{s}</span>
                              ))}
                            </div>
                          )}
                          {mod.topics?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Topics:</p>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                {mod.topics.map((t, j) => (
                                  <li key={j} className="text-xs text-gray-600 flex items-center gap-1">
                                    <span className="w-1 h-1 bg-indigo-400 rounded-full shrink-0" /> {t}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {mod.learning_outcomes?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Learning Outcomes:</p>
                              <ul className="space-y-1">
                                {mod.learning_outcomes.map((o, j) => (
                                  <li key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" /> {o}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline */}
              {roadmapSection === 'timeline' && roadmap.timeline?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                    <div className="space-y-6">
                      {roadmap.timeline.map((week, i) => (
                        <div key={i} className="relative flex gap-4">
                          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shrink-0 z-10">
                            <span className="text-xs font-bold text-white">W{week.week}</span>
                          </div>
                          <div className="flex-1 pb-1">
                            <p className="font-medium text-gray-900 text-sm">{week.module}</p>
                            {week.activities?.length > 0 && (
                              <ul className="mt-1 space-y-0.5">
                                {week.activities.map((a, j) => (
                                  <li key={j} className="text-xs text-gray-500 flex items-center gap-1.5">
                                    <span className="w-1 h-1 bg-gray-400 rounded-full shrink-0" /> {a}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {week.milestone && (
                              <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
                                <Target className="w-3 h-3" /> {week.milestone}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Resources */}
              {roadmapSection === 'resources' && roadmap.resources?.length > 0 && (
                <div className="space-y-4">
                  {roadmap.resources.map((group, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                      <h4 className="font-semibold text-gray-900 mb-3">{group.module}</h4>
                      <div className="space-y-2">
                        {group.items?.map((item, j) => (
                          <div key={j} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              <BookMarked className="w-4 h-4 text-gray-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm text-gray-900 truncate">{item.title}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{item.type}</span>
                                  {item.platform && <span>&middot; {item.platform}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {item.free && (
                                <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Free</span>
                              )}
                              {item.url && (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Capstone Projects */}
              {roadmapSection === 'projects' && roadmap.capstone_projects?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roadmap.capstone_projects.map((project, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                          <Rocket className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900">{project.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              project.difficulty === 'advanced' ? 'bg-red-50 text-red-600' :
                              project.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600' :
                              'bg-green-50 text-green-600'
                            }`}>{project.difficulty}</span>
                            {project.duration_weeks && (
                              <span className="text-xs text-gray-400">{project.duration_weeks} weeks</span>
                            )}
                          </div>
                          {project.skills_covered?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {project.skills_covered.map(s => (
                                <span key={s} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Skills addressed */}
              {roadmap.skill_gaps_addressed?.length > 0 && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Skill Gaps Addressed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {roadmap.skill_gaps_addressed.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 bg-white text-gray-700 rounded-full border border-gray-200">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
