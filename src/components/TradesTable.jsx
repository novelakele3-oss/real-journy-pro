import { useState, useMemo } from 'react'
import { formatCurrency, formatMinutes } from '../utils/analytics.js'
import styles from './TradesTable.module.css'

export default function TradesTable({ trades }) {
  const [sort, setSort] = useState({ key: 'openTime', dir: 'desc' })
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const sorted = useMemo(() => {
    let rows = [...trades]
    if (filter) rows = rows.filter(t =>
      t.symbol.toLowerCase().includes(filter.toLowerCase()) ||
      t.type.toLowerCase().includes(filter.toLowerCase()) ||
      (t.date && t.date.includes(filter)) // ✅ fixed here
    )
    rows.sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key]
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase() }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [trades, sort, filter])

  const pages = Math.ceil(sorted.length / PER_PAGE)
  const visible = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const toggleSort = (key) => {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })
    setPage(1)
  }

  const Col = ({ k, label }) => (
    <th className={styles.th} onClick={() => toggleSort(k)} style={{ cursor: 'pointer' }}>
      {label} {sort.key === k ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Filter by symbol, type, date…"
          value={filter}
          onChange={e => { setFilter(e.target.value); setPage(1) }}
        />
        <span className={styles.count}>{sorted.length} trades</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <Col k="ticket" label="Ticket" />
              <Col k="date" label="Date" />
              <Col k="symbol" label="Symbol" />
              <Col k="type" label="Type" />
              <Col k="lots" label="Lots" />
              <Col k="openPrice" label="Open" />
              <Col k="closePrice" label="Close" />
              <Col k="holdingMinutes" label="Hold Time" />
              <Col k="profit" label="P&L" />
              <th className={styles.th}>Result</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(t => (
              <tr key={t.ticket} className={`${styles.tr} ${t.isWin ? styles.trWin : styles.trLoss}`}>
                <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.ticket}</td>
                <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{t.date}</td>
                <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{t.symbol}</td>
                <td className={styles.td}>
                  <span className={`${styles.badge} ${t.type === 'buy' ? styles.buy : styles.sell}`}>{t.type.toUpperCase()}</span>
                </td>
                <td className={styles.td} style={{ fontFamily: 'var(--font-mono)' }}>{t.lots}</td>
                <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{t.openPrice.toFixed(3)}</td>
                <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{t.closePrice.toFixed(3)}</td>
                <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{formatMinutes(t.holdingMinutes)}</td>
                <td className={`${styles.td} ${t.isWin ? styles.win : styles.loss}`} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {formatCurrency(t.profit)}
                </td>
                <td className={styles.td}>
                  <span className={`${styles.result} ${t.isWin ? styles.resultWin : styles.resultLoss}`}>
                    {t.isWin ? '✓ WIN' : '✗ LOSS'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className={styles.pageBtn} onClick={() => setPage(p => p-1)} disabled={page === 1}>‹</button>
          <span className={styles.pageInfo}>{page} / {pages}</span>
          <button className={styles.pageBtn} onClick={() => setPage(p => p+1)} disabled={page === pages}>›</button>
          <button className={styles.pageBtn} onClick={() => setPage(pages)} disabled={page === pages}>»</button>
        </div>
      )}
    </div>
  )
}