import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Home, CandlestickChart, ChartColumn, FileText, ShieldCheck, CircleUser, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { parseCSV, calcAnalytics, calcChallenge, formatMinutes, formatCurrency } from '../utils/analytics.js'
import StatCard from '../components/StatCard.jsx'
import EquityChart from '../components/EquityChart.jsx'
import PairChart from '../components/PairChart.jsx'
import DailyChart from '../components/DailyChart.jsx'
import TradesTable from '../components/TradesTable.jsx'
import TradeCalendar from '../components/TradeCalendar.jsx'
import ChallengeTracker from '../components/ChallengeTracker.jsx'
import styles from './DashboardPage.module.css'

// ─── SVG Icon set (Reconstructed for clean rendering) ───
const Icon = ({ d, size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}></path></svg>;

const Icons = {
  overview: <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  trades: <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  charts: <Icon d="M18 20V10M12 20V4M6 20v-6" />,
  reports: <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />,
  upload: <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" />,
  logout: <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={15} />,
  totalTrades: <Icon d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  winRate: <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2" />,
  pnl: <Icon d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  yield: <Icon d="M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6" />,
  avgWin: <Icon d="M7 17l9.2-9.2M17 17V7H7" />,
  avgLoss: <Icon d="M17 7L7.8 16.2M7 7v10h10" />,
  drawdown: <Icon d="M23 18l-9.5-9.5-5 5L1 6 M17 18h6v-6" />,
  holdTime: <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2" />,
  winStreak: <Icon d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  lossStreak: <Icon d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />,
  rr: <Icon d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />,
  expectancy: <Icon d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z" />,
  activeDay: <Icon d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M16 2v4M8 2v4M3 10h18" />,
  bestDay: <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
  worstDay: <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4M12 17h.01" />,
  bestPair: <Icon d="M12 15l-2 5l9-9l-9-9l2 5l-7 4z" />,
  challenge: <Icon d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />,
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Home',    icon: Icons.overview, sidebarIcon: <Home strokeWidth={2} size={18} /> },
  { id: 'trades',   label: 'Trades',  icon: Icons.trades,   sidebarIcon: <CandlestickChart strokeWidth={2} size={18} /> },
  { id: 'charts',   label: 'Charts',  icon: Icons.charts,   sidebarIcon: <ChartColumn strokeWidth={2} size={18} /> },
  { id: 'reports',  label: 'Reports', icon: Icons.reports,  sidebarIcon: <FileText strokeWidth={2} size={18} /> },
]

export default function DashboardPage({ user, setup, onLogout, onSetup }) {
  const [trades, setTrades] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [tradesLoading, setTradesLoading] = useState(true)
  const [nav, setNav]           = useState('overview')
  const [calendarView, setCalendarView] = useState('month')
  const [periodSummary, setPeriodSummary] = useState({ view: 'month', label: '', count: 0, profit: 0, activeDays: 0 })
  const [showProfile, setShowProfile] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg]     = useState('')
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef()

  // Load this user's trades from Supabase on mount.
  useEffect(() => {
    let active = true
    setTradesLoading(true)
    supabase
      .from('trades')
      .select('trade, created_at')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('Failed to load trades:', error.message)
          setUploadError('Could not load your saved trades. Please refresh the page.')
        } else {
          const loaded = (data || [])
            .map(row => row.trade)
            .sort((a, b) => new Date(a.openTime) - new Date(b.openTime))
          setTrades(loaded)
          setAnalytics(loaded.length ? calcAnalytics(loaded, setup.accountSize) : null)
        }
        setTradesLoading(false)
      })
    return () => { active = false }
  }, [user.id, setup.accountSize])

  const processFile = useCallback((file) => {
    if (!file) return
    if (!file.name.endsWith('.csv')) { setUploadError('Please upload a CSV file.'); return }
    setUploading(true); setUploadError(''); setUploadMsg('')
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const parsed = parseCSV(e.target.result)
        if (!parsed.length) { setUploadError('No valid trades found. Check your CSV format.'); setUploading(false); return }

        // Replace this user's trades in Supabase: clear old rows, insert the fresh import.
        const { error: deleteError } = await supabase.from('trades').delete().eq('user_id', user.id)
        if (deleteError) throw deleteError

        const rows = parsed.map(trade => ({ user_id: user.id, trade }))
        const { error: insertError } = await supabase.from('trades').insert(rows)
        if (insertError) throw insertError

        setTrades(parsed)
        setAnalytics(calcAnalytics(parsed, setup.accountSize))
        setUploadMsg(`✓ ${parsed.length} trades imported successfully`)
        setUploading(false)
      } catch (err) {
        setUploadError('Failed to save trades: ' + err.message)
        setUploading(false)
      }
    }
    reader.onerror = () => { setUploadError('Failed to read file.'); setUploading(false) }
    reader.readAsText(file)
  }, [setup.accountSize, user.id])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0])
  }, [processFile])

  const handleFileChange = (e) => processFile(e.target.files[0])

  const a = analytics

  const navItems = setup.challenge?.enabled
    ? [...NAV_ITEMS, { id: 'challenge', label: 'Challenge', icon: Icons.challenge, sidebarIcon: <ShieldCheck strokeWidth={2} size={18} /> }]
    : NAV_ITEMS

  const challenge = useMemo(
    () => (a ? calcChallenge(a, setup.accountSize, setup.challenge) : null),
    [a, setup.accountSize, setup.challenge]
  )

  return (
    <div className={styles.root}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo} data-tooltip="Non FX Journal">
          <div className={styles.logoMark} style={{ '--badge-color': setup.color }}>
            <div className={styles.logoDot}></div>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${nav === item.id ? styles.navItemActive : ''}`}
              onClick={() => setNav(item.id)}
              data-tooltip={item.label}
              aria-label={item.label}
            >
              <span className={styles.navIcon}>{item.sidebarIcon}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.profileWrap}>
            <button
              className={styles.navItem}
              onClick={() => setShowProfile(v => !v)}
              data-tooltip={showProfile ? undefined : (user.name || 'Profile')}
              aria-label="Profile"
            >
              <span className={styles.navIcon}><CircleUser strokeWidth={2} size={18} /></span>
            </button>

            {showProfile && (
              <>
                <div className={styles.profileOverlay} onClick={() => setShowProfile(false)} />
                <div className={styles.profileCard}>
                  <div className={styles.profileAvatar}>{user.name?.charAt(0)?.toUpperCase() || '?'}</div>
                  <div className={styles.profileInfo}>
                    <div className={styles.profileName}>{user.name || 'Trader'}</div>
                    <div className={styles.profileEmail}>{user.email}</div>
                  </div>
                </div>
              </>
            )}
          </div>
          <button className={styles.navItem} onClick={onLogout} data-tooltip="Logout" aria-label="Logout">
            <span className={styles.navIcon}><LogOut strokeWidth={2} size={18} /></span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className={styles.main}>
        {/* TOP BAR */}
        <div className={styles.topbar}>
          <div>
            <div className={styles.pageTitle}>
              <span className={styles.pageTitleIcon}>{navItems.find(n => n.id === nav)?.icon}</span>
              {navItems.find(n => n.id === nav)?.label}
            </div>
            <div className={styles.pageSub}>
              {tradesLoading ? 'Loading your trades…' : a ? `${a.totalTrades} trades · ${a.activeDays} active days` : 'Upload your CSV to get started'}
            </div>
          </div>
          <button className={styles.uploadBtn} onClick={() => fileRef.current.click()}>
            {Icons.upload} Import CSV
          </button>
          <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".csv" onChange={handleFileChange} />
        </div>

        {/* UPLOAD ZONE (UPGRADED WITH PREMIUM SPINNER) */}
        {!tradesLoading && !trades.length && (
          <div 
            className={`${styles.dropzone} ${dragging ? styles.dropzoneDrag : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
          >
            {uploading ? (
              <div className={styles.loadingGraphic}>
                <div className={styles.modernSpinner}></div>
                <div className={styles.loadingText}>Analyzing your trades...</div>
              </div>
            ) : (
              <>
                <div className={styles.dropzoneIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <div className={styles.dropzoneTitle}>Drop your CSV here</div>
                <div className={styles.dropzoneSub}>or click to browse · supports Exness, IC Markets, MetaTrader CSV exports</div>
              </>
            )}
            
            {uploadError && <div className={styles.uploadError}>{uploadError}</div>}
          </div>
        )}

        {uploadMsg && <div className={styles.uploadSuccess}>{uploadMsg}</div>}
        {uploadError && trades.length > 0 && <div className={styles.uploadErrorInline}>{uploadError}</div>}

        {/* ─── OVERVIEW ─── */}
        {nav === 'overview' && a && (
          <div className={styles.content}>
            <div className={styles.statsGrid}>
              <StatCard label="Total Trades" value={a.totalTrades} icon={Icons.totalTrades} />
              <StatCard label="Win Rate" value={`${a.winRate.toFixed(1)}%`} icon={Icons.winRate} accent={a.winRate >= 50 ? 'success' : 'danger'} />
              <StatCard label="Total P&L" value={formatCurrency(a.totalProfit)} icon={Icons.pnl} accent={a.totalProfit >= 0 ? 'success' : 'danger'} />
              <StatCard label="Account Yield" value={`${a.accountYield.toFixed(2)}%`} icon={Icons.yield} accent={a.accountYield >= 0 ? 'success' : 'danger'} />
              <StatCard label="Avg Win" value={formatCurrency(a.avgWin)} icon={Icons.avgWin} accent="success" />
              <StatCard label="Avg Loss" value={formatCurrency(a.avgLoss)} icon={Icons.avgLoss} accent="danger" />
              <StatCard label="Max Drawdown" value={`${a.maxDrawdownPct.toFixed(2)}%`} icon={Icons.drawdown} accent="danger" />
              <StatCard label="Avg Hold Time" value={formatMinutes(a.avgHolding)} icon={Icons.holdTime} />
              <StatCard label="Win Streak" value={a.maxWinStreak} icon={Icons.winStreak} accent="success" />
              <StatCard label="Loss Streak" value={a.maxLossStreak} icon={Icons.lossStreak} accent="danger" />
              <StatCard label="Risk/Reward" value={a.rr.toFixed(2)} icon={Icons.rr} />
              <StatCard label="Expectancy" value={formatCurrency(a.expectancy)} icon={Icons.expectancy} accent={a.expectancy >= 0 ? 'success' : 'danger'} />
            </div>

            <div className={styles.chartsRow}>
              <div className={styles.chartBig}>
                <div className={styles.chartTitle}>Equity Curve</div>
                <EquityChart data={a.equityCurve} accountSize={setup.accountSize} tall />
              </div>
              <div className={styles.chartBox}>
                <div className={styles.chartTitle}>Daily P&L</div>
                <DailyChart data={a.dailyPnL} />
              </div>
            </div>

            <div className={styles.insightsRow}>
              <div className={styles.insightCard}>
                <div className={styles.insightIcon}>{Icons.activeDay}</div>
                <div>
                  <div className={styles.insightLabel}>Most Active Day</div>
                  <div className={styles.insightVal}>{a.mostTradeDay?.date || '—'}</div>
                  <div className={styles.insightSub}>{a.mostTradeDay?.count} trades</div>
                </div>
              </div>
              <div className={styles.insightCard}>
                <div className={styles.insightIcon}>{Icons.bestDay}</div>
                <div>
                  <div className={styles.insightLabel}>Best Day</div>
                  <div className={styles.insightVal}>{a.mostProfitDay?.date || '—'}</div>
                  <div className={styles.insightSub}>{formatCurrency(a.mostProfitDay?.profit || 0)}</div>
                </div>
              </div>
              <div className={styles.insightCard}>
                <div className={styles.insightIcon}>{Icons.worstDay}</div>
                <div>
                  <div className={styles.insightLabel}>Worst Day</div>
                  <div className={styles.insightVal}>{a.mostLosingDay?.date || '—'}</div>
                  <div className={styles.insightSub}>{formatCurrency(a.mostLosingDay?.profit || 0)}</div>
                </div>
              </div>
              <div className={styles.insightCard}>
                <div className={styles.insightIcon}>{Icons.bestPair}</div>
                <div>
                  <div className={styles.insightLabel}>Best Pair</div>
                  <div className={styles.insightVal}>{a.mostProfitPair?.symbol || '—'}</div>
                  <div className={styles.insightSub}>{formatCurrency(a.mostProfitPair?.profit || 0)}</div>
                </div>
              </div>
              <div className={styles.insightCard}>
                <div className={styles.insightIcon}>{Icons.worstDay}</div>
                <div>
                  <div className={styles.insightLabel}>Worst Pair</div>
                  <div className={styles.insightVal}>{a.mostLosingPair?.symbol || '—'}</div>
                  <div className={styles.insightSub}>{formatCurrency(a.mostLosingPair?.profit || 0)}</div>
                </div>
              </div>
              <div className={styles.insightCard}>
                <div className={styles.insightIcon}>{Icons.activeDay}</div>
                <div>
                  <div className={styles.insightLabel}>Active Days</div>
                  <div className={styles.insightVal}>{a.activeDays}</div>
                  <div className={styles.insightSub}>{a.totalTrades} total trades</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TRADES ─── */}
        {nav === 'trades' && (
          <div className={styles.content}>
            {trades.length ? (
              <>
                <div className={styles.chartBox}>
                  <div className={styles.calendarHeader}>
                    <div className={styles.chartTitle}>Trade Calendar</div>
                    <ViewToggle view={calendarView} onChange={setCalendarView} />
                  </div>
                  <TradeCalendar trades={trades} byDay={a.byDay} view={calendarView} onViewChange={setCalendarView} onSummaryChange={setPeriodSummary} />
                </div>
                <TradesTable trades={trades} />
              </>
            ) : (
              <EmptyState />
            )}
          </div>
        )}

        {/* ─── CHARTS ─── */}
        {nav === 'charts' && a && (
          <div className={styles.content}>
            <div className={styles.chartBig}>
              <div className={styles.chartTitle}>Equity Curve</div>
              <EquityChart data={a.equityCurve} accountSize={setup.accountSize} tall />
            </div>
            <div className={styles.chartsRow}>
              <div className={styles.chartBox}>
                <div className={styles.chartTitle}>Daily P&L</div>
                <DailyChart data={a.dailyPnL} />
              </div>
              <div className={styles.chartBox}>
                <div className={styles.chartTitle}>Pair Performance</div>
                <PairChart data={a.pairPerformance} />
              </div>
            </div>
          </div>
        )}
        {nav === 'charts' && !a && <EmptyState />}

        {/* ─── REPORTS ─── */}
        {nav === 'reports' && a && (
          <div className={styles.content}>
            <div className={styles.chartBox}>
              <div className={styles.calendarHeader}>
                <div className={styles.chartTitle}>Win / Loss Calendar</div>
                <div className={styles.calendarHeaderRight}>
                  <ViewToggle view={calendarView} onChange={setCalendarView} />
                  <span className={`${styles.headerStat} ${periodSummary.profit >= 0 ? styles.headerStatSuccess : styles.headerStatDanger}`}>
                    {formatCurrency(periodSummary.profit)}
                  </span>
                  <span className={styles.headerStat}>{periodSummary.count} trades</span>
                  <span className={styles.headerStat}>{periodSummary.activeDays} D</span>
                  <DownloadCalendarBtn id="report-calendar" filename="nofx-calendar" />
                </div>
              </div>
              <div id="report-calendar">
                <TradeCalendar trades={trades} byDay={a.byDay} view={calendarView} onViewChange={setCalendarView} onSummaryChange={setPeriodSummary} />
              </div>
            </div>
            <div className={styles.reportGrid}>
              <ReportSection title="Performance" icon={Icons.pnl}>
                <ReportRow label="Total Trades" value={a.totalTrades} />
                <ReportRow label="Wins / Losses" value={`${a.totalWins} / ${a.totalLosses}`} />
                <ReportRow label="Win Rate" value={`${a.winRate.toFixed(1)}%`} accent={a.winRate >= 50 ? 'success' : 'danger'} />
                <ReportRow label="Total P&L" value={formatCurrency(a.totalProfit)} accent={a.totalProfit >= 0 ? 'success' : 'danger'} />
                <ReportRow label="Account Yield" value={`${a.accountYield.toFixed(2)}%`} accent={a.accountYield >= 0 ? 'success' : 'danger'} />
              </ReportSection>
              <ReportSection title="Risk & Averages" icon={Icons.drawdown}>
                <ReportRow label="Avg Win" value={formatCurrency(a.avgWin)} accent="success" />
                <ReportRow label="Avg Loss" value={formatCurrency(a.avgLoss)} accent="danger" />
                <ReportRow label="Risk/Reward" value={a.rr.toFixed(2)} />
                <ReportRow label="Expectancy" value={formatCurrency(a.expectancy)} accent={a.expectancy >= 0 ? 'success' : 'danger'} />
                <ReportRow label="Max Drawdown" value={`${a.maxDrawdownPct.toFixed(2)}%`} accent="danger" />
              </ReportSection>
            </div>
          </div>
        )}
        {nav === 'reports' && !a && <EmptyState />}

        {/* ─── CHALLENGE ─── */}
        {nav === 'challenge' && (
          <div className={styles.content}>
            {a ? <ChallengeTracker data={challenge} setup={setup} /> : <EmptyState />}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Download Calendar as PNG ───
function DownloadCalendarBtn({ id, filename }) {
  const [state, setState] = useState('idle') // idle | working | done

  const handleDownload = async () => {
    const el = document.getElementById(id)
    if (!el) return
    setState('working')
    try {
      const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js')
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 })
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setState('done')
      setTimeout(() => setState('idle'), 1800)
    } catch {
      window.print()
      setState('idle')
    }
  }

  return (
    <button className={styles.downloadBtn} onClick={handleDownload} disabled={state === 'working'}>
      {state === 'working' ? (
        <span className={styles.downloadSpinner} />
      ) : state === 'done' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M20 19H4" />
        </svg>
      )}
      <span>{state === 'working' ? 'Rendering…' : state === 'done' ? 'Saved' : 'Download'}</span>
    </button>
  )
}

// ─── Calendar View Toggle (Year / Month / Week) ───
function ViewToggle({ view, onChange }) {
  const options = [
    { id: 'year',  label: 'Year' },
    { id: 'month', label: 'Month' },
    { id: 'week',  label: 'Week' },
  ]
  return (
    <div className={styles.viewToggle}>
      {options.map(o => (
        <button
          key={o.id}
          className={`${styles.viewToggleBtn} ${view === o.id ? styles.viewToggleBtnActive : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className={styles.dropzone}>
      <div className={styles.dropzoneIcon}>{Icons.upload}</div>
      <div className={styles.dropzoneTitle}>No trades yet</div>
      <div className={styles.dropzoneSub}>Import a CSV file to see your analytics</div>
    </div>
  )
}

function ReportSection({ title, icon, children }) {
  return (
    <div className={styles.chartBox}>
      <div className={styles.chartTitle}>{icon} {title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {children} 
      </div>
    </div>
  )
}

function ReportRow({ label, value, accent }) {
  const color = accent === 'success' ? 'var(--success)' : accent === 'danger' ? 'var(--danger)' : 'var(--text-primary)'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  )
}