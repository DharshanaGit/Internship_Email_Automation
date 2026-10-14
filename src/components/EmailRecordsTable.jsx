'use client';

import React, { useState } from 'react';
import styles from './EmailRecordsTable.module.css';
import {
  SearchIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  HelpCircleIcon,
  EyeIcon,
  MailIcon,
  CloseIcon
} from './Icons.jsx';

export default function EmailRecordsTable({
  records = [],
  total = 0,
  currentStatus = 'all',
  searchQuery = '',
  onStatusChange,
  onSearchChange,
  onRefresh,
  onRetryRecord,
  isRetryingId = null,
}) {
  const [selectedRecord, setSelectedRecord] = useState(null);

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className={`${styles.badge} ${styles.badgeAccepted}`}>
            <CheckCircleIcon size={12} />
            <span>Accepted</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className={`${styles.badge} ${styles.badgeFailed}`}>
            <AlertCircleIcon size={12} />
            <span>Failed</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className={`${styles.badge} ${styles.badgePending}`}>
            <ClockIcon size={12} />
            <span>Pending</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className={`${styles.badge} ${styles.badgeProcessing}`}>
            <RefreshCwIcon size={12} className="spin" />
            <span>Processing</span>
          </span>
        );
      case 'UNKNOWN':
        return (
          <span className={`${styles.badge} ${styles.badgeUnknown}`}>
            <HelpCircleIcon size={12} />
            <span>Unknown</span>
          </span>
        );
      default:
        return <span className={styles.badge}>{status}</span>;
    }
  };

  return (
    <div className={styles.tableCard}>
      {/* Header with Search and Status Filter Tabs */}
      <div className={styles.tableHeader}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Outreach Audit &amp; Delivery Ledger</h3>
          <p className={styles.subtitle}>
            Real-time status of all dispatched and pending campus communications ({total} records)
          </p>
        </div>

        <div className={styles.filterControls}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}><SearchIcon size={14} /></span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search college, email, dept..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <div className={styles.statusFilterTabs}>
            {[
              { id: 'all', label: 'All' },
              { id: 'ACCEPTED', label: 'Accepted' },
              { id: 'FAILED', label: 'Failed' },
              { id: 'PENDING', label: 'Pending' },
              { id: 'PROCESSING', label: 'Active' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.filterTab} ${currentStatus === tab.id ? styles.filterTabActive : ''}`}
                onClick={() => onStatusChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.refreshBtn}
            onClick={onRefresh}
            title="Refresh logs from database"
          >
            <RefreshCwIcon size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className={styles.tableResponsive}>
        {records.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <MailIcon size={24} />
            </div>
            <div className={styles.emptyTitle}>No outreach records found</div>
            <p className={styles.emptyDesc}>
              {searchQuery || currentStatus !== 'all'
                ? 'Try adjusting your search criteria or status filter.'
                : 'Use the manual entry form above to initiate your first campus partnership proposal.'}
            </p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>College &amp; Department</th>
                <th>Recipient Contact</th>
                <th>Delivery Status</th>
                <th>Attempts</th>
                <th>Dispatched At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} className={styles.row}>
                  <td>
                    <div className={styles.collegeCol}>
                      <span className={styles.collegeName}>{rec.college_name}</span>
                      <span className={styles.department}>{rec.department}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.emailCol}>
                      <span className={styles.recipientEmail}>{rec.email}</span>
                      {rec.contact_person && (
                        <span className={styles.contactPerson}>
                          {rec.contact_person} {rec.designation ? `(${rec.designation})` : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>{renderStatusBadge(rec.status)}</div>
                    {rec.error_message && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#f87171',
                          marginTop: '4px',
                          maxWidth: '220px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={rec.error_message}
                      >
                        {rec.error_message}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={styles.attemptsBadge}>{rec.attempts || 1}</span>
                    {rec.failure_type && rec.failure_type !== 'NONE' && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {rec.failure_type}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={styles.timestamp}>
                      {formatTimestamp(rec.sent_at || rec.created_at)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionCell}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => setSelectedRecord(rec)}
                        title="View exact proposal content sent"
                      >
                        <EyeIcon size={12} />
                        <span>View</span>
                      </button>

                      {(rec.status === 'FAILED' || rec.status === 'UNKNOWN') && (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.retryBtn}`}
                          onClick={() => onRetryRecord(rec.id)}
                          disabled={isRetryingId === rec.id}
                          title="Retry dispatching this proposal via SMTP"
                        >
                          {isRetryingId === rec.id ? (
                            <RefreshCwIcon size={12} className="spin" />
                          ) : (
                            <RefreshCwIcon size={12} />
                          )}
                          <span>{isRetryingId === rec.id ? 'Retrying...' : 'Retry'}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View Record Content Modal */}
      {selectedRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => e.target === e.currentTarget && setSelectedRecord(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '750px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
              }}
            >
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Proposal for {selectedRecord.college_name}
                </h4>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Recipient: {selectedRecord.email} | Status: {selectedRecord.status}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                style={{ color: 'var(--text-secondary)', padding: '4px' }}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div
                style={{
                  background: '#ffffff',
                  padding: '24px',
                  borderRadius: 'var(--radius-sm)',
                  color: '#1e293b',
                  fontSize: '13px',
                  lineHeight: '1.6',
                }}
              >
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    marginBottom: '14px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  Subject: {selectedRecord.subject}
                </div>
                <div dangerouslySetInnerHTML={{ __html: selectedRecord.body_html }} />
              </div>

              {selectedRecord.error_message && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: 'var(--status-failed-bg)',
                    border: '1px solid var(--status-failed-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--status-failed-text)',
                    fontSize: '12px',
                  }}
                >
                  <strong>Failure Diagnostic Log:</strong>
                  <pre
                    style={{
                      marginTop: '6px',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                    }}
                  >
                    {selectedRecord.error_message}
                  </pre>
                </div>
              )}
            </div>

            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'flex-end',
                background: 'var(--bg-secondary)',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
