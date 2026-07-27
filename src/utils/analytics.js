// ─── PIP / SESSION HELPERS ───
export function pipSize(symbol = '') {
  const s = symbol.toUpperCase()
  if (s.includes('JPY')) return 0.01
  if (s.includes('XAU') || s.includes('GOLD')) return 0.1
  if (s.includes('XAG') || s.includes('SILVER')) return 0.01
  if (s.includes('BTC') || s.includes('ETH')) return 1
  if (s.includes('US30') || s.includes('NAS') || s.includes('SPX') || s.includes('DOW')) return 1
  return 0.0001
}

export function calcPips(trade) {
  const pip = pipSize(trade.symbol)
  if (!pip || !trade.openPrice || !trade.closePrice) return 0
  const isSell = trade.type === 'sell' || trade.type === 'short'
  const diff = isSell ? (trade.openPrice - trade.closePrice) : (trade.closePrice - trade.openPrice)
  return diff / pip
}

// Session windows in UTC. Overlaps are collapsed into a single label.
export function getSession(openTime) {
  const d = new Date(openTime)
  const h = d.getUTCHours()
  if (h >= 0 && h < 7) return 'Asian'
  if (h >= 7 && h < 12) return 'London'
  if (h >= 12 && h < 16) return 'London / New York'
  if (h >= 16 && h < 21) return 'New York'
  return 'Asian'
}

// Best-effort detection of whether the trade closed via its take-profit,
// so we can report a meaningful "time to TP" for the day.
export function hitTakeProfit(trade) {
  if (trade.closeReason && /tp|take.?profit/i.test(trade.closeReason)) return true
  if (!trade.tp || !trade.closePrice) return false
  const pip = pipSize(trade.symbol)
  return Math.abs(trade.closePrice - trade.tp) <= pip * 3
}

// ─── CSV PARSER ───
export function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const trades = []

  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i])
    if (vals.length < 2) continue
    const row = {}
    headers.forEach((h, idx) => { row[h] = vals[idx]?.trim() ?? '' })

    // Normalise field names
    const openTime  = row['opening_time_utc'] || row['open_time'] || row['opentime'] || row['open'] || ''
    const closeTime = row['closing_time_utc'] || row['close_time'] || row['closetime'] || row['close'] || ''
    const symbol    = (row['symbol'] || row['pair'] || row['instrument'] || '').replace(/m$/, '').toUpperCase()
    const type      = (row['type'] || row['direction'] || row['side'] || '').toLowerCase()
    const profit    = parseFloat(row['profit'] || row['pnl'] || row['pl'] || 0) || 0
    const lots      = parseFloat(row['lots'] || row['volume'] || row['size'] || 0) || 0
    const openPrice  = parseFloat(row['opening_price'] || row['open_price'] || row['entry'] || 0) || 0
    const closePrice = parseFloat(row['closing_price'] || row['close_price'] || row['exit'] || 0) || 0
    const sl         = parseFloat(row['stop_loss'] || row['sl'] || 0) || 0
    const tp         = parseFloat(row['take_profit'] || row['tp'] || 0) || 0
    const ticket     = row['ticket'] || row['id'] || String(i)
    const closeReason = row['close_reason'] || row['reason'] || ''

    if (!openTime || !closeTime) continue

    const openMs  = new Date(openTime).getTime()
    const closeMs = new Date(closeTime).getTime()
    if (isNaN(openMs) || isNaN(closeMs)) continue

    const holdingMinutes = Math.max(0, Math.round((closeMs - openMs) / 60000))

    const trade = {
      ticket, symbol, type, profit, lots, openPrice, closePrice,
      sl, tp, openTime, closeTime, holdingMinutes, closeReason,
      isWin: profit > 0,
      date: openTime.split('T')[0],
    }
    trade.pips = calcPips(trade)
    trade.session = getSession(openTime)
    trade.hitTP = hitTakeProfit(trade)
    trade.timeToTP = trade.hitTP ? holdingMinutes : null

    trades.push(trade)
  }
  return trades
}

function splitCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQuotes = !inQuotes }
    else if (c === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += c }
  }
  result.push(current)
  return result
}

