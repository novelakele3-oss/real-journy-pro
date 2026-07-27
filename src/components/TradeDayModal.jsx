import { useEffect } from 'react'
import { formatCurrency, formatMinutes } from '../utils/analytics.js'
import styles from './TradeDayModal.module.css'

const SESSION_CLASS = {
  'Asian': 'asian',
  'London': 'london',
  'London / New York': 'overlap',
  'New York': 'newyork',
}

function fmtTime(iso) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC'
}

function fmtDateHeading(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function TradeDayModal({ dateKey, data, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!dateKey || !data) return null

  const trades = data.trades || []
  const wins = trades.filter(t => t.isWin).length
  const winRate = trades.length ? (wins / trades.length) * 100 : 0
  const netPips = data.pips || 0

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Daily Report</div>
            <div className={styles.title}>{fmtDateHeading(dateKey)}</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className={styles.summaryRow}>
          <div className={styles.summaryCell}>
            <div className={styles.summaryLabel}>Trades</div>
            <div className={styles.summaryVal}>{trades.length}</div>
          </div>
          <div className={styles.summaryCell}>
            <div className={styles.summaryLabel}>Win Rate</div>
            <div className={`${styles.summaryVal} ${winRate >= 50 ? styles.success : styles.danger}`}>{winRate.toFixed(0)}%</div>
          </div>
          <div className={styles.summaryCell}>
            <div className={styles.summaryLabel}>Net P&L</div>
            <div className={`${styles.summaryVal} ${data.profit >= 0 ? styles.success : styles.danger}`}>{formatCurrency(data.profit)}</div>
          </div>
          <div className={styles.summaryCell}>
            <div className={styles.summaryLabel}>Net Pips</div>
            <div className={`${styles.summaryVal} ${netPips >= 0 ? styles.success : styles.danger}`}>{netPips >= 0 ? '+' : ''}{netPips.toFixed(1)}</div>
          </div>
        </div>

        <div className={styles.list}>
          {trades.map((t) => (
            <div key={t.ticket} className={styles.tradeRow}>
              <div className={styles.tradeMain}>
                <span className={`${styles.dirBadge} ${t.type === 'sell' || t.type === 'short' ? styles.sell : styles.buy}`}>
                  {t.type === 'sell' || t.type === 'short' ? 'SELL' : 'BUY'}
                </span>
                <span className={styles.symbol}>{t.symbol || '—'}</span>
                <span className={`${styles.sessionBadge} ${styles[SESSION_CLASS[t.session]] || ''}`}>{t.session}</span>
                <span className={styles.timeRange}>{fmtTime(t.openTime)} → {fmtTime(t.closeTime)}</span>
              </div>
              <div className={styles.tradeMetrics}>
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>Pips</div>
                  <div className={`${styles.metricVal} ${t.pips >= 0 ? styles.success : styles.danger}`}>{t.pips >= 0 ? '+' : ''}{t.pips.toFixed(1)}</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>P&L</div>
                  <div className={`${styles.metricVal} ${t.profit >= 0 ? styles.success : styles.danger}`}>{formatCurrency(t.profit)}</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>Hold Time</div>
                  <div className={styles.metricVal}>{formatMinutes(t.holdingMinutes)}</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricLabel}>Time to TP</div>
                  <div className={styles.metricVal}>{t.hitTP ? formatMinutes(t.timeToTP) : <span className={styles.muted}>SL / Manual</span>}</div>
                </div>
              </div>
            </div>
          ))}
          {!trades.length && <div className={styles.empty}>No trades recorded on this day.</div>}
        </div>
      </div>
    </div>
  )
}
