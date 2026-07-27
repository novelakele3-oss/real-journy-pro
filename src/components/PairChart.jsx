import { formatCurrency } from '../utils/analytics.js'

export default function PairChart({ data }) {
  if (!data?.length) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No data</div>

  const maxAbs = Math.max(...data.map(d => Math.abs(d.profit)), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '4px 0' }}>
      {data.slice(0, 10).map(pair => {
        const pct = (Math.abs(pair.profit) / maxAbs) * 100
        const isPos = pair.profit >= 0
        return (
          <div key={pair.symbol}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.82rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{pair.symbol}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: isPos ? 'var(--bull)' : 'var(--bear)' }}>
                {formatCurrency(pair.profit)}
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: isPos ? 'var(--bull)' : 'var(--bear)',
                borderRadius: '3px',
                transition: 'width 0.6s ease',
              }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}
