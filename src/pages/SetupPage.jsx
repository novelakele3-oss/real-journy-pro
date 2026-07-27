import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import styles from './SetupPage.module.css'

const PROP_FIRMS = [
  { id: 'ftmo', name: 'FTMO', color: '#ff6b35' },
  { id: '5ers', name: 'The 5%ers', color: '#00d4a0' },
  { id: 'funding_pips', name: 'Funding Pips', color: '#7c3aed' },
  { id: 'topstep', name: 'Topstep', color: '#0ea5e9' },
  { id: 'myfundedfx', name: 'MyFundedFX', color: '#f59e0b' },
  { id: 'alpha', name: 'Alpha Capital Group', color: '#ec4899' },
  { id: 'e8', name: 'E8 Markets', color: '#10b981' },
  { id: 'maven', name: 'Maven Trading', color: '#6366f1' },
  { id: 'glownode', name: 'Glow Node', color: '#f97316' },
  { id: 'apex', name: 'Apex Trader Funding', color: '#14b8a6' },
]

const BROKERS = [
  { id: 'icmarkets', name: 'IC Markets', color: '#e63946' },
  { id: 'exness', name: 'Exness', color: '#00a651' },
  { id: 'pepperstone', name: 'Pepperstone', color: '#ff5c00' },
  { id: 'xm', name: 'XM', color: '#e91e63' },
  { id: 'tickmill', name: 'Tickmill', color: '#2563eb' },
  { id: 'vantage', name: 'Vantage Markets', color: '#7c3aed' },
  { id: 'hfm', name: 'HFM', color: '#dc2626' },
  { id: 'fpmarkets', name: 'FP Markets', color: '#0891b2' },
  { id: 'admiral', name: 'Admiral Markets', color: '#1a56db' },
  { id: 'oanda', name: 'OANDA', color: '#f59e0b' },
]

const PAIRS = [
  { id: 'XAUUSD', name: 'Gold', symbol: 'XAU/USD' },
  { id: 'NAS100', name: 'Nasdaq', symbol: 'NAS100' },
  { id: 'US30', name: 'Dow Jones', symbol: 'US30' },
  { id: 'EURUSD', name: 'Euro/USD', symbol: 'EUR/USD' },
  { id: 'GBPUSD', name: 'GBP/USD', symbol: 'GBP/USD' },
  { id: 'USDJPY', name: 'USD/JPY', symbol: 'USD/JPY' },
  { id: 'GBPJPY', name: 'GBP/JPY', symbol: 'GBP/JPY' },
  { id: 'AUDUSD', name: 'AUD/USD', symbol: 'AUD/USD' },
  { id: 'BTCUSD', name: 'Bitcoin', symbol: 'BTC/USD' },
  { id: 'GER40', name: 'DAX', symbol: 'GER40' },
]

const PHASES = [
  { id: 'phase1', name: 'Phase 1', sub: 'Challenge' },
  { id: 'phase2', name: 'Phase 2', sub: 'Verification' },
  { id: 'funded', name: 'Funded', sub: 'Live account' },
]

