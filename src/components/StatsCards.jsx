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
    <div className={styles.statsRibbon}>
      {/* 1. Total Outreach */}
      <div className={styles.statMetricCard}>
        <div className={styles.cardTopRow}>
          <span className={styles.metricLabel}>Total Tracked Outreach</span>
          <div className={styles.iconChip}>
            <MailIcon size={14} />
          </div>
        </div>
        <div className={styles.metricNumber}>{total.toLocaleString()}</div>
        <div className={styles.metricFootnote}>All campus dispatches</div>
      </div>

      {/* 2. SMTP Accepted 250 OK */}
      <div className={`${styles.statMetricCard} ${styles.metricAccepted}`}>
        <div className={styles.cardTopRow}>
          <span className={styles.metricLabel}>Delivered (250 OK)</span>
          <div className={`${styles.iconChip} ${styles.iconChipGreen}`}>
            <CheckCircleIcon size={14} />
          </div>
        </div>
        <div className={`${styles.metricNumber} ${styles.numberGreen}`}>{accepted.toLocaleString()}</div>
        <div className={styles.metricFootnote}>Direct inbox acknowledgment</div>
      </div>

      {/* 3. Failed Attempts */}
      <div className={`${styles.statMetricCard} ${styles.metricFailed}`}>
        <div className={styles.cardTopRow}>
          <span className={styles.metricLabel}>Failed Dispatches</span>
          <div className={`${styles.iconChip} ${styles.iconChipRed}`}>
            <AlertCircleIcon size={14} />
          </div>
        </div>
        <div className={`${styles.metricNumber} ${styles.numberRed}`}>{failed.toLocaleString()}</div>
        <div className={styles.metricFootnote}>Bounce or transient errors</div>
      </div>

      {/* 4. Pending Queue */}
      <div className={`${styles.statMetricCard} ${styles.metricPending}`}>
        <div className={styles.cardTopRow}>
          <span className={styles.metricLabel}>Queue Pending</span>
          <div className={`${styles.iconChip} ${styles.iconChipAmber}`}>
            <ClockIcon size={14} />
          </div>
        </div>
        <div className={`${styles.metricNumber} ${styles.numberAmber}`}>{pending.toLocaleString()}</div>
        <div className={styles.metricFootnote}>Awaiting worker cycle</div>
      </div>

      {/* 5. Currently Processing */}
      <div className={`${styles.statMetricCard} ${styles.metricProcessing}`}>
        <div className={styles.cardTopRow}>
          <span className={styles.metricLabel}>In Flight</span>
          <div className={`${styles.iconChip} ${styles.iconChipBlue}`}>
            <RefreshCwIcon size={14} className={processing > 0 ? styles.activeSpin : ''} />
          </div>
        </div>
        <div className={`${styles.metricNumber} ${styles.numberBlue}`}>{processing.toLocaleString()}</div>
        <div className={styles.metricFootnote}>Active transmission</div>
      </div>

      {/* 6. Cooldown Collision Shield */}
      <div className={`${styles.statMetricCard} ${styles.metricShield}`}>
        <div className={styles.cardTopRow}>
          <span className={styles.metricLabel}>30d Collision Shield</span>
          <div className={`${styles.iconChip} ${styles.iconChipCrimson}`}>
            <ShieldAlertIcon size={14} />
          </div>
        </div>
        <div className={`${styles.metricNumber} ${styles.numberCrimson}`}>{duplicates_blocked.toLocaleString()}</div>
        <div className={styles.metricFootnote}>Duplicate emails protected</div>
      </div>

      {/* 7. Ambiguous / Unknown (conditional) */}
      {unknown > 0 && (
        <div className={`${styles.statMetricCard} ${styles.metricUnknown}`}>
          <div className={styles.cardTopRow}>
            <span className={styles.metricLabel}>Uncertain Outcome</span>
            <div className={styles.iconChip}>
              <HelpCircleIcon size={14} />
            </div>
          </div>
          <div className={styles.metricNumber}>{unknown.toLocaleString()}</div>
          <div className={styles.metricFootnote}>Handshake timeout</div>
        </div>
      )}
    </div>
  );
}
