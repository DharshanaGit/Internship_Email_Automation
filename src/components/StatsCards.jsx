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

  const deliverabilityRate = total > 0 ? ((accepted / total) * 100).toFixed(1) : '100.0';

  return (
    <div className={styles.analyticsGrid}>
      {/* 1. Total Campaign Dispatches */}
      <div className={styles.metricCard}>
        <div className={styles.cardHeader}>
          <span className={styles.metricTitle}>Total Outreach</span>
          <div className={styles.iconCircle}>
            <MailIcon size={14} />
          </div>
        </div>
        <div className={styles.metricValue}>{total.toLocaleString()}</div>
        <div className={styles.metaRow}>
          <div className={styles.progressBar}>
            <div className={styles.fillSlate} style={{ width: total > 0 ? '100%' : '0%' }} />
          </div>
          <span className={styles.metaCaption}>Tracked transmissions</span>
        </div>
      </div>

      {/* 2. SMTP Accepted (250 OK) */}
      <div className={`${styles.metricCard} ${styles.cardDelivered}`}>
        <div className={styles.cardHeader}>
          <span className={styles.metricTitle}>Delivered (250 OK)</span>
          <div className={`${styles.iconCircle} ${styles.iconTeal}`}>
            <CheckCircleIcon size={14} />
          </div>
        </div>
        <div className={`${styles.metricValue} ${styles.valTeal}`}>{accepted.toLocaleString()}</div>
        <div className={styles.metaRow}>
          <div className={styles.progressBar}>
            <div className={styles.fillTeal} style={{ width: `${Math.min(100, Math.round(Number(deliverabilityRate)))}%` }} />
          </div>
          <span className={styles.metaCaption}>
            <strong>{deliverabilityRate}%</strong> Deliverability Rate
          </span>
        </div>
      </div>

      {/* 3. Failed Attempts */}
      <div className={`${styles.metricCard} ${styles.cardFailed}`}>
        <div className={styles.cardHeader}>
          <span className={styles.metricTitle}>Failed Attempts</span>
          <div className={`${styles.iconCircle} ${styles.iconRose}`}>
            <AlertCircleIcon size={14} />
          </div>
        </div>
        <div className={`${styles.metricValue} ${styles.valRose}`}>{failed.toLocaleString()}</div>
        <div className={styles.metaRow}>
          <div className={styles.progressBar}>
            <div className={styles.fillRose} style={{ width: total > 0 ? `${Math.min(100, Math.round((failed / total) * 100))}%` : '0%' }} />
          </div>
          <span className={styles.metaCaption}>Bounces &amp; transient errors</span>
        </div>
      </div>

      {/* 4. Queue Pending */}
      <div className={`${styles.metricCard} ${styles.cardPending}`}>
        <div className={styles.cardHeader}>
          <span className={styles.metricTitle}>Pending Queue</span>
          <div className={`${styles.iconCircle} ${styles.iconAmber}`}>
            <ClockIcon size={14} />
          </div>
        </div>
        <div className={`${styles.metricValue} ${styles.valAmber}`}>{pending.toLocaleString()}</div>
        <div className={styles.metaRow}>
          <div className={styles.progressBar}>
            <div className={styles.fillAmber} style={{ width: pending > 0 ? '60%' : '0%' }} />
          </div>
          <span className={styles.metaCaption}>Awaiting worker cycle</span>
        </div>
      </div>

      {/* 5. Active In Flight */}
      <div className={`${styles.metricCard} ${styles.cardProcessing}`}>
        <div className={styles.cardHeader}>
          <span className={styles.metricTitle}>In Flight</span>
          <div className={`${styles.iconCircle} ${styles.iconProcessing}`}>
            <RefreshCwIcon size={14} className={processing > 0 ? styles.spinAnimation : ''} />
          </div>
        </div>
        <div className={`${styles.metricValue} ${styles.valProcessing}`}>{processing.toLocaleString()}</div>
        <div className={styles.metaRow}>
          <div className={styles.progressBar}>
            <div className={styles.fillProcessing} style={{ width: processing > 0 ? '100%' : '0%' }} />
          </div>
          <span className={styles.metaCaption}>Socket actively streaming</span>
        </div>
      </div>

      {/* 6. Cooldown Collision Shield */}
      <div className={`${styles.metricCard} ${styles.cardShield}`}>
        <div className={styles.cardHeader}>
          <span className={styles.metricTitle}>Collision Guard</span>
          <div className={`${styles.iconCircle} ${styles.iconLime}`}>
            <ShieldAlertIcon size={14} />
          </div>
        </div>
        <div className={`${styles.metricValue} ${styles.valLime}`}>{duplicates_blocked.toLocaleString()}</div>
        <div className={styles.metaRow}>
          <div className={styles.progressBar}>
            <div className={styles.fillLime} style={{ width: '100%' }} />
          </div>
          <span className={styles.metaCaption}>30-day duplicates blocked</span>
        </div>
      </div>

      {/* 7. Ambiguous Unknown (if present) */}
      {unknown > 0 && (
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.metricTitle}>Uncertain Handshake</span>
            <div className={styles.iconCircle}>
              <HelpCircleIcon size={14} />
            </div>
          </div>
          <div className={styles.metricValue}>{unknown.toLocaleString()}</div>
          <div className={styles.metaRow}>
            <span className={styles.metaCaption}>Handshake timed out</span>
          </div>
        </div>
      )}
    </div>
  );
}
