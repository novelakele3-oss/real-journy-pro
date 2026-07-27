import styles from './StatCard.module.css'

export default function StatCard({ label, value, icon, accent }) {
  const accentClass = accent === 'success' ? styles.success : accent === 'danger' ? styles.danger : ''
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.icon}>{icon}</span>
        <span className={`${styles.value} ${accentClass}`}>{value}</span>
      </div>
      <div className={styles.label}>{label}</div>
    </div>
  )
}
