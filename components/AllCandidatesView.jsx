'use client';

import { useState, useMemo } from 'react';
import styles from './web3Deck.module.css';
import {
  Users,
  Search,
  Filter,
  UserX,
  UserCheck,
  Calendar,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Building,
  RotateCcw,
  X
} from 'lucide-react';

export default function AllCandidatesView({
  candidates = [],
  batches = [],
  onRefresh,
  showToast,
}) {
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'LEAVED'
  const [searchTerm, setSearchTerm] = useState('');

  // Departure Modal
  const [leavingCandidate, setLeavingCandidate] = useState(null);
  const [departureReason, setDepartureReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (selectedStatus === 'ACTIVE' && c.isLeaved) return false;
      if (selectedStatus === 'LEAVED' && !c.isLeaved) return false;
      if (selectedBatch !== 'ALL' && c.batch !== selectedBatch) return false;
      if (selectedRole !== 'ALL' && c.role !== selectedRole) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const nameMatch = c.fullName?.toLowerCase().includes(term);
        const idMatch = (c.internId || c.candidateId)?.toLowerCase().includes(term);
        const emailMatch = c.email?.toLowerCase().includes(term);
        const collegeMatch = c.collegeName?.toLowerCase().includes(term);
        if (!nameMatch && !idMatch && !emailMatch && !collegeMatch) return false;
      }
      return true;
    });
  }, [candidates, selectedBatch, selectedRole, selectedStatus, searchTerm]);

  // Open Leave Modal
  const handleOpenLeaveModal = (cand) => {
    setLeavingCandidate(cand);
    setDepartureReason('Candidate sent official resignation email requesting departure before internship tenure completion.');
  };

  // Confirm Departure
  const handleConfirmLeave = async () => {
    if (!leavingCandidate) return;

    try {
      setSubmittingLeave(true);
      const res = await fetch('/api/candidates/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: leavingCandidate.id,
          reason: departureReason,
          action: 'LEAVE',
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(data.message, 'warning');
        setLeavingCandidate(null);
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to record candidate departure.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Reinstate Candidate
  const handleReinstate = async (cand) => {
    const confirm = window.confirm(`Reinstate ${cand.fullName} to active internship?`);
    if (!confirm) return;

    try {
      const res = await fetch('/api/candidates/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: cand.id,
          action: 'REINSTATE',
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(data.message, 'success');
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to reinstate candidate.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <div className={styles.titleIcon}>
            <Users size={22} />
          </div>
          <div>
            <h2 className={styles.mainTitle}>All Candidate Directory & Attrition Records</h2>
            <p className={styles.subtitle}>Unified Intern Ledger &bull; Role & Batch Filters &bull; Verify Candidates & Manage Departures</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by Intern ID, name, email, or college..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className={styles.selectInput}
        >
          <option value="ALL">All Batches</option>
          {batches.map((b) => (
            <option key={b.id || b.batchName} value={b.batchName}>{b.batchName}</option>
          ))}
        </select>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className={styles.selectInput}
        >
          <option value="ALL">All Roles</option>
          <option value="Web Developer Intern">Web Developer Intern</option>
          <option value="Frontend Developer">Frontend Developer</option>
          <option value="Backend Developer">Backend Developer</option>
          <option value="Full Stack Intern">Full Stack Intern</option>
          <option value="AI/ML Engineer">AI/ML Engineer</option>
          <option value="UI/UX Designer">UI/UX Designer</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className={styles.selectInput}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Interns Only</option>
          <option value="LEAVED">Leaved Internship Only</option>
        </select>
      </div>

      {/* Candidate Ledger Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderRow}>
          <strong style={{ color: '#ffffff', fontSize: '14px' }}>
            Showing {filteredCandidates.length} Candidates
          </strong>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Intern ID</th>
                <th>Candidate Name</th>
                <th>Role & College</th>
                <th>Contact Details</th>
                <th>Batch</th>
                <th>Tenure Dates</th>
                <th>Score (%)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#71717a' }}>
                    No candidates found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', color: '#c084fc', fontWeight: 700 }}>
                      {c.internId || c.candidateId}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{c.fullName}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{c.degree || 'B.Tech'}</div>
                    </td>
                    <td>
                      <div>{c.role}</div>
                      <div style={{ fontSize: '11px', color: '#71717a' }}>{c.collegeName}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>{c.email}</div>
                      <div style={{ fontSize: '11px', color: '#71717a' }}>{c.phone || '-'}</div>
                    </td>
                    <td>
                      <span className={styles.badgePurple}>{c.batch || 'Batch A'}</span>
                    </td>
                    <td style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                      <div>{c.joiningDate}</div>
                      <div>to {c.endDate}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {c.performancePercentage?.toFixed(1)}%
                    </td>
                    <td>
                      {c.isLeaved ? (
                        <span className={styles.badgeRose}>Leaved Internship</span>
                      ) : (
                        <span className={styles.badgeEmerald}>Active</span>
                      )}
                    </td>
                    <td>
                      {c.isLeaved ? (
                        <button
                          type="button"
                          onClick={() => handleReinstate(c)}
                          className={styles.btnSecondary}
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          title="Reinstate to Active Internship"
                        >
                          <RotateCcw size={11} />
                          <span>Reinstate</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenLeaveModal(c)}
                          className={styles.btnDanger}
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          title="Record Candidate Departure"
                        >
                          <UserX size={11} />
                          <span>Remove</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: REMOVE CANDIDATE (LEAVED INTERNSHIP) */}
      {leavingCandidate && (
        <div className={styles.modalOverlay} onClick={() => setLeavingCandidate(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserX size={18} color="#ef4444" />
                <span>Remove Candidate &bull; Leaved Internship</span>
              </h3>
              <button type="button" onClick={() => setLeavingCandidate(null)} style={{ color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ background: '#141417', border: '1px solid #27272a', borderRadius: '8px', padding: '14px 18px', fontSize: '13px' }}>
                <div><strong>Candidate Name:</strong> {leavingCandidate.fullName}</div>
                <div><strong>Intern ID:</strong> <code style={{ color: '#c084fc' }}>{leavingCandidate.internId || leavingCandidate.candidateId}</code></div>
                <div><strong>Role & Batch:</strong> {leavingCandidate.role} &bull; {leavingCandidate.batch}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Departure Reason / Notes (Captured from Candidate's Resignation Email)
                </label>
                <textarea
                  rows={4}
                  value={departureReason}
                  onChange={(e) => setDepartureReason(e.target.value)}
                  className={styles.searchInput}
                  style={{ height: 'auto', padding: '10px' }}
                  placeholder="Record resignation email details, effective departure date, etc."
                />
              </div>

              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                Note: Marking this candidate as <strong>Leaved Internship</strong> will immediately halt automated task reminders, omit them from certificate qualification, and archive their status in the audit ledger.
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setLeavingCandidate(null)}
                className={styles.btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                disabled={submittingLeave}
                className={styles.btnDanger}
              >
                <UserX size={14} />
                <span>{submittingLeave ? 'Saving Departure...' : 'Confirm & Save as Leaved Internship'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
