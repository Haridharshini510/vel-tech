import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, GraduationCap, Heart, Briefcase, Brain, Tractor, HeartPulse,
  ChevronRight, TrendingDown, Users, MapPin,
  AlertTriangle, Zap, Target, Sparkles, FileText,
  ArrowRight, Shield, Eye, Lightbulb, Play, RotateCcw,
} from 'lucide-react'
import staticDistricts, { getSeverity, getOverallScore } from '../data/maharashtraDistricts'
import { getDistrictProfile } from '../lib/api'

const DOMAIN_ICONS = {
  Education: GraduationCap, Skills: Brain, Employment: Briefcase,
  Girls: Heart, Health: HeartPulse, Livelihood: Tractor,
}

const DOMAIN_COLORS = {
  Education: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', bar: 'bg-blue-500', light: 'text-blue-600' },
  Skills: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', bar: 'bg-purple-500', light: 'text-purple-600' },
  Employment: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500', light: 'text-amber-600' },
  Girls: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', bar: 'bg-pink-500', light: 'text-pink-600' },
  Health: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500', light: 'text-emerald-600' },
  Livelihood: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', bar: 'bg-orange-500', light: 'text-orange-600' },
}

function getHeatColor(score) {
  if (score < 25) return '#10b981'
  if (score < 50) return '#f59e0b'
  if (score < 70) return '#f97316'
  return '#ef4444'
}

function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const start = display
    const startTime = performance.now()
    function tick(now) {
      const p = Math.min((now - startTime) / duration, 1)
      setDisplay(Math.round(start + (value - start) * (1 - Math.pow(1 - p, 3))))
      if (p < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(ref.current)
  }, [value, duration])
  return <span>{display}</span>
}

function ScoreRing({ score, size = 120, strokeWidth = 8, label }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = getHeatColor(score)
  const severity = getSeverity(score)

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900"><AnimatedNumber value={score} duration={1200} /></span>
          <span className="text-[9px] font-semibold tracking-wider" style={{ color }}>{severity.label}</span>
        </div>
      </div>
      {label && <span className="text-xs text-gray-500 mt-2">{label}</span>}
    </div>
  )
}

function IndicatorCard({ name, data, icon: Icon, delay = 0 }) {
  const score = data.score
  const color = getHeatColor(score)
  const severity = getSeverity(score)
  const details = Object.entries(data).filter(([k]) => k !== 'score')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-sm font-semibold text-gray-900 capitalize">{name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold" style={{ color }}>{score}</span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ color, backgroundColor: `${color}12` }}>{severity.label}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: delay + 0.2 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {details.map(([key, val]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span className="text-xs font-semibold text-gray-700">
              {typeof val === 'number' ? val.toLocaleString() + (key.includes('Rate') || key.includes('Index') || key.includes('Dependence') ? '%' : '') : val}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function EvidenceChain({ chain }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
      className="bg-white border border-gray-200 rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-amber-50">
          <Eye className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-gray-900 font-bold text-lg">Why?</h3>
          <p className="text-gray-500 text-xs">Evidence-backed causal chain</p>
        </div>
      </div>

      <div className="relative">
        {chain.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.12 }}
            className="flex items-start gap-4 mb-1"
          >
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                i === chain.length - 1
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}>
                {i + 1}
              </div>
              {step.arrow && (
                <div className="w-px h-6 bg-gradient-to-b from-gray-300 to-transparent my-1" />
              )}
            </div>
            <div className={`pt-2.5 pb-3 ${i === chain.length - 1 ? 'text-red-700 font-semibold' : 'text-gray-700'}`}>
              <p className="text-sm leading-snug">{step.factor}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-400">
        <Shield className="w-3 h-3" />
        Sources: UDISE+, NFHS-5, Census 2011, Maharashtra Economic Survey, MSSDS
      </div>
    </motion.div>
  )
}

