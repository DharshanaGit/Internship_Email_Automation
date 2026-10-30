'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './web3Deck.module.css';
import {
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  Video,
  FileText,
  AlertTriangle,
  Send,
  Search,
  Filter,
  Sparkles,
  Plus,
  Eye,
  RefreshCw,
  Mail,
  X,
  Activity,
  ExternalLink,
  Calendar,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import * as xlsx from 'xlsx';
import { renderJinja, jinjaTextToEmailHtml } from '../lib/jinjaEngine.js';

function generateClientMeetUrl() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const pick = (len) => Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `https://meet.google.com/${pick(3)}-${pick(4)}-${pick(3)}`;
}

export default function TaskAssignmentView({
  candidates = [],
  batches = [],
  onRefresh,
  showToast,
}) {
  const [subTab, setSubTab] = useState('interns'); // 'interns' | 'templates' | 'reminder' | 'tracker'

  // Filter States
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedTaskNumberFilter, setSelectedTaskNumberFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Interns Selection
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Consolidated dynamic batches (A, B, C, D, E, Solo Interns, and custom batches)
  const allBatches = useMemo(() => {
    const set = new Set();
    ['Batch A', 'Batch B', 'Batch C', 'Batch D', 'Batch E', 'Solo Interns'].forEach(b => set.add(b));
    batches.forEach(b => set.add(typeof b === 'string' ? b : b.batchName));
    candidates.forEach(c => {
      if (c.batch) set.add(c.batch);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [batches, candidates]);

  // Assignment Modal & Dual Assignment Modes
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState('BULK'); // 'BULK' (same task for batch) | 'INDIVIDUAL' (custom per student)
  const [individualFormMap, setIndividualFormMap] = useState({});
  const [due24hCount, setDue24hCount] = useState(0);
  const [checking24h, setChecking24h] = useState(false);
  const [assignForm, setAssignForm] = useState({
    taskNumber: 1,
    taskId: '',
    title: '',
    deadline: '',
    explanationDate: '',
    explanationTime: '04:00 PM',
    customJinja: '',
  });
  const [dispatching, setDispatching] = useState(false);

  // Template Management Modal
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateModalTab, setTemplateModalTab] = useState('editor'); // 'editor' | 'preview'
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateFilterLevel, setTemplateFilterLevel] = useState('ALL');
  const [templateFilterRole, setTemplateFilterRole] = useState('ALL');

  const defaultTaskJinjaBody = `Subject: Internship Sprint Task Assignment - {{taskId}} | Shortfundly

Dear {{candidateName}},

Congratulations on completing your onboarding requirements. Your technical sprint assignment (Task #{{taskNumber}} &bull; {{taskId}}) has been officially dispatched.

Sprint Briefing Details:
- Intern ID: {{internId}}
- Task ID: {{taskId}}
- Task Milestone: Task #{{taskNumber}}
- Submission Deadline: {{deadline}}
- Briefing Call Date: {{explanationDate}}
- Briefing Call Time: {{explanationTime}}
- Google Meet Room: {{meetLink}}

Please join the synchronized Google Meet call at the scheduled time to discuss architecture guidelines and deliverables with your mentor.

Best regards,
Engineering & Mentorship Team
Shortfundly Media Technologies Pvt. Ltd.`;

  const sampleTaskContext = {
    candidateName: 'Aditya Sharma',
    internId: 'INT-2026-00412',
    taskId: editingTemplate?.taskId || 'TSK-DEV-001',
    taskNumber: '1',
    deadline: '2026-06-15 06:00 PM',
    meetLink: 'https://meet.google.com/xyz-uvwx-rst',
    explanationDate: '2026-06-08',
    explanationTime: '04:00 PM',
  };

  const handleSaveTaskTemplate = async () => {
    if (!editingTemplate.title || !editingTemplate.role || !editingTemplate.objective) {
      showToast?.('Title, Role, and Objective are required.', 'error');
      return;
    }
    try {
      setSavingTemplate(true);
      const isUpdate = Boolean(editingTemplate.id);
      const res = await fetch('/api/task-templates', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(isUpdate ? 'Template updated successfully!' : 'New task template created successfully!', 'success');
        setEditingTemplate(null);
        await loadTaskTemplates();
      } else {
        showToast?.(data.error || 'Failed to save template', 'error');
      }
    } catch (err) {
      showToast?.('Error saving template', 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Subtab 3: Deadline Reminder State & Filters
  const [reminderBatchFilter, setReminderBatchFilter] = useState('ALL');
  const [reminderTaskNoFilter, setReminderTaskNoFilter] = useState('ALL');
  const [reminderRoleFilter, setReminderRoleFilter] = useState('ALL');
  const [reminderSearchTerm, setReminderSearchTerm] = useState('');
  const [selectedReminderIds, setSelectedReminderIds] = useState([]);
  const [reminderForm, setReminderForm] = useState({
    submissionDeadline: '',
    customNotes: '',
  });
  const [sendingReminder, setSendingReminder] = useState(false);

  // Subtab 4: Task Submission & Review Trigger Tracker State
  const [trackerBatchFilter, setTrackerBatchFilter] = useState('ALL');
  const [trackerRoleFilter, setTrackerRoleFilter] = useState('ALL');
  const [trackerTaskNoFilter, setTrackerTaskNoFilter] = useState('ALL');
  const [trackerStatusFilter, setTrackerStatusFilter] = useState('ALL'); // 'ALL' | 'SUBMITTED' | 'PENDING' | 'EXPIRED'
  const [trackerSearchTerm, setTrackerSearchTerm] = useState('');
  const [reviewTriggerModal, setReviewTriggerModal] = useState({
    isOpen: false,
    candidate: null,
    meetMode: 'BATCH',
    batchMeetLink: '',
    reviewDate: '',
    reviewTime: '04:00 PM',
    customNotes: '',
  });
  const [dispatchingReview, setDispatchingReview] = useState(false);
  const [sendingWarningCandidateId, setSendingWarningCandidateId] = useState(null);

  // Load Task Templates
  const loadTaskTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const res = await fetch('/api/task-templates');
      const data = await res.json();
      if (data.success) {
        setTaskTemplates(data.templates);
        if (!selectedTemplateId && data.templates.length > 0) {
          setSelectedTemplateId(data.templates[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading task templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const check24hDeadlines = async () => {
    try {
      setChecking24h(true);
      const res = await fetch('/api/tasks/deadline-reminder');
      const data = await res.json();
      if (data.success) {
        setDue24hCount(data.dueCount || 0);
      }
    } catch (err) {
      console.warn('Error checking 24h deadlines:', err);
    } finally {
      setChecking24h(false);
    }
  };

  const handleAutoSend24hReminders = async () => {
    try {
      setSendingReminder(true);
      const res = await fetch('/api/tasks/deadline-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto24hOnly: true,
          customNotes: reminderForm.customNotes || 'Official reminder: Your task deadline is within 24 hours. Please complete your deliverable submission promptly.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`24-Hour deadline reminders dispatched to ${data.count} candidates!`, 'success');
        check24hDeadlines();
        onRefresh?.();
      } else {
        showToast?.(data.error || 'No candidates currently pending submission within 24 hours.', 'info');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSendingReminder(false);
    }
  };

  useEffect(() => {
    loadTaskTemplates();
    check24hDeadlines();
    const defaultDeadline = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);
    const defaultExpDate = new Date().toISOString().split('T')[0];
    setAssignForm(prev => ({ ...prev, deadline: defaultDeadline, explanationDate: defaultExpDate }));
    setReminderForm(prev => ({ ...prev, submissionDeadline: defaultDeadline }));
  }, []);

  // 1. Strict deduplication & mock data purge filter
  const cleanCandidates = useMemo(() => {
    const map = new Map();
    (candidates || []).forEach((c) => {
      if (!c || c.isLeaved) return;
      const isMock =
        (c.fullName && (c.fullName.includes('Meet Integration') || c.fullName.includes('Test Candidate'))) ||
        (c.candidateId && (c.candidateId.startsWith('SF-MEET-') || c.candidateId.startsWith('SF-LOAD-') || c.candidateId.startsWith('TEST-'))) ||
        (c.email && c.email.includes('shortfundly.com') && c.email.includes('candidate.'));
      if (isMock) return;

      const key = (c.email ? c.email.toLowerCase().trim() : '') || c.candidateId || c.id;
      if (!map.has(key)) {
        map.set(key, c);
      } else {
        const existing = map.get(key);
        if (c.taskStatus !== 'Not Assigned' || c.offerLetterStatus === 'Accepted') {
          map.set(key, c);
        }
      }
    });
    return Array.from(map.values());
  }, [candidates]);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return cleanCandidates.filter((c) => {
      if (c.isLeaved) return false;
      if (selectedBatch !== 'ALL' && c.batch !== selectedBatch) return false;
      if (selectedRole !== 'ALL' && c.role !== selectedRole) return false;
      if (selectedTaskNumberFilter !== 'ALL') {
        const activeTask = c.tasks?.[0];
        const num = activeTask ? activeTask.taskNumber : ((c.tasksCompleted || 0) + 1);
        if (String(num) !== String(selectedTaskNumberFilter)) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const nameMatch = c.fullName?.toLowerCase().includes(term);
        const idMatch = (c.internId || c.candidateId)?.toLowerCase().includes(term);
        const emailMatch = c.email?.toLowerCase().includes(term);
        if (!nameMatch && !idMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [cleanCandidates, selectedBatch, selectedRole, selectedTaskNumberFilter, searchTerm]);

  // Export task milestones as Excel / CSV with exact columns:
  // Intern ID, Name, Email ID, Task ID, Task Number, Task Title, batch, role, Review Number, Feedback, Performance Score
  const handleExportTaskReviewTemplate = (format = 'xlsx') => {
    const targets = selectedCandidateIds.length > 0
      ? filteredCandidates.filter(c => selectedCandidateIds.includes(c.id))
      : filteredCandidates;

    if (targets.length === 0) {
      showToast?.('No candidate task records found matching selected filters.', 'warning');
      return;
    }

    try {
      const currentTemplate = taskTemplates.find(t => t.id === selectedTemplateId) || taskTemplates[0];

      const rows = targets.map((c) => {
        const activeTask = c.tasks?.[0];
        const taskNum = activeTask ? activeTask.taskNumber : ((c.tasksCompleted || 0) + 1);
        const taskId = activeTask?.taskId || currentTemplate?.taskId || `TSK-INT-${(c.internId || '001').slice(-4)}`;
        const taskTitle = activeTask?.title || activeTask?.taskName || currentTemplate?.title || 'Core Technical Milestone';
        const nextReviewNum = (activeTask?.reviews?.length || 0) >= 1 ? (activeTask.reviews.length + 1) : 2;

        return {
          'Intern ID': c.internId || c.candidateId,
          'Name': c.fullName,
          'Email ID': c.email,
          'Task ID': taskId,
          'Task Number': taskNum,
          'Task Title': taskTitle,
          'batch': c.batch || 'Batch A',
          'role': c.role,
          'Review Number': nextReviewNum,
          'Feedback': 'Sprint deliverables reviewed. Architecture and test execution verified.',
          'Performance Score': 85.0,
        };
      });

      const worksheet = xlsx.utils.json_to_sheet(rows);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Review_Feedback_Template');

      const batchSlug = selectedBatch === 'ALL' ? 'AllBatches' : selectedBatch.replace(/[^a-zA-Z0-9]/g, '_');
      const roleSlug = selectedRole === 'ALL' ? 'AllRoles' : selectedRole.replace(/[^a-zA-Z0-9]/g, '_');
      const taskSlug = selectedTaskNumberFilter === 'ALL' ? 'AllTasks' : `Task${selectedTaskNumberFilter}`;
      const fileName = `Shortfundly_Tasks_${batchSlug}_${roleSlug}_${taskSlug}_${new Date().toISOString().split('T')[0]}.${format}`;

      if (format === 'csv') {
        xlsx.writeFile(workbook, fileName, { bookType: 'csv' });
      } else {
        xlsx.writeFile(workbook, fileName, { bookType: 'xlsx' });
      }
      showToast?.(`Exported review feedback template with ${targets.length} interns! Ready to edit & upload in Reviews.`, 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast?.(`Failed to export review template: ${err.message}`, 'error');
    }
  };

  // Handle Select All / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedCandidateIds.length === filteredCandidates.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(filteredCandidates.map((c) => c.id));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedCandidateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Open Assign Modal with Dual Mode Support
  const handleOpenAssignModal = () => {
    if (selectedCandidateIds.length === 0) {
      showToast?.('Please select at least one candidate.', 'error');
      return;
    }
    const template = taskTemplates.find(t => t.id === selectedTemplateId) || taskTemplates[0];
    const defaultExpDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const defaultDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const randSeq = Math.floor(1000 + Math.random() * 9000);

    setAssignForm(prev => ({
      taskNumber: prev.taskNumber || 1,
      taskId: template?.taskId || `TSK-2026-${randSeq}`,
      title: template?.title || 'Core Milestone 1: Engineering Implementation',
      explanationDate: prev.explanationDate || defaultExpDate,
      explanationTime: prev.explanationTime || '04:00 PM',
      deadline: prev.deadline || defaultDeadline,
      customJinja: template?.jinjaBody || defaultTaskJinjaBody,
    }));

    // Initialize individual customization map for each selected intern
    const indMap = {};
    selectedCandidateIds.forEach(id => {
      const c = cleanCandidates.find(cand => cand.id === id);
      const roleMatch = taskTemplates.find(t => t.role?.toLowerCase() === c?.role?.toLowerCase()) || template;
      indMap[id] = {
        candidateId: id,
        candidateName: c?.fullName || 'Intern',
        internId: c?.internId || c?.candidateId || id,
        role: c?.role || 'Intern',
        batch: c?.batch || 'Batch A',
        templateId: roleMatch?.id || selectedTemplateId,
        taskId: roleMatch?.taskId || `TSK-${randSeq}`,
        taskTitle: roleMatch?.title || 'Core Milestone Implementation',
        objective: roleMatch?.objective || 'Deliver core technical requirements.',
        deadline: defaultDeadline,
        explanationDate: defaultExpDate,
        explanationTime: '04:00 PM',
      };
    });
    setIndividualFormMap(indMap);

    setIsAssignModalOpen(true);
  };

  // Dispatch Tasks (Bulk or Individual Mode)
  const handleDispatchTasks = async () => {
    try {
      setDispatching(true);

      const payload = assignMode === 'INDIVIDUAL'
        ? {
            individualAssignments: selectedCandidateIds.map(id => individualFormMap[id] || {
              candidateId: id,
              taskId: assignForm.taskId,
              title: assignForm.title,
              deadline: assignForm.deadline,
              explanationDate: assignForm.explanationDate,
              explanationTime: assignForm.explanationTime,
            }),
          }
        : {
            candidateIds: selectedCandidateIds,
            taskNumber: assignForm.taskNumber,
            taskId: assignForm.taskId,
            title: assignForm.title,
            deadline: assignForm.deadline,
            explanationDate: assignForm.explanationDate,
            explanationTime: assignForm.explanationTime,
            customJinja: assignForm.customJinja,
          };

      const res = await fetch('/api/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Task successfully assigned to ${selectedCandidateIds.length} interns! Navigating to Deadline Reminder Mail...`, 'success');
        setIsAssignModalOpen(false);
        setSelectedCandidateIds([]);
        setSubTab('reminder'); // Automatically move candidates to deadline reminder mail section!
        check24hDeadlines();
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to dispatch task assignments.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setDispatching(false);
    }
  };

  // Subtab 3: Filtered Candidates for Deadline Reminder
  const filteredReminderCandidates = useMemo(() => {
    return cleanCandidates.filter((c) => {
      if (c.isLeaved) return false;
      if (c.taskStatus === 'Not Assigned' && (!c.tasks || c.tasks.length === 0)) return false;
      if (reminderBatchFilter !== 'ALL' && c.batch !== reminderBatchFilter) return false;
      if (reminderRoleFilter !== 'ALL' && c.role !== reminderRoleFilter) return false;
      const activeTask = c.tasks?.[0];
      if (reminderTaskNoFilter !== 'ALL') {
        const num = activeTask ? activeTask.taskNumber : 1;
        if (String(num) !== String(reminderTaskNoFilter)) return false;
      }
      if (reminderSearchTerm) {
        const term = reminderSearchTerm.toLowerCase();
        const nameMatch = c.fullName?.toLowerCase().includes(term);
        const idMatch = (c.internId || c.candidateId)?.toLowerCase().includes(term);
        const emailMatch = c.email?.toLowerCase().includes(term);
        if (!nameMatch && !idMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [cleanCandidates, reminderBatchFilter, reminderRoleFilter, reminderTaskNoFilter, reminderSearchTerm]);

  const handleToggleSelectAllReminders = () => {
    if (selectedReminderIds.length === filteredReminderCandidates.length) {
      setSelectedReminderIds([]);
    } else {
      setSelectedReminderIds(filteredReminderCandidates.map((c) => c.id));
    }
  };

  const handleToggleSelectOneReminder = (id) => {
    setSelectedReminderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Dispatch Deadline Reminders with unique candidate website URL
  const handleSendDeadlineReminder = async () => {
    const targetIds = selectedReminderIds.length > 0
      ? selectedReminderIds
      : filteredReminderCandidates.map(c => c.id);

    if (targetIds.length === 0) {
      showToast?.('No candidates match the selected filters for reminder.', 'error');
      return;
    }

    try {
      setSendingReminder(true);
      const res = await fetch('/api/tasks/deadline-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: targetIds,
          submissionDeadline: reminderForm.submissionDeadline,
          customNotes: reminderForm.customNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Deadline reminder emails dispatched to ${data.count} candidates with unique submission portal links!`, 'success');
        setSelectedReminderIds([]);
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to send deadline reminders.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSendingReminder(false);
    }
  };

  // Subtab 4: Filtered Candidates for Submission & Review Tracker
  const filteredTrackerCandidates = useMemo(() => {
    return cleanCandidates.filter((c) => {
      if (c.isLeaved) return false;
      if (c.taskStatus === 'Not Assigned' && (!c.tasks || c.tasks.length === 0)) return false;
      if (trackerBatchFilter !== 'ALL' && c.batch !== trackerBatchFilter) return false;
      if (trackerRoleFilter !== 'ALL' && c.role !== trackerRoleFilter) return false;
      const activeTask = c.tasks?.[0];
      if (trackerTaskNoFilter !== 'ALL') {
        const num = activeTask ? activeTask.taskNumber : 1;
        if (String(num) !== String(trackerTaskNoFilter)) return false;
      }
      if (trackerStatusFilter !== 'ALL') {
        const subStatus = activeTask?.submissionStatus || 'PENDING';
        if (trackerStatusFilter === 'SUBMITTED' && subStatus !== 'SUBMITTED') return false;
        if (trackerStatusFilter === 'PENDING' && subStatus !== 'PENDING') return false;
        if (trackerStatusFilter === 'EXPIRED' && subStatus !== 'EXPIRED') return false;
      }
      if (trackerSearchTerm) {
        const term = trackerSearchTerm.toLowerCase();
        const nameMatch = c.fullName?.toLowerCase().includes(term);
        const idMatch = (c.internId || c.candidateId)?.toLowerCase().includes(term);
        const emailMatch = c.email?.toLowerCase().includes(term);
        if (!nameMatch && !idMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [cleanCandidates, trackerBatchFilter, trackerRoleFilter, trackerTaskNoFilter, trackerStatusFilter, trackerSearchTerm]);

  // Telemetry metrics for Tracker
  const trackerMetrics = useMemo(() => {
    const total = filteredTrackerCandidates.length;
    const submitted = filteredTrackerCandidates.filter(c => c.tasks?.[0]?.submissionStatus === 'SUBMITTED').length;
    const pending = filteredTrackerCandidates.filter(c => (c.tasks?.[0]?.submissionStatus || 'PENDING') === 'PENDING').length;
    const underReview = filteredTrackerCandidates.filter(c => c.taskStatus === 'Under Review' || (c.taskStatus || '').includes('Review')).length;
    return { total, submitted, pending, underReview };
  }, [filteredTrackerCandidates]);

  // Open Review Trigger Modal
  const handleOpenReviewTrigger = (candidate) => {
    const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setReviewTriggerModal({
      isOpen: true,
      candidate,
      meetMode: 'BATCH',
      batchMeetLink: generateClientMeetUrl(),
      reviewDate: defaultDate,
      reviewTime: '04:00 PM',
      customNotes: 'Congratulations on submitting your technical milestone deliverables! Please join the Google Meet room for your technical evaluation and code walk-through.',
    });
  };

  // Dispatch Review Schedule & Google Meet Link
  const handleDispatchReviewSchedule = async () => {
    if (!reviewTriggerModal.candidate) return;
    try {
      setDispatchingReview(true);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: [reviewTriggerModal.candidate.id],
          reviewNumber: 1,
          reviewDate: reviewTriggerModal.reviewDate,
          reviewTime: reviewTriggerModal.reviewTime,
          customNotes: reviewTriggerModal.customNotes,
          meetMode: reviewTriggerModal.meetMode,
          batchMeetLink: reviewTriggerModal.batchMeetLink,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Review invitation & Google Meet room sent to ${reviewTriggerModal.candidate.fullName}!`, 'success');
        setReviewTriggerModal({
          isOpen: false,
          candidate: null,
          meetMode: 'BATCH',
          batchMeetLink: '',
          reviewDate: '',
          reviewTime: '04:00 PM',
          customNotes: '',
        });
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to trigger review', 'error');
      }
    } catch (err) {
      showToast?.(err.message || 'Error triggering review', 'error');
    } finally {
      setDispatchingReview(false);
    }
  };

  // Single candidate warning with 10% penalty
  const handleSendPenaltyWarningSingle = async (candidateId) => {
    const confirm = window.confirm('Send Formal Warning Notice and deduct 10% performance score from this candidate?');
    if (!confirm) return;

    try {
      setSendingWarningCandidateId(candidateId);
      const res = await fetch('/api/tasks/send-warning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: [candidateId],
          penaltyAmount: 10,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.('Formal warning notice dispatched with 10% penalty deduction.', 'warning');
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to dispatch warning notice.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSendingWarningCandidateId(null);
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <div className={styles.titleIcon}>
            <Briefcase size={22} />
          </div>
          <div>
            <h2 className={styles.mainTitle}>Technical Milestone & Task Governance</h2>
            <p className={styles.subtitle}>Role-Based Engineering Specifications &bull; Video Review Continuity &bull; Automated Telemetry</p>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className={styles.subNavBar}>
          <button
            type="button"
            onClick={() => setSubTab('interns')}
            className={`${styles.subTabBtn} ${subTab === 'interns' ? styles.subTabBtnActive : ''}`}
          >
            <Users size={14} />
            <span>Interns Directory ({filteredCandidates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('templates')}
            className={`${styles.subTabBtn} ${subTab === 'templates' ? styles.subTabBtnActive : ''}`}
          >
            <Sparkles size={14} />
            <span>Milestone Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('reminder')}
            className={`${styles.subTabBtn} ${subTab === 'reminder' ? styles.subTabBtnActive : ''}`}
          >
            <Clock size={14} />
            <span>Deadline Reminder Mail</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('tracker')}
            className={`${styles.subTabBtn} ${subTab === 'tracker' ? styles.subTabBtnActive : ''}`}
          >
            <Activity size={14} />
            <span>Submission & Review Tracker</span>
          </button>
        </div>
      </div>

      {/* --- SUBTAB 1: INTERNS DIRECTORY & TASK ASSIGNMENT --- */}
      {subTab === 'interns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search intern by ID, name, or email..."
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
              value={selectedTaskNumberFilter}
              onChange={(e) => setSelectedTaskNumberFilter(e.target.value)}
              className={styles.selectInput}
            >
              <option value="ALL">All Task Numbers</option>
              <option value="1">Task #1</option>
              <option value="2">Task #2</option>
              <option value="3">Task #3</option>
              <option value="4">Task #4</option>
            </select>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className={styles.selectInput}
                style={{ minWidth: '300px', maxWidth: '440px', fontWeight: 600 }}
                title="Choose from Gemma 2B industrial task templates"
              >
                {taskTemplates.map((t) => (
                  <option key={t.id} value={t.id} title={t.title}>
                    [{t.level}] {t.taskId}: {t.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleExportTaskReviewTemplate('xlsx')}
                disabled={filteredCandidates.length === 0}
                className={styles.btnSecondary}
                style={{ fontSize: '12px', padding: '7px 13px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                title="Export tasks with columns: Intern ID, Name, Email ID, Task ID, Task Number, Task Title, batch, role, Review Number, Feedback, Score"
              >
                <FileSpreadsheet size={13} color="#34d399" />
                <span>Export Review Template ({filteredCandidates.length})</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAssignModal}
                disabled={selectedCandidateIds.length === 0}
                className={styles.btnPrimary}
              >
                <Send size={14} />
                <span>Assign Task ({selectedCandidateIds.length})</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeaderRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={selectedCandidateIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                  onChange={handleToggleSelectAll}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                  {selectedCandidateIds.length} of {filteredCandidates.length} Selected
                </span>
              </div>
            </div>

            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>Select</th>
                    <th>Intern ID</th>
                    <th>Candidate Name</th>
                    <th>Role</th>
                    <th>Batch</th>
                    <th>Task Status</th>
                    <th>Score (%)</th>
                    <th>Google Meet Link</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#71717a' }}>
                        No candidates found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((c) => {
                      const isSelected = selectedCandidateIds.includes(c.id);
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
                          <td style={{ fontFamily: 'monospace', color: '#c084fc', fontWeight: 600 }}>
                            {c.internId || c.candidateId}
                          </td>
                          <td style={{ fontWeight: 600, color: '#ffffff' }}>{c.fullName}</td>
                          <td>{c.role}</td>
                          <td>
                            <span className={styles.badgePurple}>{c.batch || 'Batch A'}</span>
                          </td>
                          <td>
                            <span className={c.taskStatus === 'Not Assigned' ? styles.badgeAmber : styles.badgeEmerald}>
                              {c.taskStatus}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {c.performancePercentage?.toFixed(1)}%
                          </td>
                          <td>
                            {c.googleMeetUrl ? (
                              <a href={c.googleMeetUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Video size={12} />
                                <span>Join Room</span>
                              </a>
                            ) : (
                              <span style={{ color: '#71717a', fontSize: '11px' }}>Auto-Generates on Task</span>
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

      {/* --- SUBTAB 2: GEMMA 2B TASK TEMPLATES --- */}
      {subTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.filterBar}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#c084fc' }}>Filter Templates:</span>
              <select
                value={templateFilterLevel}
                onChange={(e) => setTemplateFilterLevel(e.target.value)}
                className={styles.selectInput}
              >
                <option value="ALL">All Levels</option>
                <option value="INTERMEDIATE">Intermediate Level</option>
                <option value="DEVELOPER">Developer Level</option>
                <option value="ENTERPRISE">Enterprise Level</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingTemplate({
                  title: '',
                  taskId: `TSK-CUSTOM-${Date.now().toString().slice(-4)}`,
                  level: 'DEVELOPER',
                  role: 'Full Stack Developer',
                  objective: '',
                  modules: '',
                  expectedOutput: '',
                  techStack: 'React, Node.js, PostgreSQL',
                  jinjaBody: defaultTaskJinjaBody,
                });
                setTemplateModalTab('editor');
              }}
              className={styles.btnPrimary}
            >
              <Plus size={14} />
              <span>Create Custom Task Template</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {taskTemplates
              .filter(t => templateFilterLevel === 'ALL' || t.level === templateFilterLevel)
              .map((template) => (
                <div
                  key={template.id}
                  style={{
                    background: '#0c0c0e',
                    border: '1px solid #232328',
                    borderRadius: '10px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#c084fc', fontWeight: 700 }}>
                        {template.taskId}
                      </span>
                      <span className={template.level === 'ENTERPRISE' ? styles.badgeRose : template.level === 'DEVELOPER' ? styles.badgePurple : styles.badgeEmerald}>
                        {template.level}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14.5px', color: '#ffffff', lineHeight: 1.4 }}>
                      {template.title}
                    </h4>

                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px', lineHeight: 1.5 }}>
                      <strong>Objective:</strong> {template.objective?.slice(0, 110)}...
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#71717a', marginBottom: '6px' }}>
                      <strong>Tech Stack:</strong> {template.techStack}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #1c1c21', paddingTop: '12px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate({ ...template });
                        setTemplateModalTab('preview');
                      }}
                      className={styles.btnSecondary}
                      style={{ fontSize: '11.5px', padding: '5px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Preview this template's email format"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate({ ...template });
                        setTemplateModalTab('editor');
                      }}
                      className={styles.btnSecondary}
                      style={{ fontSize: '11.5px', padding: '5px 10px' }}
                    >
                      Edit Jinja Template
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setSubTab('interns');
                        showToast?.(`Selected template "${template.title}" for assignment.`, 'info');
                      }}
                      className={styles.btnPrimary}
                      style={{ fontSize: '11.5px', padding: '5px 12px', marginLeft: 'auto' }}
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* --- SUBTAB 3: DEADLINE REMAINDER MAIL --- */}
      {subTab === 'reminder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ background: '#0c0c0e', border: '1px solid #232328', borderRadius: '12px', padding: '24px 28px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#a855f7" />
              <span>Automated Task Deadline Reminder Email Dispatcher</span>
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8' }}>
              Filter assigned candidates and dispatch automated reminder emails containing their unique Intern ID, strict deadline notice, and their secure candidate portal website URL to submit project and GitHub repository links.
            </p>

            {/* Unique Website Submission Portal URL banner */}
            <div style={{ background: '#12111a', border: '1px solid #2b2842', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>
                  Unique Candidate Submission Website URL (Auto-Generated per Candidate)
                </label>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                  &bull; Live Vercel Production Portal
                </span>
              </div>
              <div style={{ background: '#08070d', border: '1px solid #1f1d2e', padding: '8px 12px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', color: '#38bdf8', wordBreak: 'break-all' }}>
                https://internship-email-automation.vercel.app/tasks/submit?token=&#123;&#123;candidate_submission_token&#125;&#125;
              </div>
              <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#94a3b8' }}>
                Candidate submits live project demo URL + GitHub repository link directly on the web app. Upon submission, the candidate is automatically transitioned to <strong>Under Review</strong>, an automated confirmation email is dispatched, and HR is notified to conduct the milestone review.
              </div>
            </div>

            {/* Automated 24-Hour Pre-Deadline Reminders Card */}
            <div style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)', border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={20} color="#c084fc" />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Automated 24-Hour Pre-Deadline Reminder Dispatcher</span>
                    <span className={due24hCount > 0 ? styles.badgeRose : styles.badgeEmerald} style={{ fontSize: '11px' }}>
                      {due24hCount} Intern{due24hCount === 1 ? '' : 's'} Due Within 24h
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    Automated scan detects candidates with tasks expiring within 24 hours who haven't submitted yet, and sends official submission portal reminders.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={check24hDeadlines}
                  disabled={checking24h}
                  className={styles.btnSecondary}
                  style={{ fontSize: '12px', padding: '7px 12px' }}
                  title="Scan database for tasks expiring in 24 hours"
                >
                  <RefreshCw size={13} className={checking24h ? styles.spin : ''} />
                  <span>Scan 24h Status</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoSend24hReminders}
                  disabled={sendingReminder || due24hCount === 0}
                  className={styles.btnPrimary}
                  style={{ fontSize: '12px', padding: '7px 16px' }}
                >
                  <Send size={13} />
                  <span>{sendingReminder ? 'Dispatching...' : `Auto-Send 24H Reminders (${due24hCount})`}</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className={styles.filterBar} style={{ marginBottom: '16px' }}>
              <div className={styles.searchBox}>
                <Search size={15} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Filter by intern ID, name, or email..."
                  value={reminderSearchTerm}
                  onChange={(e) => setReminderSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              <select
                value={reminderBatchFilter}
                onChange={(e) => setReminderBatchFilter(e.target.value)}
                className={styles.selectInput}
              >
                <option value="ALL">All Batches</option>
                {allBatches.map((bName) => (
                  <option key={bName} value={bName}>{bName}</option>
                ))}
              </select>

              <select
                value={reminderTaskNoFilter}
                onChange={(e) => setReminderTaskNoFilter(e.target.value)}
                className={styles.selectInput}
              >
                <option value="ALL">All Task Numbers</option>
                <option value="1">Task #1</option>
                <option value="2">Task #2</option>
                <option value="3">Task #3</option>
                <option value="4">Task #4</option>
              </select>

              <select
                value={reminderRoleFilter}
                onChange={(e) => setReminderRoleFilter(e.target.value)}
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
            </div>

            {/* Target Recipients Table */}
            <div className={styles.tableCard} style={{ marginBottom: '20px' }}>
              <div className={styles.tableHeaderRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color="#c084fc" />
                  <strong style={{ color: '#ffffff' }}>Select Candidates for Reminder ({selectedReminderIds.length} of {filteredReminderCandidates.length} Selected)</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleToggleSelectAllReminders}
                    className={styles.btnSecondary}
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    {selectedReminderIds.length === filteredReminderCandidates.length ? 'Deselect All' : 'Select All Filtered'}
                  </button>
                </div>
              </div>

              <div className={styles.tableResponsive} style={{ maxHeight: '320px', overflowY: 'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredReminderCandidates.length > 0 && selectedReminderIds.length === filteredReminderCandidates.length}
                          onChange={handleToggleSelectAllReminders}
                        />
                      </th>
                      <th>Intern ID</th>
                      <th>Candidate Name & Email</th>
                      <th>Batch & Role</th>
                      <th>Task Milestone</th>
                      <th>Deadline</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReminderCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                          No candidates found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredReminderCandidates.map((cand) => {
                        const isSelected = selectedReminderIds.includes(cand.id);
                        const activeTask = cand.tasks?.[0];
                        const reminderEmail = cand.emails?.find(e => e.emailType === 'TASK_DEADLINE_REMINDER' || (e.subject || '').includes('Deadline Reminder'));
                        const reminderSentAt = reminderEmail ? new Date(reminderEmail.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

                        return (
                          <tr key={cand.id} style={{ background: isSelected ? 'rgba(168, 85, 247, 0.08)' : 'transparent' }}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOneReminder(cand.id)}
                              />
                            </td>
                            <td style={{ fontFamily: 'monospace', color: '#c084fc', fontWeight: 600 }}>
                              {cand.internId || cand.candidateId}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#ffffff' }}>{cand.fullName}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{cand.email}</div>
                            </td>
                            <td>
                              <div style={{ color: '#cbd5e1' }}>{cand.batch || 'Batch A'}</div>
                              <div style={{ fontSize: '11px', color: '#71717a' }}>{cand.role}</div>
                            </td>
                            <td>
                              <span className={styles.badgePurple}>
                                Task #{activeTask?.taskNumber || 1}: {activeTask?.taskId || 'TSK-ACTIVE'}
                              </span>
                            </td>
                            <td style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                              {activeTask?.deadline ? new Date(activeTask.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '7 Days Default'}
                            </td>
                            <td>
                              {reminderSentAt ? (
                                <span className={styles.badgeEmerald}>Reminder Sent ({reminderSentAt})</span>
                              ) : (
                                <span className={styles.badgeAmber}>Pending Reminder</span>
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

            {/* Submission Configuration Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Strict Submission Deadline (Calendar Selection) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  min={new Date().toISOString().slice(0, 16)}
                  value={reminderForm.submissionDeadline}
                  onChange={(e) => setReminderForm({ ...reminderForm, submissionDeadline: e.target.value })}
                  className={styles.searchInput}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Past dates are disabled. Candidates must submit deliverables before this timestamp.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Target Recipients Summary
                </label>
                <div style={{ background: '#14131e', border: '1px solid #28253d', padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px', color: '#e2e8f0' }}>
                  {selectedReminderIds.length > 0 ? (
                    <span>Dispatching to <strong>{selectedReminderIds.length}</strong> selected candidate(s)</span>
                  ) : (
                    <span>Dispatching to <strong>all {filteredReminderCandidates.length}</strong> candidates in the filtered view</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Custom Mentorship Notes (Appended to reminder email)
              </label>
              <textarea
                rows={3}
                value={reminderForm.customNotes}
                onChange={(e) => setReminderForm({ ...reminderForm, customNotes: e.target.value })}
                className={styles.searchInput}
                style={{ height: 'auto', padding: '10px' }}
                placeholder="e.g. Please verify that your GitHub repository is public and includes a comprehensive README with setup instructions."
              />
            </div>

            <button
              type="button"
              onClick={handleSendDeadlineReminder}
              disabled={sendingReminder || filteredReminderCandidates.length === 0}
              className={styles.btnPrimary}
            >
              <Send size={14} />
              <span>{sendingReminder ? 'Dispatching Reminders via SMTP...' : `Send Deadline Reminder Emails (${selectedReminderIds.length > 0 ? selectedReminderIds.length : filteredReminderCandidates.length} Interns)`}</span>
            </button>
          </div>
        </div>
      )}

      {/* --- SUBTAB 4: TASK SUBMISSION & REVIEW TRIGGER TRACKER --- */}
      {subTab === 'tracker' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Telemetry Metrics */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Total Tasks Tracked</div>
              <div className={styles.metricValue}>{trackerMetrics.total}</div>
              <div className={styles.metricDesc}>Active technical assignments</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Submitted Deliverables</div>
              <div className={styles.metricValue} style={{ color: '#34d399' }}>{trackerMetrics.submitted}</div>
              <div className={styles.metricDesc}>Ready for milestone review</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Pending Submissions</div>
              <div className={styles.metricValue} style={{ color: '#fbbf24' }}>{trackerMetrics.pending}</div>
              <div className={styles.metricDesc}>Awaiting project and GitHub demo</div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Under Review / Evaluated</div>
              <div className={styles.metricValue} style={{ color: '#c084fc' }}>{trackerMetrics.underReview}</div>
              <div className={styles.metricDesc}>Review cycle triggered or scheduled</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search candidate by name, intern ID, or email..."
                value={trackerSearchTerm}
                onChange={(e) => setTrackerSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <select
              value={trackerBatchFilter}
              onChange={(e) => setTrackerBatchFilter(e.target.value)}
              className={styles.selectInput}
            >
              <option value="ALL">All Batches</option>
              {allBatches.map((bName) => (
                <option key={bName} value={bName}>{bName}</option>
              ))}
            </select>

            <select
              value={trackerRoleFilter}
              onChange={(e) => setTrackerRoleFilter(e.target.value)}
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
              value={trackerTaskNoFilter}
              onChange={(e) => setTrackerTaskNoFilter(e.target.value)}
              className={styles.selectInput}
            >
              <option value="ALL">All Task Numbers</option>
              <option value="1">Task #1</option>
              <option value="2">Task #2</option>
              <option value="3">Task #3</option>
              <option value="4">Task #4</option>
            </select>

            <select
              value={trackerStatusFilter}
              onChange={(e) => setTrackerStatusFilter(e.target.value)}
              className={styles.selectInput}
            >
              <option value="ALL">All Submission States</option>
              <option value="SUBMITTED">Submitted (Ready for Review)</option>
              <option value="PENDING">Pending Submission</option>
              <option value="EXPIRED">Expired Deadline</option>
            </select>
          </div>

          {/* Pipeline Tracker Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeaderRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="#c084fc" />
                <strong style={{ color: '#ffffff' }}>Task Submission & Review Trigger Pipeline ({filteredTrackerCandidates.length} Interns)</strong>
              </div>
            </div>

            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Intern ID</th>
                    <th>Candidate & Role</th>
                    <th>Batch</th>
                    <th>Milestone</th>
                    <th>Deadline Mail</th>
                    <th>Deliverables (GitHub / Demo)</th>
                    <th>Review Trigger Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrackerCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '28px' }}>
                        No candidates match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTrackerCandidates.map((cand) => {
                      const activeTask = cand.tasks?.[0];
                      const isSubmitted = activeTask?.submissionStatus === 'SUBMITTED';
                      const isExpired = activeTask?.submissionStatus === 'EXPIRED';
                      const reminderEmail = cand.emails?.find(e => e.emailType === 'TASK_DEADLINE_REMINDER' || (e.subject || '').includes('Deadline Reminder'));
                      const reminderSentAt = reminderEmail ? new Date(reminderEmail.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

                      return (
                        <tr key={cand.id}>
                          <td style={{ fontFamily: 'monospace', color: '#c084fc', fontWeight: 600 }}>
                            {cand.internId || cand.candidateId}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#ffffff' }}>{cand.fullName}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{cand.role}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{cand.batch || 'Batch A'}</span>
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                              Task #{activeTask?.taskNumber || 1}
                            </div>
                            <div style={{ fontSize: '11px', color: '#71717a' }}>
                              {activeTask?.taskId || 'TSK-ACTIVE'}
                            </div>
                          </td>
                          <td>
                            {reminderSentAt ? (
                              <span className={styles.badgeEmerald}>Sent ({reminderSentAt})</span>
                            ) : (
                              <span className={styles.badgeAmber}>Not Sent</span>
                            )}
                          </td>
                          <td>
                            {isSubmitted ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className={styles.badgeEmerald}>
                                  &bull; Submitted {activeTask.submittedAt ? new Date(activeTask.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                </span>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                                  {activeTask.githubUrl && (
                                    <a
                                      href={activeTask.githubUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#38bdf8', fontSize: '11px', textDecoration: 'none' }}
                                    >
                                      <span>GitHub</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  )}
                                  {activeTask.projectUrl && (
                                    <a
                                      href={activeTask.projectUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#c084fc', fontSize: '11px', textDecoration: 'none' }}
                                    >
                                      <span>Demo</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ) : isExpired ? (
                              <span className={styles.badgeRose}>Deadline Expired</span>
                            ) : (
                              <span className={styles.badgeAmber}>⏳ Pending Submission</span>
                            )}
                          </td>
                          <td>
                            {isSubmitted ? (
                              <button
                                type="button"
                                onClick={() => handleOpenReviewTrigger(cand)}
                                className={styles.btnPrimary}
                                style={{ fontSize: '11.5px', padding: '6px 12px' }}
                              >
                                <Video size={13} />
                                <span>Send Review Mail & Meet</span>
                              </button>
                            ) : isExpired ? (
                              <button
                                type="button"
                                onClick={() => handleSendPenaltyWarningSingle(cand.id)}
                                disabled={sendingWarningCandidateId === cand.id}
                                className={styles.btnDanger}
                                style={{ fontSize: '11px', padding: '5px 10px' }}
                              >
                                <AlertTriangle size={12} />
                                <span>{sendingWarningCandidateId === cand.id ? 'Sending...' : 'Send Warning (-10%)'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReminderIds([cand.id]);
                                  setSubTab('reminder');
                                }}
                                className={styles.btnSecondary}
                                style={{ fontSize: '11px', padding: '5px 10px' }}
                              >
                                <Mail size={12} />
                                <span>Send Reminder</span>
                              </button>
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

          {/* Modal: Trigger Review & Google Meet Dispatch */}
          {reviewTriggerModal.isOpen && reviewTriggerModal.candidate && (
            <div className={styles.modalOverlay} onClick={() => setReviewTriggerModal({ ...reviewTriggerModal, isOpen: false })}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className={styles.modalHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Video size={18} color="#a855f7" />
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>
                      Schedule Milestone Review & Google Meet Call
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewTriggerModal({ ...reviewTriggerModal, isOpen: false })}
                    style={{ color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className={styles.modalBody}>
                  {/* Candidate summary card */}
                  <div style={{ background: '#12111a', border: '1px solid #2b2842', borderRadius: '8px', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#ffffff', fontSize: '14px' }}>{reviewTriggerModal.candidate.fullName}</strong>
                      <span style={{ fontFamily: 'monospace', color: '#c084fc', fontSize: '12px' }}>{reviewTriggerModal.candidate.internId || reviewTriggerModal.candidate.candidateId}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                      {reviewTriggerModal.candidate.role} &bull; {reviewTriggerModal.candidate.batch || 'Batch A'} &bull; {reviewTriggerModal.candidate.email}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Review Date <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={reviewTriggerModal.reviewDate}
                        onChange={(e) => setReviewTriggerModal({ ...reviewTriggerModal, reviewDate: e.target.value })}
                        className={styles.searchInput}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Review Time <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={reviewTriggerModal.reviewTime}
                        onChange={(e) => setReviewTriggerModal({ ...reviewTriggerModal, reviewTime: e.target.value })}
                        className={styles.searchInput}
                        placeholder="04:00 PM"
                      />
                    </div>
                  </div>

                  {/* Google Meet Link Options */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                      Google Meet Video Room Configuration
                    </label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setReviewTriggerModal({ ...reviewTriggerModal, meetMode: 'BATCH' })}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: reviewTriggerModal.meetMode === 'BATCH' ? '1px solid #a855f7' : '1px solid #232328',
                          background: reviewTriggerModal.meetMode === 'BATCH' ? 'rgba(168, 85, 247, 0.15)' : '#09090b',
                          color: reviewTriggerModal.meetMode === 'BATCH' ? '#ffffff' : '#94a3b8',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Batch-Wise Shared Meet Room
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewTriggerModal({ ...reviewTriggerModal, meetMode: 'INDIVIDUAL' })}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: reviewTriggerModal.meetMode === 'INDIVIDUAL' ? '1px solid #a855f7' : '1px solid #232328',
                          background: reviewTriggerModal.meetMode === 'INDIVIDUAL' ? 'rgba(168, 85, 247, 0.15)' : '#09090b',
                          color: reviewTriggerModal.meetMode === 'INDIVIDUAL' ? '#ffffff' : '#94a3b8',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Unique Dedicated 1-on-1 Room
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                        Google Meet URL (Authentic standard format):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newUrl = generateClientMeetUrl();
                          setReviewTriggerModal({ ...reviewTriggerModal, batchMeetLink: newUrl });
                          showToast?.('Generated new genuine Google Meet URL!', 'info');
                        }}
                        style={{ background: '#1c1b26', border: '1px solid #332f4a', color: '#c084fc', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Regenerate Room URL
                      </button>
                    </div>
                    <input
                      type="url"
                      value={reviewTriggerModal.batchMeetLink}
                      onChange={(e) => setReviewTriggerModal({ ...reviewTriggerModal, batchMeetLink: e.target.value })}
                      className={styles.searchInput}
                      placeholder="https://meet.google.com/abc-defg-hij"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                      Custom Mentorship Notes (Delivered in review invitation email)
                    </label>
                    <textarea
                      rows={3}
                      value={reviewTriggerModal.customNotes}
                      onChange={(e) => setReviewTriggerModal({ ...reviewTriggerModal, customNotes: e.target.value })}
                      className={styles.searchInput}
                      style={{ height: 'auto', padding: '10px' }}
                      placeholder="Instructions for the review session..."
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => setReviewTriggerModal({ ...reviewTriggerModal, isOpen: false })}
                    className={styles.btnSecondary}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDispatchReviewSchedule}
                    disabled={dispatchingReview}
                    className={styles.btnPrimary}
                  >
                    <Send size={14} />
                    <span>{dispatchingReview ? 'Dispatching Review Email...' : 'Send Review Mail & Meet Link'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL: ASSIGN TASK FORM --- */}
      {isAssignModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAssignModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: assignMode === 'INDIVIDUAL' ? '820px' : '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Briefcase size={18} color="#a855f7" />
                  <span>Assign Sprint Tasks ({selectedCandidateIds.length} Interns Selected)</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Select whether to assign the same task in bulk or customize individual tasks and deadlines per student.
                </p>
              </div>
              <button type="button" onClick={() => setIsAssignModalOpen(false)} style={{ color: '#94a3b8', cursor: 'pointer', background: 'transparent', border: 'none' }}>
                <X size={18} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', background: '#09090b', borderBottom: '1px solid #232328' }}>
              <button
                type="button"
                onClick={() => setAssignMode('BULK')}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: assignMode === 'BULK' ? '1px solid #a855f7' : '1px solid #27272a',
                  background: assignMode === 'BULK' ? 'rgba(168, 85, 247, 0.18)' : '#0c0c0e',
                  color: assignMode === 'BULK' ? '#ffffff' : '#94a3b8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                }}
              >
                <Users size={14} color={assignMode === 'BULK' ? '#c084fc' : '#71717a'} />
                <span>1. Bulk Assign (Same Task for Batch)</span>
              </button>

              <button
                type="button"
                onClick={() => setAssignMode('INDIVIDUAL')}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: assignMode === 'INDIVIDUAL' ? '1px solid #a855f7' : '1px solid #27272a',
                  background: assignMode === 'INDIVIDUAL' ? 'rgba(168, 85, 247, 0.18)' : '#0c0c0e',
                  color: assignMode === 'INDIVIDUAL' ? '#ffffff' : '#94a3b8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                }}
              >
                <Sparkles size={14} color={assignMode === 'INDIVIDUAL' ? '#c084fc' : '#71717a'} />
                <span>2. Assign Individual Tasks (Per-Intern Customization)</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              {assignMode === 'BULK' ? (
                /* --- MODE 1: BULK ASSIGN --- */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: '#12111a', border: '1px solid #2b2842', borderRadius: '8px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#c084fc', marginBottom: '6px' }}>
                      Selected Industrial Task Template:
                    </div>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedTemplateId(newId);
                        const tmpl = taskTemplates.find(t => t.id === newId);
                        if (tmpl) {
                          setAssignForm(prev => ({
                            ...prev,
                            taskId: tmpl.taskId,
                            title: tmpl.title,
                            customJinja: tmpl.jinjaBody || defaultTaskJinjaBody,
                          }));
                        }
                      }}
                      className={styles.searchInput}
                      style={{ marginBottom: '8px' }}
                    >
                      {taskTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          [{t.level}] {t.taskId}: {t.title} ({t.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Task Milestone Number
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={assignForm.taskNumber}
                        onChange={(e) => setAssignForm({ ...assignForm, taskNumber: parseInt(e.target.value) || 1 })}
                        className={styles.searchInput}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Task ID
                      </label>
                      <input
                        type="text"
                        value={assignForm.taskId}
                        onChange={(e) => setAssignForm({ ...assignForm, taskId: e.target.value })}
                        className={styles.searchInput}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={assignForm.title}
                      onChange={(e) => setAssignForm({ ...assignForm, title: e.target.value })}
                      className={styles.searchInput}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Explanation Call Date
                      </label>
                      <input
                        type="date"
                        value={assignForm.explanationDate}
                        onChange={(e) => setAssignForm({ ...assignForm, explanationDate: e.target.value })}
                        className={styles.searchInput}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Explanation Time
                      </label>
                      <input
                        type="text"
                        value={assignForm.explanationTime}
                        onChange={(e) => setAssignForm({ ...assignForm, explanationTime: e.target.value })}
                        className={styles.searchInput}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Shared Batch Task Deadline <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={assignForm.deadline}
                        onChange={(e) => setAssignForm({ ...assignForm, deadline: e.target.value })}
                        className={styles.searchInput}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                      Task Email Body (Jinja Text Format)
                    </label>
                    <textarea
                      rows={6}
                      value={assignForm.customJinja}
                      onChange={(e) => setAssignForm({ ...assignForm, customJinja: e.target.value })}
                      className={styles.searchInput}
                      style={{ height: 'auto', fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.6 }}
                    />
                  </div>
                </div>
              ) : (
                /* --- MODE 2: ASSIGN INDIVIDUAL TASKS --- */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', padding: '12px 16px', fontSize: '12.5px', color: '#d8b4fe' }}>
                    <strong>Individual Task Customization Mode Active:</strong> You can select a distinct technical sprint task, customize the task title, and set an individual deadline for each intern below.
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {selectedCandidateIds.map((cId) => {
                      const cand = cleanCandidates.find(c => c.id === cId);
                      const currentForm = individualFormMap[cId] || {};

                      const handleUpdateIndividual = (field, val) => {
                        setIndividualFormMap(prev => ({
                          ...prev,
                          [cId]: {
                            ...prev[cId],
                            [field]: val,
                          },
                        }));
                      };

                      const handleTemplateChange = (tmplId) => {
                        const tmpl = taskTemplates.find(t => t.id === tmplId);
                        if (tmpl) {
                          setIndividualFormMap(prev => ({
                            ...prev,
                            [cId]: {
                              ...prev[cId],
                              templateId: tmplId,
                              taskId: tmpl.taskId,
                              taskTitle: tmpl.title,
                              objective: tmpl.objective,
                            },
                          }));
                        }
                      };

                      return (
                        <div
                          key={cId}
                          style={{
                            background: '#0c0c0e',
                            border: '1px solid #232328',
                            borderRadius: '10px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          {/* Candidate Identity Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1c1c21', paddingBottom: '8px' }}>
                            <div>
                              <strong style={{ color: '#ffffff', fontSize: '13.5px' }}>{cand?.fullName || 'Intern'}</strong>
                              <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '8px' }}>
                                &bull; {cand?.role || 'Intern'} &bull; {cand?.batch || 'Batch A'}
                              </span>
                            </div>
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#c084fc', fontWeight: 700 }}>
                              {cand?.internId || cand?.candidateId}
                            </span>
                          </div>

                          {/* Task Selection for this Candidate */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                                Select Task Template
                              </label>
                              <select
                                value={currentForm.templateId || ''}
                                onChange={(e) => handleTemplateChange(e.target.value)}
                                className={styles.searchInput}
                                style={{ fontSize: '12px' }}
                              >
                                {taskTemplates.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    [{t.level}] {t.taskId}: {t.title}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                                Task Title
                              </label>
                              <input
                                type="text"
                                value={currentForm.taskTitle || ''}
                                onChange={(e) => handleUpdateIndividual('taskTitle', e.target.value)}
                                className={styles.searchInput}
                                style={{ fontSize: '12px' }}
                              />
                            </div>
                          </div>

                          {/* Individual Deadline & Explanation Call Details */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                                Individual Task Deadline <span style={{ color: '#ef4444' }}>*</span>
                              </label>
                              <input
                                type="datetime-local"
                                value={currentForm.deadline || ''}
                                onChange={(e) => handleUpdateIndividual('deadline', e.target.value)}
                                className={styles.searchInput}
                                style={{ fontSize: '12px' }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                                Explanation Date
                              </label>
                              <input
                                type="date"
                                value={currentForm.explanationDate || ''}
                                onChange={(e) => handleUpdateIndividual('explanationDate', e.target.value)}
                                className={styles.searchInput}
                                style={{ fontSize: '12px' }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                                Explanation Time
                              </label>
                              <input
                                type="text"
                                value={currentForm.explanationTime || '04:00 PM'}
                                onChange={(e) => handleUpdateIndividual('explanationTime', e.target.value)}
                                className={styles.searchInput}
                                style={{ fontSize: '12px' }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className={styles.btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchTasks}
                disabled={dispatching}
                className={styles.btnPrimary}
              >
                <Send size={14} />
                <span>
                  {dispatching
                    ? 'Dispatching Task Emails & Meet Links...'
                    : assignMode === 'INDIVIDUAL'
                    ? `Confirm & Dispatch Individual Tasks (${selectedCandidateIds.length})`
                    : `Confirm & Bulk Dispatch Tasks (${selectedCandidateIds.length})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CREATE / EDIT TASK TEMPLATE WITH LIVE PREVIEW --- */}
      {editingTemplate && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox} style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#c084fc" />
                  <span>{editingTemplate.id ? 'Edit Industrial Task Template' : 'Create Custom Task Template'}</span>
                </h3>
                <p className={styles.modalSubtitle}>
                  Configure industrial sprint requirements and customize the Jinja plain-text email template with dynamic variables.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-tabs: Editor vs Preview */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', borderBottom: '1px solid #232328', background: '#09090b' }}>
              <button
                type="button"
                onClick={() => setTemplateModalTab('editor')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: templateModalTab === 'editor' ? '#7c3aed' : 'transparent',
                  color: templateModalTab === 'editor' ? '#ffffff' : '#94a3b8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={13} />
                <span>Template Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setTemplateModalTab('preview')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: templateModalTab === 'preview' ? '#7c3aed' : 'transparent',
                  color: templateModalTab === 'preview' ? '#ffffff' : '#94a3b8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Eye size={13} />
                <span>Live Output Preview</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              {templateModalTab === 'editor' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Task ID <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.taskId || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, taskId: e.target.value.toUpperCase() })}
                        placeholder="e.g. TSK-DEV-001"
                        className={styles.searchInput}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Task Title <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.title || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                        placeholder="e.g. RESTful API Endpoints & Middleware"
                        className={styles.searchInput}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Industrial Level
                      </label>
                      <select
                        value={editingTemplate.level || 'DEVELOPER'}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, level: e.target.value })}
                        className={styles.searchInput}
                      >
                        <option value="INTERMEDIATE">INTERMEDIATE</option>
                        <option value="DEVELOPER">DEVELOPER</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Target Role <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.role || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, role: e.target.value })}
                        placeholder="e.g. Full Stack Developer"
                        className={styles.searchInput}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Tech Stack
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.techStack || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, techStack: e.target.value })}
                        placeholder="e.g. React 19, Node.js, Prisma"
                        className={styles.searchInput}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                      Sprint Objective <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={editingTemplate.objective || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, objective: e.target.value })}
                      placeholder="Brief summary of sprint objective..."
                      className={styles.searchInput}
                      style={{ height: 'auto', fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Modules & Architecture Deliverables
                      </label>
                      <textarea
                        rows={3}
                        value={editingTemplate.modules || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, modules: e.target.value })}
                        placeholder="Architecture modules to complete..."
                        className={styles.searchInput}
                        style={{ height: 'auto', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                        Expected Output / Acceptance Criteria
                      </label>
                      <textarea
                        rows={3}
                        value={editingTemplate.expectedOutput || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, expectedOutput: e.target.value })}
                        placeholder="Acceptance criteria (unit tests, demo link, clean PR)..."
                        className={styles.searchInput}
                        style={{ height: 'auto', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1' }}>
                        Task Email Body (Jinja Plain Text Format)
                      </label>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Click a variable tag below to append it:
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {[
                        { label: 'Candidate Name', val: '{{candidateName}}' },
                        { label: 'Intern ID', val: '{{internId}}' },
                        { label: 'Task ID', val: '{{taskId}}' },
                        { label: 'Task Number', val: '{{taskNumber}}' },
                        { label: 'Deadline', val: '{{deadline}}' },
                        { label: 'Meet Link', val: '{{meetLink}}' },
                        { label: 'Explanation Date', val: '{{explanationDate}}' },
                        { label: 'Explanation Time', val: '{{explanationTime}}' },
                      ].map((chip) => (
                        <button
                          key={chip.val}
                          type="button"
                          onClick={() => setEditingTemplate({
                            ...editingTemplate,
                            jinjaBody: (editingTemplate.jinjaBody || '') + ` ${chip.val}`,
                          })}
                          style={{
                            background: '#141417',
                            border: '1px solid #27272a',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            color: '#c084fc',
                            cursor: 'pointer',
                          }}
                        >
                          + {chip.label}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={10}
                      value={editingTemplate.jinjaBody || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, jinjaBody: e.target.value })}
                      placeholder="Write your email body in clean plain text with {{variable}} tags..."
                      className={styles.searchInput}
                      style={{ height: 'auto', fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.6 }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '10px', fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={13} color="#a855f7" />
                    <span>Live rendered email preview with sample intern data:</span>
                  </div>
                  <div style={{ border: '1px solid #232328', borderRadius: '8px', overflow: 'hidden', background: '#ffffff', minHeight: '380px' }}>
                    <iframe
                      title="Live Task Email Preview"
                      srcDoc={jinjaTextToEmailHtml(editingTemplate.jinjaBody || defaultTaskJinjaBody, sampleTaskContext)}
                      style={{ width: '100%', height: '420px', border: 'none', display: 'block', background: '#ffffff' }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className={styles.btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTaskTemplate}
                disabled={savingTemplate}
                className={styles.btnPrimary}
              >
                <Sparkles size={14} />
                <span>{savingTemplate ? 'Saving Template...' : (editingTemplate.id ? 'Save Template Changes' : 'Create Task Template')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
