'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
  X,
  Trash2,
  Undo2,
  Download,
  FileSpreadsheet,
  Plus
} from 'lucide-react';
import * as xlsx from 'xlsx';

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
  const [exporting, setExporting] = useState(false);

  // Consolidated dynamic batches (A, B, C, D, E, Solo Interns, and custom candidate batches)
  const allBatches = useMemo(() => {
    const set = new Set();
    ['Batch A', 'Batch B', 'Batch C', 'Batch D', 'Batch E', 'Solo Interns'].forEach(b => set.add(b));
    batches.forEach(b => set.add(typeof b === 'string' ? b : b.batchName));
    candidates.forEach(c => {
      if (c.batch) set.add(c.batch);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [batches, candidates]);

  // Departure Modal
  const [leavingCandidate, setLeavingCandidate] = useState(null);
  const [departureReason, setDepartureReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // 3-Second Undo Deletion State
  const [undoState, setUndoState] = useState(null);
  const [hiddenCandidateIds, setHiddenCandidateIds] = useState([]);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Filter candidates (omit candidates queued in undo deletion)
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (hiddenCandidateIds.includes(c.id)) return false;
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
  }, [candidates, selectedBatch, selectedRole, selectedStatus, searchTerm, hiddenCandidateIds]);

  // Export filtered candidates to Excel (.xlsx) or CSV with ALL intern details
  const handleExportCandidates = (format = 'xlsx') => {
    if (filteredCandidates.length === 0) {
      showToast?.('No candidates match the active filters to export.', 'warning');
      return;
    }

    try {
      setExporting(true);
      const rows = filteredCandidates.map((c) => ({
        'Intern ID': c.internId || c.candidateId,
        'Candidate Name': c.fullName,
        'Email Address': c.email,
        'Phone Number': c.phone || '',
        'Role / Designation': c.role,
        'College Name': c.collegeName || '',
        'Degree': c.degree || '',
        'Department': c.department || 'Engineering',
        'Batch': c.batch || 'Batch A',
        'Tenure Start Date': c.joiningDate || '',
        'Tenure End Date': c.endDate || '',
        'Internship Duration': c.duration || '3 Months',
        'Monthly Stipend': c.stipend || 'Rs. 10,000',
        'Work Mode': c.workMode || 'Virtual / Remote',
        'Reporting Manager': c.reportingManager || 'Priyanka Nair',
        'Assigned Mentor': c.assignedMentor || 'Rahul Kapoor',
        'Offer Letter Status': c.offerLetterStatus || 'Accepted',
        'Task Status': c.taskStatus || 'Not Assigned',
        'Tasks Completed': c.tasksCompleted || 0,
        'Performance Score (%)': `${(c.performancePercentage ?? 100).toFixed(1)}%`,
        'Internship Status': c.isLeaved ? 'Leaved' : 'Active',
        'Departure Date': c.leavedAt ? new Date(c.leavedAt).toLocaleDateString() : '',
        'Departure Reason': c.leaveReason || '',
        'Google Meet Link': c.googleMeetUrl || '',
      }));

      const worksheet = xlsx.utils.json_to_sheet(rows);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Interns_Directory');

      const batchSlug = selectedBatch === 'ALL' ? 'AllBatches' : selectedBatch.replace(/[^a-zA-Z0-9]/g, '_');
      const roleSlug = selectedRole === 'ALL' ? 'AllRoles' : selectedRole.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Shortfundly_Interns_${batchSlug}_${roleSlug}_${new Date().toISOString().split('T')[0]}.${format}`;

      if (format === 'csv') {
        xlsx.writeFile(workbook, fileName, { bookType: 'csv' });
      } else {
        xlsx.writeFile(workbook, fileName, { bookType: 'xlsx' });
      }
      showToast?.(`Successfully exported ${filteredCandidates.length} candidate(s) to ${fileName}!`, 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast?.(`Failed to export candidates: ${err.message}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  // Inline Batch Customization / Edit
  const handleChangeCandidateBatch = async (candidateId, targetBatchName) => {
    let finalBatch = targetBatchName;
    if (targetBatchName === '__NEW__') {
      const customName = window.prompt('Enter new custom batch name (e.g. Batch E, Solo Interns):');
      if (!customName || !customName.trim()) return;
      finalBatch = customName.trim();
    }

    try {
      const res = await fetch('/api/candidates/reorganize-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, targetBatchName: finalBatch }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Candidate assigned to "${finalBatch}" successfully!`, 'success');
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to update batch.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

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

  // Permanently Delete Candidate with 3-Second Undo
  const handleRequestDelete = (cand) => {
    // If a deletion is already pending, finalize it immediately
    if (undoState) {
      finalizeDelete(undoState.candidate.id);
    }

    // Hide candidate optimistically
    setHiddenCandidateIds((prev) => [...prev, cand.id]);

    let countdown = 3;
    setUndoState({
      candidate: cand,
      countdown: 3,
    });

    // Update countdown every second
    intervalRef.current = setInterval(() => {
      countdown -= 1;
      if (countdown > 0) {
        setUndoState((prev) => (prev ? { ...prev, countdown } : null));
      }
    }, 1000);

    // After 3 seconds, perform permanent deletion
    timerRef.current = setTimeout(async () => {
      clearInterval(intervalRef.current);
      await finalizeDelete(cand.id, cand.fullName);
    }, 3000);
  };

  // Finalize Deletion after 3 seconds
  const finalizeDelete = async (candId, candName = '') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setUndoState(null);

    try {
      const res = await fetch(`/api/candidates/${candId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Candidate ${candName || ''} permanently removed from portal.`, 'success');
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to delete candidate.', 'error');
        // Restore visibility on failure
        setHiddenCandidateIds((prev) => prev.filter((id) => id !== candId));
      }
    } catch (err) {
      showToast?.(err.message, 'error');
      setHiddenCandidateIds((prev) => prev.filter((id) => id !== candId));
    }
  };

  // Undo Delete within 3 seconds
  const handleUndoDelete = () => {
    if (!undoState) return;
    const restoredCandidate = undoState.candidate;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setHiddenCandidateIds((prev) => prev.filter((id) => id !== restoredCandidate.id));
    setUndoState(null);
    showToast?.(`Deletion cancelled. Candidate "${restoredCandidate.fullName}" restored.`, 'info');
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
            <h2 className={styles.mainTitle}>Candidate Directory</h2>
            <p className={styles.subtitle}>View and manage all enrolled interns, filter by batch or role, and export records.</p>
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
          {allBatches.map((bName) => (
            <option key={bName} value={bName}>{bName}</option>
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
        <div className={styles.tableHeaderRow} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <strong style={{ color: '#ffffff', fontSize: '14px' }}>
            Showing {filteredCandidates.length} Candidates {selectedBatch !== 'ALL' ? `(${selectedBatch})` : ''} {selectedRole !== 'ALL' ? `• ${selectedRole}` : ''}
          </strong>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => handleExportCandidates('xlsx')}
              disabled={exporting || filteredCandidates.length === 0}
              className={styles.btnSecondary}
              style={{ fontSize: '13px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Export filtered candidates to Excel with all intern details"
            >
              <FileSpreadsheet size={14} color="#34d399" />
              <span>Export to Excel ({filteredCandidates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportCandidates('csv')}
              disabled={exporting || filteredCandidates.length === 0}
              className={styles.btnSecondary}
              style={{ fontSize: '13px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Export filtered candidates to CSV with all intern details"
            >
              <Download size={14} color="#38bdf8" />
              <span>Export to CSV</span>
            </button>
          </div>
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
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
                    No candidates found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', color: '#6D28D9', fontWeight: 700 }}>
                      {c.internId || c.candidateId}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{c.fullName}</div>
                      <div style={{ fontSize: '12.5px', color: '#475569' }}>{c.degree || 'B.Tech'}</div>
                    </td>
                    <td>
                      <div>{c.role}</div>
                      <div style={{ fontSize: '12.5px', color: '#475569' }}>{c.collegeName}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{c.email}</div>
                      <div style={{ fontSize: '12.5px', color: '#475569' }}>{c.phone || '-'}</div>
                    </td>
                    <td>
                      <select
                        value={c.batch || 'Batch A'}
                        onChange={(e) => handleChangeCandidateBatch(c.id, e.target.value)}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid #3b335c',
                          color: '#6D28D9',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Click to change or customize batch for this intern"
                      >
                        {allBatches.map(bName => (
                          <option key={bName} value={bName}>{bName}</option>
                        ))}
                        <option value="__NEW__">+ Custom Batch...</option>
                      </select>
                    </td>
                    <td style={{ fontSize: '13px', color: '#475569' }}>
                      <div>{c.joiningDate}</div>
                      <div>to {c.endDate}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
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
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {c.isLeaved ? (
                          <button
                            type="button"
                            onClick={() => handleReinstate(c)}
                            className={styles.btnSecondary}
                            style={{ fontSize: '12.5px', padding: '4px 8px' }}
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
                            style={{ fontSize: '12.5px', padding: '4px 8px' }}
                            title="Record Candidate Departure"
                          >
                            <UserX size={11} />
                            <span>Remove</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRequestDelete(c)}
                          className={styles.btnDanger}
                          style={{
                            fontSize: '12.5px',
                            padding: '4px 8px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            borderColor: 'rgba(239, 68, 68, 0.35)',
                            color: '#f87171',
                          }}
                          title="Permanently Delete Candidate (with 3-second undo)"
                        >
                          <Trash2 size={11} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FLOATING 3-SECOND UNDO NOTIFICATION */}
      {undoState && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            background: 'var(--bg-surface)',
            border: '1px solid #a855f7',
            borderRadius: '10px',
            padding: '14px 20px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.9), 0 0 15px rgba(168, 85, 247, 0.25)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '8px', borderRadius: '8px', color: '#f87171' }}>
            <Trash2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
              Candidate &quot;{undoState.candidate.fullName}&quot; deleting in {undoState.countdown}s...
            </div>
            <div style={{ fontSize: '12.5px', color: '#475569' }}>
              Record will be permanently purged from database when timer finishes.
            </div>
          </div>
          <button
            type="button"
            onClick={handleUndoDelete}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(124, 58, 237, 0.4)',
            }}
          >
            <Undo2 size={13} />
            <span>Undo ({undoState.countdown}s)</span>
          </button>
        </div>
      )}

      {/* MODAL: REMOVE CANDIDATE (LEAVED INTERNSHIP) */}
      {leavingCandidate && (
        <div className={styles.modalOverlay} onClick={() => setLeavingCandidate(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserX size={18} color="#ef4444" />
                <span>Remove Intern &bull; Mark as Left Internship</span>
              </h3>
              <button type="button" onClick={() => setLeavingCandidate(null)} style={{ color: '#475569', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '14px 18px', fontSize: '13px' }}>
                <div><strong>Candidate Name:</strong> {leavingCandidate.fullName}</div>
                <div><strong>Intern ID:</strong> <code style={{ color: '#6D28D9' }}>{leavingCandidate.internId || leavingCandidate.candidateId}</code></div>
                <div><strong>Role & Batch:</strong> {leavingCandidate.role} &bull; {leavingCandidate.batch}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Departure Reason / Notes (Captured from Candidate&apos;s Resignation Email)
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

              <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
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
