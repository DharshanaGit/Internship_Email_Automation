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
  Upload,
  Send,
  Search,
  Filter,
  Sparkles,
  Plus,
  Eye,
  RefreshCw,
  Mail,
  X
} from 'lucide-react';
import { renderJinja, jinjaTextToEmailHtml } from '../lib/jinjaEngine.js';

export default function TaskAssignmentView({
  candidates = [],
  batches = [],
  onRefresh,
  showToast,
}) {
  const [subTab, setSubTab] = useState('interns'); // 'interns' | 'templates' | 'reminder' | 'evaluator'

  // Filter States
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Interns Selection
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
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

  // Reminder State
  const [reminderForm, setReminderForm] = useState({
    submissionFormUrl: 'https://forms.google.com/sample-internship-submission',
    submissionDeadline: '',
    customNotes: '',
  });
  const [sendingReminder, setSendingReminder] = useState(false);

  // Evaluator State
  const [evaluatorRows, setEvaluatorRows] = useState([]);
  const [evaluatorResults, setEvaluatorResults] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [sendingWarnings, setSendingWarnings] = useState(false);

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

  useEffect(() => {
    loadTaskTemplates();
    const defaultDeadline = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);
    const defaultExpDate = new Date().toISOString().split('T')[0];
    setAssignForm(prev => ({ ...prev, deadline: defaultDeadline, explanationDate: defaultExpDate }));
    setReminderForm(prev => ({ ...prev, submissionDeadline: defaultDeadline }));
  }, []);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (c.isLeaved) return false;
      if (selectedBatch !== 'ALL' && c.batch !== selectedBatch) return false;
      if (selectedRole !== 'ALL' && c.role !== selectedRole) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const nameMatch = c.fullName?.toLowerCase().includes(term);
        const idMatch = (c.internId || c.candidateId)?.toLowerCase().includes(term);
        const emailMatch = c.email?.toLowerCase().includes(term);
        if (!nameMatch && !idMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [candidates, selectedBatch, selectedRole, searchTerm]);

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

  // Open Assign Modal
  const handleOpenAssignModal = () => {
    if (selectedCandidateIds.length === 0) {
      showToast?.('Please select at least one candidate.', 'error');
      return;
    }
    const template = taskTemplates.find(t => t.id === selectedTemplateId) || taskTemplates[0];
    if (template) {
      setAssignForm(prev => ({
        ...prev,
        taskId: template.taskId,
        title: template.title,
        customJinja: template.jinjaBody || '',
      }));
    }
    setIsAssignModalOpen(true);
  };

  // Dispatch Tasks
  const handleDispatchTasks = async () => {
    try {
      setDispatching(true);
      const res = await fetch('/api/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          taskNumber: assignForm.taskNumber,
          taskId: assignForm.taskId,
          title: assignForm.title,
          deadline: assignForm.deadline,
          explanationDate: assignForm.explanationDate,
          explanationTime: assignForm.explanationTime,
          customJinja: assignForm.customJinja,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Task successfully assigned to ${selectedCandidateIds.length} interns!`, 'success');
        setIsAssignModalOpen(false);
        setSelectedCandidateIds([]);
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

  // Dispatch Deadline Reminders
  const handleSendDeadlineReminder = async () => {
    if (!reminderForm.submissionFormUrl) {
      showToast?.('Google Form submission URL is required.', 'error');
      return;
    }

    try {
      setSendingReminder(true);
      const res = await fetch('/api/tasks/deadline-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds.length ? selectedCandidateIds : undefined,
          submissionFormUrl: reminderForm.submissionFormUrl,
          submissionDeadline: reminderForm.submissionDeadline,
          customNotes: reminderForm.customNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Deadline reminder email sent to ${data.count} candidates!`, 'success');
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

  // Ingest Google Form Submission File
  const handleUploadEvaluatorFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      // Simple CSV parser
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const parsedRows = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = parts[idx] || '';
        });
        parsedRows.push(row);
      }

      setEvaluatorRows(parsedRows);
      showToast?.(`Parsed ${parsedRows.length} Google Form submission responses. Click "Evaluate Submissions" to process.`, 'info');
    } catch (err) {
      showToast?.(`Error parsing submission file: ${err.message}`, 'error');
    }
  };

  // Evaluate Submissions
  const handleRunEvaluation = async () => {
    if (evaluatorRows.length === 0) {
      showToast?.('Please upload a Google Form submission CSV file first.', 'error');
      return;
    }

    try {
      setEvaluating(true);
      const res = await fetch('/api/tasks/evaluate-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: evaluatorRows,
          batch: selectedBatch,
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEvaluatorResults(data);
        showToast?.(`Evaluation complete! ${data.submittedCount} submitted, ${data.notSubmittedCount} not submitted.`, 'success');
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to evaluate submissions.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setEvaluating(false);
    }
  };

  // Send Formal Warning Emails (-10% Penalty)
  const handleSendPenaltyWarnings = async () => {
    if (!evaluatorResults?.notSubmitted?.length) {
      showToast?.('No unsubmitted candidates available to warn.', 'error');
      return;
    }

    const notSubIds = evaluatorResults.notSubmitted.map(c => c.id);
    const confirm = window.confirm(`Send Formal Warning Notice and deduct 10% performance score from ${notSubIds.length} unsubmitted candidates?`);
    if (!confirm) return;

    try {
      setSendingWarnings(true);
      const res = await fetch('/api/tasks/send-warning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: notSubIds,
          penaltyAmount: 10,
          submissionUrl: reminderForm.submissionFormUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Formal warning notices dispatched with -10% score deduction to ${data.deductedCount} candidates!`, 'warning');
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to dispatch warning notices.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSendingWarnings(false);
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
            <h2 className={styles.mainTitle}>Task Assignment & Technical Milestones Deck</h2>
            <p className={styles.subtitle}>Gemma 2B Industrial Task Templates &bull; Google Meet Integration &bull; Automated Reminders & Performance Evaluator</p>
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
            <span>Task Templates (15 Gemma AI)</span>
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
            onClick={() => setSubTab('evaluator')}
            className={`${styles.subTabBtn} ${subTab === 'evaluator' ? styles.subTabBtnActive : ''}`}
          >
            <Upload size={14} />
            <span>Task Evaluator (Upload CSV)</span>
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

            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className={styles.selectInput}
                style={{ maxWidth: '200px' }}
              >
                {taskTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.level}] {t.title.slice(0, 24)}...
                  </option>
                ))}
              </select>

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
                  style={{ width: '16px', height: '16px', accentColor: '#a855f7', cursor: 'pointer' }}
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
                              style={{ width: '16px', height: '16px', accentColor: '#a855f7', cursor: 'pointer' }}
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
        <div style={{ background: '#0c0c0e', border: '1px solid #232328', borderRadius: '12px', padding: '24px 28px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#a855f7" />
            <span>Automated Task Deadline Reminder Email Dispatcher</span>
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8' }}>
            Dispatches automated reminder emails to assigned candidates containing their unique Intern ID, deadline notice, and the Google Form submission URL where candidates submit their project and GitHub links.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Google Form Submission URL <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="url"
                value={reminderForm.submissionFormUrl}
                onChange={(e) => setReminderForm({ ...reminderForm, submissionFormUrl: e.target.value })}
                className={styles.searchInput}
                placeholder="https://docs.google.com/forms/d/e/.../viewform"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Strict Submission Deadline (Fixed by HR) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="datetime-local"
                value={reminderForm.submissionDeadline}
                onChange={(e) => setReminderForm({ ...reminderForm, submissionDeadline: e.target.value })}
                className={styles.searchInput}
              />
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
            disabled={sendingReminder}
            className={styles.btnPrimary}
          >
            <Send size={14} />
            <span>{sendingReminder ? 'Dispatching Reminders via SMTP...' : 'Send Deadline Reminder Emails to Assigned Interns'}</span>
          </button>
        </div>
      )}

      {/* --- SUBTAB 4: TASK EVALUATOR (CSV INGESTION & PENALTY DISPATCH) --- */}
      {subTab === 'evaluator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#0c0c0e', border: '1px solid #232328', borderRadius: '12px', padding: '24px 28px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} color="#a855f7" />
              <span>Task Evaluator & Google Form CSV Submissions Ingestion</span>
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: '#94a3b8' }}>
              After candidates fill out the Google Form, HR exports the responses as CSV/Excel and uploads them here. The system automatically cross-references records and splits students into <strong>Task Submitted</strong> (advancing to Review Dashboard) and <strong>Task Not Submitted</strong> (allowing 1-click formal warning emails with a 10% penalty deduction).
            </p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label className={styles.btnSecondary} style={{ cursor: 'pointer' }}>
                <Upload size={14} />
                <span>Upload Google Form CSV / Excel</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleUploadEvaluatorFile}
                />
              </label>

              <button
                type="button"
                onClick={handleRunEvaluation}
                disabled={evaluating || evaluatorRows.length === 0}
                className={styles.btnPrimary}
              >
                <RefreshCw size={14} />
                <span>{evaluating ? 'Evaluating Submissions...' : `Evaluate Submissions (${evaluatorRows.length} Loaded)`}</span>
              </button>

              {evaluatorResults?.notSubmitted?.length > 0 && (
                <button
                  type="button"
                  onClick={handleSendPenaltyWarnings}
                  disabled={sendingWarnings}
                  className={styles.btnDanger}
                >
                  <AlertTriangle size={14} />
                  <span>Send Warning & Deduct 10% ({evaluatorResults.notSubmitted.length} Unsubmitted)</span>
                </button>
              )}
            </div>
          </div>

          {/* Results Comparison Grid */}
          {evaluatorResults && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '18px' }}>
              {/* Submitted Candidates */}
              <div className={styles.tableCard}>
                <div className={styles.tableHeaderRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" />
                    <strong style={{ color: '#ffffff' }}>Task Submitted &rarr; Ready for Review ({evaluatorResults.submittedCount})</strong>
                  </div>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Intern ID</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Links</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluatorResults.submitted.map((s) => (
                        <tr key={s.id}>
                          <td style={{ fontFamily: 'monospace', color: '#c084fc' }}>{s.internId}</td>
                          <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                          <td>{s.role}</td>
                          <td>
                            {s.githubUrl ? (
                              <a href={s.githubUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontSize: '11.5px' }}>GitHub</a>
                            ) : '-'}
                          </td>
                          <td>
                            <span className={styles.badgeEmerald}>Review Pending</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Not Submitted Candidates */}
              <div className={styles.tableCard}>
                <div className={styles.tableHeaderRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} color="#f87171" />
                    <strong style={{ color: '#ffffff' }}>Task Not Submitted &rarr; Penalty Queue ({evaluatorResults.notSubmittedCount})</strong>
                  </div>
                </div>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Intern ID</th>
                        <th>Name</th>
                        <th>Current Score</th>
                        <th>Penalty</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluatorResults.notSubmitted.map((ns) => (
                        <tr key={ns.id}>
                          <td style={{ fontFamily: 'monospace', color: '#c084fc' }}>{ns.internId}</td>
                          <td style={{ fontWeight: 600 }}>{ns.fullName}</td>
                          <td style={{ fontFamily: 'monospace' }}>{ns.performancePercentage?.toFixed(1)}%</td>
                          <td>
                            <span className={styles.badgeRose}>-10%</span>
                          </td>
                          <td>
                            <span className={styles.badgeAmber}>Warning Queued</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL: ASSIGN TASK FORM --- */}
      {isAssignModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAssignModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>
                Assign Task to {selectedCandidateIds.length} Selected Candidates
              </h3>
              <button type="button" onClick={() => setIsAssignModalOpen(false)} style={{ color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Task Number
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
                    Task Deadline
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
                  rows={8}
                  value={assignForm.customJinja}
                  onChange={(e) => setAssignForm({ ...assignForm, customJinja: e.target.value })}
                  className={styles.searchInput}
                  style={{ height: 'auto', fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.6 }}
                />
              </div>
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
                <span>{dispatching ? 'Dispatching Task Emails & Meet Links...' : 'Confirm & Dispatch Task'}</span>
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