// ─── ANALYTICS ───
export function calcAnalytics(trades, accountSize = 10000) {
  if (!trades.length) return null

  const wins  = trades.filter(t => t.isWin)
  const losses = trades.filter(t => !t.isWin)
  const totalProfit = trades.reduce((s, t) => s + t.profit, 0)
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0

  // Average win / loss
  const avgWin  = wins.length  ? wins.reduce((s,t) => s + t.profit, 0)  / wins.length  : 0
  const avgLoss = losses.length ? losses.reduce((s,t) => s + t.profit, 0) / losses.length : 0

  // Average holding time (in minutes)
  const avgHolding = trades.reduce((s,t) => s + t.holdingMinutes, 0) / trades.length

  // Win / Loss streaks
  let maxWinStreak = 0, maxLossStreak = 0
  let curWin = 0, curLoss = 0
  trades.forEach(t => {
    if (t.isWin) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin) }
    else { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss) }
  })

  // By day
  const byDay = {}
  trades.forEach(t => {
    if (!byDay[t.date]) byDay[t.date] = { profit: 0, count: 0, pips: 0, trades: [] }
    byDay[t.date].profit += t.profit
    byDay[t.date].count += 1
    byDay[t.date].pips += t.pips
    byDay[t.date].trades.push(t)
  })
  const days = Object.entries(byDay).map(([date, v]) => ({ date, ...v }))
  const mostTradeDay   = days.sort((a,b) => b.count - a.count)[0]
  const mostProfitDay  = [...days].sort((a,b) => b.profit - a.profit)[0]
  const mostLosingDay  = [...days].sort((a,b) => a.profit - b.profit)[0]

  // By pair
  const byPair = {}
  trades.forEach(t => {
    if (!byPair[t.symbol]) byPair[t.symbol] = { profit: 0, count: 0 }
    byPair[t.symbol].profit += t.profit
    byPair[t.symbol].count += 1
  })
  const pairs = Object.entries(byPair).map(([symbol, v]) => ({ symbol, ...v }))
  const mostProfitPair = [...pairs].sort((a,b) => b.profit - a.profit)[0]
  const mostLosingPair = [...pairs].sort((a,b) => a.profit - b.profit)[0]

  // Max drawdown (running equity)
  let peak = accountSize
  let maxDD = 0
  let equity = accountSize
  trades.forEach(t => {
    equity += t.profit
    if (equity > peak) peak = equity
    const dd = peak - equity
    if (dd > maxDD) maxDD = dd
  })
  const maxDrawdownPct = peak > 0 ? (maxDD / peak) * 100 : 0

  // Account yield
  const accountYield = (totalProfit / accountSize) * 100

  // Active days
  const activeDays = Object.keys(byDay).length

  // RR and expectancy
  const rr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0
  const expectancy = (winRate / 100) * avgWin + ((1 - winRate / 100) * avgLoss)

  // Equity curve (cumulative)
  let cum = accountSize
  const equityCurve = trades.map((t, i) => {
    cum += t.profit
    return { index: i + 1, equity: cum, date: t.date }
  })

  // Daily P&L
  const dailyPnL = days.map(d => ({ date: d.date, profit: d.profit, count: d.count }))
    .sort((a,b) => a.date.localeCompare(b.date))

  // Pair performance
  const pairPerformance = pairs.sort((a,b) => b.profit - a.profit)

  return {
    totalTrades: trades.length,
    totalWins: wins.length,
    totalLosses: losses.length,
    totalProfit,
    winRate,
    avgWin,
    avgLoss,
    avgHolding,
    maxWinStreak,
    maxLossStreak,
    mostTradeDay,
    mostProfitDay,
    mostLosingDay,
    mostProfitPair,
    mostLosingPair,
    maxDrawdownPct,
    maxDrawdown: maxDD,
    accountYield,
    activeDays,
    rr,
    expectancy,
    equityCurve,
    dailyPnL,
    pairPerformance,
    byDay,
  }
}

