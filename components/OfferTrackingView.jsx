'use client';

import { useState } from 'react';
import styles from './offerTracking.module.css';
import {
  CheckCircle2,
  XCircle,
  Search,
  Clock,
  ExternalLink,
  X,
  RotateCw,
  FileText,
  UserCheck,
  Filter,
  Download,
  AlertCircle
} from 'lucide-react';
import { isDeadlineExpired, formatFlexibleDate } from '../lib/dateUtils.js';

export default function OfferTrackingView({
  candidates = [],
  onCandidateUpdated,
  showToast,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedResponseStatus, setSelectedResponseStatus] = useState('ALL');
  const [activeSigModal, setActiveSigModal] = useState(null);
  const [activePdfModal, setActivePdfModal] = useState(null);
  const [auditing, setAuditing] = useState(false);

  // Compute unique batches and roles for filters
  const batches = Array.from(new Set(candidates.map((c) => c.batch).filter(Boolean)));
  const roles = Array.from(new Set(candidates.map((c) => c.role).filter(Boolean)));

  // Telemetry counts
  const totalOffers = candidates.filter((c) => c.offerLetterStatus !== 'Not Assigned');
  const acceptedCount = candidates.filter((c) => c.offerLetterStatus === 'Accepted').length;
  const rejectedCount = candidates.filter((c) => c.offerLetterStatus?.startsWith('Rejected') || (c.offerLetterStatus === 'Sent' && isDeadlineExpired(c.offerDeadline))).length;
  const pendingCount = candidates.filter((c) => c.offerLetterStatus === 'Sent' && !isDeadlineExpired(c.offerDeadline)).length;
  const deliveredEmailCount = candidates.filter((c) => c.offerDeliveryStatus === 'Delivered').length;

  // Filter logic
  const filteredCandidates = candidates.filter((cand) => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch =
      !term ||
      (cand.fullName && cand.fullName.toLowerCase().includes(term)) ||
      (cand.internId && cand.internId.toLowerCase().includes(term)) ||
      (cand.email && cand.email.toLowerCase().includes(term));

    const matchBatch = selectedBatch === 'ALL' || cand.batch === selectedBatch;
    const matchRole = selectedRole === 'ALL' || cand.role === selectedRole;

    const isCandExpired = isDeadlineExpired(cand.offerDeadline);

    let matchStatus = true;
    if (selectedResponseStatus === 'Accepted') {
      matchStatus = cand.offerLetterStatus === 'Accepted';
    } else if (selectedResponseStatus === 'Pending') {
      matchStatus = cand.offerLetterStatus === 'Sent' && !isCandExpired;
    } else if (selectedResponseStatus === 'Rejected') {
      matchStatus = cand.offerLetterStatus?.startsWith('Rejected') && !cand.offerLetterStatus?.includes('Expired');
    } else if (selectedResponseStatus === 'Expired') {
      matchStatus = cand.offerLetterStatus?.includes('Expired') || (cand.offerLetterStatus === 'Sent' && isCandExpired);
    }

    return matchSearch && matchBatch && matchRole && matchStatus;
  });

  // Action: Revert accidental acceptance
  const handleRevert = async (candidate) => {
    const confirm = window.confirm(
      `Are you sure you want to revert acceptance for ${candidate.fullName}? This will unlock the offer for re-evaluation.`
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerLetterStatus: 'Sent',
          offerAcceptedAt: null,
          remarks: 'Offer acceptance reverted by HR admin.',
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Reverted acceptance for ${candidate.fullName}`, 'success');
        onCandidateUpdated?.();
      } else {
        showToast?.(data.error || 'Failed to revert status.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  // Action: Run deadline expiry audit
  const handleRunDeadlineCheck = async () => {
    try {
      setAuditing(true);
      showToast?.('Scanning candidates for expired decision deadlines...', 'info');

      let expiredCount = 0;

      for (const cand of candidates) {
        if (cand.offerLetterStatus === 'Sent' && cand.offerDeadline) {
          if (isDeadlineExpired(cand.offerDeadline)) {
            await fetch(`/api/candidates/${cand.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                offerLetterStatus: 'Rejected (Expired)',
                remarks: 'Offer decision deadline expired without candidate submission.',
              }),
            });
            expiredCount++;
          }
        }
      }

      showToast?.(`Audit completed. ${expiredCount} candidates updated to Rejected (Expired).`, 'success');
      onCandidateUpdated?.();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setAuditing(false);
    }
  };

  return (
    <div className={styles.trackingContainer}>
      {/* 1. TELEMETRY STATS BANNER */}
      <div className={styles.telemetryGrid}>
        <div className={styles.metricCard} style={{ borderLeft: '4px solid #10b981' }}>
          <div className={styles.metricTitle} style={{ color: '#34d399' }}>ACCEPTED OFFERS</div>
          <div className={styles.metricValue}>{acceptedCount}</div>
          <div className={styles.metricSubtitle}>Signed Digital Acceptances</div>
        </div>

        <div className={styles.metricCard} style={{ borderLeft: '4px solid #a855f7' }}>
          <div className={styles.metricTitle} style={{ color: '#c084fc' }}>AWAITING RESPONSE</div>
          <div className={styles.metricValue}>{pendingCount}</div>
          <div className={styles.metricSubtitle}>Pending Link Decisions</div>
        </div>

        <div className={styles.metricCard} style={{ borderLeft: '4px solid #f43f5e' }}>
          <div className={styles.metricTitle} style={{ color: '#fb7185' }}>DECLINED / EXPIRED</div>
          <div className={styles.metricValue}>{rejectedCount}</div>
          <div className={styles.metricSubtitle}>Declined or Expired Decisions</div>
        </div>

        <div className={styles.metricCard} style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className={styles.metricTitle} style={{ color: '#60a5fa' }}>DELIVERED EMAILS</div>
          <div className={styles.metricValue}>{deliveredEmailCount}</div>
          <div className={styles.metricSubtitle}>Confirmed SMTP Dispatches</div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROL BAR */}
      <div className={styles.controlBar}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search candidate name, Intern ID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filtersGroup}>
          <div className={styles.selectWrapper}>
            <Filter size={14} className={styles.selectIcon} />
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className={styles.selectInput}
            >
              <option value="ALL">All Batches ({batches.length})</option>
              {batches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className={styles.selectWrapper}>
            <Filter size={14} className={styles.selectIcon} />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={styles.selectInput}
            >
              <option value="ALL">All Roles ({roles.length})</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className={styles.selectWrapper}>
            <Filter size={14} className={styles.selectIcon} />
            <select
              value={selectedResponseStatus}
              onChange={(e) => setSelectedResponseStatus(e.target.value)}
              className={styles.selectInput}
            >
              <option value="ALL">All Response Statuses</option>
              <option value="Accepted">Accepted Only</option>
              <option value="Pending">Pending Only</option>
              <option value="Rejected">Rejected Only</option>
              <option value="Expired">Expired Only</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleRunDeadlineCheck}
            disabled={auditing}
            className={styles.btnAudit}
            title="Scan candidate records for expired deadlines"
          >
            <RotateCw size={14} className={auditing ? styles.spin : ''} />
            <span>Audit Deadlines</span>
          </button>
        </div>
      </div>

      {/* 3. CANDIDATES DECISION TELEMETRY TABLE */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderRow}>
          <h3 className={styles.tableTitle}>
            <UserCheck size={16} color="#a855f7" />
            <span>Candidate Offer & Decision Records ({filteredCandidates.length})</span>
          </h3>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>INTERN ID / CANDIDATE</th>
                <th>ROLE & BATCH</th>
                <th>EMAIL DISPATCH STATUS</th>
                <th>OFFER RESPONSE STATUS</th>
                <th>SENT / EXPIRY DATE</th>
                <th>SIGNATURE / ACCEPTANCE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    No candidate records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => {
                  const isAccepted = cand.offerLetterStatus === 'Accepted';
                  const isRejected = cand.offerLetterStatus?.startsWith('Rejected');
                  const isExpired = cand.offerLetterStatus?.includes('Expired') || (cand.offerLetterStatus === 'Sent' && cand.offerDeadline && isDeadlineExpired(cand.offerDeadline));

                  return (
                    <tr key={cand.id}>
                      <td>
                        <div className={styles.candidatePrimary}>
                          <span className={styles.candInternId}>{cand.internId || cand.candidateId}</span>
                          <span className={styles.candName}>{cand.fullName}</span>
                          <span className={styles.candEmail}>{cand.email}</span>
                        </div>
                      </td>

                      <td>
                        <div className={styles.rolePrimary}>
                          <span className={styles.candRole}>{cand.role}</span>
                          <span className={styles.candBatch}>{cand.batch || 'Batch A'}</span>
                        </div>
                      </td>

                      <td>
                        <span className={`${styles.statusPill} ${
                          cand.offerDeliveryStatus === 'Delivered'
                            ? styles.pillGreen
                            : cand.offerDeliveryStatus === 'Failed'
                            ? styles.pillRed
                            : styles.pillPurple
                        }`}>
                          {cand.offerDeliveryStatus || (cand.offerLetterStatus === 'Sent' ? 'Sent' : 'Not Sent')}
                        </span>
                      </td>

                      <td>
                        <span className={`${styles.statusPill} ${
                          isAccepted
                            ? styles.pillGreen
                            : isRejected || isExpired
                            ? styles.pillRed
                            : styles.pillYellow
                        }`}>
                          {isExpired && !isAccepted
                            ? 'Expired'
                            : cand.offerLetterStatus}
                        </span>
                      </td>

                      <td>
                        <div className={styles.dateBlock}>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Sent: {formatFlexibleDate(cand.offerLetterSentAt)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#c084fc' }}>
                            Deadline: {formatFlexibleDate(cand.offerDeadline)}
                          </div>
                        </div>
                      </td>

                      <td>
                        {isAccepted ? (
                          <button
                            type="button"
                            onClick={() => setActiveSigModal(cand)}
                            className={styles.btnViewSignature}
                          >
                            <CheckCircle2 size={13} color="#10b981" />
                            <span>View Signature</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#71717a' }}>No signature</span>
                        )}
                      </td>

                      <td>
                        <div className={styles.actionRow}>
                          <button
                            type="button"
                            onClick={() => setActivePdfModal(cand)}
                            className={styles.btnActionIcon}
                            title="View Formal Offer Letter PDF"
                          >
                            <FileText size={14} />
                          </button>

                          {isAccepted && (
                            <button
                              type="button"
                              onClick={() => handleRevert(cand)}
                              className={styles.btnActionIcon}
                              title="Revert accidental acceptance (mark as withdrawn)"
                              style={{ color: '#fb7185' }}
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: VIEW SIGNATURE RECORD */}
      {activeSigModal && (
        <div className={styles.modalOverlay} onClick={() => setActiveSigModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <h3 className={styles.modalTitle}>Digital Acceptance & Signature Record</h3>
              </div>
              <button type="button" onClick={() => setActiveSigModal(null)} className={styles.modalClose}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.sigCandidateSummary}>
                <div><strong>Candidate:</strong> {activeSigModal.fullName}</div>
                <div><strong>Intern ID:</strong> {activeSigModal.internId || activeSigModal.candidateId}</div>
                <div><strong>Role:</strong> {activeSigModal.role}</div>
                <div><strong>Accepted On:</strong> {activeSigModal.offerAcceptedAt ? new Date(activeSigModal.offerAcceptedAt).toUTCString() : 'N/A'}</div>
                <div><strong>Signature Type:</strong> {activeSigModal.signatureType || 'Digital Signature'}</div>
              </div>

              <div className={styles.signaturePreviewBox}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Recorded Signature Data:
                </div>
                {activeSigModal.signatureUrl && activeSigModal.signatureUrl.startsWith('data:image/') ? (
                  <img src={activeSigModal.signatureUrl} alt="Signature" className={styles.sigImg} />
                ) : activeSigModal.signatureUrl && activeSigModal.signatureUrl.startsWith('http') ? (
                  <img src={activeSigModal.signatureUrl} alt="Signature" className={styles.sigImg} />
                ) : (
                  <div className={styles.signatureStyledFont}>
                    {activeSigModal.signatureData || activeSigModal.fullName}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW OFFER LETTER PDF */}
      {activePdfModal && (
        <div className={styles.modalOverlay} onClick={() => setActivePdfModal(null)}>
          <div className={styles.modalContentLarge} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#a855f7" />
                <h3 className={styles.modalTitle}>
                  Formal Offer Letter PDF &bull; {activePdfModal.fullName} ({activePdfModal.internId || activePdfModal.candidateId})
                </h3>
              </div>
              <button type="button" onClick={() => setActivePdfModal(null)} className={styles.modalClose}>
                <X size={16} />
              </button>
            </div>

            <div className={styles.modalBody} style={{ padding: 0 }}>
              <iframe
                src={`/api/offers/pdf?token=${encodeURIComponent(activePdfModal.offerAcceptanceToken || activePdfModal.id)}`}
                title="Offer Letter PDF"
                style={{ width: '100%', height: '580px', border: 'none', background: '#000' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
