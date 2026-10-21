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

  const deliveryRate = total > 0 ? Math.round((accepted / total) * 100) : 100;

  return (
    <div className={styles.statsContainer}>
      {/* 1. Total Outreach Module */}
      <div className={styles.statPanel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>Total Outreach</span>
          <div className={styles.iconCircle}>
            <MailIcon size={14} />
          </div>
        </div>
        <div className={styles.statValue}>{total.toLocaleString()}</div>
        <div className={styles.progressRow}>
          <div className={styles.barBackground}>
            <div className={styles.barFillNeutral} style={{ width: total > 0 ? '100%' : '0%' }} />
          </div>
          <span className={styles.barCaption}>All campus records</span>
        </div>
      </div>

      {/* 2. SMTP Accepted 250 OK */}
      <div className={`${styles.statPanel} ${styles.panelAccepted}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>Delivered (250 OK)</span>
          <div className={`${styles.iconCircle} ${styles.iconGreen}`}>
            <CheckCircleIcon size={14} />
          </div>
        </div>
        <div className={`${styles.statValue} ${styles.textGreen}`}>{accepted.toLocaleString()}</div>
        <div className={styles.progressRow}>
          <div className={styles.barBackground}>
            <div className={styles.barFillGreen} style={{ width: `${deliveryRate}%` }} />
          </div>
          <span className={styles.barCaption}>
            {deliveryRate}% Inbox Handshake
          </span>
        </div>
      </div>

      {/* 3. Failed Attempts */}
      <div className={`${styles.statPanel} ${styles.panelFailed}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>Failed Dispatches</span>
          <div className={`${styles.iconCircle} ${styles.iconRed}`}>
            <AlertCircleIcon size={14} />
          </div>
        </div>
        <div className={`${styles.statValue} ${styles.textRed}`}>{failed.toLocaleString()}</div>
        <div className={styles.progressRow}>
          <div className={styles.barBackground}>
            <div className={styles.barFillRed} style={{ width: total > 0 ? `${Math.min(100, Math.round((failed / total) * 100))}%` : '0%' }} />
          </div>
          <span className={styles.barCaption}>Transient / Bounced</span>
        </div>
      </div>

      {/* 4. Pending Queue */}
      <div className={`${styles.statPanel} ${styles.panelPending}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>Queue Pending</span>
          <div className={`${styles.iconCircle} ${styles.iconAmber}`}>
            <ClockIcon size={14} />
          </div>
        </div>
        <div className={`${styles.statValue} ${styles.textAmber}`}>{pending.toLocaleString()}</div>
        <div className={styles.progressRow}>
          <div className={styles.barBackground}>
            <div className={styles.barFillAmber} style={{ width: pending > 0 ? '70%' : '0%' }} />
          </div>
          <span className={styles.barCaption}>Awaiting dispatch</span>
        </div>
      </div>

      {/* 5. In Flight Processing */}
      <div className={`${styles.statPanel} ${styles.panelProcessing}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>In Flight</span>
          <div className={`${styles.iconCircle} ${styles.iconBlue}`}>
            <RefreshCwIcon size={14} className={processing > 0 ? styles.spinIcon : ''} />
          </div>
        </div>
        <div className={`${styles.statValue} ${styles.textBlue}`}>{processing.toLocaleString()}</div>
        <div className={styles.progressRow}>
          <div className={styles.barBackground}>
            <div className={styles.barFillBlue} style={{ width: processing > 0 ? '100%' : '0%' }} />
          </div>
          <span className={styles.barCaption}>Active transmission</span>
        </div>
      </div>

      {/* 6. Cooldown Shield */}
      <div className={`${styles.statPanel} ${styles.panelShield}`}>
        <div className={styles.panelHeader}>
          <span className={styles.panelLabel}>30d Collision Guard</span>
          <div className={`${styles.iconCircle} ${styles.iconCoral}`}>
            <ShieldAlertIcon size={14} />
          </div>
        </div>
        <div className={`${styles.statValue} ${styles.textCoral}`}>{duplicates_blocked.toLocaleString()}</div>
        <div className={styles.progressRow}>
          <div className={styles.barBackground}>
            <div className={styles.barFillCoral} style={{ width: '100%' }} />
          </div>
          <span className={styles.barCaption}>Zero spam collisions</span>
        </div>
      </div>

      {/* 7. Uncertain Outcome (if present) */}
      {unknown > 0 && (
        <div className={styles.statPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>Uncertain Handshake</span>
            <div className={styles.iconCircle}>
              <HelpCircleIcon size={14} />
            </div>
          </div>
          <div className={styles.statValue}>{unknown.toLocaleString()}</div>
          <div className={styles.progressRow}>
            <span className={styles.barCaption}>Timeout response</span>
          </div>
        </div>
      )}
    </div>
  );
}
