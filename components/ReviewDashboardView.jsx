'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import styles from './web3Deck.module.css';
import {
  Users,
  Sliders,
  ExternalLink,
  CheckSquare,
  Square,
  Link2,
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
  Award,
  Calendar,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import * as xlsx from 'xlsx';
import { renderJinja, jinjaTextToEmailHtml } from '../lib/jinjaEngine.js';

export default function ReviewDashboardView({
  batches = [],
  onRefresh,
  showToast,
}) {
  const [subTab, setSubTab] = useState('review-queue'); // 'review-queue' | 'schedule-r1' | 'feedback-upload' | 'checkpoint' | 'warning'

  // Refs for visible date pickers
  const scheduleDateRef = useRef(null);
  const feedbackDateRef = useRef(null);

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

  // Consolidated dynamic batches (A, B, C, D, E, Solo Interns, and candidate batches)
  const allBatches = useMemo(() => {
    const set = new Set();
    ['Batch A', 'Batch B', 'Batch C', 'Batch D', 'Batch E', 'Solo Interns'].forEach(b => set.add(b));
    batches.forEach(b => set.add(typeof b === 'string' ? b : b.batchName));
    candidates.forEach(c => { if (c.batch) set.add(c.batch); });
    return Array.from(set).filter(Boolean).sort();
  }, [batches, candidates]);

  // Generate standard 3-4-3 lowercase letter Google Meet link (e.g. https://meet.google.com/abc-defg-hij)
  const generateMeetUrl = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const pick = (len) => Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    return `https://meet.google.com/${pick(3)}-${pick(4)}-${pick(3)}`;
  };

  // Review Schedule Form with Multi-Session & Dual Google Meet Modes
  const [r1ScheduleForm, setR1ScheduleForm] = useState({
    reviewNumber: 1,
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

  // Modal 1: Customize Next Task Modal State
  const [customizeNextTaskModal, setCustomizeNextTaskModal] = useState({
    open: false,
    candidates: [],
    nextTaskNumber: 2,
    title: '',
    description: '',
    deadline: '',
    explanationDate: '',
    explanationTime: '11:00 AM IST',
    meetLink: '',
    customNotes: '',
    awardedScore: 100,
  });

  // Modal 2: Add New Task Modal State
  const [addNewTaskModal, setAddNewTaskModal] = useState({
    open: false,
    targetBatch: 'ALL',
    targetRole: 'ALL',
    taskNumber: 2,
    title: '',
    description: '',
    deadline: '',
    explanationDate: '',
    explanationTime: '11:00 AM IST',
    meetLink: '',
    assigning: false,
  });

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

  // Schedule Milestone Review Session (Review 1, 2, 3, etc.)
  const handleScheduleReview1 = async () => {
    if (selectedCandidateIds.length === 0) {
      showToast?.('Please select at least one candidate for Review.', 'error');
      return;
    }

    try {
      setSchedulingR1(true);
      const revNum = Number(r1ScheduleForm.reviewNumber || 1);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          reviewNumber: revNum,
          reviewDate: r1ScheduleForm.reviewDate,
          reviewTime: r1ScheduleForm.reviewTime,
          customNotes: r1ScheduleForm.customNotes,
          meetMode: r1ScheduleForm.meetMode,
          batchMeetLink: r1ScheduleForm.batchMeetLink,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Review #${revNum} successfully scheduled for ${data.count} candidates on ${data.scheduledDate}!`, 'success');
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

  // Download Sample Feedback Template with exact columns requested:
  // Intern ID, Name, Email ID, Task ID, Task Number, Task Title, batch, role, Review Number, Feedback, Performance Score
  const handleDownloadFeedbackTemplate = (format = 'xlsx') => {
    const sampleRows = candidates.length > 0
      ? candidates.slice(0, 10).map((c, i) => ({
          'Intern ID': c.internId || c.candidateId,
          'Name': c.fullName,
          'Email ID': c.email,
          'Task ID': c.activeTask?.taskId || `TSK-DEV-00${i + 1}`,
          'Task Number': c.activeTask?.taskNumber || 1,
          'Task Title': c.activeTask?.title || 'Core Technical Milestone',
          'batch': c.batch || 'Batch A',
          'role': c.role,
          'Review Number': (c.activeTask?.reviews?.length || 0) >= 1 ? (c.activeTask.reviews.length + 1) : 2,
          'Feedback': 'Sprint code evaluated. Clean architecture, modular components, and test coverage verified.',
          'Performance Score': 88.0,
        }))
      : [
          {
            'Intern ID': 'INT-2026-00001',
            'Name': 'Dharshana',
            'Email ID': 'dachudharshana17@gmail.com',
            'Task ID': 'TSK-DEV-001',
            'Task Number': 1,
            'Task Title': 'Core Milestone Implementation',
            'batch': 'Batch A',
            'role': 'AI Engineer',
            'Review Number': 2,
            'Feedback': 'Sprint deliverables reviewed. Architecture and test execution approved.',
            'Performance Score': 90.0,
          },
        ];

    const worksheet = xlsx.utils.json_to_sheet(sampleRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Review_Feedback_Template');
    const fileName = `Shortfundly_Review_Feedback_Template.${format}`;

    if (format === 'csv') {
      xlsx.writeFile(workbook, fileName, { bookType: 'csv' });
    } else {
      xlsx.writeFile(workbook, fileName, { bookType: 'xlsx' });
    }
    showToast?.(`Downloaded review feedback template (${format.toUpperCase()})!`, 'success');
  };

  // Ingest Feedback CSV or Excel (.xlsx, .xls)
  const handleFeedbackFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const parsed = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

      if (!parsed || parsed.length === 0) {
        showToast?.('The selected file contains no readable data rows.', 'warning');
        return;
      }

      setFeedbackRows(parsed);
      showToast?.(`Loaded ${parsed.length} review feedback row(s) from ${file.name}. Ready to dispatch feedback emails!`, 'info');
    } catch (err) {
      console.error('Error parsing feedback file:', err);
      showToast?.(`Error parsing feedback file: ${err.message}`, 'error');
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

  // Open Customize Next Task modal for a single intern
  const handleOpenCustomizeModal = (candidate) => {
    const currentNum = candidate.activeTask?.taskNumber || 1;
    const nextNum = currentNum + 1;
    const today = new Date();
    const defaultExpDate = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    const defaultDeadline = new Date(today.getTime() + 10 * 86400000).toISOString().split('T')[0];
    const meet = candidate.activeTask?.meetLink || candidate.googleMeetUrl || generateMeetUrl();

    setCustomizeNextTaskModal({
      open: true,
      candidates: [candidate],
      nextTaskNumber: nextNum,
      title: `Sprint Milestone #${nextNum}: Production Feature Implementation`,
      description: `Develop and integrate core deliverable modules for Milestone #${nextNum}. Write comprehensive unit tests and adhere to product architecture guidelines. Discuss implementation roadmap during the briefing check-in call.`,
      deadline: defaultDeadline,
      explanationDate: defaultExpDate,
      explanationTime: '11:00 AM IST',
      meetLink: meet,
      customNotes: `Milestone #${currentNum} verified and approved. Candidate demonstrates strong technical execution and is promoted to Sprint Task #${nextNum}.`,
      awardedScore: finalScoreMap[candidate.id] !== undefined ? Number(finalScoreMap[candidate.id]) : (candidate.performancePercentage || 100),
    });
  };

  // Open Customize Next Task modal for multiple selected interns
  const handleOpenBulkCustomizeModal = () => {
    if (selectedCandidateIds.length === 0) {
      showToast?.('Please select at least one candidate first.', 'error');
      return;
    }
    const targetCands = filteredCandidates.filter(c => selectedCandidateIds.includes(c.id));
    const sampleCand = targetCands[0];
    const currentNum = sampleCand?.activeTask?.taskNumber || 1;
    const nextNum = currentNum + 1;
    const today = new Date();
    const defaultExpDate = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    const defaultDeadline = new Date(today.getTime() + 10 * 86400000).toISOString().split('T')[0];

    setCustomizeNextTaskModal({
      open: true,
      candidates: targetCands,
      nextTaskNumber: nextNum,
      title: `Sprint Milestone #${nextNum}: Production Deliverables & Testing`,
      description: `Implement and deliver milestone features for Task #${nextNum}. Submit live demo application and verified GitHub repository via the candidate portal.`,
      deadline: defaultDeadline,
      explanationDate: defaultExpDate,
      explanationTime: '11:00 AM IST',
      meetLink: generateMeetUrl(),
      customNotes: `Sprint milestone approved across cohort. Candidates promoted to Milestone #${nextNum}.`,
      awardedScore: 100,
    });
  };

  // Open Add New Task Modal
  const handleOpenAddNewTaskModal = () => {
    const today = new Date();
    const defaultExpDate = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    const defaultDeadline = new Date(today.getTime() + 10 * 86400000).toISOString().split('T')[0];

    setAddNewTaskModal({
      open: true,
      targetBatch: selectedBatch !== 'ALL' ? selectedBatch : 'ALL',
      targetRole: selectedRole !== 'ALL' ? selectedRole : 'ALL',
      taskNumber: selectedTaskNum !== 'ALL' ? (parseInt(selectedTaskNum, 10) + 1) : 2,
      title: 'Sprint Milestone: Core Application Engineering',
      description: 'Design and build assigned architectural modules with clean code standards, responsive interfaces, and continuous integration workflows.',
      deadline: defaultDeadline,
      explanationDate: defaultExpDate,
      explanationTime: '11:00 AM IST',
      meetLink: generateMeetUrl(),
      assigning: false,
    });
  };

  // Dispatch Add New Task to Batch/Role
  const handleDispatchAddNewTask = async () => {
    try {
      setAddNewTaskModal(prev => ({ ...prev, assigning: true }));
      let targetCandidates = filteredCandidates;
      if (addNewTaskModal.targetBatch !== 'ALL') {
        targetCandidates = targetCandidates.filter(c => c.batch === addNewTaskModal.targetBatch);
      }
      if (addNewTaskModal.targetRole !== 'ALL') {
        targetCandidates = targetCandidates.filter(c => c.role?.toLowerCase().includes(addNewTaskModal.targetRole.toLowerCase()));
      }

      if (targetCandidates.length === 0) {
        showToast?.('No matching candidates found for this batch/role selection.', 'error');
        setAddNewTaskModal(prev => ({ ...prev, assigning: false }));
        return;
      }

      const res = await fetch('/api/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: targetCandidates.map(c => c.id),
          title: addNewTaskModal.title,
          description: addNewTaskModal.description,
          objective: addNewTaskModal.description,
          explanationDate: addNewTaskModal.explanationDate,
          explanationTime: addNewTaskModal.explanationTime,
          deadline: addNewTaskModal.deadline,
          customMeetLink: addNewTaskModal.meetLink,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Task successfully assigned & email invites sent to ${targetCandidates.length} candidate(s)!`, 'success');
        setAddNewTaskModal(prev => ({ ...prev, open: false, assigning: false }));
        loadReviewData();
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to dispatch new task.', 'error');
        setAddNewTaskModal(prev => ({ ...prev, assigning: false }));
      }
    } catch (err) {
      showToast?.(err.message, 'error');
      setAddNewTaskModal(prev => ({ ...prev, assigning: false }));
    }
  };

  // Submit Approval and Dispatch Next Task (Customized or Quick)
  const executeApproveAndAdvance = async (targetCandIds, customTaskData = null) => {
    try {
      setCompletingTask(true);
      const res = await fetch('/api/reviews/complete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: targetCandIds,
          finalScoreMap,
          customNotes: customTaskData?.customNotes,
          customNextTask: customTaskData ? {
            title: customTaskData.title,
            description: customTaskData.description,
            deadline: customTaskData.deadline,
            explanationDate: customTaskData.explanationDate,
            explanationTime: customTaskData.explanationTime,
            meetLink: customTaskData.meetLink,
          } : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Task approved & completed! Automated milestone notice and Next Task dispatched to ${data.completedCount} intern(s).`, 'success');
        setSelectedCandidateIds([]);
        setCustomizeNextTaskModal(prev => ({ ...prev, open: false }));
        loadReviewData();
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to approve task completion.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setCompletingTask(false);
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
            <h2 className={styles.mainTitle}>Reviews & Mentorship</h2>
            <p className={styles.subtitle}>Schedule review meetings, share feedback, and track intern progress.</p>
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
            <span>Schedule Review Meeting</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('feedback-upload')}
            className={`${styles.subTabBtn} ${subTab === 'feedback-upload' ? styles.subTabBtnActive : ''}`}
          >
            <Upload size={14} />
            <span>Upload Feedback (CSV / Excel)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('checkpoint')}
            className={`${styles.subTabBtn} ${subTab === 'checkpoint' ? styles.subTabBtnActive : ''}`}
          >
            <Award size={14} />
            <span>Mark Tasks Completed</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('warning')}
            className={`${styles.subTabBtn} ${subTab === 'warning' ? styles.subTabBtnActive : ''}`}
          >
            <AlertTriangle size={14} />
            <span>Send Warning Notice</span>
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
          value={selectedTaskNum}
          onChange={(e) => {
            if (e.target.value === '__ADD_NEW__') {
              handleOpenAddNewTaskModal();
            } else {
              setSelectedTaskNum(e.target.value);
            }
          }}
          className={styles.selectInput}
        >
          <option value="ALL">All Task Numbers</option>
          <option value="1">Task #1</option>
          <option value="2">Task #2</option>
          <option value="3">Task #3</option>
          <option value="4">Task #4</option>
          <option value="__ADD_NEW__" style={{ fontWeight: 700, color: '#6D28D9' }}>+ Add New Task Option...</option>
        </select>

        <button
          type="button"
          onClick={handleOpenAddNewTaskModal}
          className={styles.btnSecondary}
          style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EDE9FE', borderColor: '#C4B5FD', color: '#5B21B6', fontWeight: 700, padding: '7px 14px' }}
          title="Create and assign a new milestone task"
        >
          <Plus size={14} />
          <span>+ Add New Task</span>
        </button>
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
                  style={{ background: '#064e3b', border: '1px solid #059669', color: '#a7f3d0', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
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
                  style={{ background: '#10b981', border: 'none', color: '#ffffff', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
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
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
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
                  <th>Email ID</th>
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
                    <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
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
                            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                          />
                        </td>
                        <td><code style={{ fontFamily: 'var(--font-mono)', color: '#6D28D9', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>{c.internId}</code></td>
                        <td style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{c.fullName}</td>
                        <td style={{ fontSize: '13px', color: '#475569' }}>{c.email}</td>
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
                            <a href={task.meetLink} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Video size={12} />
                              <span>Join Session</span>
                            </a>
                          ) : (
                            <span style={{ color: '#475569', fontSize: '12.5px' }}>Auto-Assigned</span>
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
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '24px 28px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', color: '#0F172A', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#7C3AED" />
            <span>Schedule Review Meeting & Send Meeting Links</span>
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#475569' }}>
            HR and Admin decide the review date and session time for selected interns. Dispatches official review invitations with Google Meet video links, automatically skipping non-working days or conforming to HR calendar preferences.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Review Milestone Session <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={r1ScheduleForm.reviewNumber || 1}
                onChange={(e) => setR1ScheduleForm({ ...r1ScheduleForm, reviewNumber: parseInt(e.target.value) || 1 })}
                className={styles.searchInput}
              >
                <option value="1">Review #1 (Initial Sprint Architecture & Code Review)</option>
                <option value="2">Review #2 (Mid-Sprint Code Walkthrough & Evaluation)</option>
                <option value="3">Review #3 (Final QA, Documentation & Signoff)</option>
                <option value="4">Review #4 (Advanced Milestone Evaluation)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Review Scheduled Date (HR Decided) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  ref={scheduleDateRef}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={r1ScheduleForm.reviewDate}
                  onChange={(e) => setR1ScheduleForm({ ...r1ScheduleForm, reviewDate: e.target.value })}
                  className={styles.searchInput}
                  style={{ colorScheme: 'light', paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => scheduleDateRef.current?.showPicker?.()}
                  style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                  title="Open Calendar"
                >
                  <Calendar size={16} color="#c084fc" />
                </button>
              </div>
              <span style={{ fontSize: '12.5px', color: '#16a34a', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                Suggested Next Business Day: {suggestedReviewDate}
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Scheduled Review Time
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
          <div style={{ background: '#FAF5FF', border: '1px solid #DDD6FE', borderRadius: '12px', padding: '18px 22px', marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
              Google Meet Link Mode for Candidate Evaluation Mails <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setR1ScheduleForm({ ...r1ScheduleForm, meetMode: 'BATCH' })}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: r1ScheduleForm.meetMode === 'BATCH' ? '2px solid #7C3AED' : '1px solid #CBD5E1',
                  background: r1ScheduleForm.meetMode === 'BATCH' ? '#EDE9FE' : '#FFFFFF',
                  color: r1ScheduleForm.meetMode === 'BATCH' ? '#581C87' : '#0F172A',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Video size={18} color={r1ScheduleForm.meetMode === 'BATCH' ? '#7C3AED' : '#64748B'} />
                <div>
                  <div style={{ color: r1ScheduleForm.meetMode === 'BATCH' ? '#581C87' : '#0F172A', fontWeight: 700 }}>Batch-Wise Shared Google Meet Link</div>
                  <div style={{ fontSize: '12.5px', color: '#475569', fontWeight: 500 }}>Send same Meet link to all candidates in batch</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setR1ScheduleForm({ ...r1ScheduleForm, meetMode: 'INDIVIDUAL' })}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: r1ScheduleForm.meetMode === 'INDIVIDUAL' ? '2px solid #7C3AED' : '1px solid #CBD5E1',
                  background: r1ScheduleForm.meetMode === 'INDIVIDUAL' ? '#EDE9FE' : '#FFFFFF',
                  color: r1ScheduleForm.meetMode === 'INDIVIDUAL' ? '#581C87' : '#0F172A',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Sparkles size={18} color={r1ScheduleForm.meetMode === 'INDIVIDUAL' ? '#7C3AED' : '#64748B'} />
                <div>
                  <div style={{ color: r1ScheduleForm.meetMode === 'INDIVIDUAL' ? '#581C87' : '#0F172A', fontWeight: 700 }}>Unique Google Meet Link per Candidate</div>
                  <div style={{ fontSize: '12.5px', color: '#475569', fontWeight: 500 }}>Auto-generate dedicated 1-on-1 Meet room per student</div>
                </div>
              </button>
            </div>

            {r1ScheduleForm.meetMode === 'BATCH' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', color: '#0F172A', fontWeight: 700 }}>
                    Batch Google Meet Room URL (Sent to all {selectedCandidateIds.length} candidate(s)):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newUrl = generateMeetUrl();
                      setR1ScheduleForm({ ...r1ScheduleForm, batchMeetLink: newUrl });
                      showToast?.('Regenerated genuine Google Meet link!', 'info');
                    }}
                    style={{ background: '#EDE9FE', border: '1px solid #C4B5FD', color: '#6D28D9', borderRadius: '6px', padding: '4px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
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
              <div style={{ background: '#FFFFFF', border: '1px solid #DDD6FE', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', color: '#6D28D9' }}>
                <div style={{ fontWeight: 700, marginBottom: '2px', color: '#0F172A' }}>Dedicated Individual Google Meet Room:</div>
                <code style={{ color: '#6D28D9', fontWeight: 600 }}>https://meet.google.com/xxx-yyyy-zzz (Unique authentic Google Meet room per candidate)</code>
                <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                  A unique, authentic Google Meet video conference link will be automatically generated and dispatched to each individual candidate in their review email.
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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
            <span style={{ fontSize: '12.5px', color: '#475569' }}>
              Targeting <strong>{selectedCandidateIds.length}</strong> selected candidates.
            </span>

            <button
              type="button"
              onClick={handleScheduleReview1}
              disabled={schedulingR1 || selectedCandidateIds.length === 0}
              className={styles.btnPrimary}
            >
              <Send size={14} />
              <span>{schedulingR1 ? 'Scheduling & Dispatching...' : `Confirm & Send Review #${r1ScheduleForm.reviewNumber || 1} Emails (${selectedCandidateIds.length})`}</span>
            </button>
          </div>

          {/* Candidates Selection Table in Schedule Milestone Review */}
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-default)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0F172A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color="#7C3AED" />
                  <span>Select Candidates for Review Scheduling ({selectedCandidateIds.length} of {filteredCandidates.length} Selected)</span>
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                  Check candidate(s) below who will receive Review #{r1ScheduleForm.reviewNumber || 1} emails on {r1ScheduleForm.reviewDate || 'the scheduled date'}.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  style={{ background: '#EDE9FE', border: '1px solid #DDD6FE', color: '#581C87', padding: '8px 18px', borderRadius: '8px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {selectedCandidateIds.length === filteredCandidates.length && filteredCandidates.length > 0 ? 'Deselect All' : 'Select All'}
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
                    <th>Email ID</th>
                    <th>Role</th>
                    <th>Batch</th>
                    <th>Task No.</th>
                    <th>Current Stage</th>
                    <th>Score (%)</th>
                    <th>Google Meet Room</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#475569' }}>
                        No candidates found for review scheduling.
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
                              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                            />
                          </td>
                          <td><code style={{ fontFamily: 'var(--font-mono)', color: '#6D28D9', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>{c.internId}</code></td>
                          <td style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{c.fullName}</td>
                          <td style={{ fontSize: '13px', color: '#475569' }}>{c.email}</td>
                          <td style={{ fontSize: '13.5px', color: '#0F172A', fontWeight: 500 }}>{c.role}</td>
                          <td><span className={styles.badgePurple}>{c.batch}</span></td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{task?.taskNumber || 1}</td>
                          <td>
                            <span className={
                              c.reviewStage === 'Checkpoint Ready' ? styles.badgeEmerald :
                              c.reviewStage === 'Review 2 Pending' ? styles.badgePurple : styles.badgeAmber
                            }>
                              {c.reviewStage || 'Review 1 Pending'}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
                            {c.performancePercentage?.toFixed(1)}%
                          </td>
                          <td>
                            {r1ScheduleForm.meetMode === 'BATCH' ? (
                              <span style={{ fontSize: '13px', color: '#6D28D9' }}>Batch Shared Link</span>
                            ) : (
                              <span style={{ fontSize: '13px', color: '#38bdf8' }}>Individual Auto-Link</span>
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
        </div>
      )}

      {/* --- SUBTAB 3: UPLOAD FEEDBACK CSV / EXCEL (SUBSEQUENT REVIEWS) --- */}
      {subTab === 'feedback-upload' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#0F172A', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} color="#7C3AED" />
              <span>Upload Multi-Session Review Feedback (CSV / Excel)</span>
            </h3>

            {/* 1-Click Template Downloads */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleDownloadFeedbackTemplate('xlsx')}
                className={styles.btnSecondary}
                style={{ padding: '5px 12px', fontSize: '13px' }}
                title="Download ready-to-fill Excel template with prefilled intern records"
              >
                <FileSpreadsheet size={13} color="#10b981" />
                <span>Download Template (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadFeedbackTemplate('csv')}
                className={styles.btnSecondary}
                style={{ padding: '5px 12px', fontSize: '13px' }}
                title="Download CSV format template"
              >
                <Download size={13} color="#38bdf8" />
                <span>Download Template (.csv)</span>
              </button>
            </div>
          </div>

          <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
            Upload evaluation feedback for Review 2, Review 3, etc. Expected CSV / Excel columns: Intern ID, Name, Email ID, Task ID, Task Number, Task Title, batch, role, Review Number, Feedback, Performance Score. Sends personalized feedback emails with Google Meet links.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Review Date
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  ref={feedbackDateRef}
                  type="date"
                  value={feedbackMeta.reviewDate}
                  onChange={(e) => setFeedbackMeta({ ...feedbackMeta, reviewDate: e.target.value })}
                  className={styles.searchInput}
                  style={{ colorScheme: 'light', paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => feedbackDateRef.current?.showPicker?.()}
                  style={{ position: 'absolute', right: '10px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                  title="Open Calendar"
                >
                  <Calendar size={16} color="#c084fc" />
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
            <label className={styles.btnSecondary} style={{ cursor: 'pointer' }}>
              <Upload size={14} />
              <span>Select Feedback CSV / Excel File (.xlsx, .csv)</span>
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

          {/* UPLOADED EXCEL/CSV INTERNS DETAILS PREVIEW TABLE */}
          {feedbackRows.length > 0 && (
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-default)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14.5px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <span>Uploaded Interns List ({feedbackRows.length} Records Loaded from File)</span>
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                    Review each intern\'s feedback and scores below before confirming dispatch.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackRows([]);
                      showToast?.('Cleared uploaded file records.', 'info');
                    }}
                    style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', color: '#f87171', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Clear / Re-upload
                  </button>
                  <button
                    type="button"
                    onClick={handleSendFeedbackMails}
                    disabled={uploadingFeedback}
                    className={styles.btnPrimary}
                    style={{ padding: '6px 14px', fontSize: '13px' }}
                  >
                    <Send size={13} />
                    <span>{uploadingFeedback ? 'Dispatching...' : `Dispatch Feedback Mails (${feedbackRows.length})`}</span>
                  </button>
                </div>
              </div>

              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}>#</th>
                      <th>Intern ID</th>
                      <th>Candidate Name</th>
                      <th>Email ID</th>
                      <th>Batch</th>
                      <th>Role</th>
                      <th>Task ID</th>
                      <th>Task Title</th>
                      <th>Review #</th>
                      <th>Score</th>
                      <th>Feedback Evaluation</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackRows.map((row, idx) => {
                      const internId = row['Intern ID'] || row.internId || row.InternId || row['Candidate ID'] || row.candidateId || `INT-ROW-${idx + 1}`;
                      const name = row['Name'] || row.name || row['Candidate Name'] || row.candidateName || 'Candidate';
                      const email = row['Email ID'] || row['Email'] || row.email || row.EmailId || row['Email Address'] || '-';
                      const taskId = row['Task ID'] || row.taskId || row.TaskId || 'TSK-001';
                      const taskNum = row['Task Number'] || row.taskNumber || 1;
                      const taskTitle = row['Task Title'] || row['Task Name'] || row.taskTitle || row.title || 'Technical Milestone';
                      const batch = row['batch'] || row['Batch'] || row.batch || 'Batch A';
                      const role = row['role'] || row['Role'] || row.role || 'Intern';
                      const reviewNum = row['Review Number'] || row.reviewNumber || 2;
                      const feedback = row['Feedback'] || row.feedback || row['Notes'] || 'Evaluation verified';
                      const score = row['Performance Score'] || row['Performance Percentage'] || row.performancePercentage || row.score || 90;

                      return (
                        <tr key={idx}>
                          <td style={{ color: '#475569', fontSize: '12.5px' }}>{idx + 1}</td>
                          <td><code style={{ fontFamily: 'var(--font-mono)', color: '#6D28D9', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>{internId}</code></td>
                          <td style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{name}</td>
                          <td style={{ fontSize: '13px', color: '#475569' }}>{email}</td>
                          <td><span className={styles.badgePurple}>{batch}</span></td>
                          <td style={{ fontSize: '13.5px', color: '#0F172A', fontWeight: 500 }}>{role}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{taskId} (#{taskNum})</td>
                          <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{taskTitle}</td>
                          <td><span className={styles.badgeAmber}>Review #{reviewNum}</span></td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>{score}%</td>
                          <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', color: '#334155' }} title={feedback}>
                            {feedback}
                          </td>
                          <td>
                            <span className={styles.badgeEmerald}>
                              <CheckCircle2 size={11} />
                              <span>Ready</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* When no file is uploaded yet: Show current platform candidates table */}
          {feedbackRows.length === 0 && (
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-default)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#0F172A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color="#7C3AED" />
                    <span>Eligible Interns in System ({filteredCandidates.length} Candidates Available)</span>
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                    Upload an Excel or CSV file above to submit bulk evaluation feedback, or download a template pre-filled with these candidates.
                  </p>
                </div>
              </div>

              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Intern ID</th>
                      <th>Candidate Name</th>
                      <th>Email ID</th>
                      <th>Role</th>
                      <th>Batch</th>
                      <th>Active Task</th>
                      <th>Current Stage</th>
                      <th>Performance Score</th>
                      <th>Assigned Meet Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#475569' }}>
                          No candidates found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredCandidates.map((c) => {
                        const task = c.activeTask;
                        return (
                          <tr key={c.id}>
                            <td><code style={{ fontFamily: 'var(--font-mono)', color: '#6D28D9', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}>{c.internId}</code></td>
                            <td style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{c.fullName}</td>
                            <td style={{ fontSize: '13px', color: '#475569' }}>{c.email}</td>
                            <td style={{ fontSize: '13.5px', color: '#0F172A', fontWeight: 500 }}>{c.role}</td>
                            <td><span className={styles.badgePurple}>{c.batch}</span></td>
                            <td>
                              <span style={{ fontWeight: 600, color: '#0F172A' }}>{task?.taskId || 'TSK-DEV-001'}</span>
                              <div style={{ fontSize: '12.5px', color: '#475569' }}>{task?.title || 'Technical Milestone'}</div>
                            </td>
                            <td>
                              <span className={
                                c.reviewStage === 'Checkpoint Ready' ? styles.badgeEmerald :
                                c.reviewStage === 'Review 2 Pending' ? styles.badgePurple : styles.badgeAmber
                              }>
                                {c.reviewStage || 'Review 1 Pending'}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
                              {c.performancePercentage?.toFixed(1)}%
                            </td>
                            <td>
                              {task?.meetLink ? (
                                <a href={task.meetLink} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Video size={12} />
                                  <span>View Meet</span>
                                </a>
                              ) : (
                                <span style={{ color: '#475569', fontSize: '12.5px' }}>Auto-Generates</span>
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
        </div>
      )}

      {/* --- SUBTAB 4: TASK COMPLETION CHECKPOINT --- */}
      {subTab === 'checkpoint' && (
        <div style={{ background: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: '12px', padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {/* Header & Description */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#0F172A', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="#059669" />
                <span>Mark Tasks Completed & Advance Interns</span>
              </h3>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.5, maxWidth: '820px' }}>
                HR approves candidates based on live project submissions, review evaluations, and performance scores. Approved interns are automatically promoted to their next sprint task with automated notification emails.
              </p>
            </div>

            {/* Bulk Action Controls */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className={styles.btnSecondary}
                style={{ fontSize: '13px', padding: '7px 14px', fontWeight: 700 }}
              >
                {selectedCandidateIds.length === filteredCandidates.length && filteredCandidates.length > 0 ? 'Deselect All' : `Select All (${filteredCandidates.length})`}
              </button>

              <button
                type="button"
                onClick={() => executeApproveAndAdvance(selectedCandidateIds, null)}
                disabled={completingTask || selectedCandidateIds.length === 0}
                className={styles.btnPrimary}
                style={{ fontSize: '13px', padding: '7px 16px', fontWeight: 700, background: '#059669', borderColor: '#047857' }}
                title="Directly approve current task and auto-dispatch next sprint task"
              >
                <CheckCircle2 size={15} />
                <span>Quick Approve Selected (${selectedCandidateIds.length})</span>
              </button>

              <button
                type="button"
                onClick={handleOpenBulkCustomizeModal}
                disabled={completingTask || selectedCandidateIds.length === 0}
                className={styles.btnPrimary}
                style={{ fontSize: '13px', padding: '7px 16px', fontWeight: 700, background: '#6D28D9', borderColor: '#5B21B6' }}
                title="Customize next task title, requirements, deadline, and Google Meet link before sending"
              >
                <Sliders size={15} />
                <span>Customize Next Task for Selected (${selectedCandidateIds.length})</span>
              </button>
            </div>
          </div>

          {/* All Students List Table (Filtered, True Data Only) */}
          <div className={styles.tableResponsive} style={{ marginBottom: '20px' }}>
            {filteredCandidates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: '#F8FAFC', borderRadius: '10px', border: '1.5px dashed #CBD5E1', color: '#475569' }}>
                <Users size={36} color="#6D28D9" style={{ margin: '0 auto 10px auto' }} />
                <h4 style={{ color: '#0F172A', margin: '0 0 6px 0', fontWeight: 700, fontSize: '15px' }}>No Interns Found</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  No interns currently match your filter criteria. Try adjusting the Batch, Role, or Task Number filters above.
                </p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedCandidateIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                        onChange={handleToggleSelectAll}
                        style={{ width: '16px', height: '16px', accentColor: '#6D28D9', cursor: 'pointer' }}
                        title="Select/Deselect All"
                      />
                    </th>
                    <th>Intern ID</th>
                    <th>Candidate & Role</th>
                    <th>Batch</th>
                    <th>Current Task</th>
                    <th>Submissions</th>
                    <th>Reviews & Feedback</th>
                    <th>Score (%)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>HR Approval & Next Task Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c) => {
                    const isSelected = selectedCandidateIds.includes(c.id);
                    const taskNum = c.activeTask?.taskNumber || 1;
                    const taskTitle = c.activeTask?.title || `Task #${taskNum}`;
                    const hasSubmissions = Boolean(c.activeTask?.projectUrl || c.activeTask?.githubUrl || c.activeTask?.submissionStatus === 'SUBMITTED');
                    const isCompleted = c.taskStatus === 'Task Completed' || c.taskStatus === 'Completed';

                    return (
                      <tr key={c.id} style={{ background: isSelected ? '#FAF5FF' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(c.id)}
                            style={{ width: '16px', height: '16px', accentColor: '#6D28D9', cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          <code style={{ fontFamily: 'monospace', color: '#6D28D9', fontWeight: 800, fontSize: '13px' }}>
                            {c.internId || c.candidateId}
                          </code>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{c.fullName}</div>
                          <div style={{ fontSize: '12.5px', color: '#475569', fontWeight: 500 }}>{c.role}</div>
                          {c.collegeName && <div style={{ fontSize: '11.5px', color: '#64748B' }}>{c.collegeName}</div>}
                        </td>
                        <td>
                          <span className={styles.badgePurple} style={{ fontWeight: 700 }}>{c.batch || 'Batch A'}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>Task #{taskNum}</div>
                          <div style={{ fontSize: '12px', color: '#475569', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={taskTitle}>
                            {taskTitle}
                          </div>
                        </td>
                        <td>
                          {hasSubmissions ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span className={styles.badgeEmerald} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', width: 'fit-content', fontSize: '11px', padding: '2px 8px' }}>
                                <CheckCircle2 size={11} /> Submitted
                              </span>
                              {c.activeTask?.projectUrl && (
                                <a
                                  href={c.activeTask.projectUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: '#2563EB', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'underline' }}
                                >
                                  <ExternalLink size={11} /> Live Demo
                                </a>
                              )}
                              {c.activeTask?.githubUrl && (
                                <a
                                  href={c.activeTask.githubUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: '#475569', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'underline' }}
                                >
                                  <ExternalLink size={11} /> GitHub Repo
                                </a>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>
                              Pending Submission
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: c.reviewCount >= 2 ? '#059669' : c.reviewCount === 1 ? '#D97706' : '#64748B', fontSize: '12.5px' }}>
                            {c.reviewCount ? `${c.reviewCount} Review(s) Conducted` : 'Review Pending'}
                          </div>
                          {c.activeTask?.reviews && c.activeTask.reviews.length > 0 && (
                            <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.activeTask.reviews[c.activeTask.reviews.length - 1].feedback}>
                              &bull; {c.activeTask.reviews[c.activeTask.reviews.length - 1].feedback}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={finalScoreMap[c.id] !== undefined ? finalScoreMap[c.id] : Math.round(c.performancePercentage || 100)}
                              onChange={(e) => setFinalScoreMap({ ...finalScoreMap, [c.id]: e.target.value })}
                              style={{
                                width: '64px',
                                height: '32px',
                                padding: '4px 6px',
                                border: '1.5px solid #CBD5E1',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#0F172A',
                                background: '#FFFFFF',
                                textAlign: 'center',
                              }}
                              title="Override candidate performance percentage"
                            />
                            <span style={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>%</span>
                          </div>
                        </td>
                        <td>
                          {isCompleted ? (
                            <span className={styles.badgeEmerald} style={{ fontWeight: 700 }}>Completed</span>
                          ) : c.activeTask?.submissionStatus === 'SUBMITTED' ? (
                            <span style={{ background: '#EDE9FE', color: '#5B21B6', border: '1px solid #C4B5FD', padding: '3px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 700 }}>Under Review</span>
                          ) : (
                            <span className={styles.badgeIndigo} style={{ fontWeight: 700 }}>In Progress</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => executeApproveAndAdvance([c.id], null)}
                              disabled={completingTask}
                              className={styles.btnPrimary}
                              style={{ padding: '5px 10px', fontSize: '12px', fontWeight: 700, background: '#059669', borderColor: '#047857', whiteSpace: 'nowrap' }}
                              title="Approve task completion and auto-dispatch next sprint task"
                            >
                              <CheckCircle2 size={13} />
                              <span>Approve & Next</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenCustomizeModal(c)}
                              disabled={completingTask}
                              className={styles.btnSecondary}
                              style={{ padding: '5px 10px', fontSize: '12px', fontWeight: 700, color: '#5B21B6', borderColor: '#C4B5FD', background: '#EDE9FE', whiteSpace: 'nowrap' }}
                              title="Customize next task title, requirements, deadline, and Google Meet room"
                            >
                              <Sliders size={13} />
                              <span>Customize Next</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CUSTOMIZE NEXT TASK CONTENT & DISPATCH                  */}
      {/* ============================================================== */}
      {customizeNextTaskModal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6D28D9' }}>
                  <Award size={20} />
                </div>
                <div>
                  <h3 className={styles.modalTitle} style={{ margin: 0, fontSize: '17px', color: '#0F172A', fontWeight: 800 }}>
                    Approve Task Completion & Customize Next Sprint Task
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#475569' }}>
                    {customizeNextTaskModal.candidates.length === 1
                      ? `Intern: ${customizeNextTaskModal.candidates[0].fullName} (${customizeNextTaskModal.candidates[0].internId || customizeNextTaskModal.candidates[0].candidateId})`
                      : `Dispatching next task to ${customizeNextTaskModal.candidates.length} selected interns`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomizeNextTaskModal(prev => ({ ...prev, open: false }))}
                className={styles.modalClose}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Approval & Score Box */}
              <div style={{ background: '#FAF5FF', border: '1.5px solid #DDD6FE', borderRadius: '8px', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ color: '#5B21B6', fontSize: '14px' }}>Approval & Completion Evaluation</strong>
                  <span style={{ fontSize: '12.5px', color: '#6D28D9', fontWeight: 700 }}>
                    Promoting to Task #{customizeNextTaskModal.nextTaskNumber}
                  </span>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                    Mentor Feedback & Completion Note
                  </label>
                  <textarea
                    rows={2}
                    value={customizeNextTaskModal.customNotes}
                    onChange={(e) => setCustomizeNextTaskModal({ ...customizeNextTaskModal, customNotes: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', background: '#FFFFFF', fontWeight: 600 }}
                    placeholder="Enter approval praise and evaluation note..."
                  />
                </div>
              </div>

              {/* Next Task Parameters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                    Next Task Title *
                  </label>
                  <input
                    type="text"
                    value={customizeNextTaskModal.title}
                    onChange={(e) => setCustomizeNextTaskModal({ ...customizeNextTaskModal, title: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13.5px', color: '#0F172A', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                    Deliverable Requirements & Technical Objectives *
                  </label>
                  <textarea
                    rows={5}
                    value={customizeNextTaskModal.description}
                    onChange={(e) => setCustomizeNextTaskModal({ ...customizeNextTaskModal, description: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontWeight: 600, lineHeight: 1.5 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                      Explanation Call Date *
                    </label>
                    <input
                      type="date"
                      value={customizeNextTaskModal.explanationDate}
                      onChange={(e) => setCustomizeNextTaskModal({ ...customizeNextTaskModal, explanationDate: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                      Explanation Call Time *
                    </label>
                    <input
                      type="text"
                      value={customizeNextTaskModal.explanationTime}
                      onChange={(e) => setCustomizeNextTaskModal({ ...customizeNextTaskModal, explanationTime: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                      Submission Deadline *
                    </label>
                    <input
                      type="date"
                      value={customizeNextTaskModal.deadline}
                      onChange={(e) => setCustomizeNextTaskModal({ ...customizeNextTaskModal, deadline: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontWeight: 600 }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Google Meet Briefing Room *
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomizeNextTaskModal(prev => ({ ...prev, meetLink: generateMeetUrl() }))}
                      style={{ fontSize: '12px', color: '#6D28D9', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Regenerate Meeting Link
                    </button>
                  </div>
                  <input
                    type="url"
                    value={customizeNextTaskModal.meetLink}
                    onChange={(e) => setCustomizeNextTaskModal({ ...customizeNextTaskModal, meetLink: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontWeight: 600 }}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px' }}>
              <button
                type="button"
                onClick={() => setCustomizeNextTaskModal(prev => ({ ...prev, open: false }))}
                className={styles.btnSecondary}
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600 }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => executeApproveAndAdvance(customizeNextTaskModal.candidates.map(c => c.id), customizeNextTaskModal)}
                disabled={completingTask}
                className={styles.btnPrimary}
                style={{ padding: '8px 20px', fontSize: '13.5px', fontWeight: 700, background: '#6D28D9', borderColor: '#5B21B6' }}
              >
                <CheckCircle2 size={15} />
                <span>{completingTask ? 'Dispatching...' : `Approve & Dispatch Task #${customizeNextTaskModal.nextTaskNumber} Email`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD NEW TECHNICAL TASK TO COHORT                        */}
      {/* ============================================================== */}
      {addNewTaskModal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: '720px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6D28D9' }}>
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className={styles.modalTitle} style={{ margin: 0, fontSize: '17px', color: '#0F172A', fontWeight: 800 }}>
                    Create & Assign New Technical Sprint Task
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#475569' }}>
                    Assign a new sprint milestone, set deadlines, and dispatch briefing meeting emails.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddNewTaskModal(prev => ({ ...prev, open: false }))}
                className={styles.modalClose}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                    Target Batch
                  </label>
                  <select
                    value={addNewTaskModal.targetBatch}
                    onChange={(e) => setAddNewTaskModal({ ...addNewTaskModal, targetBatch: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontWeight: 600 }}
                  >
                    <option value="ALL">All Batches</option>
                    {allBatches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                    Target Role
                  </label>
                  <select
                    value={addNewTaskModal.targetRole}
                    onChange={(e) => setAddNewTaskModal({ ...addNewTaskModal, targetRole: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontWeight: 600 }}
                  >
                    <option value="ALL">All Roles</option>
                    <option value="Web Developer">Web Developer Intern</option>
                    <option value="AI">AI/ML Engineer</option>
                    <option value="Full Stack">Full Stack Intern</option>
                    <option value="UI/UX">UI/UX Designer</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                    Task Number
                  </label>
                  <select
                    value={addNewTaskModal.taskNumber}
                    onChange={(e) => setAddNewTaskModal({ ...addNewTaskModal, taskNumber: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontWeight: 600 }}
                  >
                    <option value={1}>Task #1</option>
                    <option value={2}>Task #2</option>
                    <option value={3}>Task #3</option>
                    <option value={4}>Task #4</option>
                    <option value={5}>Task #5</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  value={addNewTaskModal.title}
                  onChange={(e) => setAddNewTaskModal({ ...addNewTaskModal, title: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13.5px', color: '#0F172A', fontWeight: 600 }}
                  placeholder="e.g. Full Stack Dashboard Implementation & API Integration"
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  Task Description & Technical Instructions *
                </label>
                <textarea
                  rows={4}
                  value={addNewTaskModal.description}
                  onChange={(e) => setAddNewTaskModal({ ...addNewTaskModal, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontWeight: 600, lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                    Explanation Call Date *
                  </label>
                  <input
                    type="date"
                    value={addNewTaskModal.explanationDate}
                    onChange={(e) => setAddNewTaskModal({ ...addNewTaskModal, explanationDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                    Submission Deadline *
                  </label>
                  <input
                    type="date"
                    value={addNewTaskModal.deadline}
                    onChange={(e) => setAddNewTaskModal({ ...addNewTaskModal, deadline: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Google Meet Briefing Room *
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddNewTaskModal(prev => ({ ...prev, meetLink: generateMeetUrl() }))}
                    style={{ fontSize: '12px', color: '#6D28D9', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
                  >
                    Regenerate Meeting Link
                  </button>
                </div>
                <input
                  type="url"
                  value={addNewTaskModal.meetLink}
                  onChange={(e) => setAddNewTaskModal({ ...addNewTaskModal, meetLink: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', color: '#0F172A', fontWeight: 600 }}
                />
              </div>
            </div>

            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px' }}>
              <button
                type="button"
                onClick={() => setAddNewTaskModal(prev => ({ ...prev, open: false }))}
                className={styles.btnSecondary}
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600 }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDispatchAddNewTask}
                disabled={addNewTaskModal.assigning}
                className={styles.btnPrimary}
                style={{ padding: '8px 20px', fontSize: '13.5px', fontWeight: 700, background: '#6D28D9', borderColor: '#5B21B6' }}
              >
                <Send size={14} />
                <span>{addNewTaskModal.assigning ? 'Dispatching...' : 'Assign & Dispatch Task Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUBTAB 5: FORMAL WARNING MAIL --- */}
      {subTab === 'warning' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '24px 28px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#ef4444" />
            <span>Formal Performance Warning & Score Reduction Dispatcher</span>
          </h3>
          <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: '#475569' }}>
            For candidates who fail multiple review evaluations or leave tasks incomplete. Deducts a performance penalty (e.g. -10%) and dispatches official warning documentation.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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
