import { formatCurrency } from '../utils/analytics.js'
import styles from './ChallengeTracker.module.css'

const PHASE_LABELS = { phase1: 'Phase 1 · Challenge', phase2: 'Phase 2 · Verification', funded: 'Funded · Live' }
const HEALTH_LABELS = { healthy: 'Healthy', warning: 'At Risk', breached: 'Rules Breached' }

const WarnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
)
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

function Gauge({ label, usedPct, breached, sub, valueLabel }) {
  const pct = Math.max(0, Math.min(100, usedPct))
  const state = breached ? 'breached' : pct >= 80 ? 'warning' : 'healthy'
  return (
    <div className={styles.gaugeCard}>
      <div className={styles.gaugeTop}>
        <span className={styles.gaugeLabel}>{label}</span>
        <span className={`${styles.gaugeValue} ${styles[state]}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className={styles.gaugeTrack}>
        <div className={`${styles.gaugeFill} ${styles[state]}`} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.gaugeSub}>{sub}</div>
      {valueLabel && <div className={styles.gaugeSub}>{valueLabel}</div>}
    </div>
  )
}

export default function ChallengeTracker({ data, setup }) {
  if (!data) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyTitle}>Challenge tracking isn't set up</div>
        <div className={styles.emptySub}>Re-run setup to add your firm's profit target, drawdown and daily loss rules.</div>
      </div>
    )
  }

  const c = data

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.phaseBadge}>{PHASE_LABELS[c.phase] || c.phase}</div>
          <div className={styles.headerSub}>{setup.name} · {formatCurrency(setup.accountSize, 0)} account</div>
        </div>
        <div className={`${styles.healthBadge} ${styles[c.accountHealth]}`}>
          <span className={styles.healthDot} />
          {HEALTH_LABELS[c.accountHealth]}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.gaugeCard}>
          <div className={styles.gaugeTop}>
            <span className={styles.gaugeLabel}>Profit Target</span>
            <span className={`${styles.gaugeValue} ${c.targetReached ? styles.healthy : ''}`}>{c.profitProgressPct.toFixed(0)}%</span>
          </div>
          <div className={styles.gaugeTrack}>
            <div className={`${styles.gaugeFill} ${styles.target}`} style={{ width: `${c.profitProgressPct}%` }} />
          </div>
          <div className={styles.gaugeSub}>
            {c.targetReached
              ? `Target reached — ${formatCurrency(c.totalProfit)} / ${formatCurrency(c.profitTargetAmount)}`
              : `${formatCurrency(c.remainingTarget)} remaining of ${formatCurrency(c.profitTargetAmount)}`}
          </div>
        </div>

        <Gauge
          label="Max Drawdown"
          usedPct={c.ddUsedPct}
          breached={c.ddBreached}
          sub={`${formatCurrency(c.maxDrawdownAmount)} limit`}
        />

        <Gauge
          label="Daily Loss (latest day)"
          usedPct={c.lastDayLossPct}
          breached={c.dailyBreachDays.length > 0}
          sub={`${formatCurrency(c.dailyLossLimitAmount)} limit`}
          valueLabel={c.lastDayLoss > 0 ? `Lost ${formatCurrency(c.lastDayLoss)} last session` : 'No loss last session'}
        />

        <div className={styles.gaugeCard}>
          <div className={styles.gaugeTop}>
            <span className={styles.gaugeLabel}>Trading Days</span>
            <span className={`${styles.gaugeValue} ${c.minDaysMet ? styles.healthy : ''}`}>{c.tradingDays}/{c.minTradingDays}</span>
          </div>
          <div className={styles.gaugeTrack}>
            <div className={`${styles.gaugeFill} ${styles.target}`} style={{ width: `${c.minTradingDays ? Math.min(100, (c.tradingDays / c.minTradingDays) * 100) : 100}%` }} />
          </div>
          <div className={styles.gaugeSub}>
            {c.minDaysMet ? 'Minimum trading days met' : `${c.daysRemaining} day${c.daysRemaining === 1 ? '' : 's'} remaining`}
          </div>
        </div>
      </div>

      <div className={styles.alertsBox}>
        <div className={styles.alertsTitle}>Risk Alerts &amp; Rule Violations</div>
        {c.violations.length === 0 && c.alerts.length === 0 ? (
          <div className={`${styles.alertRow} ${styles.ok}`}>
            <CheckIcon /> No rule violations or risk alerts — you're on track.
          </div>
        ) : (
          <>
            {c.violations.map((v, i) => (
              <div key={`v-${i}`} className={`${styles.alertRow} ${styles.breached}`}>
                <AlertIcon /> {v.message}
              </div>
            ))}
            {c.alerts.map((a, i) => (
              <div key={`a-${i}`} className={`${styles.alertRow} ${styles.warning}`}>
                <WarnIcon /> {a.message}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
