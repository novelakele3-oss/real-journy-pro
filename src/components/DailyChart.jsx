import { useMemo, useRef, useState, useCallback } from 'react'

function formatMoney(val) {
  const sign = val < 0 ? '-' : ''
  return `${sign}$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function DailyChart({ data }) {
  const width = 600, height = 200
  const pad = { top: 20, right: 20, bottom: 40, left: 70 }
  const wrapRef = useRef(null)
  const [hoverIdx, setHoverIdx] = useState(null)

  const bars = useMemo(() => {
    if (!data?.length) return []
    const maxAbs = Math.max(...data.map(d => Math.abs(d.profit)), 1)
    const innerW = width - pad.left - pad.right
    const innerH = (height - pad.top - pad.bottom) / 2
    const zeroY = pad.top + innerH
    const barW = Math.max(4, Math.min(20, innerW / data.length - 3))
    return data.map((d, i) => {
      const x = pad.left + (i / data.length) * innerW + (innerW / data.length - barW) / 2
      const barH = (Math.abs(d.profit) / maxAbs) * innerH
      return {
        x, zeroY,
        y: d.profit >= 0 ? zeroY - barH : zeroY,
        h: barH,
        profit: d.profit,
        date: d.date,
        count: d.count,
        isWin: d.profit >= 0,
        barW,
      }
    })
  }, [data])

  const handleMove = useCallback((e) => {
    if (!wrapRef.current || !bars.length) return
    const rect = wrapRef.current.getBoundingClientRect()
    const scaleX = width / rect.width
    const mouseX = (e.clientX - rect.left) * scaleX
    let nearest = 0
    let nearestDist = Infinity
    for (let i = 0; i < bars.length; i++) {
      const center = bars[i].x + bars[i].barW / 2
      const d = Math.abs(center - mouseX)
      if (d < nearestDist) { nearestDist = d; nearest = i }
    }
    setHoverIdx(nearest)
  }, [bars, width])

  const handleLeave = useCallback(() => setHoverIdx(null), [])

  if (!bars.length) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No data</div>

  const zeroY = bars[0]?.zeroY || height / 2
  const hb = hoverIdx !== null ? bars[hoverIdx] : null
  const tooltipLeft = hb ? (hb.x / width) * 100 : 0
  const flipTooltip = tooltipLeft > 60

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%', height: 200, cursor: 'crosshair' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
        {/* Zero line */}
        <line x1={pad.left} y1={zeroY} x2={width - pad.right} y2={zeroY} stroke="var(--border)" strokeWidth="1"/>
        {/* Bars */}
        {bars.map((b, i) => (
          <rect key={i}
            x={b.x} y={b.y} width={b.barW} height={Math.max(1, b.h)}
            fill={b.isWin ? 'var(--bull)' : 'var(--bear)'}
            opacity={hoverIdx === null || hoverIdx === i ? 0.85 : 0.35}
            stroke={hoverIdx === i ? (b.isWin ? 'var(--bull)' : 'var(--bear)') : 'none'}
            strokeWidth={hoverIdx === i ? 1.5 : 0}
            rx="2"
            style={{ transition: 'opacity 150ms ease' }}
          />
        ))}
        {/* Date labels - show every Nth */}
        {bars.filter((_, i) => i % Math.ceil(bars.length / 6) === 0).map((b, i) => (
          <text key={i} x={b.x + b.barW / 2} y={height - pad.bottom + 14}
            textAnchor="middle" fontSize="9" fill="var(--text-muted)"
            fontFamily="var(--font-mono)">
            {b.date?.slice(5)}
          </text>
        ))}
        {/* Crosshair */}
        {hb && (
          <line x1={hb.x + hb.barW / 2} y1={pad.top} x2={hb.x + hb.barW / 2} y2={height - pad.bottom} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5"/>
        )}
      </svg>

      {/* HTML tooltip overlay */}
      {hb && (
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
            minWidth: 140,
            boxShadow: 'var(--shadow-sm)',
            pointerEvents: 'none',
            fontFamily: 'var(--font-mono)',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 0.3 }}>
            {hb.date}
          </div>
          <Row label="P&L" value={formatMoney(hb.profit)} color={hb.profit >= 0 ? 'var(--success)' : 'var(--danger)'} />
          <Row label="Trades" value={hb.count ?? '—'} />
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
