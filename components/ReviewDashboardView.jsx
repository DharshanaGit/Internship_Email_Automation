'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './web3Deck.module.css';
import {
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  Video,
  FileText,
  AlertTriangle,
  Upload,
  Send,
  Search,
  Filter,
  Sparkles,
  Plus,
  Eye,
  RefreshCw,
  Mail,
  X,
  Award
} from 'lucide-react';
import { renderJinja, jinjaTextToEmailHtml } from '../lib/jinjaEngine.js';

export default function ReviewDashboardView({
  batches = [],
  onRefresh,
  showToast,
}) {
  const [subTab, setSubTab] = useState('review-queue'); // 'review-queue' | 'schedule-r1' | 'feedback-upload' | 'checkpoint' | 'warning'

  // Filter States
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedTaskNum, setSelectedTaskNum] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Candidates awaiting review data from API
  const [candidates, setCandidates] = useState([]);
  const [suggestedReviewDate, setSuggestedReviewDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);

  // Generate standard 3-4-3 lowercase letter Google Meet link (e.g. https://meet.google.com/abc-defg-hij)
  const generateMeetUrl = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const pick = (len) => Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    return `https://meet.google.com/${pick(3)}-${pick(4)}-${pick(3)}`;
  };

  // Review 1 Schedule Form with Dual Google Meet Modes
  const [r1ScheduleForm, setR1ScheduleForm] = useState({
    reviewDate: '',
    reviewTime: '04:00 PM',
    customNotes: 'Please ensure your code is pushed to GitHub and be prepared to demonstrate your implemented features.',
    meetMode: 'BATCH', // 'BATCH' = batch-wise shared link, 'INDIVIDUAL' = unique candidate link
    batchMeetLink: '',
  });

  // Set initial genuine Google Meet link on mount or when batch changes
  useEffect(() => {
    if (!r1ScheduleForm.batchMeetLink) {
      setR1ScheduleForm(prev => ({ ...prev, batchMeetLink: generateMeetUrl() }));
    }
  }, []);

  const handleBatchSelectChange = (newBatch) => {
    setSelectedBatch(newBatch);
    setR1ScheduleForm(prev => ({
      ...prev,
      batchMeetLink: generateMeetUrl(),
    }));
  };
  const [schedulingR1, setSchedulingR1] = useState(false);

  // Feedback CSV Ingestion State
  const [feedbackRows, setFeedbackRows] = useState([]);
  const [feedbackMeta, setFeedbackMeta] = useState({
    reviewDate: '',
    reviewTime: '04:00 PM',
    cc: '',
    customJinja: '',
  });
  const [uploadingFeedback, setUploadingFeedback] = useState(false);

  // Checkpoint Task Completion State
  const [finalScoreMap, setFinalScoreMap] = useState({});
  const [completingTask, setCompletingTask] = useState(false);

  // Warning Mail State
  const [warningForm, setWarningForm] = useState({
    penaltyAmount: 10,
    customNote: 'Repeated unsatisfactory review evaluations or non-attendance of scheduled sessions. 10% penalty reduction has been recorded.',
  });
  const [sendingWarning, setSendingWarning] = useState(false);

  // Fetch review dashboard data
  const loadReviewData = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/reviews', window.location.origin);
      if (selectedBatch !== 'ALL') url.searchParams.set('batch', selectedBatch);
      if (selectedRole !== 'ALL') url.searchParams.set('role', selectedRole);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setCandidates(data.candidates);
        setSuggestedReviewDate(data.suggestedReviewDate);
        setR1ScheduleForm(prev => ({ ...prev, reviewDate: prev.reviewDate || data.suggestedReviewDate }));
        setFeedbackMeta(prev => ({ ...prev, reviewDate: prev.reviewDate || data.suggestedReviewDate }));
      }
    } catch (err) {
      console.error('Error loading review dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewData();
  }, [selectedBatch, selectedRole]);

  // Filtered list
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (selectedTaskNum !== 'ALL') {
        const num = c.activeTask?.taskNumber;
        if (num !== parseInt(selectedTaskNum, 10)) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const nameMatch = c.fullName?.toLowerCase().includes(term);
        const idMatch = c.internId?.toLowerCase().includes(term);
        if (!nameMatch && !idMatch) return false;
      }
      return true;
    });
  }, [candidates, selectedTaskNum, searchTerm]);

  // Selection toggles
  const handleToggleSelectAll = () => {
    if (selectedCandidateIds.length === filteredCandidates.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(filteredCandidates.map(c => c.id));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedCandidateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Schedule Review 1
  const handleScheduleReview1 = async () => {
    if (selectedCandidateIds.length === 0) {
      showToast?.('Please select at least one candidate for Review 1.', 'error');
      return;
    }

    try {
      setSchedulingR1(true);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          reviewNumber: 1,
          reviewDate: r1ScheduleForm.reviewDate,
          reviewTime: r1ScheduleForm.reviewTime,
          customNotes: r1ScheduleForm.customNotes,
          meetMode: r1ScheduleForm.meetMode,
          batchMeetLink: r1ScheduleForm.batchMeetLink,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Review 1 successfully scheduled for ${data.count} candidates on ${data.scheduledDate}!`, 'success');
        setSelectedCandidateIds([]);
        loadReviewData();
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to schedule review.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSchedulingR1(false);
    }
  };

  // Ingest Feedback CSV
  const handleFeedbackFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const parsed = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = parts[idx] || '';
        });
        parsed.push(row);
      }

      setFeedbackRows(parsed);
      showToast?.(`Loaded ${parsed.length} feedback rows from CSV. Ready to send feedback emails.`, 'info');
    } catch (err) {
      showToast?.(`Error parsing feedback CSV: ${err.message}`, 'error');
    }
  };

  // Upload Feedback and Send Review Emails
  const handleSendFeedbackMails = async () => {
    if (feedbackRows.length === 0) {
      showToast?.('Please upload a feedback CSV file first.', 'error');
      return;
    }

    try {
      setUploadingFeedback(true);
      const res = await fetch('/api/reviews/upload-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: feedbackRows,
          reviewDate: feedbackMeta.reviewDate,
          reviewTime: feedbackMeta.reviewTime,
          cc: feedbackMeta.cc,
          customJinjaTemplate: feedbackMeta.customJinja || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Feedback recorded and review emails sent to ${data.processedCount} candidates!`, 'success');
        setFeedbackRows([]);
        loadReviewData();
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to process feedback upload.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setUploadingFeedback(false);
    }
  };

  // Mark Task Completed Checkpoint
  const handleMarkTasksCompleted = async () => {
    if (selectedCandidateIds.length === 0) {
      showToast?.('Please select candidates to complete the milestone task.', 'error');
      return;
    }

    try {
      setCompletingTask(true);
      const res = await fetch('/api/reviews/complete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          finalScoreMap,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Milestone task marked Completed and confirmation emails sent to ${data.completedCount} candidates!`, 'success');
        setSelectedCandidateIds([]);
        loadReviewData();
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to complete milestone tasks.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setCompletingTask(false);
    }
  };

  // Send Formal Warning Emails for Incomplete Reviews
  const handleSendWarningEmails = async () => {
    if (selectedCandidateIds.length === 0) {
      showToast?.('Please select candidates to dispatch warning notices.', 'error');
      return;
    }

    const confirm = window.confirm(`Send formal warning notice and deduct ${warningForm.penaltyAmount}% from ${selectedCandidateIds.length} candidates?`);
    if (!confirm) return;

    try {
      setSendingWarning(true);
      const res = await fetch('/api/tasks/send-warning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          penaltyAmount: Number(warningForm.penaltyAmount),
          customNote: warningForm.customNote,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Warning notices dispatched with -${warningForm.penaltyAmount}% deduction to ${data.deductedCount} candidates!`, 'warning');
        loadReviewData();
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to dispatch warning notices.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSendingWarning(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <div className={styles.titleIcon}>
            <UserCheck size={22} />
          </div>
          <div>
            <h2 className={styles.mainTitle}>Milestone Review & Mentorship Dashboard</h2>
            <p className={styles.subtitle}>Multi-Session Reviews &bull; Same Google Meet Continuity &bull; Feedback CSV Ingestion & Task Completion Checkpoint</p>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className={styles.subNavBar}>
          <button
            type="button"
            onClick={() => setSubTab('review-queue')}
            className={`${styles.subTabBtn} ${subTab === 'review-queue' ? styles.subTabBtnActive : ''}`}
          >
            <Users size={14} />
            <span>Review Queue ({filteredCandidates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('schedule-r1')}
            className={`${styles.subTabBtn} ${subTab === 'schedule-r1' ? styles.subTabBtnActive : ''}`}
          >
            <Clock size={14} />
            <span>Schedule Review 1 (Automated Date)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('feedback-upload')}
            className={`${styles.subTabBtn} ${subTab === 'feedback-upload' ? styles.subTabBtnActive : ''}`}
          >
            <Upload size={14} />
            <span>Upload Feedback CSV (Subsequent Reviews)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('checkpoint')}
            className={`${styles.subTabBtn} ${subTab === 'checkpoint' ? styles.subTabBtnActive : ''}`}
          >
            <Award size={14} />
            <span>Task Completion Checkpoint</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('warning')}
            className={`${styles.subTabBtn} ${subTab === 'warning' ? styles.subTabBtnActive : ''}`}
          >
            <AlertTriangle size={14} />
            <span>Formal Warning Mail</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search candidate by name or Intern ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select
          value={selectedBatch}
          onChange={(e) => handleBatchSelectChange(e.target.value)}
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
          value={selectedTaskNum}
          onChange={(e) => setSelectedTaskNum(e.target.value)}
          className={styles.selectInput}
        >
          <option value="ALL">All Task Numbers</option>
          <option value="1">Task #1</option>
          <option value="2">Task #2</option>
          <option value="3">Task #3</option>
          <option value="4">Task #4</option>
        </select>
      </div>

      {/* --- SUBTAB 1: REVIEW QUEUE TABLE --- */}
      {subTab === 'review-queue' && (
        <div className={styles.tableCard}>
          {/* Notification banner for submitted deliverables awaiting HR review approval */}
          {filteredCandidates.filter(c => c.activeTask?.submissionStatus === 'SUBMITTED' || c.taskStatus === 'Under Review').length > 0 && (
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '10px', padding: '12px 18px', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span style={{ fontSize: '13px', color: '#6ee7b7', fontWeight: 600 }}>
                  {filteredCandidates.filter(c => c.activeTask?.submissionStatus === 'SUBMITTED' || c.taskStatus === 'Under Review').length} Intern(s) have submitted project deliverables & awaiting HR review approval!
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const submittedIds = filteredCandidates
                      .filter(c => c.activeTask?.submissionStatus === 'SUBMITTED' || c.taskStatus === 'Under Review')
                      .map(c => c.id);
                    setSelectedCandidateIds(submittedIds);
                    showToast?.(`Selected ${submittedIds.length} submitted candidates for review scheduling!`, 'info');
                  }}
                  style={{ background: '#064e3b', border: '1px solid #059669', color: '#a7f3d0', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Select All Submitted ({filteredCandidates.filter(c => c.activeTask?.submissionStatus === 'SUBMITTED' || c.taskStatus === 'Under Review').length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const submittedIds = filteredCandidates
                      .filter(c => c.activeTask?.submissionStatus === 'SUBMITTED' || c.taskStatus === 'Under Review')
                      .map(c => c.id);
                    setSelectedCandidateIds(submittedIds);
                    setSubTab('schedule-r1');
                  }}
                  style={{ background: '#10b981', border: 'none', color: '#ffffff', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Approve & Schedule Review Mail &rarr;
                </button>
              </div>
            </div>
          )}

          <div className={styles.tableHeaderRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                checked={selectedCandidateIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                onChange={handleToggleSelectAll}
                style={{ width: '16px', height: '16px', accentColor: '#a855f7', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                {selectedCandidateIds.length} of {filteredCandidates.length} Selected
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSubTab('schedule-r1')}
                disabled={selectedCandidateIds.length === 0}
                className={styles.btnPrimary}
              >
                <span>Schedule Review 1 ({selectedCandidateIds.length})</span>
              </button>
            </div>
          </div>

          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Select</th>
                  <th>Intern ID</th>
                  <th>Candidate Name</th>
                  <th>Batch</th>
                  <th>Task No.</th>
                  <th>Task Title</th>
                  <th>Review Stage</th>
                  <th>Reviews Held</th>
                  <th>Score (%)</th>
                  <th>Google Meet Link</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#71717a' }}>
                      No candidates currently in the review queue. (Candidates appear here only after task emails are dispatched.)
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => {
                    const isSelected = selectedCandidateIds.includes(c.id);
                    const task = c.activeTask;
                    return (
                      <tr key={c.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(c.id)}
                            style={{ width: '16px', height: '16px', accentColor: '#a855f7', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ fontFamily: 'monospace', color: '#c084fc', fontWeight: 600 }}>{c.internId}</td>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>{c.fullName}</td>
                        <td><span className={styles.badgePurple}>{c.batch}</span></td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{task?.taskNumber || 1}</td>
                        <td>{task?.title || 'Milestone Task'}</td>
                        <td>
                          <span className={
                            c.reviewStage === 'Checkpoint Ready'
                              ? styles.badgeEmerald
                              : c.reviewStage === 'Review 2 Pending'
                              ? styles.badgePurple
                              : styles.badgeAmber
                          }>
                            {c.reviewStage || 'Review 1 Pending'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{c.reviewCount || task?.reviews?.length || 0} Sessions</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
                          {c.performancePercentage?.toFixed(1)}%
                        </td>
                        <td>
                          {task?.meetLink ? (
                            <a href={task.meetLink} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Video size={12} />
                              <span>Join Session</span>
                            </a>
                          ) : (
                            <span style={{ color: '#71717a', fontSize: '11px' }}>Auto-Assigned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SUBTAB 2: SCHEDULE REVIEW 1 (AUTOMATED / SKIP SUNDAY) --- */}
      {subTab === 'schedule-r1' && (
        <div style={{ background: '#0c0c0e', border: '1px solid #232328', borderRadius: '12px', padding: '24px 28px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#a855f7" />
            <span>Automated Review 1 Notification & Schedule Dispatcher</span>
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8' }}>
            Automatically calculates the next review date following task deadline submission (automatically skips Sundays to Monday morning). HR can also freely override and customize the date and time. Uses the same Google Meet room created during task assignment.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Review 1 Scheduled Date (Auto-skips Sundays to Monday)
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={r1ScheduleForm.reviewDate}
                onChange={(e) => setR1ScheduleForm({ ...r1ScheduleForm, reviewDate: e.target.value })}
                className={styles.searchInput}
              />
              <span style={{ fontSize: '11px', color: '#34d399', marginTop: '4px', display: 'block' }}>
                Calculated Next Business Day: {suggestedReviewDate}
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Scheduled Review Session Time
              </label>
              <input
                type="text"
                value={r1ScheduleForm.reviewTime}
                onChange={(e) => setR1ScheduleForm({ ...r1ScheduleForm, reviewTime: e.target.value })}
                className={styles.searchInput}
                placeholder="04:00 PM"
              />
            </div>
          </div>

          {/* DUAL GOOGLE MEET LINK OPTIONS (BATCH-WISE vs UNIQUE CANDIDATE LINK) */}
          <div style={{ background: '#12111b', border: '1px solid #2b2840', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              Google Meet Link Mode for Candidate Evaluation Mails <span style={{ color: '#ec4899' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setR1ScheduleForm({ ...r1ScheduleForm, meetMode: 'BATCH' })}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: r1ScheduleForm.meetMode === 'BATCH' ? '1px solid #a855f7' : '1px solid #2d2a44',
                  background: r1ScheduleForm.meetMode === 'BATCH' ? 'rgba(168, 85, 247, 0.18)' : '#181625',
                  color: r1ScheduleForm.meetMode === 'BATCH' ? '#ffffff' : '#94a3b8',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Video size={16} color={r1ScheduleForm.meetMode === 'BATCH' ? '#c084fc' : '#94a3b8'} />
                <div>
                  <div style={{ color: r1ScheduleForm.meetMode === 'BATCH' ? '#ffffff' : '#e2e8f0' }}>Batch-Wise Shared Google Meet Link</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>Send same Meet link to all candidates in batch</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setR1ScheduleForm({ ...r1ScheduleForm, meetMode: 'INDIVIDUAL' })}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: r1ScheduleForm.meetMode === 'INDIVIDUAL' ? '1px solid #a855f7' : '1px solid #2d2a44',
                  background: r1ScheduleForm.meetMode === 'INDIVIDUAL' ? 'rgba(168, 85, 247, 0.18)' : '#181625',
                  color: r1ScheduleForm.meetMode === 'INDIVIDUAL' ? '#ffffff' : '#94a3b8',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={16} color={r1ScheduleForm.meetMode === 'INDIVIDUAL' ? '#c084fc' : '#94a3b8'} />
                <div>
                  <div style={{ color: r1ScheduleForm.meetMode === 'INDIVIDUAL' ? '#ffffff' : '#e2e8f0' }}>Unique Google Meet Link per Candidate</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>Auto-generate dedicated 1-on-1 Meet room per student</div>
                </div>
              </button>
            </div>

            {r1ScheduleForm.meetMode === 'BATCH' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11.5px', color: '#cbd5e1', fontWeight: 600 }}>
                    Batch Google Meet Room URL (Sent to all {selectedCandidateIds.length} candidate(s)):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newUrl = generateMeetUrl();
                      setR1ScheduleForm({ ...r1ScheduleForm, batchMeetLink: newUrl });
                      showToast?.('Regenerated genuine Google Meet link!', 'info');
                    }}
                    style={{ background: '#221f33', border: '1px solid #3d3957', color: '#c084fc', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Regenerate Meet Link
                  </button>
                </div>
                <input
                  type="url"
                  value={r1ScheduleForm.batchMeetLink}
                  onChange={(e) => setR1ScheduleForm({ ...r1ScheduleForm, batchMeetLink: e.target.value })}
                  className={styles.searchInput}
                  placeholder="https://meet.google.com/abc-defg-hij"
                />
              </div>
            ) : (
              <div style={{ background: '#08070d', border: '1px solid #1f1d2e', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: '#38bdf8' }}>
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>Dedicated Individual Google Meet Room:</div>
                <code style={{ color: '#c084fc' }}>https://meet.google.com/xxx-yyyy-zzz (Unique authentic Google Meet room per candidate)</code>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  A unique, authentic Google Meet video conference link will be automatically generated and dispatched to each individual candidate in their review email.
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Mentorship Guidelines & Preparation Notes
            </label>
            <textarea
              rows={3}
              value={r1ScheduleForm.customNotes}
              onChange={(e) => setR1ScheduleForm({ ...r1ScheduleForm, customNotes: e.target.value })}
              className={styles.searchInput}
              style={{ height: 'auto', padding: '10px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
              Targeting <strong>{selectedCandidateIds.length}</strong> selected candidates.
            </span>

            <button
              type="button"
              onClick={handleScheduleReview1}
              disabled={schedulingR1 || selectedCandidateIds.length === 0}
              className={styles.btnPrimary}
            >
              <Send size={14} />
              <span>{schedulingR1 ? 'Scheduling & Dispatching...' : `Confirm & Send Review 1 Emails (${selectedCandidateIds.length})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* --- SUBTAB 3: UPLOAD FEEDBACK CSV (SUBSEQUENT REVIEWS) --- */}
      {subTab === 'feedback-upload' && (
        <div style={{ background: '#0c0c0e', border: '1px solid #232328', borderRadius: '12px', padding: '24px 28px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} color="#a855f7" />
            <span>Upload Multi-Session Review Feedback (CSV / Excel)</span>
          </h3>
          <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: '#94a3b8' }}>
            Upload evaluation feedback for Review 2, Review 3, etc. Expected CSV columns: <code>Intern ID, Name, Task ID, Task Number, Review Number, Feedback, Performance Score</code>. Uses the same Google Meet link assigned to each candidate and dispatches professional Jinja-formatted feedback emails.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Review Date
              </label>
              <input
                type="date"
                value={feedbackMeta.reviewDate}
                onChange={(e) => setFeedbackMeta({ ...feedbackMeta, reviewDate: e.target.value })}
                className={styles.searchInput}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Review Time
              </label>
              <input
                type="text"
                value={feedbackMeta.reviewTime}
                onChange={(e) => setFeedbackMeta({ ...feedbackMeta, reviewTime: e.target.value })}
                className={styles.searchInput}
                placeholder="04:00 PM"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Add CC Recipients (Optional)
              </label>
              <input
                type="text"
                value={feedbackMeta.cc}
                onChange={(e) => setFeedbackMeta({ ...feedbackMeta, cc: e.target.value })}
                className={styles.searchInput}
                placeholder="evaluator@shortfundly.com"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '14px' }}>
            <label className={styles.btnSecondary} style={{ cursor: 'pointer' }}>
              <Upload size={14} />
              <span>Select Feedback CSV File</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFeedbackFileChange}
              />
            </label>

            <button
              type="button"
              onClick={handleSendFeedbackMails}
              disabled={uploadingFeedback || feedbackRows.length === 0}
              className={styles.btnPrimary}
            >
              <Send size={14} />
              <span>{uploadingFeedback ? 'Processing & Dispatching...' : `Confirm & Dispatch Feedback Mails (${feedbackRows.length} Loaded)`}</span>
            </button>
          </div>
        </div>
      )}

      {/* --- SUBTAB 4: TASK COMPLETION CHECKPOINT --- */}
      {subTab === 'checkpoint' && (
        <div style={{ background: '#0c0c0e', border: '1px solid #232328', borderRadius: '12px', padding: '24px 28px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="#10b981" />
            <span>Task Completion Checkpoint & Milestone Finalization</span>
          </h3>
          <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: '#94a3b8' }}>
            Once reviews are completed across sessions, HR marks candidates as <strong>Task Completed</strong>. The platform calculates the individual task percentage score, sends automated milestone approval emails, and approves students to proceed to their next sprint task.
          </p>

          <div className={styles.tableResponsive} style={{ marginBottom: '20px' }}>
            {(() => {
              const checkpointCandidates = filteredCandidates.filter(
                (c) => (c.reviewCount && c.reviewCount >= 1) || c.reviewStage === 'Checkpoint Ready' || c.taskStatus?.includes('Completed')
              );

              if (checkpointCandidates.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '36px', background: '#09090b', borderRadius: '8px', border: '1px dashed #27272a', color: '#94a3b8' }}>
                    <Award size={36} color="#a855f7" style={{ margin: '0 auto 10px auto' }} />
                    <h4 style={{ color: '#ffffff', margin: '0 0 6px 0' }}>No Candidates Ready for Final Checkpoint</h4>
                    <p style={{ margin: 0, fontSize: '13px', maxWidth: '480px', marginInline: 'auto' }}>
                      Step-by-step review gating active: Only candidates who have received task emails and completed Review 1 & Review 2 evaluation will move into this checkpoint list.
                    </p>
                  </div>
                );
              }

              return (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>Select</th>
                      <th>Intern ID</th>
                      <th>Candidate Name</th>
                      <th>Batch</th>
                      <th>Calculated Score</th>
                      <th>Override Final Task Score (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkpointCandidates.map((c) => {
                      const isSelected = selectedCandidateIds.includes(c.id);
                      return (
                        <tr key={c.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(c.id)}
                              style={{ width: '16px', height: '16px', accentColor: '#a855f7', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ fontFamily: 'monospace', color: '#c084fc' }}>{c.internId}</td>
                          <td style={{ fontWeight: 600 }}>{c.fullName}</td>
                          <td><span className={styles.badgePurple}>{c.batch}</span></td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
                            {c.performancePercentage?.toFixed(1)}%
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              placeholder={String(c.performancePercentage || 100)}
                              value={finalScoreMap[c.id] || ''}
                              onChange={(e) => setFinalScoreMap({ ...finalScoreMap, [c.id]: e.target.value })}
                              className={styles.searchInput}
                              style={{ width: '100px', height: '32px' }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </div>

          <button
            type="button"
            onClick={handleMarkTasksCompleted}
            disabled={completingTask || selectedCandidateIds.length === 0}
            className={styles.btnPrimary}
          >
            <CheckCircle2 size={14} />
            <span>{completingTask ? 'Completing Milestones...' : `Approve & Mark Task Completed for ${selectedCandidateIds.length} Interns`}</span>
          </button>
        </div>
      )}

      {/* --- SUBTAB 5: FORMAL WARNING MAIL --- */}
      {subTab === 'warning' && (
        <div style={{ background: '#0c0c0e', border: '1px solid #232328', borderRadius: '12px', padding: '24px 28px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#ef4444" />
            <span>Formal Performance Warning & Score Reduction Dispatcher</span>
          </h3>
          <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: '#94a3b8' }}>
            For candidates who fail multiple review evaluations or leave tasks incomplete. Deducts a performance penalty (e.g. -10%) and dispatches official warning documentation.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Penalty Deduction Percentage
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={warningForm.penaltyAmount}
                onChange={(e) => setWarningForm({ ...warningForm, penaltyAmount: e.target.value })}
                className={styles.searchInput}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Warning Directive / Reason for Penalty
            </label>
            <textarea
              rows={3}
              value={warningForm.customNote}
              onChange={(e) => setWarningForm({ ...warningForm, customNote: e.target.value })}
              className={styles.searchInput}
              style={{ height: 'auto', padding: '10px' }}
            />
          </div>

          <button
            type="button"
            onClick={handleSendWarningEmails}
            disabled={sendingWarning || selectedCandidateIds.length === 0}
            className={styles.btnDanger}
          >
            <AlertTriangle size={14} />
            <span>{sendingWarning ? 'Deducting & Dispatching Warnings...' : `Dispatch Formal Warning to ${selectedCandidateIds.length} Selected Candidates`}</span>
          </button>
        </div>
      )}
    </div>
  );
}
