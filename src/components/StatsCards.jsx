import React from 'react';
import styles from './StatsCards.module.css';
import {
  MailIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  HelpCircleIcon
} from './Icons.jsx';

export default function StatsCards({ stats = {} }) {
  const {
    total = 0,
    accepted = 0,
    failed = 0,
    pending = 0,
    processing = 0,
    unknown = 0,
    duplicates_blocked = 0,
  } = stats;

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardLabel}>Total Outreach</span>
          <div className={styles.iconWrapper}>
            <MailIcon size={16} />
          </div>
        </div>
        <div className={styles.value}>{total}</div>
        <div className={styles.subtext}>All tracked communications</div>
      </div>

      <div className={`${styles.card} ${styles.cardAccepted}`}>
        <div className={styles.cardHeader}>
          <span className={styles.cardLabel} style={{ color: 'var(--status-accepted-text)' }}>
            SMTP Accepted
          </span>
          <div className={styles.iconWrapper} style={{ color: 'var(--status-accepted-text)' }}>
            <CheckCircleIcon size={16} />
          </div>
        </div>
        <div className={styles.value} style={{ color: 'var(--status-accepted-text)' }}>
          {accepted}
        </div>
        <div className={styles.subtext}>250 OK acknowledgment</div>
      </div>

      <div className={`${styles.card} ${styles.cardFailed}`}>
        <div className={styles.cardHeader}>
          <span className={styles.cardLabel} style={{ color: 'var(--status-failed-text)' }}>
            Failed Attempts
          </span>
          <div className={styles.iconWrapper} style={{ color: 'var(--status-failed-text)' }}>
            <AlertCircleIcon size={16} />
          </div>
        </div>
        <div className={styles.value} style={{ color: 'var(--status-failed-text)' }}>
          {failed}
        </div>
        <div className={styles.subtext}>Permanent or transient fails</div>
      </div>

      <div className={`${styles.card} ${styles.cardPending}`}>
        <div className={styles.cardHeader}>
          <span className={styles.cardLabel} style={{ color: 'var(--status-pending-text)' }}>
            Pending Queue
          </span>
          <div className={styles.iconWrapper} style={{ color: 'var(--status-pending-text)' }}>
            <ClockIcon size={16} />
          </div>
        </div>
        <div className={styles.value} style={{ color: 'var(--status-pending-text)' }}>
          {pending}
        </div>
        <div className={styles.subtext}>Awaiting worker dispatch</div>
      </div>

      <div className={`${styles.card} ${styles.cardProcessing}`}>
        <div className={styles.cardHeader}>
          <span className={styles.cardLabel} style={{ color: 'var(--status-processing-text)' }}>
            Processing
          </span>
          <div className={styles.iconWrapper} style={{ color: 'var(--status-processing-text)' }}>
            <RefreshCwIcon size={16} />
          </div>
        </div>
        <div className={styles.value} style={{ color: 'var(--status-processing-text)' }}>
          {processing}
        </div>
        <div className={styles.subtext}>Worker currently active</div>
      </div>

      {unknown > 0 && (
        <div className={`${styles.card} ${styles.cardUnknown}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel} style={{ color: 'var(--status-unknown-text)' }}>
              Outcome Uncertain
            </span>
            <div className={styles.iconWrapper} style={{ color: 'var(--status-unknown-text)' }}>
              <HelpCircleIcon size={16} />
            </div>
          </div>
          <div className={styles.value} style={{ color: 'var(--status-unknown-text)' }}>
            {unknown}
          </div>
          <div className={styles.subtext}>Timeout / Ambiguous response</div>
        </div>
      )}

      <div className={`${styles.card} ${styles.cardDuplicates}`}>
        <div className={styles.cardHeader}>
          <span className={styles.cardLabel} style={{ color: 'var(--accent-primary)' }}>
            Dupe Shield
          </span>
          <div className={styles.iconWrapper} style={{ color: 'var(--accent-primary)' }}>
            <ShieldAlertIcon size={16} />
          </div>
        </div>
        <div className={styles.value} style={{ color: 'var(--accent-primary)' }}>
          {duplicates_blocked}
        </div>
        <div className={styles.subtext}>Cooldownguard protected</div>
      </div>
    </div>
  );
}