function InterventionCard({ intervention, index, isSimulating, onSimulate }) {
  const colors = DOMAIN_COLORS[intervention.domain] || DOMAIN_COLORS.Education
  const Icon = DOMAIN_ICONS[intervention.domain] || Lightbulb

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.08 }}
      className={`bg-white border rounded-xl p-5 hover:shadow-md transition-all ${
        isSimulating ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colors.bg} shrink-0`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {intervention.domain}
            </span>
            <span className="text-xs text-gray-400">Priority</span>
            <span className="text-sm font-bold" style={{ color: getHeatColor(100 - intervention.priority) }}>
              {intervention.priority}
            </span>
          </div>
          <p className="text-sm text-gray-900 font-medium mb-3">{intervention.action}</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] text-gray-400">Impact</p>
              <p className={`text-xs font-semibold capitalize ${intervention.impact === 'high' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {intervention.impact}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Youth Reach</p>
              <p className="text-xs font-semibold text-gray-700">{intervention.reach?.toLocaleString()}/yr</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400">Feasibility</p>
              <div className="flex items-center gap-1">
                <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${intervention.feasibility}%` }} />
                </div>
                <span className="text-[11px] text-gray-500">{intervention.feasibility}%</span>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => onSimulate(intervention)}
          className="shrink-0 p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          title="Simulate impact"
        >
          <Play className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="text-gray-400">Priority = Severity × Reach × Impact × Feasibility</span>
          <span className="font-bold text-gray-600">{intervention.priority}/100</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${intervention.priority}%` }}
            transition={{ duration: 0.8, delay: 0.5 + index * 0.08 }}
            className={`h-full rounded-full ${colors.bar}`}
          />
        </div>
      </div>
    </motion.div>
  )
}

function WhatIfSimulator({ district, simulatingIntervention, onReset }) {
  const [sliderValue, setSliderValue] = useState(50)
  const indicators = district.indicators
  const overall = getOverallScore(indicators)

  const intervention = simulatingIntervention
  if (!intervention) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="bg-white border border-gray-200 rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-indigo-50"><Sparkles className="w-5 h-5 text-indigo-600" /></div>
          <div>
            <h3 className="text-gray-900 font-bold text-lg">What If?</h3>
            <p className="text-gray-500 text-xs">Simulate intervention impact</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          <div className="text-center">
            <Play className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>Click the play button on any intervention to simulate its impact</p>
          </div>
        </div>
      </motion.div>
    )
  }

  const domainMap = {
    Education: 'education', Skills: 'skills', Employment: 'employment',
    Girls: 'social', Health: 'health', Livelihood: 'livelihood',
  }
  const targetDomain = domainMap[intervention.domain] || 'education'
  const currentScore = indicators[targetDomain].score
  const maxReduction = currentScore * 0.35
  const reduction = (sliderValue / 100) * maxReduction
  const newScore = Math.round(currentScore - reduction)
  const newIndicators = { ...indicators, [targetDomain]: { ...indicators[targetDomain], score: newScore } }
  const newOverall = getOverallScore(newIndicators)
  const youthReach = Math.round(intervention.reach * (sliderValue / 50))
  const estimatedCost = Math.round(youthReach * 2.5)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 animate-pulse">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-gray-900 font-bold text-lg">What If?</h3>
            <p className="text-gray-500 text-xs">Simulating intervention impact</p>
          </div>
        </div>
        <button onClick={onReset} className="p-2 rounded-lg bg-white text-gray-500 hover:text-gray-700 border border-gray-200 transition-colors">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4 border border-indigo-100">
        <p className="text-xs text-indigo-600 font-medium mb-1">Simulating:</p>
        <p className="text-sm text-gray-900 font-medium">{intervention.action}</p>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">Intervention Intensity</span>
          <span className="text-xs font-bold text-indigo-600">{sliderValue}%</span>
        </div>
        <input
          type="range" min="10" max="100" value={sliderValue}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3.5 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">{intervention.domain} Risk</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: getHeatColor(currentScore) }}>{currentScore}</span>
            <ArrowRight className="w-4 h-4 text-gray-300" />
            <motion.span key={newScore} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
              className="text-xl font-bold" style={{ color: getHeatColor(newScore) }}
            >{newScore}</motion.span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-semibold">-{Math.round(reduction)} pts</span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Overall Risk</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: getHeatColor(overall) }}>{overall}</span>
            <ArrowRight className="w-4 h-4 text-gray-300" />
            <motion.span key={newOverall} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
              className="text-xl font-bold" style={{ color: getHeatColor(newOverall) }}
            >{newOverall}</motion.span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-semibold">-{overall - newOverall} pts</span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Youth Reach</p>
          <div className="text-xl font-bold text-indigo-600">+{youthReach.toLocaleString()}</div>
          <p className="text-xs text-gray-400">per year</p>
        </div>

        <div className="bg-white rounded-lg p-3.5 border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Estimated Cost</p>
          <div className="text-xl font-bold text-amber-600">{estimatedCost.toLocaleString()}L</div>
          <p className="text-xs text-gray-400">annual budget</p>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 italic flex items-center gap-1">
        <Shield className="w-3 h-3" />
        Model-based projection — not guaranteed outcomes
      </p>
    </motion.div>
  )
}

function ActionPlanGenerator({ district }) {
  const [generated, setGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => { setGenerating(false); setGenerated(true) }, 1500)
  }

  const sortedInterventions = [...district.interventions].sort((a, b) => b.priority - a.priority)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
      className="bg-white border border-gray-200 rounded-xl p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-emerald-50"><FileText className="w-5 h-5 text-emerald-600" /></div>
        <div>
          <h3 className="text-gray-900 font-bold text-lg">12-Month Development Plan</h3>
          <p className="text-gray-500 text-xs">Prioritized action plan for {district.name}</p>
        </div>
      </div>

      {!generated ? (
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={handleGenerate} disabled={generating}
          className="w-full py-4 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          {generating ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating plan...</>
          ) : (
            <><Zap className="w-4 h-4" /> Generate 12-Month Development Plan</>
          )}
        </motion.button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
            <h4 className="text-gray-900 font-bold text-sm mb-1">{district.name} — 12 Month Plan</h4>
            <p className="text-xs text-gray-400 mb-4">Youth Development & Skill Intervention Roadmap</p>
            <div className="space-y-4">
              {sortedInterventions.map((intervention, i) => {
                const colors = DOMAIN_COLORS[intervention.domain] || DOMAIN_COLORS.Education
                const months = i === 0 ? 'Month 1-3' : i === 1 ? 'Month 2-6' : i === 2 ? 'Month 4-9' : 'Month 6-12'
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${colors.bg} ${colors.text}`}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-semibold ${colors.light}`}>{intervention.domain}</span>
                        <span className="text-[11px] text-gray-400">{months}</span>
                      </div>
                      <p className="text-sm text-gray-800">{intervention.action}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Target: {intervention.reach?.toLocaleString()} youth/year · {intervention.impact} impact
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h4 className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <Target className="w-3.5 h-3.5" /> Monitoring KPIs
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Dropout Rate Reduction', target: '-15%' },
                { label: 'Skill Certification Rate', target: '+40%' },
                { label: 'Youth Employment', target: '+25%' },
                { label: 'Girls\' Retention', target: '+20%' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                  <p className="text-sm font-bold text-emerald-600">{kpi.target}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default function DistrictProfile() {
  const { districtId } = useParams()
  const navigate = useNavigate()
  const [simulatingIntervention, setSimulatingIntervention] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [district, setDistrict] = useState(() => staticDistricts.find(d => d.id === districtId) || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getDistrictProfile(districtId)
      .then(data => { if (data && !data.error) setDistrict(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [districtId])

  if (!district) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          {loading ? (
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          ) : (
            <>
              <h2 className="text-gray-900 text-xl font-bold mb-2">District not found</h2>
              <Link to="/maharashtra" className="text-indigo-600 text-sm hover:underline">Back to map</Link>
            </>
          )}
        </div>
      </div>
    )
  }

  const overall = getOverallScore(district.indicators)
  const INDICATOR_ICONS = {
    education: GraduationCap, social: Heart, employment: Briefcase,
    skills: Brain, livelihood: Tractor, health: HeartPulse,
  }
  const sortedInterventions = [...district.interventions].sort((a, b) => b.priority - a.priority)

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Eye },
    { key: 'evidence', label: 'Why?', icon: AlertTriangle },
    { key: 'interventions', label: 'What To Do?', icon: Target },
    { key: 'simulate', label: 'What If?', icon: Sparkles },
    { key: 'plan', label: 'Action Plan', icon: FileText },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 text-sm mb-6"
      >
        <button onClick={() => navigate('/maharashtra')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Maharashtra Map
        </button>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <span className="text-gray-900 font-medium">{district.name}</span>
      </motion.div>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6"
      >
        <div className="flex flex-col md:flex-row md:items-start gap-4 sm:gap-6">
          <ScoreRing score={overall} size={110} label="Overall Risk" />
          <div className="flex-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{district.name}</h1>
              <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{district.region}</span>
            </div>
            <p className="text-gray-500 text-sm mb-4">Youth Development Profile</p>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              {Object.entries(district.indicators).map(([key, data]) => {
                const color = getHeatColor(data.score)
                const severity = getSeverity(data.score)
                return (
                  <div key={key} className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold" style={{ color }}>{data.score}</p>
                    <p className="text-[9px] font-semibold tracking-wider" style={{ color }}>{severity.label}</p>
                    <p className="text-[11px] text-gray-500 capitalize mt-1">{key}</p>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {district.population.total.toLocaleString()} total pop.</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {district.population.youth.toLocaleString()} youth</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {district.region}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split('?')[0].split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(district.indicators).map(([key, data], i) => (
                <IndicatorCard key={key} name={key} data={data} icon={INDICATOR_ICONS[key]} delay={i * 0.06} />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'evidence' && (
          <motion.div key="evidence" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl">
            <EvidenceChain chain={district.evidenceChain} />
          </motion.div>
        )}

        {activeTab === 'interventions' && (
          <motion.div key="interventions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-50"><Target className="w-5 h-5 text-purple-600" /></div>
              <div>
                <h3 className="text-gray-900 font-bold text-lg">What Should We Do?</h3>
                <p className="text-gray-500 text-xs">Interventions ranked by priority score</p>
              </div>
            </div>
            <div className="space-y-3">
              {sortedInterventions.map((intervention, i) => (
                <InterventionCard key={i} intervention={intervention} index={i}
                  isSimulating={simulatingIntervention === intervention}
                  onSimulate={(int) => { setSimulatingIntervention(int); setActiveTab('simulate') }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'simulate' && (
          <motion.div key="simulate" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-xl">
            <WhatIfSimulator district={district} simulatingIntervention={simulatingIntervention} onReset={() => setSimulatingIntervention(null)} />
          </motion.div>
        )}

        {activeTab === 'plan' && (
          <motion.div key="plan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl">
            <ActionPlanGenerator district={district} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
