import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Heart, Briefcase, Brain, Tractor, HeartPulse,
  TrendingUp, AlertTriangle, Users, Eye, Search,
  MapPin, ArrowRight, Sparkles, Layers,
} from 'lucide-react'
import staticDistricts, { LAYERS, getSeverity, getOverallScore } from '../data/maharashtraDistricts'
import { getMaharashtraDistricts } from '../lib/api'

const ICON_MAP = { GraduationCap, Heart, Briefcase, Brain, Tractor, HeartPulse }

function getHeatColor(score) {
  if (score < 25) return '#10b981'
  if (score < 50) return '#f59e0b'
  if (score < 70) return '#f97316'
  return '#ef4444'
}

function getHeatBg(score) {
  if (score < 25) return 'bg-emerald-50'
  if (score < 50) return 'bg-amber-50'
  if (score < 70) return 'bg-orange-50'
  return 'bg-red-50'
}

function AnimatedCounter({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const startTime = performance.now()
    function tick(now) {
      const p = Math.min((now - startTime) / duration, 1)
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) ref.current = requestAnimationFrame(tick)
    }
    ref.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(ref.current)
  }, [value, duration])
  return <span>{display}</span>
}

const TILE_W = 88
const TILE_H = 72
const GAP = 2

function tilePos(grid) {
  const [col, row] = grid
  const offsetX = row % 2 === 1 ? TILE_W / 2 : 0
  return {
    x: col * TILE_W + offsetX,
    y: row * (TILE_H * 0.82),
  }
}

