import { useState, useMemo, useEffect } from 'react'
import { formatCurrency } from '../utils/analytics.js'
import TradeDayModal from './TradeDayModal.jsx'
import styles from './TradeCalendar.module.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function dateKey(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function startOfWeek(d) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  r.setDate(r.getDate() - r.getDay())
  return r
}

export default function TradeCalendar({ trades, byDay, view = 'month', onViewChange, onSummaryChange }) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(today))
  const [selectedDay, setSelectedDay] = useState(null) // { key, data }

  const tradeYears = useMemo(() => {
    if (!byDay) return [today.getFullYear()]
    const years = [...new Set(Object.keys(byDay).map(d => parseInt(d.slice(0, 4))))]
    return years.length ? years.sort() : [today.getFullYear()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDay])

  // ── Navigation ──
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }
  const prevWeek  = () => setWeekAnchor(w => addDays(w, -7))
  const nextWeek  = () => setWeekAnchor(w => addDays(w, 7))
  const prevYear  = () => setYear(y => y - 1)
  const nextYear  = () => setYear(y => y + 1)

  const handlePrev = view === 'week' ? prevWeek : view === 'year' ? prevYear : prevMonth
  const handleNext = view === 'week' ? nextWeek : view === 'year' ? nextYear : nextMonth

  const goToday = () => {
    if (view === 'week') setWeekAnchor(startOfWeek(today))
    else if (view === 'year') setYear(today.getFullYear())
    else { setYear(today.getFullYear()); setMonth(today.getMonth()) }
  }

  const jumpToMonth = (idx) => {
    setMonth(idx)
    onViewChange && onViewChange('month')
  }

  // ── Month grid (existing behaviour) ──
  const { weeks } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const weeks = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    return { weeks }
  }, [year, month])

  const getMonthDateKey = (d) => {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }
  const getDayData = (key) => (byDay && byDay[key]) || null

  const todayKey = dateKey(today)

  const monthSummary = useMemo(() => {
    let profit = 0, count = 0, winDays = 0, lossDays = 0, beDays = 0
    weeks.flat().forEach(d => {
      if (!d) return
      const data = getDayData(getMonthDateKey(d))
      if (!data) return
      profit += data.profit; count += data.count
      if (data.profit > 0) winDays++; else if (data.profit < 0) lossDays++; else beDays++
    })
    return { profit, count, winDays, lossDays, activeDays: winDays + lossDays + beDays }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks, byDay])

  const maxAbsProfit = useMemo(() => {
    if (!byDay) return 1
    const vals = Object.values(byDay).map(d => Math.abs(d.profit))
    return Math.max(1, ...vals)
  }, [byDay])

  // ── Week grid ──
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)), [weekAnchor])

  const weekSummary = useMemo(() => {
    let profit = 0, count = 0, winDays = 0, lossDays = 0, beDays = 0
    weekDays.forEach(d => {
      const data = getDayData(dateKey(d))
      if (!data) return
      profit += data.profit; count += data.count
      if (data.profit > 0) winDays++; else if (data.profit < 0) lossDays++; else beDays++
    })
    return { profit, count, winDays, lossDays, activeDays: winDays + lossDays + beDays }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays, byDay])

  const weekLabel = useMemo(() => {
    const end = weekDays[6]
    const start = weekDays[0]
    const sameMonth = start.getMonth() === end.getMonth()
    return sameMonth
      ? `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
      : `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
  }, [weekDays])

  // ── Year grid ──
  const yearMonthsData = useMemo(() => {
    const arr = Array.from({ length: 12 }, (_, idx) => ({ idx, profit: 0, count: 0 }))
    if (byDay) {
      Object.entries(byDay).forEach(([date, v]) => {
        const [y, m] = date.split('-')
        if (Number(y) === year) {
          arr[Number(m) - 1].profit += v.profit
          arr[Number(m) - 1].count += v.count
        }
      })
    }
    return arr
  }, [byDay, year])

  const yearSummary = useMemo(() => {
    const profit = yearMonthsData.reduce((s, m) => s + m.profit, 0)
    const count = yearMonthsData.reduce((s, m) => s + m.count, 0)
    const winMonths = yearMonthsData.filter(m => m.profit > 0).length
    const lossMonths = yearMonthsData.filter(m => m.profit < 0).length
    const activeDays = byDay ? Object.keys(byDay).filter(d => Number(d.slice(0, 4)) === year).length : 0
    return { profit, count, winMonths, lossMonths, activeDays }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearMonthsData, byDay, year])

  const label = view === 'week' ? weekLabel : view === 'year' ? `${year}` : `${MONTHS[month]} ${year}`
  const summary = view === 'week' ? weekSummary : view === 'year' ? yearSummary : monthSummary

  // Report the currently selected period's stats (Year / Month / Week) up to the parent
  // so any header stats outside this component stay in sync with the toggle.
  useEffect(() => {
    if (!onSummaryChange) return
    onSummaryChange({ view, label, count: summary.count, profit: summary.profit, activeDays: summary.activeDays })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, label, summary.count, summary.profit, summary.activeDays])

  return (
    <div className={styles.wrap}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button onClick={handlePrev} className={styles.navBtn} aria-label="Previous">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className={styles.monthLabel}>{label}</span>
        <button onClick={handleNext} className={styles.navBtn} aria-label="Next">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button onClick={goToday} className={styles.todayBtn}>Today</button>
        {view !== 'week' && (
          <select value={year} onChange={e => setYear(Number(e.target.value))} className={styles.yearSelect}>
            {tradeYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {/* Summary strip */}
      <div className={styles.summaryStrip}>
        <div className={styles.summaryChip}>
          <div className={styles.summaryChipLabel}>{view === 'year' ? 'Year P&L' : view === 'week' ? 'Week P&L' : 'Month P&L'}</div>
          <div className={styles.summaryChipVal} style={{ color: summary.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatCurrency(summary.profit)}
          </div>
        </div>
        <div className={styles.summaryChip}>
          <div className={styles.summaryChipLabel}>Trades</div>
          <div className={styles.summaryChipVal}>{summary.count}</div>
        </div>
        {view === 'year' ? (
          <>
            <div className={styles.summaryChip}>
              <div className={styles.summaryChipLabel}>Win Months</div>
              <div className={styles.summaryChipVal} style={{ color: 'var(--success)' }}>{yearSummary.winMonths}</div>
            </div>
            <div className={styles.summaryChip}>
              <div className={styles.summaryChipLabel}>Loss Months</div>
              <div className={styles.summaryChipVal} style={{ color: 'var(--danger)' }}>{yearSummary.lossMonths}</div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.summaryChip}>
              <div className={styles.summaryChipLabel}>Win Days</div>
              <div className={styles.summaryChipVal} style={{ color: 'var(--success)' }}>{summary.winDays}</div>
            </div>
            <div className={styles.summaryChip}>
              <div className={styles.summaryChipLabel}>Loss Days</div>
              <div className={styles.summaryChipVal} style={{ color: 'var(--danger)' }}>{summary.lossDays}</div>
            </div>
          </>
        )}
      </div>

      {/* MONTH & WEEK share a weekday header */}
      {view !== 'year' && (
        <div className={styles.weekHeader}>
          {DAYS.map(d => <div key={d} className={styles.weekDay}>{d}</div>)}
        </div>
      )}

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div className={styles.grid}>
          {weeks.map((week, wi) => (
            <div key={wi} className={styles.weekRow}>
              {week.map((day, di) => {
                const key = day ? getMonthDateKey(day) : null
                const data = day ? getDayData(key) : null
                const isToday = day && key === todayKey
                const isWin  = data && data.profit > 0
                const isLoss = data && data.profit < 0
                const isBE   = data && data.profit === 0
                const barWidth = data ? Math.min(100, (Math.abs(data.profit) / maxAbsProfit) * 100) : 0
                const cellClass = [
                  styles.cell,
                  !day ? styles.cellEmpty : '',
                  isWin ? styles.cellWin : '', isLoss ? styles.cellLoss : '', isBE ? styles.cellBE : '',
                  isToday ? styles.cellToday : '', data ? styles.cellClickable : '',
                ].filter(Boolean).join(' ')

                return (
                  <div key={di} className={cellClass} onClick={() => data && setSelectedDay({ key, data })}
                    title={data ? `${key} · ${data.count} trade${data.count !== 1 ? 's' : ''} · ${formatCurrency(data.profit)}` : undefined}>
                    {day && (
                      <>
                        <div className={`${styles.cellDayNum} ${isToday ? styles.cellDayNumToday : ''}`}>{day}</div>
                        {data && (
                          <>
                            <div className={styles.cellPnl} style={{ color: isWin ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--text-muted)' }}>{formatCurrency(data.profit)}</div>
                            <div className={styles.cellCount}>{data.count} trade{data.count !== 1 ? 's' : ''}</div>
                            <div className={styles.cellDot} style={{ background: isWin ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--text-muted)' }} />
                            <div className={styles.cellBar} style={{ width: `${barWidth}%`, background: isWin ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--text-muted)' }} />
                          </>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className={styles.grid}>
          <div className={styles.weekRow}>
            {weekDays.map((d, i) => {
              const key = dateKey(d)
              const data = getDayData(key)
              const isToday = key === todayKey
              const isWin  = data && data.profit > 0
              const isLoss = data && data.profit < 0
              const isBE   = data && data.profit === 0
              const cellClass = [
                styles.cell, styles.cellWeekTall,
                isWin ? styles.cellWin : '', isLoss ? styles.cellLoss : '', isBE ? styles.cellBE : '',
                isToday ? styles.cellToday : '', data ? styles.cellClickable : '',
              ].filter(Boolean).join(' ')
              return (
                <div key={i} className={cellClass} onClick={() => data && setSelectedDay({ key, data })}
                  title={data ? `${key} · ${data.count} trade${data.count !== 1 ? 's' : ''} · ${formatCurrency(data.profit)}` : undefined}>
                  <div className={`${styles.cellDayNum} ${isToday ? styles.cellDayNumToday : ''}`}>
                    {d.getDate() === 1 ? `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}` : d.getDate()}
                  </div>
                  {data ? (
                    <>
                      <div className={styles.cellPnl} style={{ color: isWin ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--text-muted)' }}>{formatCurrency(data.profit)}</div>
                      <div className={styles.cellCount}>{data.count} trade{data.count !== 1 ? 's' : ''}</div>
                      <div className={styles.cellDot} style={{ background: isWin ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--text-muted)' }} />
                    </>
                  ) : (
                    <div className={styles.cellNoTrades}>No trades</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* YEAR VIEW */}
      {view === 'year' && (
        <div className={styles.yearGrid}>
          {yearMonthsData.map(m => {
            const isWin  = m.profit > 0
            const isLoss = m.profit < 0
            const isCurrent = year === today.getFullYear() && m.idx === today.getMonth()
            const cardClass = [
              styles.monthCard,
              isWin ? styles.cellWin : '', isLoss ? styles.cellLoss : '',
              isCurrent ? styles.cellToday : '',
              m.count ? styles.cellClickable : '',
            ].filter(Boolean).join(' ')
            return (
              <div key={m.idx} className={cardClass} onClick={() => m.count && jumpToMonth(m.idx)}>
                <div className={styles.monthCardName}>{MONTHS_SHORT[m.idx]}</div>
                <div className={styles.cellPnl} style={{ color: isWin ? 'var(--success)' : isLoss ? 'var(--danger)' : 'var(--text-muted)' }}>{formatCurrency(m.profit)}</div>
                <div className={styles.cellCount}>{m.count} trade{m.count !== 1 ? 's' : ''}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}><div className={styles.legendSwatch} style={{ background: 'var(--success)' }} /><span className={styles.legendLabel}>Profit {view === 'year' ? 'month' : 'day'}</span></div>
        <div className={styles.legendItem}><div className={styles.legendSwatch} style={{ background: 'var(--danger)' }} /><span className={styles.legendLabel}>Loss {view === 'year' ? 'month' : 'day'}</span></div>
        <div className={styles.legendItem}><div className={styles.legendSwatch} style={{ background: 'var(--text-muted)' }} /><span className={styles.legendLabel}>Break even</span></div>
        <div className={styles.legendHint}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          {view === 'year' ? 'Tap a month to open it' : 'Tap a day for the full report'}
        </div>
      </div>

      {selectedDay && (
        <TradeDayModal dateKey={selectedDay.key} data={selectedDay.data} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  )
}
