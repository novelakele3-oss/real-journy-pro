import { useMemo, useRef, useState, useCallback } from 'react'

function formatMoney(val) {
  const sign = val < 0 ? '-' : ''
  return `${sign}$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function EquityChart({ data, accountSize, tall }) {
  const height = tall ? 320 : 200
  const width = 600
  const pad = { top: 20, right: 20, bottom: 30, left: 70 }
  const wrapRef = useRef(null)
  const [hoverIdx, setHoverIdx] = useState(null)

  const points = useMemo(() => {
    if (!data?.length) return []
    const minE = Math.min(...data.map(d => d.equity), accountSize)
    const maxE = Math.max(...data.map(d => d.equity), accountSize)
    const range = maxE - minE || 1
    const innerW = width - pad.left - pad.right
    const innerH = height - pad.top - pad.bottom

    let peak = accountSize
    return data.map((d, i) => {
      peak = Math.max(peak, d.equity)
      const drawdownPct = peak > 0 ? ((peak - d.equity) / peak) * 100 : 0
      return {
        x: pad.left + (i / Math.max(data.length - 1, 1)) * innerW,
        y: pad.top + ((maxE - d.equity) / range) * innerH,
        equity: d.equity,
        date: d.date,
        profit: d.equity - accountSize,
        peak,
        drawdownPct,
        min: minE, max: maxE,
      }
    })
  }, [data, accountSize, height, width, pad])

  const handleMove = useCallback((e) => {
    if (!wrapRef.current || !points.length) return
    const rect = wrapRef.current.getBoundingClientRect()
    const scaleX = width / rect.width
    const mouseX = (e.clientX - rect.left) * scaleX
    let nearest = 0
    let nearestDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - mouseX)
      if (d < nearestDist) { nearestDist = d; nearest = i }
    }
    setHoverIdx(nearest)
  }, [points, width])

  const handleLeave = useCallback(() => setHoverIdx(null), [])

  if (!points.length) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No data</div>

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const fillD = pathD + ` L${points[points.length-1].x},${height - pad.bottom} L${points[0].x},${height - pad.bottom} Z`

  const isPositive = points[points.length - 1]?.equity >= accountSize
  const hp = hoverIdx !== null ? points[hoverIdx] : null

  // Tooltip placement: flip to the left side once past the chart's midpoint so it never clips
  const tooltipLeft = hp ? (hp.x / width) * 100 : 0
  const flipTooltip = tooltipLeft > 60

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%', height: tall ? 320 : 200, cursor: 'crosshair' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? 'var(--bull)' : 'var(--bear)'} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={isPositive ? 'var(--bull)' : 'var(--bear)'} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0,1,2,3].map(i => {
          const y = pad.top + (i / 3) * (height - pad.top - pad.bottom)
          return <line key={i} x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4"/>
        })}
        {/* Fill */}
        <path d={fillD} fill="url(#eqGrad)"/>
        {/* Line */}
        <path d={pathD} fill="none" stroke={isPositive ? 'var(--bull)' : 'var(--bear)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Labels */}
        {[0,1,2,3].map(i => {
          const minE = points[0].min
          const maxE = points[0].max
          const range = maxE - minE || 1
          const val = maxE - (range * i / 3)
          const y = pad.top + (i / 3) * (height - pad.top - pad.bottom)
          return (
            <text key={i} x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)" fontFamily="var(--font-mono)">
              ${val.toFixed(0)}
            </text>
          )
        })}
        {/* Baseline */}
        {(() => {
          const minE = points[0].min, maxE = points[0].max, range = maxE - minE || 1
          if (accountSize >= minE && accountSize <= maxE) {
            const y = pad.top + ((maxE - accountSize) / range) * (height - pad.top - pad.bottom)
            return <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="6,3" opacity="0.5"/>
          }
          return null
        })()}

        {/* Crosshair + hover marker */}
        {hp && (
          <g>
            <line x1={hp.x} y1={pad.top} x2={hp.x} y2={height - pad.bottom} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="3,3" opacity="0.6"/>
            <circle cx={hp.x} cy={hp.y} r="5" fill={isPositive ? 'var(--bull)' : 'var(--bear)'} stroke="var(--bg-card)" strokeWidth="2"/>
            <circle cx={hp.x} cy={hp.y} r="9" fill="none" stroke={isPositive ? 'var(--bull)' : 'var(--bear)'} strokeWidth="1" opacity="0.4"/>
          </g>
        )}
      </svg>

      {/* HTML tooltip overlay */}
      {hp && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: flipTooltip ? undefined : `calc(${tooltipLeft}% + 14px)`,
            right: flipTooltip ? `calc(${100 - tooltipLeft}% + 14px)` : undefined,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '10px 12px',
            minWidth: 150,
            boxShadow: 'var(--shadow-sm)',
            pointerEvents: 'none',
            fontFamily: 'var(--font-mono)',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 0.3 }}>
            {hp.date}
          </div>
          <Row label="Equity" value={formatMoney(hp.equity)} />
          <Row label="P&L" value={formatMoney(hp.profit)} color={hp.profit >= 0 ? 'var(--success)' : 'var(--danger)'} />
          <Row label="Drawdown" value={`${hp.drawdownPct.toFixed(2)}%`} color={hp.drawdownPct > 0 ? 'var(--danger)' : 'var(--text-secondary)'} />
        </div>
      )}
    </div>
  )
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, fontSize: '0.78rem', padding: '2px 0' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color: color || 'var(--text-primary)', fontWeight: 700 }}>{value}</span>
    </div>
  )
}