function computeViewBox(items) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const d of items) {
    const { x, y } = tilePos(d.grid)
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x + TILE_W > maxX) maxX = x + TILE_W
    if (y + TILE_H > maxY) maxY = y + TILE_H
  }
  const pad = 12
  return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`
}

function HexTile({ district, score, isHovered, onClick, onHover, index }) {
  const severity = getSeverity(score)
  const { x, y } = tilePos(district.grid)

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.015, duration: 0.35, type: 'spring', stiffness: 220 }}
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={() => onHover(district.id)}
      onMouseLeave={() => onHover(null)}
    >
      <motion.rect
        x={x + GAP} y={y + GAP}
        width={TILE_W - GAP * 2} height={TILE_H - GAP * 2}
        rx={10}
        fill={isHovered ? getHeatColor(score) : '#ffffff'}
        stroke={getHeatColor(score)}
        strokeWidth={isHovered ? 2.5 : 1.5}
        animate={{ scale: isHovered ? 1.05 : 1 }}
        transition={{ duration: 0.15 }}
        style={{ transformOrigin: `${x + TILE_W / 2}px ${y + TILE_H / 2}px` }}
      />
      <text
        x={x + TILE_W / 2} y={y + 22}
        textAnchor="middle"
        fill={isHovered ? '#fff' : '#374151'}
        fontSize="9.5" fontWeight="600" fontFamily="Inter, system-ui, sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {district.name.length > 14 ? district.name.slice(0, 13) + '…' : district.name}
      </text>
      <text
        x={x + TILE_W / 2} y={y + 42}
        textAnchor="middle"
        fill={isHovered ? '#fff' : getHeatColor(score)}
        fontSize="18" fontWeight="800" fontFamily="Inter, system-ui, sans-serif"
        style={{ pointerEvents: 'none' }}
      >
        {score}
      </text>
      <text
        x={x + TILE_W / 2} y={y + 57}
        textAnchor="middle"
        fill={isHovered ? 'rgba(255,255,255,0.85)' : '#9ca3af'}
        fontSize="7.5" fontWeight="600" fontFamily="Inter, system-ui, sans-serif"
        letterSpacing="0.8"
        style={{ pointerEvents: 'none' }}
      >
        {severity.label}
      </text>
    </motion.g>
  )
}

function LayerButton({ layer, isActive, onClick }) {
  const Icon = ICON_MAP[layer.icon] || Brain
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
        isActive
          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {layer.label}
    </button>
  )
}

function DistrictTooltip({ district, activeLayer, position }) {
  if (!district) return null
  const indicators = district.indicators
  const layerData = indicators[activeLayer]
  const severity = getSeverity(layerData.score)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="absolute z-50 pointer-events-none"
      style={{ left: position.x + 16, top: position.y - 8 }}
    >
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 min-w-[240px] shadow-xl">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-gray-900 font-bold text-sm">{district.name}</h3>
          <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{district.region}</span>
        </div>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="text-xl font-extrabold" style={{ color: severity.color }}>{layerData.score}</div>
          <div>
            <div className="text-[10px] font-semibold" style={{ color: severity.color }}>{severity.label}</div>
            <div className="text-[10px] text-gray-400">{LAYERS.find(l => l.key === activeLayer)?.label} Risk</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-gray-100">
          {Object.entries(indicators).map(([key, val]) => (
            <div key={key} className="text-center">
              <div className="text-[11px] font-bold" style={{ color: getHeatColor(val.score) }}>{val.score}</div>
              <div className="text-[8px] text-gray-400 capitalize">{key.slice(0, 5)}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
          <Eye className="w-3 h-3" /> Click to view profile
        </div>
      </div>
    </motion.div>
  )
}

function RegionSummary({ region, districtsList, activeLayer, navigate, setHoveredDistrict }) {
  const scores = districtsList.map(d => d.indicators[activeLayer].score)
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const worst = districtsList.reduce((a, b) =>
    b.indicators[activeLayer].score > a.indicators[activeLayer].score ? b : a
  )
  const severity = getSeverity(avg)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-gray-900 text-xs font-semibold">{region}</h4>
        <span className="text-xs font-bold" style={{ color: severity.color }}>{avg}</span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2">
        <span>{districtsList.length} districts</span>
        <span>·</span>
        <span>Worst: <span className="text-gray-600 font-medium">{worst.name}</span></span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${avg}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: severity.color }}
        />
      </div>
    </div>
  )
}

export default function MaharashtraMap() {
  const [districts, setDistricts] = useState(staticDistricts)
  const [loading, setLoading] = useState(true)
  const [activeLayer, setActiveLayer] = useState('education')
  const [hoveredDistrict, setHoveredDistrict] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const mapRef = useRef(null)

  useEffect(() => {
    getMaharashtraDistricts()
      .then(data => { if (data?.length) setDistricts(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sortedDistricts = useMemo(() => {
    return [...districts].sort((a, b) =>
      b.indicators[activeLayer].score - a.indicators[activeLayer].score
    )
  }, [activeLayer, districts])

  const filteredDistricts = useMemo(() => {
    if (!searchQuery) return districts
    const q = searchQuery.toLowerCase()
    return districts.filter(d =>
      d.name.toLowerCase().includes(q) || d.region.toLowerCase().includes(q)
    )
  }, [searchQuery, districts])

  const regions = useMemo(() => {
    const map = {}
    districts.forEach(d => {
      if (!map[d.region]) map[d.region] = []
      map[d.region].push(d)
    })
    return map
  }, [districts])

  const hoveredDistrictData = districts.find(d => d.id === hoveredDistrict)

  const handleMouseMove = (e) => {
    if (mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect()
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }

  const viewBox = useMemo(() => computeViewBox(filteredDistricts.length ? filteredDistricts : districts), [filteredDistricts])

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-600 tracking-wider uppercase">Live Intelligence</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Maharashtra Youth Intelligence Map</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            36 districts · 6 layers · evidence-backed interventions
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LAYERS.map(layer => (
            <LayerButton key={layer.key} layer={layer} isActive={activeLayer === layer.key} onClick={() => setActiveLayer(layer.key)} />
          ))}
        </div>
      </div>

      {/* Stats row — compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        {(() => {
          const scores = districts.map(d => d.indicators[activeLayer].score)
          const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          const critical = scores.filter(s => s >= 70).length
          const totalYouth = districts.reduce((sum, d) => sum + d.population.youth, 0)
          const atRisk = districts.filter(d => d.indicators[activeLayer].score >= 50).reduce((sum, d) => sum + d.population.youth, 0)
          return [
            { label: 'State Avg', value: avg, suffix: '/100', color: getHeatColor(avg), icon: TrendingUp, bg: getHeatBg(avg) },
            { label: 'Critical', value: critical, suffix: '/36', color: '#ef4444', icon: AlertTriangle, bg: 'bg-red-50' },
            { label: 'Total Youth', value: Math.round(totalYouth / 100000), suffix: 'L', color: '#6366f1', icon: Users, bg: 'bg-indigo-50' },
            { label: 'At-Risk', value: Math.round(atRisk / 100000), suffix: 'L', color: '#f97316', icon: AlertTriangle, bg: 'bg-orange-50' },
          ]
        })().map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">{s.label}</p>
              <p className="text-base sm:text-xl font-bold text-gray-900"><AnimatedCounter value={s.value} /><span className="text-xs sm:text-sm text-gray-400 font-normal ml-0.5">{s.suffix}</span></p>
            </div>
            <div className={`p-1.5 sm:p-2 rounded-lg ${s.bg}`}>
              <s.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: s.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Main grid — map left, sidebar right */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
        {/* Map card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden relative"
          ref={mapRef}
          onMouseMove={handleMouseMove}
        >
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-sm text-gray-700 font-medium">
                {LAYERS.find(l => l.key === activeLayer)?.label}
              </span>
              <span className="text-xs text-gray-400">
                — {LAYERS.find(l => l.key === activeLayer)?.description}
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-2.5 text-[10px] text-gray-500">
              {[
                { color: 'bg-emerald-500', label: 'Low' },
                { color: 'bg-amber-500', label: 'Moderate' },
                { color: 'bg-orange-500', label: 'High' },
                { color: 'bg-red-500', label: 'Very High' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-sm ${l.color}`} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50/60 p-2">
            <svg
              viewBox={viewBox}
              className="w-full h-auto"
              style={{ maxHeight: '520px' }}
              preserveAspectRatio="xMidYMid meet"
            >
              {filteredDistricts.map((district, i) => (
                <HexTile
                  key={district.id}
                  district={district}
                  score={district.indicators[activeLayer].score}
                  isHovered={hoveredDistrict === district.id}
                  onClick={() => navigate(`/maharashtra/${district.id}`)}
                  onHover={setHoveredDistrict}
                  index={i}
                />
              ))}
            </svg>
          </div>

          <AnimatePresence>
            {hoveredDistrictData && (
              <DistrictTooltip district={hoveredDistrictData} activeLayer={activeLayer} position={mousePos} />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search districts…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
            />
          </div>

          {/* Regions */}
          <div>
            <h3 className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Regions</h3>
            <div className="space-y-1.5">
              {Object.entries(regions).map(([region, dists]) => (
                <RegionSummary key={region} region={region} districtsList={dists} activeLayer={activeLayer} navigate={navigate} setHoveredDistrict={setHoveredDistrict} />
              ))}
            </div>
          </div>

          {/* Critical Districts */}
          <div>
            <h3 className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              Critical Districts
            </h3>
            <div className="space-y-1">
              {sortedDistricts.slice(0, 8).map((district, i) => {
                const score = district.indicators[activeLayer].score
                const severity = getSeverity(score)
                return (
                  <button
                    key={district.id}
                    onClick={() => navigate(`/maharashtra/${district.id}`)}
                    onMouseEnter={() => setHoveredDistrict(district.id)}
                    onMouseLeave={() => setHoveredDistrict(null)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg transition-all group text-left"
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: `${severity.color}15`, color: severity.color }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-900 font-medium truncate">{district.name}</div>
                      <div className="text-[10px] text-gray-400">{district.region}</div>
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color: severity.color }}>{score}</span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-indigo-700 mb-0.5">SEE → UNDERSTAND → ACT</p>
                <p className="text-[11px] text-indigo-600/70 leading-relaxed">
                  Click any district for evidence-backed analysis, prioritized interventions & a "What-If" simulator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
