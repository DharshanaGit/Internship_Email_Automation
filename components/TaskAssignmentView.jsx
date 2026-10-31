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
  Zap,
  ShieldAlert,
  CheckSquare,
  Edit3,
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

  // --- SUBTAB: BATCH-WISE ROLE-BASED TASK AUTOMATION PIPELINE ---
  const [selectedAutoBatch, setSelectedAutoBatch] = useState('Batch A');
  const [autoBatchPipelineData, setAutoBatchPipelineData] = useState(null);
  const [activeRoleTab, setActiveRoleTab] = useState('');
  const [tasksPerMonthSetting, setTasksPerMonthSetting] = useState(3);
  const [isBatchAutoLoading, setIsBatchAutoLoading] = useState(false);
  const [isBatchAutoSaving, setIsBatchAutoSaving] = useState(false);
  const [isTriggeringJoining, setIsTriggeringJoining] = useState(false);

  // --- SUBTAB: OVERDUE WARNINGS AUTOMATION & MANUAL CUSTOMIZATION ---
  const [overdueTasksList, setOverdueTasksList] = useState([]);
  const [loadingOverdue, setLoadingOverdue] = useState(false);
  const [scanningOverdue, setScanningOverdue] = useState(false);
  const [manualWarningModal, setManualWarningModal] = useState({
    isOpen: false,
    candidate: null,
    recipientEmail: '',
    customSubject: '',
    customBody: '',
    penaltyAmount: 10,
    graceHours: 48,
    customNote: '',
  });
  const [sendingManualWarning, setSendingManualWarning] = useState(false);

  // Load Overdue Tasks
  const loadOverdueTasks = async () => {
    try {
      setLoadingOverdue(true);
      const res = await fetch('/api/tasks/check-deadlines-and-warn');
      const data = await res.json();
      if (data.success) {
        setOverdueTasksList(data.overdueTasks || []);
      }
    } catch (err) {
      console.warn('Error loading overdue tasks:', err);
    } finally {
      setLoadingOverdue(false);
    }
  };

  // Automated scan for overdue tasks and warning dispatch
  const handleScanOverdueWarnings = async () => {
    try {
      setScanningOverdue(true);
      const res = await fetch('/api/tasks/check-deadlines-and-warn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ penaltyAmount: 10, graceHours: 48 }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(data.message || 'Overdue scan completed!', 'success');
        loadOverdueTasks();
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to scan overdue tasks', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setScanningOverdue(false);
    }
  };

  // Open manual warning modal with prefilled customizable values
  const handleOpenManualWarning = (candidateOrOverdue) => {
    const cand = candidateOrOverdue.candidate || candidateOrOverdue;
    const taskTitle = candidateOrOverdue.title || 'Assigned Milestone';
    const taskNum = candidateOrOverdue.taskNumber || 1;

    setManualWarningModal({
      isOpen: true,
      candidate: cand,
      recipientEmail: candidateOrOverdue.email || cand.email || '',
      customSubject: `Official Warning: Performance Deduction (-10%) Applied for Task Non-Submission - ${cand.fullName}`,
      customBody: `Dear ${cand.fullName},

This is an **Official Formal Warning Notice** regarding your non-submission of internship milestone deliverables by the designated deadline.

**Audit & Infraction Findings:**
- **Intern ID:** ${cand.internId || cand.candidateId}
- **Assigned Role:** ${cand.role}
- **Milestone:** Task #${taskNum} - ${taskTitle}
- **Infraction:** Deliverables were not submitted prior to the official deadline.
- **Performance Score Reduction:** **-10%** (Score reduced from ${cand.performancePercentage || 100}% to ${Math.max(0, (cand.performancePercentage || 100) - 10)}%)
- **Grace Period Granted:** 48 Hours to complete and upload repository link.

Please submit your project repository URL immediately via your unique portal.

Sincerely,
Talent Evaluation Operations
Shortfundly Media Technologies Pvt. Ltd.`,
      penaltyAmount: 10,
      graceHours: 48,
      customNote: '',
    });
  };

  const handleSendManualWarning = async () => {
    if (!manualWarningModal.recipientEmail) {
      showToast?.('Recipient email ID is required.', 'error');
      return;
    }
    try {
      setSendingManualWarning(true);
      const res = await fetch('/api/tasks/send-warning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: manualWarningModal.candidate.id,
          customRecipientEmail: manualWarningModal.recipientEmail,
          customSubject: manualWarningModal.customSubject,
          customBody: manualWarningModal.customBody,
          penaltyAmount: manualWarningModal.penaltyAmount,
          customNote: manualWarningModal.customNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.('Formal warning notice dispatched to ' + manualWarningModal.recipientEmail + ' with penalty applied!', 'success');
        setManualWarningModal(prev => ({ ...prev, isOpen: false }));
        loadOverdueTasks();
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to dispatch warning', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSendingManualWarning(false);
    }
  };

  // Load batch pipeline based on batchName and tasksPerMonth
  const loadBatchPipeline = async (batchName, perMonth = 3) => {
    if (!batchName) return;
    try {
      setIsBatchAutoLoading(true);
      setSelectedAutoBatch(batchName);
      const res = await fetch('/api/tasks/pipeline/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchName: batchName,
          tasksPerMonth: parseInt(perMonth, 10) || 3,
        }),
      });
      const data = await res.json();
      if (data.success && data.batchPipeline) {
        setAutoBatchPipelineData(data.batchPipeline);
        if (data.batchPipeline.uniqueRoles && data.batchPipeline.uniqueRoles.length > 0) {
          setActiveRoleTab(prev => (prev && data.batchPipeline.uniqueRoles.includes(prev)) ? prev : data.batchPipeline.uniqueRoles[0]);
        }
      } else {
        showToast?.(data.error || 'Failed to generate batch pipeline', 'error');
      }
    } catch (err) {
      console.error('Error loading batch pipeline:', err);
      showToast?.('Error generating batch pipeline: ' + err.message, 'error');
    } finally {
      setIsBatchAutoLoading(false);
    }
  };

  const handleUpdateRoleTaskField = (roleName, taskIndex, field, value) => {
    if (!autoBatchPipelineData || !autoBatchPipelineData.rolePlans) return;
    const currentRoleTasks = autoBatchPipelineData.rolePlans[roleName] || [];
    const updated = [...currentRoleTasks];
    updated[taskIndex] = {
      ...updated[taskIndex],
      [field]: value,
    };
    setAutoBatchPipelineData({
      ...autoBatchPipelineData,
      rolePlans: {
        ...autoBatchPipelineData.rolePlans,
        [roleName]: updated,
      },
    });
  };

  const handleSaveAndAllocateBatchPipeline = async () => {
    if (!autoBatchPipelineData || !autoBatchPipelineData.rolePlans) {
      showToast?.('No batch task roadmap generated yet.', 'error');
      return;
    }
    try {
      setIsBatchAutoSaving(true);
      const res = await fetch('/api/tasks/pipeline/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchName: autoBatchPipelineData.batchName,
          rolePlans: autoBatchPipelineData.rolePlans,
          autoSendFirstTask: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(data.message || `Pipeline allocated to ${data.candidatesCount} interns in ${autoBatchPipelineData.batchName}!`, 'success');
        onRefresh?.();
        loadBatchPipeline(autoBatchPipelineData.batchName, tasksPerMonthSetting);
      } else {
        showToast?.(data.error || 'Failed to save batch pipeline', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setIsBatchAutoSaving(false);
    }
  };

  const handleTriggerDueJoiningTasks = async () => {
    try {
      setIsTriggeringJoining(true);
      const res = await fetch('/api/tasks/pipeline/trigger-due', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast?.(data.message || `${data.dispatchedCount} first tasks dispatched!`, 'success');
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to check joining dates', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setIsTriggeringJoining(false);
    }
  };


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
            <h2 className={styles.mainTitle}>Assign Tasks & Milestones</h2>
            <p className={styles.subtitle}>Assign role-specific tasks, create Google Meet links, and track project deadlines.</p>
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
            <span>Interns List ({filteredCandidates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab('automation');
              const defaultBatch = (selectedBatch !== 'ALL' ? selectedBatch : null) || allBatches[0] || 'Batch A';
              loadBatchPipeline(defaultBatch, tasksPerMonthSetting);
            }}
            className={`${styles.subTabBtn} ${subTab === 'automation' ? styles.subTabBtnActive : ''}`}
            style={subTab === 'automation' ? { borderBottom: '2px solid #38bdf8', color: '#38bdf8' } : {}}
          >
            <Zap size={14} color="#38bdf8" />
            <span>Batch Task Automation (Role-Based)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('templates')}
            className={`${styles.subTabBtn} ${subTab === 'templates' ? styles.subTabBtnActive : ''}`}
          >
            <Sparkles size={14} />
            <span>Task Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('reminder')}
            className={`${styles.subTabBtn} ${subTab === 'reminder' ? styles.subTabBtnActive : ''}`}
          >
            <Clock size={14} />
            <span>Deadline Reminders</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('tracker')}
            className={`${styles.subTabBtn} ${subTab === 'tracker' ? styles.subTabBtnActive : ''}`}
          >
            <Activity size={14} />
            <span>Submissions Tracker</span>
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
                style={{ fontSize: '13px', padding: '7px 13px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                title="Export tasks with columns: Intern ID, Name, Email ID, Task ID, Task Number, Task Title, batch, role, Review Number, Feedback, Score"
              >
                <FileSpreadsheet size={13} color="#34d399" />
                <span>Export Review Template ({filteredCandidates.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubTab('automation');
                  const b = (selectedCandidateIds[0] ? candidates.find(c => c.id === selectedCandidateIds[0])?.batch : null) || filteredCandidates[0]?.batch || selectedAutoBatch || 'Batch A';
                  setSelectedAutoBatch(b);
                  loadBatchPipeline(b, tasksPerMonthSetting);
                }}
                disabled={filteredCandidates.length === 0}
                className={styles.btnSecondary}
                style={{ fontSize: '13px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '5px', borderColor: '#0284c7', color: '#0284c7', background: 'rgba(2, 132, 199, 0.08)' }}
                title="Automatically allocate all tasks batch-wise from joining date to ending date"
              >
                <Zap size={13} color="#0284c7" />
                <span>Batch Task Allocation</span>
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
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedCandidateIds.length} of {filteredCandidates.length} Selected
                </span>
              </div>
            </div>

            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>Select</th>
                    <th>Action</th>
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
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
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
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setSubTab('automation');
                                const b = c.batch || 'Batch A';
                                setSelectedAutoBatch(b);
                                loadBatchPipeline(b, tasksPerMonthSetting);
                              }}
                              className={styles.btnSecondary}
                              style={{ fontSize: '12.5px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: 'rgba(2, 132, 199, 0.4)', color: '#0284c7' }}
                              title="Automatically allocate all tasks batch-wise from joining to end date"
                            >
                              <Zap size={12} color="#0284c7" />
                              <span>Batch Pipeline</span>
                            </button>
                          </td>
                          <td style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: 600 }}>
                            {c.internId || c.candidateId}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.fullName}</td>
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
                              <a href={c.googleMeetUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Video size={12} />
                                <span>Join Room</span>
                              </a>
                            ) : (
                              <span style={{ color: '#475569', fontSize: '12.5px' }}>Auto-Generates on Task</span>
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

      {/* --- SUBTAB: BATCH-WISE ROLE-BASED TASK AUTOMATION --- */}
      {subTab === 'automation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '30px' }}>
          {/* Main Directive & Automation Banner */}
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '12px',
            padding: '24px 28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '320px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={22} color="#0284c7" />
                  <span>Batch-Wise Automated Task Allocation Engine</span>
                </h3>
                <p style={{ margin: '0', fontSize: '13.5px', color: '#334155', lineHeight: 1.65 }}>
                  Tasks are automatically calculated and assigned for <strong>every intern in the selected batch</strong> based on their assigned role, from their <strong>Joining Date to Ending Date</strong>.
                  The <strong>first task email is automatically sent on/after the joining date</strong>.
                  HR can customize the start dates, deadlines, Google Meet room link, and <strong>email mail content</strong> for each role below.
                  Once completed via mentor reviews, the <strong>next milestone task is triggered and dispatched automatically</strong>!
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleTriggerDueJoiningTasks}
                  disabled={isTriggeringJoining}
                  className={styles.btnSecondary}
                  style={{
                    fontSize: '12.5px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    borderColor: '#0284c7',
                    color: '#0284c7',
                    background: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Check and auto-dispatch Task 1 for candidates whose joining date arrived"
                >
                  <RefreshCw size={14} className={isTriggeringJoining ? styles.spin : ''} />
                  <span>{isTriggeringJoining ? 'Checking...' : 'Dispatch Due Joining Tasks'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Batch Selector & Milestone Velocity Controls */}
          <div style={{
            background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '26px 30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '22px',
              alignItems: 'flex-end',
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Target Internship Cohort / Batch:
                </label>
                <select
                  value={selectedAutoBatch}
                  onChange={(e) => {
                    const b = e.target.value;
                    setSelectedAutoBatch(b);
                    loadBatchPipeline(b, tasksPerMonthSetting);
                  }}
                  className={styles.selectInput}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--border-medium)',
                  }}
                >
                  {allBatches.map(bName => {
                    const count = candidates.filter(c => c.batch === bName).length;
                    return (
                      <option key={bName} value={bName}>
                        {bName} &bull; {count} Interns Enrolled
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Milestone Frequency (Tasks / Month):
                </label>
                <select
                  value={tasksPerMonthSetting}
                  onChange={(e) => {
                    const perMonth = parseInt(e.target.value, 10);
                    setTasksPerMonthSetting(perMonth);
                    loadBatchPipeline(selectedAutoBatch, perMonth);
                  }}
                  className={styles.selectInput}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: '#38bdf8',
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--border-medium)',
                  }}
                >
                  <option value={1}>1 Task / Month (Monthly Milestones)</option>
                  <option value={2}>2 Tasks / Month (Bi-Weekly Sprints)</option>
                  <option value={3}>3 Tasks / Month (Recommended - 10-Day Sprints)</option>
                  <option value={4}>4 Tasks / Month (Weekly Intensive)</option>
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => loadBatchPipeline(selectedAutoBatch, tasksPerMonthSetting)}
                  disabled={isBatchAutoLoading}
                  className={styles.btnSecondary}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <RefreshCw size={14} className={isBatchAutoLoading ? styles.spin : ''} />
                  <span>Recalculate Batch Sprints</span>
                </button>
              </div>
            </div>

            {/* Batch Metrics Cards Grid */}
            {autoBatchPipelineData && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '16px',
                marginTop: '4px',
              }}>
                <div style={{ background: '#FFFFFF', border: '2px solid #7C3AED', padding: '18px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(109, 40, 217, 0.08)' }}>
                  <div style={{ fontSize: '13px', color: '#6D28D9', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                    Enrolled Interns
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
                    {autoBatchPipelineData.totalCandidates} Candidates
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#5B21B6', fontWeight: 700, marginTop: '3px' }}>
                    In {autoBatchPipelineData.batchName}
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '2px solid #3B82F6', padding: '18px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)' }}>
                  <div style={{ fontSize: '13px', color: '#1D4ED8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                    Tenure Window
                  </div>
                  <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', marginTop: '6px' }}>
                    {autoBatchPipelineData.joiningDate} &rarr; {autoBatchPipelineData.endDate}
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#1E40AF', fontWeight: 700, marginTop: '3px' }}>
                    Joining to End Date
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '2px solid #9333EA', padding: '18px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(147, 51, 234, 0.08)' }}>
                  <div style={{ fontSize: '13px', color: '#7E22CE', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                    Duration & Velocity
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#6B21A8', marginTop: '6px' }}>
                    {autoBatchPipelineData.durationMonths} Months ({autoBatchPipelineData.totalDays} Days)
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#581C87', fontWeight: 700, marginTop: '3px' }}>
                    Rate: {autoBatchPipelineData.tasksPerMonth} tasks / month
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '2px solid #059669', padding: '18px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.08)' }}>
                  <div style={{ fontSize: '13px', color: '#047857', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                    Allocated Sprints
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#065F46', marginTop: '6px' }}>
                    {autoBatchPipelineData.totalTasks} Tasks Per Intern
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#064E3B', fontWeight: 700, marginTop: '3px' }}>
                    ~{autoBatchPipelineData.intervalDays} days per sprint
                  </div>
                </div>
              </div>
            )}

            {/* Role Breakdown Tabs */}
            {autoBatchPipelineData && autoBatchPipelineData.uniqueRoles && (
              <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Role Roadmaps in {autoBatchPipelineData.batchName} (Click to Review & Customize):
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {autoBatchPipelineData.uniqueRoles.map(rName => {
                    const count = autoBatchPipelineData.rolesSummary?.[rName] || 0;
                    const isActive = activeRoleTab === rName;
                    return (
                      <button
                        key={rName}
                        type="button"
                        onClick={() => setActiveRoleTab(rName)}
                        style={{
                          padding: '9px 18px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.15s ease',
                          background: isActive ? 'var(--accent-purple-light)' : 'var(--bg-surface-elevated)',
                          color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          border: isActive ? '1px solid #38bdf8' : '1px solid #262632',
                        }}
                      >
                        <span>{rName}</span>
                        <span style={{
                          background: isActive ? '#38bdf8' : '#272736',
                          color: isActive ? '#020617' : '#94a3b8',
                          padding: '2px 7px',
                          borderRadius: '10px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                        }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sprints Sequence & Mail Customization For Selected Role */}
          {isBatchAutoLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
              <RefreshCw size={26} className={styles.spin} style={{ margin: '0 auto 14px auto' }} />
              <div style={{ fontSize: '14px' }}>Calculating batch tenure intervals & generating role roadmaps...</div>
            </div>
          ) : autoBatchPipelineData && autoBatchPipelineData.rolePlans && activeRoleTab ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Customizing Sprints & Mail Templates for: <span style={{ color: '#0284c7' }}>{activeRoleTab}</span>
                  </h4>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Applies to all {autoBatchPipelineData.rolesSummary?.[activeRoleTab] || 0} interns enrolled under this role in {autoBatchPipelineData.batchName}.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAndAllocateBatchPipeline}
                  disabled={isBatchAutoSaving}
                  className={styles.btnPrimary}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    padding: '11px 24px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Zap size={15} />
                  <span>{isBatchAutoSaving ? 'Allocating to Batch...' : `Save & Allocate to Batch (${autoBatchPipelineData.totalCandidates} Interns)`}</span>
                </button>
              </div>

              {/* Task Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {(autoBatchPipelineData.rolePlans[activeRoleTab] || []).map((task, idx) => {
                  const isFirstTask = idx === 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)',
                        border: isFirstTask ? '1px solid #bae6fd' : '1px solid var(--border-default)',
                        borderRadius: '12px',
                        padding: '24px 28px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px',
                      }}
                    >
                      {/* Task Header & Auto Dispatch Badge */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-subtle)',
                        paddingBottom: '14px',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: isFirstTask ? '#e0f2fe' : '#ede9fe',
                            color: isFirstTask ? '#0284c7' : '#6d28d9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 800,
                          }}>
                            {task.taskNumber}
                          </span>
                          <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                            Milestone Sprint #{task.taskNumber}: {task.taskId}
                          </strong>
                        </div>

                        <div>
                          {isFirstTask ? (
                            <span className={styles.badgeCyan} style={{ fontSize: '13px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <Zap size={12} /> Auto-Dispatches After Joining Date ({task.explanationDate})
                            </span>
                          ) : (
                            <span className={styles.badgePurple} style={{ fontSize: '13px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <Clock size={12} /> Auto-Dispatches After Task #{task.taskNumber - 1} Completion Mail
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dates & Logistics Grid with Generous Breathing Space */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                        gap: '16px',
                      }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                            Start / Explanation Date:
                          </label>
                          <input
                            type="date"
                            value={task.explanationDate || ''}
                            onChange={(e) => handleUpdateRoleTaskField(activeRoleTab, idx, 'explanationDate', e.target.value)}
                            className={styles.searchInput}
                            style={{ height: '40px', fontSize: '12.5px', padding: '0 12px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                            Explanation Time:
                          </label>
                          <input
                            type="text"
                            value={task.explanationTime || '11:00 AM IST'}
                            onChange={(e) => handleUpdateRoleTaskField(activeRoleTab, idx, 'explanationTime', e.target.value)}
                            className={styles.searchInput}
                            style={{ height: '40px', fontSize: '12.5px', padding: '0 12px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                            Submission Deadline:
                          </label>
                          <input
                            type="date"
                            value={task.deadline || ''}
                            onChange={(e) => handleUpdateRoleTaskField(activeRoleTab, idx, 'deadline', e.target.value)}
                            className={styles.searchInput}
                            style={{ height: '40px', fontSize: '12.5px', padding: '0 12px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                            Review Milestone Date:
                          </label>
                          <input
                            type="date"
                            value={task.reviewDate || ''}
                            onChange={(e) => handleUpdateRoleTaskField(activeRoleTab, idx, 'reviewDate', e.target.value)}
                            className={styles.searchInput}
                            style={{ height: '40px', fontSize: '12.5px', padding: '0 12px' }}
                          />
                        </div>
                      </div>

                      {/* Google Meet Link Row */}
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                          Google Meet Briefing & Review Link:
                        </label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input
                            type="text"
                            value={task.meetLink || ''}
                            onChange={(e) => handleUpdateRoleTaskField(activeRoleTab, idx, 'meetLink', e.target.value)}
                            className={styles.searchInput}
                            style={{ height: '40px', fontSize: '12.5px', padding: '0 12px', fontFamily: 'monospace', color: '#38bdf8' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateRoleTaskField(activeRoleTab, idx, 'meetLink', generateClientMeetUrl())}
                            className={styles.btnSecondary}
                            style={{ height: '40px', padding: '0 14px', fontSize: '13px', whiteSpace: 'nowrap' }}
                          >
                            Generate Link
                          </button>
                        </div>
                      </div>

                      {/* Task Title & Deliverables */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                            Task Title:
                          </label>
                          <input
                            type="text"
                            value={task.title || ''}
                            onChange={(e) => handleUpdateRoleTaskField(activeRoleTab, idx, 'title', e.target.value)}
                            className={styles.searchInput}
                            style={{ height: '40px', fontSize: '13px', fontWeight: 600 }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                            Objective & Technical Deliverables:
                          </label>
                          <textarea
                            rows={3}
                            value={task.objective || ''}
                            onChange={(e) => handleUpdateRoleTaskField(activeRoleTab, idx, 'objective', e.target.value)}
                            className={styles.searchInput}
                            style={{ height: 'auto', fontSize: '12.5px', lineHeight: 1.55, padding: '10px 12px' }}
                          />
                        </div>
                      </div>

                      {/* HR Customizable Task Mail Content Box */}
                      <div style={{
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={14} color="#0284c7" />
                            <span>HR Customizable Task Mail Template</span>
                          </span>
                          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                            Variables: &#123;&#123;candidate_name&#125;&#125;, &#123;&#123;internId&#125;&#125;, &#123;&#123;taskId&#125;&#125;, &#123;&#123;deadline&#125;&#125;, &#123;&#123;meetLink&#125;&#125;, &#123;&#123;submission_link&#125;&#125;
                          </span>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            Email Subject:
                          </label>
                          <input
                            type="text"
                            value={task.customSubject || ''}
                            onChange={(e) => handleUpdateRoleTaskField(activeRoleTab, idx, 'customSubject', e.target.value)}
                            className={styles.searchInput}
                            style={{ height: '38px', fontSize: '13px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            Email Body Content:
                          </label>
                          <textarea
                            rows={5}
                            value={task.customBody || ''}
                            onChange={(e) => handleUpdateRoleTaskField(activeRoleTab, idx, 'customBody', e.target.value)}
                            className={styles.searchInput}
                            style={{ height: 'auto', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.5, padding: '10px 12px' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Large Allocate Action Card */}
              <div style={{
                background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginTop: '10px',
              }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Ready to allocate {autoBatchPipelineData.totalTasks} tasks to all {autoBatchPipelineData.totalCandidates} interns in {autoBatchPipelineData.batchName}?
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Tasks for each role will be saved. Task 1 auto-sends after batch joining date; subsequent tasks auto-dispatch after each review approval.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAndAllocateBatchPipeline}
                  disabled={isBatchAutoSaving}
                  className={styles.btnPrimary}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    padding: '12px 28px',
                    fontSize: '14px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Zap size={16} />
                  <span>{isBatchAutoSaving ? 'Allocating Pipeline...' : `Save & Allocate to Batch (${autoBatchPipelineData.totalCandidates} Interns)`}</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
              <Zap size={38} color="#0284c7" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700 }}>
                Select a batch above to generate and allocate role-based task roadmaps
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                The engine will distribute tasks across the cohort tenure from joining to ending date.
              </p>
            </div>
          )}
        </div>
      )}

{/* --- SUBTAB 2: GEMMA 2B TASK TEMPLATES --- */}
      {subTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.filterBar}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#6D28D9' }}>Filter Templates:</span>
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
                    background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '12.5px', color: '#6D28D9', fontWeight: 700 }}>
                        {template.taskId}
                      </span>
                      <span className={template.level === 'ENTERPRISE' ? styles.badgeRose : template.level === 'DEVELOPER' ? styles.badgePurple : styles.badgeEmerald}>
                        {template.level}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {template.title}
                    </h4>

                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px', lineHeight: 1.5 }}>
                      <strong>Objective:</strong> {template.objective?.slice(0, 110)}...
                    </div>

                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
                      <strong>Tech Stack:</strong> {template.techStack}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate({ ...template });
                        setTemplateModalTab('preview');
                      }}
                      className={styles.btnSecondary}
                      style={{ fontSize: '13px', padding: '5px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
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
                      style={{ fontSize: '13px', padding: '5px 10px' }}
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
                      style={{ fontSize: '13px', padding: '5px 12px', marginLeft: 'auto' }}
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
          <div style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px 28px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#a855f7" />
              <span>Automated Task Deadline Reminder Email Dispatcher</span>
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#475569' }}>
              Filter assigned candidates and dispatch automated reminder emails containing their unique Intern ID, strict deadline notice, and their secure candidate portal website URL to submit project and GitHub repository links.
            </p>

            {/* Unique Website Submission Portal URL banner */}
            <div style={{ background: '#FAF5FF', border: '2px solid #DDD6FE', borderRadius: '12px', padding: '18px 22px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                  Unique Candidate Submission Website URL (Auto-Generated per Candidate)
                </label>
                <span style={{ fontSize: '12.5px', color: '#10b981', fontWeight: 600 }}>
                  &bull; Live Vercel Production Portal
                </span>
              </div>
              <div style={{ background: '#FFFFFF', border: '1.5px solid #C4B5FD', padding: '10px 14px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13.5px', color: '#6D28D9', fontWeight: 700, wordBreak: 'break-all' }}>
                https://internship-email-automation.vercel.app/tasks/submit?token=&#123;&#123;candidate_submission_token&#125;&#125;
              </div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>
                Candidate submits live project demo URL + GitHub repository link directly on the web app. Upon submission, the candidate is automatically transitioned to <strong>Under Review</strong>, an automated confirmation email is dispatched, and HR is notified to conduct the milestone review.
              </div>
            </div>

            {/* Automated 24-Hour Pre-Deadline Reminders Card */}
            <div style={{ background: '#FAF5FF', border: '2px solid #DDD6FE', borderRadius: '12px', padding: '18px 22px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={20} color="#c084fc" />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Automated 24-Hour Pre-Deadline Reminder Dispatcher</span>
                    <span className={due24hCount > 0 ? styles.badgeRose : styles.badgeEmerald} style={{ fontSize: '12.5px' }}>
                      {due24hCount} Intern{due24hCount === 1 ? '' : 's'} Due Within 24h
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#334155', fontWeight: 500 }}>
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
                  style={{ fontSize: '13px', padding: '7px 12px' }}
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
                  style={{ fontSize: '13px', padding: '7px 16px' }}
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
                  <strong style={{ color: 'var(--text-primary)' }}>Select Candidates for Reminder ({selectedReminderIds.length} of {filteredReminderCandidates.length} Selected)</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleToggleSelectAllReminders}
                    className={styles.btnSecondary}
                    style={{ fontSize: '12.5px', padding: '4px 8px' }}
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
                        <td colSpan={7} style={{ textAlign: 'center', color: '#475569', padding: '24px' }}>
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
                            <td style={{ fontFamily: 'monospace', color: '#6D28D9', fontWeight: 600 }}>
                              {cand.internId || cand.candidateId}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cand.fullName}</div>
                              <div style={{ fontSize: '12.5px', color: '#475569' }}>{cand.email}</div>
                            </td>
                            <td>
                              <div style={{ color: '#334155' }}>{cand.batch || 'Batch A'}</div>
                              <div style={{ fontSize: '12.5px', color: '#475569' }}>{cand.role}</div>
                            </td>
                            <td>
                              <span className={styles.badgePurple}>
                                Task #{activeTask?.taskNumber || 1}: {activeTask?.taskId || 'TSK-ACTIVE'}
                              </span>
                            </td>
                            <td style={{ fontSize: '13px', color: '#475569' }}>
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
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Strict Submission Deadline (Calendar Selection) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  min={new Date().toISOString().slice(0, 16)}
                  value={reminderForm.submissionDeadline}
                  onChange={(e) => setReminderForm({ ...reminderForm, submissionDeadline: e.target.value })}
                  className={styles.searchInput}
                />
                <span style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px', display: 'block' }}>
                  Past dates are disabled. Candidates must submit deliverables before this timestamp.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Target Recipients Summary
                </label>
                <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px', color: '#e2e8f0' }}>
                  {selectedReminderIds.length > 0 ? (
                    <span>Dispatching to <strong>{selectedReminderIds.length}</strong> selected candidate(s)</span>
                  ) : (
                    <span>Dispatching to <strong>all {filteredReminderCandidates.length}</strong> candidates in the filtered view</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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

          {/* --- AUTOMATED OVERDUE WARNING & MANUAL CUSTOMIZATION CARD --- */}
          <div style={{ background: '#FFF5F5', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)', border: '2px solid #FCA5A5', borderRadius: '12px', padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#991B1B', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} color="#ef4444" />
                  <span>Overdue Task Warning & Performance Deduction Management</span>
                </h3>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#7F1D1D', fontWeight: 600 }}>
                  If a task is not submitted by the deadline, automatically dispatch warning notices with reduced performance percentage, or manually customize email content & recipient mail ID.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={loadOverdueTasks}
                  disabled={loadingOverdue}
                  className={styles.btnSecondary}
                  style={{ fontSize: '13px', padding: '7px 12px' }}
                >
                  <RefreshCw size={13} className={loadingOverdue ? styles.spin : ''} />
                  <span>Refresh Overdue List</span>
                </button>

                <button
                  type="button"
                  onClick={handleScanOverdueWarnings}
                  disabled={scanningOverdue}
                  className={styles.btnPrimary}
                  style={{ fontSize: '13px', padding: '7px 16px', background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)' }}
                >
                  <ShieldAlert size={13} />
                  <span>{scanningOverdue ? 'Scanning & Deducting...' : 'Run Automated Overdue Scan & Deduction (-10%)'}</span>
                </button>
              </div>
            </div>

            {/* Overdue Candidates Table */}
            <div className={styles.tableResponsive} style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Intern ID</th>
                    <th>Name & Email</th>
                    <th>Role</th>
                    <th>Task & Deadline</th>
                    <th>Current Performance</th>
                    <th>Warning Status</th>
                    <th>Manual Customization</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueTasksList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#475569' }}>
                        No overdue candidate submissions detected. Click "Refresh Overdue List" to scan.
                      </td>
                    </tr>
                  ) : (
                    overdueTasksList.map((item) => (
                      <tr key={item.taskId} style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                        <td style={{ fontFamily: 'monospace', color: '#f87171', fontWeight: 600 }}>
                          {item.internId}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{item.fullName}</div>
                          <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: 500 }}>{item.email}</div>
                        </td>
                        <td style={{ color: '#0F172A', fontWeight: 600 }}>{item.role}</td>
                        <td>
                          <div style={{ color: '#B91C1C', fontWeight: 700 }}>Task #{item.taskNumber}: {item.title}</div>
                          <div style={{ fontSize: '12.5px', color: '#DC2626', fontWeight: 600 }}>
                            Expired: {item.deadline ? new Date(item.deadline).toLocaleString() : 'Past Due'}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: item.performancePercentage < 90 ? '#ef4444' : '#fbbf24' }}>
                            {item.performancePercentage.toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          {item.warningSentAt ? (
                            <span className={styles.badgeRose}>Warning Sent ({new Date(item.warningSentAt).toLocaleDateString()})</span>
                          ) : (
                            <span className={styles.badgeAmber}>Pending Warning</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleOpenManualWarning(item)}
                            className={styles.btnSecondary}
                            style={{ fontSize: '12.5px', padding: '4px 8px', borderColor: '#ef4444', color: '#ef4444' }}
                          >
                            <Edit3 size={11} />
                            <span>Customize & Send</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
              <div className={styles.metricValue} style={{ color: '#6D28D9' }}>{trackerMetrics.underReview}</div>
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
                <strong style={{ color: 'var(--text-primary)' }}>Task Submission & Review Trigger Pipeline ({filteredTrackerCandidates.length} Interns)</strong>
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
                      <td colSpan={7} style={{ textAlign: 'center', color: '#475569', padding: '28px' }}>
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
                          <td style={{ fontFamily: 'monospace', color: '#6D28D9', fontWeight: 600 }}>
                            {cand.internId || cand.candidateId}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cand.fullName}</div>
                            <div style={{ fontSize: '12.5px', color: '#475569' }}>{cand.role}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '13px', color: '#334155' }}>{cand.batch || 'Batch A'}</span>
                          </td>
                          <td>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              Task #{activeTask?.taskNumber || 1}
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#475569' }}>
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
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#38bdf8', fontSize: '12.5px', textDecoration: 'none' }}
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
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#6D28D9', fontSize: '12.5px', textDecoration: 'none' }}
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
                                style={{ fontSize: '13px', padding: '6px 12px' }}
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
                                style={{ fontSize: '12.5px', padding: '5px 10px' }}
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
                                style={{ fontSize: '12.5px', padding: '5px 10px' }}
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
                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
                      Schedule Milestone Review & Google Meet Call
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewTriggerModal({ ...reviewTriggerModal, isOpen: false })}
                    style={{ color: '#475569', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className={styles.modalBody}>
                  {/* Candidate summary card */}
                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{reviewTriggerModal.candidate.fullName}</strong>
                      <span style={{ fontFamily: 'monospace', color: '#6D28D9', fontSize: '13px' }}>{reviewTriggerModal.candidate.internId || reviewTriggerModal.candidate.candidateId}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '3px' }}>
                      {reviewTriggerModal.candidate.role} &bull; {reviewTriggerModal.candidate.batch || 'Batch A'} &bull; {reviewTriggerModal.candidate.email}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
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
                          border: reviewTriggerModal.meetMode === 'BATCH' ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                          background: reviewTriggerModal.meetMode === 'BATCH' ? 'var(--accent-purple-light)' : 'var(--bg-surface)',
                          color: reviewTriggerModal.meetMode === 'BATCH' ? 'var(--accent-purple-text)' : 'var(--text-muted)',
                          fontSize: '13px',
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
                          border: reviewTriggerModal.meetMode === 'INDIVIDUAL' ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                          background: reviewTriggerModal.meetMode === 'INDIVIDUAL' ? 'var(--accent-purple-light)' : 'var(--bg-surface)',
                          color: reviewTriggerModal.meetMode === 'INDIVIDUAL' ? 'var(--accent-purple-text)' : 'var(--text-muted)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Unique Dedicated 1-on-1 Room
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '13px', color: '#475569' }}>
                        Google Meet URL (Authentic standard format):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newUrl = generateClientMeetUrl();
                          setReviewTriggerModal({ ...reviewTriggerModal, batchMeetLink: newUrl });
                          showToast?.('Generated new genuine Google Meet URL!', 'info');
                        }}
                        style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', color: '#6D28D9', borderRadius: '4px', padding: '2px 8px', fontSize: '12.5px', cursor: 'pointer' }}
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
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Briefcase size={18} color="#a855f7" />
                  <span>Assign Sprint Tasks ({selectedCandidateIds.length} Interns Selected)</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#475569' }}>
                  Select whether to assign the same task in bulk or customize individual tasks and deadlines per student.
                </p>
              </div>
              <button type="button" onClick={() => setIsAssignModalOpen(false)} style={{ color: '#475569', cursor: 'pointer', background: 'transparent', border: 'none' }}>
                <X size={18} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
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
                  border: assignMode === 'BULK' ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                  background: assignMode === 'BULK' ? 'var(--accent-purple-light)' : 'var(--bg-surface)',
                  color: assignMode === 'BULK' ? 'var(--accent-purple-text)' : 'var(--text-muted)',
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
                  border: assignMode === 'INDIVIDUAL' ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                  background: assignMode === 'INDIVIDUAL' ? 'var(--accent-purple-light)' : 'var(--bg-surface)',
                  color: assignMode === 'INDIVIDUAL' ? 'var(--accent-purple-text)' : 'var(--text-muted)',
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
                  <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#6D28D9', marginBottom: '6px' }}>
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
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Task Email Body (Jinja Text Format)
                    </label>
                    <textarea
                      rows={6}
                      value={assignForm.customJinja}
                      onChange={(e) => setAssignForm({ ...assignForm, customJinja: e.target.value })}
                      className={styles.searchInput}
                      style={{ height: 'auto', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6 }}
                    />
                  </div>
                </div>
              ) : (
                /* --- MODE 2: ASSIGN INDIVIDUAL TASKS --- */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', padding: '12px 16px', fontSize: '12.5px', color: '#581C87' }}>
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
                            background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '10px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          {/* Candidate Identity Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: '8px' }}>
                            <div>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '13.5px' }}>{cand?.fullName || 'Intern'}</strong>
                              <span style={{ fontSize: '13px', color: '#475569', marginLeft: '8px' }}>
                                &bull; {cand?.role || 'Intern'} &bull; {cand?.batch || 'Batch A'}
                              </span>
                            </div>
                            <span style={{ fontFamily: 'monospace', fontSize: '12.5px', color: '#6D28D9', fontWeight: 700 }}>
                              {cand?.internId || cand?.candidateId}
                            </span>
                          </div>

                          {/* Task Selection for this Candidate */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                Select Task Template
                              </label>
                              <select
                                value={currentForm.templateId || ''}
                                onChange={(e) => handleTemplateChange(e.target.value)}
                                className={styles.searchInput}
                                style={{ fontSize: '13px' }}
                              >
                                {taskTemplates.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    [{t.level}] {t.taskId}: {t.title}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                Task Title
                              </label>
                              <input
                                type="text"
                                value={currentForm.taskTitle || ''}
                                onChange={(e) => handleUpdateIndividual('taskTitle', e.target.value)}
                                className={styles.searchInput}
                                style={{ fontSize: '13px' }}
                              />
                            </div>
                          </div>

                          {/* Individual Deadline & Explanation Call Details */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                                Individual Task Deadline <span style={{ color: '#ef4444' }}>*</span>
                              </label>
                              <input
                                type="datetime-local"
                                value={currentForm.deadline || ''}
                                onChange={(e) => handleUpdateIndividual('deadline', e.target.value)}
                                className={styles.searchInput}
                                style={{ fontSize: '13px' }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                Explanation Date
                              </label>
                              <input
                                type="date"
                                value={currentForm.explanationDate || ''}
                                onChange={(e) => handleUpdateIndividual('explanationDate', e.target.value)}
                                className={styles.searchInput}
                                style={{ fontSize: '13px' }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                                Explanation Time
                              </label>
                              <input
                                type="text"
                                value={currentForm.explanationTime || '04:00 PM'}
                                onChange={(e) => handleUpdateIndividual('explanationTime', e.target.value)}
                                className={styles.searchInput}
                                style={{ fontSize: '13px' }}
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
                style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-tabs: Editor vs Preview */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)' }}>
              <button
                type="button"
                onClick={() => setTemplateModalTab('editor')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
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
                  fontSize: '13px',
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
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
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
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Sprint Objective <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={editingTemplate.objective || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, objective: e.target.value })}
                      placeholder="Brief summary of sprint objective..."
                      className={styles.searchInput}
                      style={{ height: 'auto', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Modules & Architecture Deliverables
                      </label>
                      <textarea
                        rows={3}
                        value={editingTemplate.modules || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, modules: e.target.value })}
                        placeholder="Architecture modules to complete..."
                        className={styles.searchInput}
                        style={{ height: 'auto', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Expected Output / Acceptance Criteria
                      </label>
                      <textarea
                        rows={3}
                        value={editingTemplate.expectedOutput || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, expectedOutput: e.target.value })}
                        placeholder="Acceptance criteria (unit tests, demo link, clean PR)..."
                        className={styles.searchInput}
                        style={{ height: 'auto', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                        Task Email Body (Jinja Plain Text Format)
                      </label>
                      <span style={{ fontSize: '12.5px', color: '#475569' }}>
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
                            background: 'var(--bg-surface-elevated)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '12.5px',
                            color: '#6D28D9',
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
                      style={{ height: 'auto', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6 }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '10px', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={13} color="#a855f7" />
                    <span>Live rendered email preview with sample intern data:</span>
                  </div>
                  <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', background: '#ffffff', minHeight: '380px' }}>
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
      {/* --- MODAL: MANUAL WARNING & CUSTOM EMAIL ID CUSTOMIZATION --- */}
      {manualWarningModal.isOpen && manualWarningModal.candidate && (
        <div className={styles.modalOverlay} onClick={() => setManualWarningModal(prev => ({ ...prev, isOpen: false }))}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#ef4444" />
                <h3 className={styles.modalTitle} style={{ color: '#fee2e2' }}>
                  Manual Warning Mail Customization
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setManualWarningModal(prev => ({ ...prev, isOpen: false }))}
                className={styles.closeBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              {/* Recipient Email ID Customization */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Recipient Candidate Email ID (Customizable):
                </label>
                <input
                  type="email"
                  value={manualWarningModal.recipientEmail}
                  onChange={(e) => setManualWarningModal(prev => ({ ...prev, recipientEmail: e.target.value }))}
                  className={styles.searchInput}
                  placeholder="candidate@example.com"
                  style={{ fontFamily: 'monospace', color: '#38bdf8' }}
                />
                <span style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                  HR can update or modify the candidate's recipient email ID directly before sending.
                </span>
              </div>

              {/* Penalty Deduction Customization */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Performance Score Deduction (%):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={manualWarningModal.penaltyAmount}
                    onChange={(e) => setManualWarningModal(prev => ({ ...prev, penaltyAmount: parseFloat(e.target.value) || 10 }))}
                    className={styles.searchInput}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Grace Period Window:
                  </label>
                  <select
                    value={manualWarningModal.graceHours}
                    onChange={(e) => setManualWarningModal(prev => ({ ...prev, graceHours: parseInt(e.target.value, 10) }))}
                    className={styles.selectInput}
                  >
                    <option value={24}>24 Hours</option>
                    <option value={48}>48 Hours (Recommended)</option>
                    <option value={72}>72 Hours</option>
                  </select>
                </div>
              </div>

              {/* Subject Customization */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Warning Email Subject:
                </label>
                <input
                  type="text"
                  value={manualWarningModal.customSubject}
                  onChange={(e) => setManualWarningModal(prev => ({ ...prev, customSubject: e.target.value }))}
                  className={styles.searchInput}
                />
              </div>

              {/* Content Customization */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Custom Warning Email Content:
                </label>
                <textarea
                  rows={8}
                  value={manualWarningModal.customBody}
                  onChange={(e) => setManualWarningModal(prev => ({ ...prev, customBody: e.target.value }))}
                  className={styles.searchInput}
                  style={{ height: 'auto', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setManualWarningModal(prev => ({ ...prev, isOpen: false }))}
                  className={styles.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendManualWarning}
                  disabled={sendingManualWarning}
                  className={styles.btnPrimary}
                  style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)' }}
                >
                  <Send size={13} />
                  <span>{sendingManualWarning ? 'Dispatching Warning...' : 'Dispatch Customized Warning Mail'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