// ─── CHALLENGE TRACKING ───
// cfg: { enabled, phase, profitTargetPct, dailyLossPct, maxDrawdownPct, minTradingDays }
export function calcChallenge(analytics, accountSize, cfg) {
  if (!analytics || !cfg?.enabled) return null

  const totalProfit = analytics.totalProfit
  const equity = accountSize + totalProfit

  // Profit target
  const profitTargetAmount = accountSize * (cfg.profitTargetPct / 100)
  const profitProgressPct = profitTargetAmount > 0
    ? Math.max(0, Math.min(100, (totalProfit / profitTargetAmount) * 100))
    : 0
  const remainingTarget = Math.max(0, profitTargetAmount - totalProfit)
  const targetReached = totalProfit >= profitTargetAmount && profitTargetAmount > 0

  // Daily loss — evaluated per trading day against the limit
  const dailyLossLimitAmount = accountSize * (cfg.dailyLossPct / 100)
  const days = Object.entries(analytics.byDay).map(([date, v]) => ({ date, profit: v.profit }))
  const dailyBreachDays = days.filter(d => d.profit < 0 && Math.abs(d.profit) >= dailyLossLimitAmount)
  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const lastDay = sortedDays[sortedDays.length - 1] || null
  const lastDayLoss = lastDay && lastDay.profit < 0 ? Math.abs(lastDay.profit) : 0
  const lastDayLossPct = dailyLossLimitAmount > 0 ? (lastDayLoss / dailyLossLimitAmount) * 100 : 0

  // Max overall drawdown (trailing peak-to-trough, computed in calcAnalytics)
  const maxDrawdownAmount = accountSize * (cfg.maxDrawdownPct / 100)
  const ddUsedPct = maxDrawdownAmount > 0 ? (analytics.maxDrawdown / maxDrawdownAmount) * 100 : 0
  const ddBreached = maxDrawdownAmount > 0 && analytics.maxDrawdown >= maxDrawdownAmount

  // Trading days
  const tradingDays = analytics.activeDays
  const minTradingDays = cfg.minTradingDays || 0
  const minDaysMet = tradingDays >= minTradingDays
  const daysRemaining = Math.max(0, minTradingDays - tradingDays)

  // Violations (hard breaches) & risk alerts (approaching limits, 80%+)
  const violations = []
  const alerts = []

  if (ddBreached) {
    violations.push({ type: 'drawdown', message: `Max drawdown limit breached — ${analytics.maxDrawdownPct.toFixed(2)}% used` })
  } else if (ddUsedPct >= 80) {
    alerts.push({ type: 'drawdown', message: `Max drawdown at ${ddUsedPct.toFixed(0)}% of limit` })
  }

  dailyBreachDays.forEach(d => {
    violations.push({ type: 'dailyLoss', message: `Daily loss limit breached on ${d.date}` })
  })
  if (!dailyBreachDays.some(d => d.date === lastDay?.date) && lastDayLossPct >= 80 && lastDayLossPct < 100) {
    alerts.push({ type: 'dailyLoss', message: `Daily loss at ${lastDayLossPct.toFixed(0)}% of limit on ${lastDay.date}` })
  }

  const accountHealth = violations.length ? 'breached' : alerts.length ? 'warning' : 'healthy'

  return {
    phase: cfg.phase,
    equity,
    totalProfit,
    profitTargetAmount,
    profitProgressPct,
    remainingTarget,
    targetReached,
    dailyLossLimitAmount,
    lastDayLoss,
    lastDayLossPct,
    dailyBreachDays,
    maxDrawdownAmount,
    ddUsedPct: Math.max(0, Math.min(100, ddUsedPct)),
    ddBreached,
    tradingDays,
    minTradingDays,
    minDaysMet,
    daysRemaining,
    violations,
    alerts,
    accountHealth,
  }
}

export function formatMinutes(mins) {
  if (mins < 60) return `${mins}m`
  if (mins < 1440) return `${Math.floor(mins/60)}h ${mins % 60}m`
  return `${Math.floor(mins/1440)}d ${Math.floor((mins%1440)/60)}h`
}

export function formatCurrency(val, decimals = 2) {
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : val > 0 ? '+' : ''
  return `${sign}$${abs.toFixed(decimals)}`
}