export default function SetupPage({ user, onSetup }) {
  const [accountType, setAccountType] = useState('') // 'prop' or 'broker'
  const [selected, setSelected] = useState(null)
  const [pairs, setPairs] = useState([])
  const [accountSize, setAccountSize] = useState('')
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [platformQuery, setPlatformQuery] = useState('')
  const [pairQuery, setPairQuery] = useState('')

  // Challenge tracking (prop firms only)
  const [challengeEnabled, setChallengeEnabled] = useState(true)
  const [phase, setPhase] = useState('phase1')
  const [profitTarget, setProfitTarget] = useState('10')
  const [dailyLoss, setDailyLoss] = useState('5')
  const [maxDrawdown, setMaxDrawdown] = useState('10')
  const [minDays, setMinDays] = useState('4')

  const totalSteps = accountType === 'prop' ? 4 : 3

  const togglePair = (id) => {
    setPairs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  const handleNext = () => {
    if (step === 1) {
      if (!accountType) { setError('Please select account type.'); return }
      if (!selected) { setError('Please select a broker or prop firm.'); return }
      setError(''); setStep(2)
    } else if (step === 2) {
      if (!pairs.length) { setError('Select at least one trading pair.'); return }
      setError(''); setStep(3)
    } else if (step === 3) {
      if (!accountSize || isNaN(Number(accountSize)) || Number(accountSize) <= 0) {
        setError('Enter a valid account size.'); return
      }
      setError('')
      if (accountType === 'prop') { setStep(4); return }
      submit()
    } else {
      submit()
    }
  }

  const submit = () => {
    const list = accountType === 'prop' ? PROP_FIRMS : BROKERS
    const info = list.find(x => x.id === selected)
    const challenge = accountType === 'prop' && challengeEnabled ? {
      enabled: true,
      phase,
      profitTargetPct: Number(profitTarget) || 0,
      dailyLossPct: Number(dailyLoss) || 0,
      maxDrawdownPct: Number(maxDrawdown) || 0,
      minTradingDays: Number(minDays) || 0,
    } : null
    onSetup({ accountType, selected, name: info?.name, color: info?.color, pairs, accountSize: Number(accountSize), challenge })
  }

  const list = accountType === 'prop' ? PROP_FIRMS : accountType === 'broker' ? BROKERS : []
  const filteredList = useMemo(
    () => list.filter(item => item.name.toLowerCase().includes(platformQuery.trim().toLowerCase())),
    [list, platformQuery]
  )
  const filteredPairs = useMemo(
    () => PAIRS.filter(p => {
      const q = pairQuery.trim().toLowerCase()
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    }),
    [pairQuery]
  )

  return (
    <div className={styles.root}>
      <div className={styles.orb1} aria-hidden />
      <div className={styles.orb2} aria-hidden />

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <svg width="32" height="32" viewBox="0 0 38 38" fill="none">
              <rect width="38" height="38" rx="12" fill="var(--accent)" opacity="0.15"/>
              <path d="M8 26 L15 12 L19 20 L23 15 L30 26" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="19" cy="11" r="3" fill="var(--accent2)" opacity="0.8"/>
            </svg>
            <span className={styles.logoText}>NōFX<span>Journal</span></span>
          </div>
          <p className={styles.welcome}>Welcome, <strong>{user?.name || 'Trader'}</strong></p>
        </div>

        {/* Progress bar */}
        <div className={styles.progress}>
          {Array.from({ length: totalSteps }, (_, idx) => idx + 1).map(i => (
            <div key={i} className={styles.progressStep}>
              <div className={`${styles.progressDot} ${step >= i ? styles.progressActive : ''} ${step > i ? styles.progressDone : ''}`}>
                {step > i
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  : i}
              </div>
              <span className={styles.progressLabel}>
                {i === 1 ? 'Platform' : i === 2 ? 'Pairs' : i === 3 ? 'Account' : 'Challenge'}
              </span>
            </div>
          ))}
          <div className={styles.progressLine}>
            <div className={styles.progressLineFill} style={{ width: `${((step-1)/(totalSteps-1))*100}%` }}/>
          </div>
        </div>

        {/* ─── STEP 1 ─── */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Choose your platform</h2>
            <p className={styles.stepSub}>Select whether you trade with a prop firm or a broker</p>

            <div className={styles.typeToggle}>
              <button
                className={`${styles.typeBtn} ${accountType === 'prop' ? styles.typeBtnActive : ''}`}
                onClick={() => { setAccountType('prop'); setSelected(null); setPlatformQuery('') }}
                type="button"
              >Prop Firm</button>
              <button
                className={`${styles.typeBtn} ${accountType === 'broker' ? styles.typeBtnActive : ''}`}
                onClick={() => { setAccountType('broker'); setSelected(null); setPlatformQuery('') }}
                type="button"
              >Broker</button>
            </div>

            {accountType && (
              <>
                <div className={styles.searchWrap}>
                  <Search size={16} strokeWidth={2} className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    type="text"
                    placeholder={accountType === 'prop' ? 'Search prop firms…' : 'Search brokers…'}
                    value={platformQuery}
                    onChange={e => setPlatformQuery(e.target.value)}
                  />
                </div>
                <div className={styles.grid}>
                {filteredList.length === 0 && (
                  <div className={styles.noResults}>No matches found.</div>
                )}
                {filteredList.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.platformCard} ${selected === item.id ? styles.platformCardActive : ''}`}
                    onClick={() => setSelected(item.id)}
                    style={{ '--item-color': item.color }}
                  >
                    <div className={styles.platformIcon} style={{ background: item.color + '22', color: item.color }}>
                      {item.name.charAt(0)}
                    </div>
                    <span className={styles.platformName}>{item.name}</span>
                    {selected === item.id && (
                      <div className={styles.checkmark}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                  </button>
                ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── STEP 2 ─── */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Select trading pairs</h2>
            <p className={styles.stepSub}>Choose the instruments you trade</p>
            <div className={styles.searchWrap}>
              <Search size={16} strokeWidth={2} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search pairs…"
                value={pairQuery}
                onChange={e => setPairQuery(e.target.value)}
              />
            </div>
            <div className={styles.pairsGrid}>
              {filteredPairs.length === 0 && (
                <div className={styles.noResults}>No matches found.</div>
              )}
              {filteredPairs.map(pair => (
                <button
                  key={pair.id}
                  type="button"
                  className={`${styles.pairCard} ${pairs.includes(pair.id) ? styles.pairCardActive : ''}`}
                  onClick={() => togglePair(pair.id)}
                >
                  <span className={styles.pairSymbol}>{pair.symbol}</span>
                  <span className={styles.pairName}>{pair.name}</span>
                  {pairs.includes(pair.id) && (
                    <div className={styles.pairCheck}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── STEP 3 ─── */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Account details</h2>
            <p className={styles.stepSub}>Enter your starting account balance</p>
            <div className={styles.accountField}>
              <label className={styles.label}>Account Balance (USD)</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputPrefix}>$</span>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  placeholder="10000"
                  value={accountSize}
                  onChange={e => { setAccountSize(e.target.value); setError('') }}
                />
              </div>
            </div>

            <div className={styles.summary}>
              <h3>Summary</h3>
              <div className={styles.summaryRow}>
                <span>Platform</span>
                <strong>{accountType === 'prop' ? 'Prop Firm' : 'Broker'} — {list.find(x => x.id === selected)?.name}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Pairs</span>
                <strong>{pairs.length} selected</strong>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 4 (prop firms only) ─── */}
        {step === 4 && accountType === 'prop' && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Challenge tracking</h2>
            <p className={styles.stepSub}>Set your firm's rules so we can monitor drawdown, targets and risk for you</p>

            <div className={styles.typeToggle}>
              <button
                className={`${styles.typeBtn} ${challengeEnabled ? styles.typeBtnActive : ''}`}
                onClick={() => setChallengeEnabled(true)}
                type="button"
              >Track my challenge</button>
              <button
                className={`${styles.typeBtn} ${!challengeEnabled ? styles.typeBtnActive : ''}`}
                onClick={() => setChallengeEnabled(false)}
                type="button"
              >Skip for now</button>
            </div>

            {challengeEnabled && (
              <>
                <div className={styles.accountField}>
                  <label className={styles.label}>Current Phase</label>
                  <div className={styles.typeToggle}>
                    {PHASES.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className={`${styles.typeBtn} ${phase === p.id ? styles.typeBtnActive : ''}`}
                        onClick={() => setPhase(p.id)}
                      >{p.name}</button>
                    ))}
                  </div>
                </div>

                <div className={styles.accountField}>
                  <label className={styles.label}>Profit Target (%)</label>
                  <div className={styles.inputWrap}>
                    <input className={`${styles.input} ${styles.suffixed}`} type="number" min="0" step="0.1" value={profitTarget}
                      onChange={e => setProfitTarget(e.target.value)} />
                    <span className={styles.inputSuffix}>%</span>
                  </div>
                </div>

                <div className={styles.accountField}>
                  <label className={styles.label}>Max Daily Loss (%)</label>
                  <div className={styles.inputWrap}>
                    <input className={`${styles.input} ${styles.suffixed}`} type="number" min="0" step="0.1" value={dailyLoss}
                      onChange={e => setDailyLoss(e.target.value)} />
                    <span className={styles.inputSuffix}>%</span>
                  </div>
                </div>

                <div className={styles.accountField}>
                  <label className={styles.label}>Max Overall Drawdown (%)</label>
                  <div className={styles.inputWrap}>
                    <input className={`${styles.input} ${styles.suffixed}`} type="number" min="0" step="0.1" value={maxDrawdown}
                      onChange={e => setMaxDrawdown(e.target.value)} />
                    <span className={styles.inputSuffix}>%</span>
                  </div>
                </div>

                <div className={styles.accountField}>
                  <label className={styles.label}>Minimum Trading Days</label>
                  <div className={styles.inputWrap}>
                    <input className={styles.input} type="number" min="0" step="1" value={minDays}
                      onChange={e => setMinDays(e.target.value)} />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div className={styles.actions}>
          {step > 1 && (
            <button className={styles.backBtn} type="button" onClick={() => { setStep(s => s-1); setError('') }}>
              Back
            </button>
          )}
          <button className={styles.nextBtn} type="button" onClick={handleNext}>
            {step < totalSteps ? 'Next' : 'Start Journaling'}
          </button>
        </div>
      </div>
    </div>
  )
}
