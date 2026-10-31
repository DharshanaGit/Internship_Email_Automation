'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './web3Deck.module.css';
import {
  Mail,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Send,
  X
} from 'lucide-react';

export default function UnifiedEmailTracker({
  batches = [],
  showToast,
}) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL' | 'OFFER' | 'TASK' | 'REVIEW' | 'WARNING' | 'CERTIFICATE'
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectingEmail, setInspectingEmail] = useState(null);

  // Load emails from API
  const loadEmailLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/emails');
      const data = await res.json();
      if (data.success) {
        setEmails(data.data || data.emails || []);
      }
    } catch (err) {
      console.error('Error loading email logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmailLogs();
  }, []);

  // Filter emails
  const filteredEmails = useMemo(() => {
    return emails.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        const type = (item.emailType || '').toUpperCase();
        if (selectedCategory === 'OFFER' && !type.includes('OFFER')) return false;
        if (selectedCategory === 'TASK' && (!type.includes('TASK') || type.includes('WARNING'))) return false;
        if (selectedCategory === 'REVIEW' && !type.includes('REVIEW')) return false;
        if (selectedCategory === 'WARNING' && !type.includes('WARNING')) return false;
        if (selectedCategory === 'CERTIFICATE' && !type.includes('CERTIFICATE')) return false;
      }

      // Batch filter
      if (selectedBatch !== 'ALL' && item.candidate?.batch !== selectedBatch) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const emailMatch = item.recipientEmail?.toLowerCase().includes(term);
        const nameMatch = item.recipientName?.toLowerCase().includes(term);
        const subMatch = item.subject?.toLowerCase().includes(term);
        const idMatch = item.candidate?.internId?.toLowerCase().includes(term);
        if (!emailMatch && !nameMatch && !subMatch && !idMatch) return false;
      }

      return true;
    });
  }, [emails, selectedCategory, selectedBatch, searchTerm]);

  // Consolidated dynamic batches (ensuring A, B, C, D, E, Solo Interns, and any custom batches are included)
  const allBatches = useMemo(() => {
    const set = new Set();
    ['Batch A', 'Batch B', 'Batch C', 'Batch D', 'Batch E', 'Solo Interns'].forEach(b => set.add(b));
    batches.forEach(b => set.add(typeof b === 'string' ? b : b.batchName));
    emails.forEach(e => {
      if (e.candidate?.batch) set.add(e.candidate.batch);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [batches, emails]);

  // Telemetry metric counts
  const offerCount = emails.filter(e => (e.emailType || '').includes('OFFER')).length;
  const taskCount = emails.filter(e => (e.emailType || '').includes('TASK') && !(e.emailType || '').includes('WARNING')).length;
  const reviewCount = emails.filter(e => (e.emailType || '').includes('REVIEW')).length;
  const warningCount = emails.filter(e => (e.emailType || '').includes('WARNING')).length;
  const certCount = emails.filter(e => (e.emailType || '').includes('CERTIFICATE')).length;

  return (
    <div className={styles.container}>
      {/* 1. Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <div className={styles.titleIcon}>
            <Mail size={22} />
          </div>
          <div>
            <h2 className={styles.mainTitle}>Track Emails</h2>
            <p className={styles.subtitle}>Real-time delivery status, sent messages, and email history across all workflows.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadEmailLogs}
          disabled={loading}
          className={styles.btnSecondary}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Offer Letters</div>
          <div className={styles.metricValue}>{offerCount}</div>
          <div className={styles.metricDesc}>Delivered to Inboxes</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Task Assignments</div>
          <div className={styles.metricValue}>{taskCount}</div>
          <div className={styles.metricDesc}>With Meeting Links</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Reviews & Feedback</div>
          <div className={styles.metricValue}>{reviewCount}</div>
          <div className={styles.metricDesc}>Feedback Reports Sent</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Warning Notices</div>
          <div className={styles.metricValue} style={{ color: '#f87171' }}>{warningCount}</div>
          <div className={styles.metricDesc}>Recorded Warnings</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search email, recipient name, Intern ID, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Emails' },
            { id: 'OFFER', label: 'Offer Letters' },
            { id: 'TASK', label: 'Tasks' },
            { id: 'REVIEW', label: 'Reviews' },
            { id: 'WARNING', label: 'Warnings' },
            { id: 'CERTIFICATE', label: 'Certificates' },
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`${styles.subTabBtn} ${selectedCategory === cat.id ? styles.subTabBtnActive : ''}`}
              style={{ padding: '6px 12px', fontSize: '11.5px' }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className={styles.selectInput}
        >
          <option value="ALL">All Batches</option>
          {allBatches.map((bName) => (
            <option key={bName} value={bName}>{bName}</option>
          ))}
        </select>
      </div>

      {/* Logs Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderRow}>
          <strong style={{ color: '#ffffff', fontSize: '13.5px' }}>
            Showing {filteredEmails.length} Sent Email Records
          </strong>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Recipient</th>
                <th>Stream / Type</th>
                <th>Subject</th>
                <th>Batch</th>
                <th>Status</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#71717a' }}>
                    No email logs found matching the selected stream criteria.
                  </td>
                </tr>
              ) : (
                filteredEmails.map((log) => {
                  const isSent = log.status === 'Sent' || log.status === 'Delivered';
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {new Date(log.sentAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{log.recipientName || 'Candidate'}</div>
                        <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{log.recipientEmail}</div>
                      </td>
                      <td>
                        <span className={
                          log.emailType?.includes('WARNING') ? styles.badgeRose :
                          log.emailType?.includes('CERTIFICATE') ? styles.badgeEmerald :
                          log.emailType?.includes('OFFER') ? styles.badgePurple : styles.badgeAmber
                        }>
                          {log.emailType}
                        </span>
                      </td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.subject}
                      </td>
                      <td>
                        <span className={styles.badgePurple}>{log.candidate?.batch || 'Batch A'}</span>
                      </td>
                      <td>
                        <span className={isSent ? styles.badgeEmerald : styles.badgeRose}>
                          {isSent ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          <span>{log.status}</span>
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setInspectingEmail(log)}
                          className={styles.btnSecondary}
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                        >
                          <Eye size={12} />
                          <span>View Body</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT MODAL */}
      {inspectingEmail && (
        <div className={styles.modalOverlay} onClick={() => setInspectingEmail(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#ffffff' }}>
                Email Dispatch Details
              </h3>
              <button type="button" onClick={() => setInspectingEmail(null)} style={{ color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '14px', fontSize: '13px' }}>
                <div><strong>To:</strong> {inspectingEmail.recipientName} &bull; {inspectingEmail.recipientEmail}</div>
                {inspectingEmail.cc && <div><strong>CC:</strong> {inspectingEmail.cc}</div>}
                <div><strong>Subject:</strong> {inspectingEmail.subject}</div>
                <div><strong>Stream Type:</strong> {inspectingEmail.emailType}</div>
                <div><strong>Sent At:</strong> {new Date(inspectingEmail.sentAt).toLocaleString()}</div>
                {inspectingEmail.meetLink && (
                  <div><strong>Google Meet Link:</strong> <a href={inspectingEmail.meetLink} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>{inspectingEmail.meetLink}</a></div>
                )}
              </div>

              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '16px', maxHeight: '350px', overflowY: 'auto' }}>
                <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
                  {inspectingEmail.body}
                </pre>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setInspectingEmail(null)}
                className={styles.btnSecondary}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
