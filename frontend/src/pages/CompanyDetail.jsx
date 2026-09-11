import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  ArrowLeft, CheckCircle2, XCircle, MapPin, Search, Briefcase,
  BarChart3, TableProperties, Sparkles, RefreshCw, Clock, BookOpen,
  BookMarked, Rocket, Target,
} from 'lucide-react'
import {
  getCompanyRoles, getCompanyRoleSkills, compareWithCourse,
  getCourses, generateRoadmap,
} from '../lib/api'

export default function CompanyDetail() {
  const { name } = useParams()
  const companyName = decodeURIComponent(name)
  const [roles, setRoles] = useState([])
  const [roleSearch, setRoleSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState(null)
  const [roleSkills, setRoleSkills] = useState(null)
  const [loading, setLoading] = useState(true)
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillView, setSkillView] = useState('chart')

  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [comparison, setComparison] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)

  const [roadmap, setRoadmap] = useState(null)
  const [roadmapLoading, setRoadmapLoading] = useState(false)
  const [roadmapSection, setRoadmapSection] = useState('modules')

  useEffect(() => {
    Promise.all([getCompanyRoles(companyName), getCourses()])
      .then(([r, c]) => { setRoles(r); setCourses(c) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [companyName])

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
    setComparison(null)
    setSelectedCourse('')
    setRoadmap(null)
    setSkillsLoading(true)
    getCompanyRoleSkills(companyName, role)
      .then(setRoleSkills)
      .catch(console.error)
      .finally(() => setSkillsLoading(false))
  }

  const handleCompare = () => {
    if (!selectedCourse || !selectedRole) return
    setCompareLoading(true)
    setRoadmap(null)
    compareWithCourse(companyName, selectedRole, selectedCourse)
      .then(setComparison)
      .catch(console.error)
      .finally(() => setCompareLoading(false))
  }

  const handleRoadmap = async (regenerate = false) => {
    if (!selectedCourse || !selectedRole) return
    setRoadmapLoading(true)
    try {
      const result = await generateRoadmap(selectedCourse, companyName, selectedRole, regenerate)
      setRoadmap(result)
    } catch (e) { console.error(e) }
    finally { setRoadmapLoading(false) }
  }

  const totalPostings = roles.reduce((sum, r) => sum + r.count, 0)
  const filteredRoles = roles.filter(r => r.role.toLowerCase().includes(roleSearch.toLowerCase()))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div>
      <Link to="/companies" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to companies
      </Link>

      {/* Company header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
            <Briefcase className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-gray-500">{totalPostings} total postings</span>
              <span className="text-sm text-gray-500">{roles.length} unique roles</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Role sidebar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Job Roles</h3>
          {roles.length > 5 && (
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Filter roles..."
                value={roleSearch}
                onChange={e => setRoleSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}
          {filteredRoles.length === 0 ? (
            <p className="text-sm text-gray-400">No roles found.</p>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {filteredRoles.map(({ role, count }) => (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selectedRole === role
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="block truncate">{role}</span>
                  <span className="text-xs text-gray-400">{count} postings</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {!selectedRole ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Select a role to explore</p>
              <p className="text-gray-400 text-sm mt-1">See expected skills, compare with courses, and generate training roadmaps</p>
            </div>
          ) : skillsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : roleSkills ? (
            <>
              {/* Skill Profile */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedRole}</h3>
                    <p className="text-sm text-gray-500">{roleSkills.total_postings} postings analyzed &middot; {roleSkills.skills.length} skills identified</p>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setSkillView('chart')}
                      className={`p-1.5 rounded-md transition-colors ${skillView === 'chart' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSkillView('table')}
                      className={`p-1.5 rounded-md transition-colors ${skillView === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                    >
                      <TableProperties className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {roleSkills.skills.length > 0 ? (
                  skillView === 'chart' ? (
                    <ResponsiveContainer width="100%" height={Math.max(200, roleSkills.skills.length * 32)}>
                      <BarChart data={roleSkills.skills} layout="vertical" margin={{ left: 140 }}>
                        <XAxis type="number" domain={[0, 100]} unit="%" />
                        <YAxis type="category" dataKey="skill" width={130} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                          {roleSkills.skills.map((s) => (
                            <Cell
                              key={s.skill}
                              fill={comparison
                                ? comparison.matched_skills.some(m => m.skill === s.skill) ? '#22c55e' : '#ef4444'
                                : '#4f46e5'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Skill</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Frequency</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Postings</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 w-32">Demand</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roleSkills.skills.map((s) => {
                            const isMatched = comparison?.matched_skills.some(m => m.skill === s.skill)
                            const isGap = comparison && !isMatched
                            return (
                              <tr key={s.skill} className="border-b border-gray-50">
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1.5">
                                    {comparison && (
                                      isMatched
                                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                        : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                    )}
                                    <span className={isGap ? 'text-red-700' : 'text-gray-900'}>{s.skill}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right text-gray-700">{s.percentage}%</td>
                                <td className="py-2 px-3 text-right text-gray-500">{s.count}</td>
                                <td className="py-2 px-3">
                                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${isGap ? 'bg-red-400' : isMatched ? 'bg-green-400' : 'bg-indigo-400'}`}
                                      style={{ width: `${s.percentage}%` }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  <p className="text-gray-400 text-sm">No normalized skills found for this role.</p>
                )}
              </div>

              {/* Sample Jobs */}
              {roleSkills.sample_jobs?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Sample Postings</h3>
                  <div className="space-y-2">
                    {roleSkills.sample_jobs.map(job => (
                      <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                          <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                            {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                            {job.posted_date && <span>{new Date(job.posted_date).toLocaleDateString()}</span>}
                            {job.source && (
                              <span className={`px-1.5 py-0.5 rounded ${
                                job.source === 'adzuna' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                              }`}>{job.source}</span>
                            )}
                          </div>
                        </div>
                        {job.salary && <span className="text-xs text-green-600 font-medium shrink-0 ml-2">{job.salary}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Comparison */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Compare with a Course</h3>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Select course</label>
                    <select
                      value={selectedCourse}
                      onChange={e => { setSelectedCourse(e.target.value); setComparison(null); setRoadmap(null) }}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Choose a course...</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleCompare}
                    disabled={!selectedCourse || compareLoading}
                    className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {compareLoading ? 'Comparing...' : 'Compare'}
                  </button>
                </div>

                {comparison && (
                  <div className="mt-6 space-y-4">
                    {/* Coverage stat */}
                    <div className="flex items-center gap-5 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center shrink-0">
                        <p className={`text-3xl font-bold ${
                          comparison.coverage >= 60 ? 'text-green-600' :
                          comparison.coverage >= 30 ? 'text-amber-600' : 'text-red-600'
                        }`}>{comparison.coverage}%</p>
                        <p className="text-xs text-gray-500">Coverage</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all ${
                              comparison.coverage >= 60 ? 'bg-green-500' :
                              comparison.coverage >= 30 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${comparison.coverage}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600">
                          Covers <strong>{comparison.total_matched}</strong> of <strong>{comparison.total_company_skills}</strong> required skills.
                          {comparison.total_delta > 0 && (
                            <span className="text-red-600"> {comparison.total_delta} need additional training.</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Matched */}
                    {comparison.matched_skills.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Covered by Course ({comparison.matched_skills.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {comparison.matched_skills.map(s => (
                            <span key={s.skill} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {s.skill}
                              <span className="text-xs opacity-60">{s.percentage}%</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Training Delta */}
                    {comparison.training_delta.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Training Delta — Missing Skills ({comparison.training_delta.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {comparison.training_delta.map(s => (
                            <span key={s.skill} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-red-50 text-red-700 border border-red-200">
                              <XCircle className="w-3.5 h-3.5" /> {s.skill}
                              <span className="text-xs opacity-60">{s.percentage}%</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Roadmap CTA */}
                    {comparison.training_delta.length > 0 && !roadmap && !roadmapLoading && (
                      <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <Sparkles className="w-8 h-8 text-indigo-500 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-indigo-900">
                            Bridge the {comparison.total_delta} skill gap{comparison.total_delta > 1 ? 's' : ''} with a training roadmap
                          </p>
                          <p className="text-xs text-indigo-600 mt-0.5">
                            Targeted at {companyName}'s {selectedRole} requirements
                          </p>
                        </div>
                        <button
                          onClick={() => handleRoadmap(false)}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
                        >
                          Generate Roadmap
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Roadmap Loading */}
              {roadmapLoading && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium">Generating roadmap for {companyName}...</p>
                  <p className="text-gray-400 text-sm mt-1">Building a learning path for the {selectedRole} role</p>
                </div>
              )}

              {/* Roadmap Display */}
              {roadmap && !roadmapLoading && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Training Roadmap — {companyName} ({selectedRole})
                        </h3>
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
                            <span className="text-xs text-gray-400">via {roadmap.source === 'llm' ? 'AI' : 'template'}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRoadmap(true)}
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
                      { key: 'projects', label: 'Projects', icon: Rocket },
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
                  {roadmapSection === 'modules' && roadmap.modules?.map((mod, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-indigo-600">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{mod.title}</h4>
                            {mod.duration_weeks && <span className="text-xs text-gray-400">{mod.duration_weeks} wk</span>}
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
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-2">
                              {mod.topics.map((t, j) => (
                                <li key={j} className="text-xs text-gray-600 flex items-center gap-1">
                                  <span className="w-1 h-1 bg-indigo-400 rounded-full shrink-0" /> {t}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

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
                                {week.activities?.map((a, j) => (
                                  <p key={j} className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1 h-1 bg-gray-400 rounded-full shrink-0" /> {a}
                                  </p>
                                ))}
                                {week.milestone && (
                                  <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
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
                  {roadmapSection === 'resources' && roadmap.resources?.map((group, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                      <h4 className="font-semibold text-gray-900 mb-3">{group.module}</h4>
                      <div className="space-y-2">
                        {group.items?.map((item, j) => (
                          <div key={j} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              <BookMarked className="w-4 h-4 text-gray-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm text-gray-900 truncate">{item.title}</p>
                                <p className="text-xs text-gray-500">{item.type}{item.platform ? ` · ${item.platform}` : ''}</p>
                              </div>
                            </div>
                            {item.free && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full shrink-0">Free</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Projects */}
                  {roadmapSection === 'projects' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {roadmap.capstone_projects?.map((project, i) => (
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
                                {project.duration_weeks && <span className="text-xs text-gray-400">{project.duration_weeks} wk</span>}
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
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
