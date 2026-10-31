'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './sequentialForm.module.css';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Mail,
  Send,
  ArrowRight,
  ArrowLeft,
  Eye,
  Info,
  Clock,
  Sparkles,
  Link2,
  Plus,
  RefreshCw,
  Printer,
  Upload,
  X,
  Paperclip,
} from 'lucide-react';
import { renderJinja, jinjaTextToEmailHtml } from '../lib/jinjaEngine.js';

export default function SequentialSingleOfferForm({
  candidates = [],
  templates = [],
  batches = [],
  onOfferSent,
  showToast,
}) {
  // Workflow Step: 1 = Details, 2 = Template & CC, 3 = Preview & Send
  const [currentStep, setCurrentStep] = useState(1);

  // Candidate Intake Source: 'database' | 'manual'
  const [intakeMode, setIntakeMode] = useState('database');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');

  // Batch options state with customization
  const [batchOptions, setBatchOptions] = useState(() => {
    const defaultList = ['Batch A', 'Batch B', 'Batch C', 'Solo Intern (Individual Track)'];
    if (batches && batches.length > 0) {
      batches.forEach((b) => {
        const name = b.batchName || b.name;
        if (name && !defaultList.includes(name)) defaultList.unshift(name);
      });
    }
    return defaultList;
  });
  const [isAddingNewBatch, setIsAddingNewBatch] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');

  // Helper function: get role keyword for readable Intern ID (e.g. wd, sd)
  const getRoleKeyword = (roleName = '') => {
    const r = (roleName || '').toLowerCase();
    if (r.includes('web')) return 'WD';
    if (r.includes('software')) return 'SD';
    if (r.includes('frontend')) return 'FE';
    if (r.includes('backend')) return 'BE';
    if (r.includes('full')) return 'FS';
    if (r.includes('ui') || r.includes('ux') || r.includes('design')) return 'UI';
    if (r.includes('ai') || r.includes('ml') || r.includes('machine') || r.includes('data')) return 'AI';
    if (r.includes('android') || r.includes('flutter') || r.includes('mobile') || r.includes('ios')) return 'MB';
    if (r.includes('python')) return 'PY';
    if (r.includes('cloud') || r.includes('devops')) return 'OPS';
    if (r.includes('qa') || r.includes('test')) return 'QA';
    return 'DEV';
  };

  // Generate readable Intern ID (e.g., SF-WD-2026-001)
  const generateReadableInternId = (role = 'Web Developer Intern') => {
    const kw = getRoleKeyword(role);
    const randomSeq = Math.floor(100 + Math.random() * 900);
    return `SF-${kw}-2026-${randomSeq}`;
  };

  // Preset Industry Intern Roles + Dynamic Custom Roles Storage
  const DEFAULT_ROLES = [
    'Web Developer Intern',
    'Frontend Developer Intern',
    'Backend Developer Intern',
    'Full Stack Intern',
    'AI / ML Engineer Intern',
    'Python Developer Intern',
    'Data Science Intern',
    'UI/UX Design Intern',
    'Mobile App Developer Intern',
    'Cloud & DevOps Intern',
    'QA / Software Tester Intern',
  ];

  const [roleOptions, setRoleOptions] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('sf_custom_roles') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...new Set([...DEFAULT_ROLES, ...parsed])];
      }
    } catch (e) {}
    return DEFAULT_ROLES;
  });
  const [isAddingNewRole, setIsAddingNewRole] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayDateTimeStr = useMemo(() => new Date().toISOString().slice(0, 16), []);

  // Compute dynamic initial dates: start +7 days, end +97 days (~90 days), deadline +3 days at 17:00
  const initialDates = useMemo(() => {
    const now = new Date();
    const join = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const end = new Date(join.getTime() + 90 * 24 * 60 * 60 * 1000);
    const dline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    dline.setHours(17, 0, 0, 0);

    const joinStr = join.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const dlineStr = dline.toISOString().slice(0, 16);
    return { joinStr, endStr, dlineStr, duration: '91 Days (~3 Months)' };
  }, []);

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: '',
    internId: 'SF-WD-2026-001',
    email: '',
    phone: '',
    degree: '',
    collegeName: '',
    role: 'Web Developer Intern',
    stipend: '10000',
    joiningDate: initialDates.joinStr,
    endDate: initialDates.endStr,
    duration: initialDates.duration,
    workMode: 'Online - Remote',
    reportingManager: 'Priyanka Nair',
    assignedMentor: 'Rahul Kapoor',
    batch: 'Batch A',
    deadline: initialDates.dlineStr,
    cc: '',
    templateId: '',
    customSubject: '',
    customBody: '',
  });

  const [previewTab, setPreviewTab] = useState('email');
  const [pdfPreviewHtml, setPdfPreviewHtml] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [prereqNotice, setPrereqNotice] = useState('');
  const [portalToken, setPortalToken] = useState(() => Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));
  const VERCEL_PROD_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://internship-email-automation.vercel.app').replace(/\/+$/, '');
  const candidatePortalUrl = `${VERCEL_PROD_URL}/offers/respond?token=${portalToken}`;

  // Guaranteed fallback templates if database or API is still loading
  const availableTemplates = useMemo(() => {
    if (templates && templates.length > 0) return templates;
    return [
      {
        id: 'corporate-std',
        name: 'Corporate Standard Offer Letter',
        isDefault: true,
        subject: 'Official Internship Offer from Shortfundly - {{candidateName}}',
      },
      {
        id: 'fast-track-tech',
        name: 'Fast-Track Technical Internship Offer',
        isDefault: false,
        subject: 'Fast-Track Technical Internship Offer - {{candidateName}}',
      },
    ];
  }, [templates]);

  // Sequential prerequisite check
  const checkPrerequisite = (fieldKey) => {
    const rules = [
      { key: 'email', prereq: formData.fullName.trim(), label: 'Candidate Name', target: 'Candidate Email ID' },
      { key: 'phone', prereq: formData.email.trim(), label: 'Candidate Email ID', target: 'Phone Number' },
      { key: 'degree', prereq: formData.phone.trim(), label: 'Phone Number', target: 'Degree / Program' },
      { key: 'collegeName', prereq: formData.degree.trim(), label: 'Degree / Program', target: 'College / University' },
      { key: 'role', prereq: formData.collegeName.trim(), label: 'College / University', target: 'Designation / Role' },
      { key: 'stipend', prereq: formData.role.trim(), label: 'Designation / Role', target: 'Monthly Stipend' },
      { key: 'joiningDate', prereq: formData.stipend.toString().trim(), label: 'Monthly Stipend', target: 'Joining Date' },
      { key: 'endDate', prereq: formData.joiningDate, label: 'Joining Date', target: 'End Date' },
      { key: 'deadline', prereq: formData.endDate, label: 'End Date', target: 'Offer Expiry Deadline' },
    ];

    const rule = rules.find((r) => r.key === fieldKey);
    if (rule && !rule.prereq) {
      const msg = `Please fill ${rule.label} before entering ${rule.target}!`;
      setPrereqNotice(msg);
      showToast?.(msg, 'warning');
      return false;
    }
    setPrereqNotice('');
    return true;
  };

  const setDeadlinePreset = (hours) => {
    const d = new Date(Date.now() + hours * 60 * 60 * 1000);
    const formatted = d.toISOString().slice(0, 16);
    setFormData((prev) => ({ ...prev, deadline: formatted }));
    showToast?.(`Offer response deadline set to ${hours} hours (${d.toLocaleString()})`, 'info');
  };

  // Adjust stipend with stepper (+50, -50, +500, etc.)
  const handleAdjustStipend = (amount) => {
    setFormData((prev) => {
      const current = Number(prev.stipend.toString().replace(/[^0-9]/g, '')) || 0;
      const next = Math.max(0, current + amount);
      return { ...prev, stipend: next.toString() };
    });
  };

  // Set default deadline to 3 days from now and initial template
  useEffect(() => {
    const defaultDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const formatted = defaultDate.toISOString().slice(0, 16);
    setFormData((prev) => ({
      ...prev,
      deadline: prev.deadline || formatted,
      templateId: prev.templateId || (templates[0]?.id || ''),
      internId: prev.internId || generateReadableInternId(prev.role),
    }));
  }, [templates]);

  // When selecting candidate from DB
  const handleSelectFromDb = (candId) => {
    setSelectedCandidateId(candId);
    const cand = candidates.find((c) => c.id === candId || c.candidateId === candId || c.internId === candId);
    if (cand) {
      const role = cand.role || 'Web Developer Intern';
      setFormData((prev) => ({
        ...prev,
        fullName: cand.fullName || '',
        internId: cand.internId || cand.candidateId || generateReadableInternId(role),
        email: cand.email || '',
        phone: cand.phone || '',
        degree: cand.degree || 'B.Tech / B.E.',
        collegeName: cand.collegeName || 'Recognized University',
        role,
        stipend: cand.stipend ? cand.stipend.replace(/[^0-9]/g, '') : '10000',
        joiningDate: cand.joiningDate || '2026-06-01',
        endDate: cand.endDate || '2026-08-31',
        duration: cand.duration || '3 Months',
        batch: cand.batch || 'Batch A',
        workMode: cand.workMode || 'Online - Remote',
        reportingManager: cand.reportingManager || 'Priyanka Nair',
        assignedMentor: cand.assignedMentor || 'Rahul Kapoor',
      }));
    }
  };

  // Switch to manual mode
  const handleSwitchToManual = () => {
    setIntakeMode('manual');
    setSelectedCandidateId('');
    setFormData((prev) => ({
      ...prev,
      internId: generateReadableInternId('Web Developer Intern'),
      fullName: '',
      email: '',
      phone: '',
      degree: '',
      collegeName: '',
      role: 'Web Developer Intern',
      stipend: '10000',
    }));
  };

  // Accurate real-time calculation of days and months between joining date and end date
  const updateDatesAndDuration = (newJoining, newEnd) => {
    const jDate = newJoining !== undefined ? newJoining : formData.joiningDate;
    const eDate = newEnd !== undefined ? newEnd : formData.endDate;

    let durationLabel = formData.duration;
    if (jDate && eDate) {
      const start = new Date(jDate);
      const end = new Date(eDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
        const approxMonths = Math.max(1, Math.round(diffDays / 30));
        durationLabel = `${diffDays} Days (~${approxMonths} Month${approxMonths > 1 ? 's' : ''})`;
      }
    }

    let suggestedBatch = formData.batch;
    if (newJoining) {
      const existingBatch = batches.find((b) => b.joiningDate === newJoining);
      if (existingBatch) suggestedBatch = existingBatch.batchName;
    }

    setFormData((prev) => ({
      ...prev,
      ...(newJoining !== undefined ? { joiningDate: newJoining, batch: suggestedBatch } : {}),
      ...(newEnd !== undefined ? { endDate: newEnd } : {}),
      duration: durationLabel,
    }));
  };

  // Add custom new role on the spot
  const handleAddNewRole = () => {
    const trimmed = newRoleInput.trim();
    if (!trimmed) {
      showToast?.('Please enter a role designation title.', 'error');
      return;
    }
    if (!roleOptions.includes(trimmed)) {
      const updated = [trimmed, ...roleOptions];
      setRoleOptions(updated);
      try {
        localStorage.setItem('sf_custom_roles', JSON.stringify(updated.filter((r) => !DEFAULT_ROLES.includes(r))));
      } catch (e) {}
    }
    handleRoleChange(trimmed);
    setNewRoleInput('');
    setIsAddingNewRole(false);
    showToast?.(`New role "${trimmed}" created and selected!`, 'success');
  };

  // Handle Role change: update readable Intern ID keyword
  const handleRoleChange = (newRole) => {
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      internId: generateReadableInternId(newRole),
    }));
  };

  // Add custom new batch
  const handleSaveNewBatch = () => {
    if (!newBatchName.trim()) {
      showToast?.('Please enter a batch name.', 'error');
      return;
    }
    const trimmed = newBatchName.trim();
    if (!batchOptions.includes(trimmed)) {
      setBatchOptions((prev) => [trimmed, ...prev]);
    }
    setFormData((prev) => ({ ...prev, batch: trimmed }));
    setNewBatchName('');
    setIsAddingNewBatch(false);
    showToast?.(`New batch "${trimmed}" created and selected!`, 'success');
  };

  // Inline Validations
  const validationErrors = useMemo(() => {
    const errs = {};

    // Full Name: Required, letters & spaces only
    if (!formData.fullName.trim()) {
      errs.fullName = 'Candidate name is required.';
    } else if (/\d/.test(formData.fullName)) {
      errs.fullName = 'Candidate name must contain letters and spaces only (no numbers).';
    } else if (formData.fullName.trim().length < 2) {
      errs.fullName = 'Name must be at least 2 characters.';
    }

    // Intern ID: Required
    if (!formData.internId.trim()) {
      errs.internId = 'Intern ID is required.';
    }

    // Email ID: Valid email format
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    // Phone: 10 to 15 digits
    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!/^\+?[0-9]{10,15}$/.test(formData.phone.trim().replace(/[\s-]/g, ''))) {
      errs.phone = 'Phone must contain 10–15 digits.';
    }

    // Degree: Required
    if (!formData.degree.trim()) {
      errs.degree = 'Degree / qualification is required.';
    }

    // College: Required
    if (!formData.collegeName.trim()) {
      errs.collegeName = 'College / university name is required.';
    }

    // Designation / Role: Required
    if (!formData.role.trim()) {
      errs.role = 'Designation / role is required.';
    }

    // Stipend: Numeric only
    if (!formData.stipend.toString().trim()) {
      errs.stipend = 'Stipend amount is required.';
    }

    // Dates
    if (!formData.joiningDate) errs.joiningDate = 'Joining date is required.';
    if (!formData.endDate) errs.endDate = 'End date is required.';
    if (!formData.deadline) errs.deadline = 'Offer response deadline is required.';

    return errs;
  }, [formData]);

  const isStep1Valid = Object.keys(validationErrors).length === 0;

  // Selected Template
  const activeTemplate = useMemo(() => {
    return availableTemplates.find((t) => t.id === formData.templateId) || availableTemplates[0] || null;
  }, [availableTemplates, formData.templateId]);

  // Load PDF preview when switching to PDF tab or entering Step 3
  const loadPdfPreview = async () => {
    try {
      setPdfLoading(true);
      const res = await fetch('/api/offer-letter/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateData: {
            fullName: formData.fullName || 'Candidate Name',
            candidateId: formData.internId || 'SF-WD-2026-001',
            role: formData.role || 'Web Developer Intern',
            stipend: `Rs. ${Number(formData.stipend || 10000).toLocaleString('en-IN')}`,
            joiningDate: formData.joiningDate || '2026-06-01',
            endDate: formData.endDate || '2026-08-31',
            duration: formData.duration || '3 Months',
            workMode: formData.workMode || 'Online - Remote',
            reportingManager: formData.reportingManager || 'Priyanka Nair',
            assignedMentor: formData.assignedMentor || 'Rahul Kapoor',
            collegeName: formData.collegeName || 'Recognized University',
            degree: formData.degree || 'Bachelor of Technology',
            phone: formData.phone || '+91 9876543210',
            email: formData.email || 'candidate@example.com',
          },
          customSubject: formData.customSubject,
          customBody: formData.customBody,
        }),
      });

      const data = await res.json();
      if (data.success && data.html) {
        setPdfPreviewHtml(data.html);
      }
    } catch (err) {
      console.warn('Error generating PDF preview:', err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    if (currentStep === 3) {
      loadPdfPreview();
    }
  }, [currentStep, formData]);

  // Dispatch single offer letter
  const handleSendOffer = async () => {
    if (!isStep1Valid) {
      showToast?.('Please ensure all required fields are valid.', 'error');
      setCurrentStep(1);
      return;
    }

    try {
      setSending(true);
      const payload = new FormData();
      payload.append('fullName', formData.fullName);
      payload.append('internId', formData.internId);
      payload.append('candidateId', formData.internId);
      payload.append('email', formData.email);
      payload.append('phone', formData.phone);
      payload.append('role', formData.role);
      payload.append('degree', formData.degree);
      payload.append('collegeName', formData.collegeName);
      payload.append('stipend', `Rs. ${Number(formData.stipend).toLocaleString('en-IN')}`);
      payload.append('joiningDate', formData.joiningDate);
      payload.append('endDate', formData.endDate);
      payload.append('duration', formData.duration);
      payload.append('workMode', formData.workMode);
      payload.append('reportingManager', formData.reportingManager);
      payload.append('assignedMentor', formData.assignedMentor);
      payload.append('batch', formData.batch);
      payload.append('deadline', formData.deadline);
      if (formData.cc) payload.append('cc', formData.cc);
      if (formData.templateId) payload.append('templateId', formData.templateId);
      if (formData.customSubject) payload.append('subject', formData.customSubject);
      if (formData.customBody) payload.append('body', formData.customBody);
      if (portalToken) {
        payload.append('token', portalToken);
        payload.append('portalToken', portalToken);
      }
      payload.append('responseUrl', candidatePortalUrl);

      // Append any uploaded files or images
      if (attachedFiles && attachedFiles.length > 0) {
        attachedFiles.forEach((file) => {
          payload.append('attachments', file);
        });
      }

      const res = await fetch('/api/offer-letter/send-single', {
        method: 'POST',
        body: payload,
      });

      const data = await res.json();
      if (data.success) {
        setSendError(null);
        setSendSuccess(true);
        showToast?.(`Offer letter successfully dispatched to ${formData.fullName}!`, 'success');
        onOfferSent?.();
        // Auto-navigate back to step 1 after short delay
        setTimeout(() => {
          setSendSuccess(false);
          setCurrentStep(1);
        }, 2000);
      } else {
        const errMsg = data.error || 'Failed to dispatch offer letter. Please try again.';
        setSendError(errMsg);
        showToast?.(errMsg, 'error');
      }
    } catch (err) {
      const errMsg = err.message || 'Network error. Please check your connection.';
      setSendError(errMsg);
      showToast?.(errMsg, 'error');
    } finally {
      setSending(false);
    }
  };

  // Jinja Context for Preview
  const previewContext = useMemo(() => {
    return {
      candidateName: formData.fullName || 'Candidate Name',
      role: formData.role || 'Web Developer Intern',
      internId: formData.internId || 'SF-WD-2026-001',
      startDate: formData.joiningDate || '2026-06-01',
      endDate: formData.endDate || '2026-08-31',
      duration: formData.duration || '3 Months',
      stipend: `Rs. ${Number(formData.stipend || 10000).toLocaleString('en-IN')}`,
      deadline: formData.deadline ? new Date(formData.deadline).toLocaleString() : '3 Days',
      responseUrl: candidatePortalUrl,
    };
  }, [formData, candidatePortalUrl]);

  const defaultJinjaBody = `Dear {{candidateName}},

Congratulations! We are thrilled to offer you the position of {{role}} at Shortfundly. We were deeply impressed by your skills, background, and performance throughout our evaluation process.

Internship Details:
• Role / Position: {{role}}
• Intern ID: {{internId}}
• Anticipated Start Date: {{startDate}}
• Duration: {{duration}}
• Stipend / Compensation: {{stipend}}
• Work Location / Mode: Online

Action Required: Review & Respond
To review the full formal offer letter PDF attached to this email and record your response, please access your secure candidate portal via the unique link below:

Access Your Secure Offer Portal & Sign Offer:
{{responseUrl}}

Important Note on Expiration: This unique link and offer will officially expire on {{deadline}}. Please ensure you complete your response before this deadline.

How to Confirm Acceptance:
1. Click the secure link above to open your candidate portal.
2. Review the terms outlined in the formal offer letter.
3. Provide your digital signature directly on the platform.
4. Upload a photo of your signature (or signature document/ID as required) to officially confirm your acceptance of this offer.

If you have any questions or require clarifications regarding the terms, please feel free to reach out to us by replying directly to this email.

We are excited about the prospect of having you join the Shortfundly family and look forward to building amazing things together!

Best regards,
Hiring & Talent Acquisition Team
Shortfundly
www.shortfundly.com`;

  return (
    <div className={styles.formContainer}>
      {/* 1. PROGRESS WORKFLOW STEPPER */}
      <div className={styles.stepIndicator}>
        <div className={`${styles.stepPill} ${currentStep === 1 ? styles.stepPillActive : isStep1Valid ? styles.stepPillCompleted : ''}`}>
          <span>1. Enter Candidate Details</span>
          {isStep1Valid && <CheckCircle2 size={14} color="#10b981" />}
        </div>

        <div className={`${styles.stepPill} ${currentStep === 2 ? styles.stepPillActive : currentStep > 2 ? styles.stepPillCompleted : ''}`}>
          <span>2. Choose Email Template</span>
        </div>

        <div className={`${styles.stepPill} ${currentStep === 3 ? styles.stepPillActive : ''}`}>
          <span>3. Preview & Send Offer</span>
        </div>
      </div>

      {/* --- STEP 1: SEQUENTIAL CANDIDATE DETAILS --- */}
      {currentStep === 1 && (
        <div>
          {/* Sequential Prerequisite Warning Notice */}
          {prereqNotice && (
            <div className={styles.prereqNotice}>
              <AlertCircle size={15} />
              <span>{prereqNotice}</span>
            </div>
          )}

          <div className={styles.modeToggleRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="#7C3AED" />
              <strong style={{ color: '#0F172A', fontSize: '14px', fontWeight: 700 }}>Candidate Source:</strong>
            </div>

            <div className={styles.modeToggleButtons}>
              <button
                type="button"
                onClick={() => setIntakeMode('database')}
                className={`${styles.btnMode} ${intakeMode === 'database' ? styles.btnModeActive : ''}`}
              >
                Select from Database
              </button>
              <button
                type="button"
                onClick={handleSwitchToManual}
                className={`${styles.btnMode} ${intakeMode === 'manual' ? styles.btnModeActive : ''}`}
              >
                Manual Entry Option
              </button>
            </div>
          </div>

          {/* Database Selector Dropdown */}
          {intakeMode === 'database' && (
            <div className={styles.fieldGroup} style={{ marginBottom: '20px' }}>
              <label className={styles.fieldLabel}>
                <span>Select Candidate Record <span className={styles.requiredStar}>*</span></span>
                <span style={{ fontSize: '12.5px', color: '#475569' }}>Auto-populates details & readable Intern ID</span>
              </label>
              <select
                value={selectedCandidateId}
                onChange={(e) => handleSelectFromDb(e.target.value)}
                className={styles.inputField}
              >
                <option value="">-- Choose Candidate ({candidates.length} available) --</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} &bull; {c.role} ({c.internId || c.candidateId})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sequential Fields Grid (Fully Visible & Editable) */}
          <div className={styles.fieldGrid}>
            {/* Field 0: Full Name */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Candidate Name <span className={styles.requiredStar}>*</span></span>
              </label>
              <input
                type="text"
                placeholder="e.g. Akash Kumar"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={`${styles.inputField} ${formData.fullName && validationErrors.fullName ? styles.inputError : formData.fullName ? styles.inputValid : ''}`}
              />
              {formData.fullName && validationErrors.fullName && (
                <div className={styles.fieldError}>
                  <AlertCircle size={12} />
                  <span>{validationErrors.fullName}</span>
                </div>
              )}
            </div>

            {/* Field 1: Intern ID (Generated bright text) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Intern ID <span className={styles.requiredStar}>*</span></span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', color: '#38bdf8' }}>
                  <Sparkles size={11} /> Auto-Generated Readable ID
                </span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="SF-WD-2026-001"
                  value={formData.internId}
                  onChange={(e) => setFormData({ ...formData, internId: e.target.value.toUpperCase() })}
                  className={`${styles.inputField} ${styles.brightGeneratedInput}`}
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, internId: generateReadableInternId(formData.role) })}
                  style={{ padding: '0 12px', background: 'var(--bg-surface-elevated)', border: '1px solid #7c3aed', borderRadius: '6px', color: '#6D28D9', fontSize: '12.5px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  title="Generate New Readable Intern ID"
                >
                  Regenerate
                </button>
              </div>
              {formData.internId && validationErrors.internId && (
                <div className={styles.fieldError}>
                  <AlertCircle size={12} />
                  <span>{validationErrors.internId}</span>
                </div>
              )}
            </div>

            {/* Field 2: Email ID */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Candidate Email ID <span className={styles.requiredStar}>*</span></span>
              </label>
              <input
                type="email"
                autoComplete="off"
                placeholder="candidate@gmail.com"
                value={formData.email}
                onFocus={() => checkPrerequisite('email')}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                className={`${styles.inputField} ${formData.email && validationErrors.email ? styles.inputError : formData.email ? styles.inputValid : ''}`}
              />
              {formData.email && validationErrors.email && (
                <div className={styles.fieldError}>
                  <AlertCircle size={12} />
                  <span>{validationErrors.email}</span>
                </div>
              )}
            </div>

            {/* Field 3: Phone */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Phone Number <span className={styles.requiredStar}>*</span></span>
              </label>
              <input
                type="text"
                placeholder="+91 9876543210"
                value={formData.phone}
                onFocus={() => checkPrerequisite('phone')}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`${styles.inputField} ${formData.phone && validationErrors.phone ? styles.inputError : formData.phone ? styles.inputValid : ''}`}
              />
              {formData.phone && validationErrors.phone && (
                <div className={styles.fieldError}>
                  <AlertCircle size={12} />
                  <span>{validationErrors.phone}</span>
                </div>
              )}
            </div>

            {/* Field 4: Degree */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Degree / Program <span className={styles.requiredStar}>*</span></span>
              </label>
              <input
                type="text"
                placeholder="e.g. B.Tech Computer Science"
                value={formData.degree}
                onFocus={() => checkPrerequisite('degree')}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                className={`${styles.inputField} ${formData.degree && validationErrors.degree ? styles.inputError : formData.degree ? styles.inputValid : ''}`}
              />
            </div>

            {/* Field 5: College Name */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>College / University <span className={styles.requiredStar}>*</span></span>
              </label>
              <input
                type="text"
                placeholder="e.g. Anna University, Chennai"
                value={formData.collegeName}
                onFocus={() => checkPrerequisite('collegeName')}
                onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                className={`${styles.inputField} ${formData.collegeName && validationErrors.collegeName ? styles.inputError : formData.collegeName ? styles.inputValid : ''}`}
              />
            </div>

            {/* Field 6: Designation / Role (Select dropdown with on-the-spot Add) */}
            <div className={styles.fieldGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className={styles.fieldLabel} style={{ margin: 0 }}>
                  <span>Designation / Role <span className={styles.requiredStar}>*</span></span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewRole(!isAddingNewRole)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#6D28D9',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <Plus size={12} />
                  <span>{isAddingNewRole ? 'Cancel' : '+ Add New Role'}</span>
                </button>
              </div>

              {!isAddingNewRole ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={formData.role}
                    onFocus={() => checkPrerequisite('role')}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className={`${styles.selectField} ${formData.role ? styles.inputValid : ''}`}
                    style={{ flex: 1 }}
                  >
                    {roleOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-surface)', border: '1px solid #7c3aed44', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="e.g. AI Research Intern"
                      value={newRoleInput}
                      onChange={(e) => setNewRoleInput(e.target.value)}
                      className={styles.inputField}
                      style={{ flex: 1, padding: '7px 12px', fontSize: '13px' }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddNewRole}
                      className={styles.btnPrimary}
                      style={{ padding: '7px 14px', fontSize: '13px', whiteSpace: 'nowrap' }}
                    >
                      Add & Select
                    </button>
                  </div>
                  <span style={{ fontSize: '12.5px', color: '#475569', display: 'block', marginTop: '4px' }}>
                    Adds new role immediately to dropdown and selects it.
                  </span>
                </div>
              )}
            </div>

            {/* Field 7: Stipend with suggestions + stepper */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Monthly Stipend (INR) <span className={styles.requiredStar}>*</span></span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="10000"
                  value={formData.stipend}
                  onFocus={() => checkPrerequisite('stipend')}
                  onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                  className={`${styles.inputField} ${formData.stipend && validationErrors.stipend ? styles.inputError : formData.stipend ? styles.inputValid : ''}`}
                />
                <button
                  type="button"
                  onClick={() => handleAdjustStipend(50)}
                  className={styles.stepperBtn}
                  title="Increase by ₹50"
                >
                  +50
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustStipend(-50)}
                  className={styles.stepperBtn}
                  title="Decrease by ₹50"
                >
                  -50
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustStipend(500)}
                  className={styles.stepperBtn}
                  title="Increase by ₹500"
                >
                  +500
                </button>
              </div>

              {/* Stipend Quick Suggestions */}
              <div className={styles.stipendPillsRow}>
                <span style={{ fontSize: '12.5px', color: '#475569' }}>Suggestions:</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, stipend: '10000' })}
                  className={styles.stipendPill}
                >
                  10k (₹10,000)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, stipend: '15000' })}
                  className={styles.stipendPill}
                >
                  15k (₹15,000)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, stipend: '20000' })}
                  className={styles.stipendPill}
                >
                  20k (₹20,000)
                </button>
              </div>
            </div>

            {/* Field 8: Joining Date (Calendar with past dates disabled) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Joining Date (Calendar) <span className={styles.requiredStar}>*</span></span>
              </label>
              <input
                type="date"
                min={todayStr}
                value={formData.joiningDate}
                onFocus={() => checkPrerequisite('joiningDate')}
                onChange={(e) => updateDatesAndDuration(e.target.value, undefined)}
                className={`${styles.inputField} ${formData.joiningDate ? styles.inputValid : ''}`}
              />
              <span style={{ fontSize: '12.5px', color: '#475569' }}>Past dates not allowed (Min: {todayStr})</span>
            </div>

            {/* Field 9: End Date (Calendar with accurate real-time duration badge) */}
            <div className={styles.fieldGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className={styles.fieldLabel} style={{ margin: 0 }}>
                  <span>End Date (Calendar) <span className={styles.requiredStar}>*</span></span>
                </label>
                {formData.duration && (
                  <span style={{ fontSize: '12.5px', color: '#a855f7', fontWeight: 600, background: '#7c3aed15', padding: '2px 8px', borderRadius: '4px', border: '1px solid #7c3aed33' }}>
                    {formData.duration}
                  </span>
                )}
              </div>
              <input
                type="date"
                min={formData.joiningDate || todayStr}
                value={formData.endDate}
                onFocus={() => checkPrerequisite('endDate')}
                onChange={(e) => updateDatesAndDuration(undefined, e.target.value)}
                className={`${styles.inputField} ${formData.endDate ? styles.inputValid : ''}`}
              />
              <span style={{ fontSize: '12.5px', color: '#475569' }}>Accurate calculation of days from joining to end date</span>
            </div>

            {/* Field 10: Expiry Date (Calendar with past dates disabled) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Offer Expiry Deadline (Calendar) <span className={styles.requiredStar}>*</span></span>
                <Clock size={13} color="#c084fc" />
              </label>
              <input
                type="datetime-local"
                min={todayDateTimeStr}
                value={formData.deadline}
                onFocus={() => checkPrerequisite('deadline')}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className={`${styles.inputField} ${formData.deadline ? styles.inputValid : ''}`}
              />
              <span style={{ fontSize: '12.5px', color: '#475569' }}>Link automatically locks after this date/time</span>
            </div>

            {/* Field 11: Unique Candidate Offer Response Portal Link with Deadline Fixer (Moved here near Expiry Deadline) */}
            <div className={styles.fieldGroup} style={{ gridColumn: 'span 2', background: 'var(--bg-surface)', padding: '14px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className={styles.fieldLabel} style={{ margin: 0 }}>
                  <span style={{ color: '#0F172A', fontWeight: 700 }}>Candidate Offer Acceptance Link</span>
                  <span style={{ fontSize: '12.5px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={11} /> Active Response Link
                  </span>
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(candidatePortalUrl);
                      showToast?.('Copied Vercel Candidate Portal URL to clipboard!', 'success');
                    }}
                    style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', borderRadius: '4px', padding: '3px 8px', fontSize: '12.5px', color: '#334155', cursor: 'pointer' }}
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextTok = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
                      setPortalToken(nextTok);
                      showToast?.('Regenerated candidate portal URL token!', 'info');
                    }}
                    style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', borderRadius: '4px', padding: '3px 8px', fontSize: '12.5px', color: '#6D28D9', cursor: 'pointer' }}
                  >
                    Regenerate URL
                  </button>
                </div>
              </div>
              <input
                type="text"
                readOnly
                value={candidatePortalUrl}
                className={`${styles.inputField} ${styles.brightUrlInput}`}
              />

              {/* Deadline Fixer Option Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #1c1b24' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={12} color="#c084fc" />
                  <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Deadline Fixer:</span>
                  <button type="button" onClick={() => setDeadlinePreset(24)} className={styles.btnDeadlinePreset}>+24h (1 Day)</button>
                  <button type="button" onClick={() => setDeadlinePreset(48)} className={styles.btnDeadlinePreset}>+48h (2 Days)</button>
                  <button type="button" onClick={() => setDeadlinePreset(72)} className={styles.btnDeadlinePreset}>+72h (3 Days)</button>
                  <button type="button" onClick={() => setDeadlinePreset(168)} className={styles.btnDeadlinePreset}>+7 Days (1 Wk)</button>
                </div>
                <div style={{ fontSize: '12.5px', color: '#34d399' }}>
                  Expires: <strong>{formData.deadline ? new Date(formData.deadline).toLocaleString() : 'Not Set'}</strong>
                </div>
              </div>
            </div>

            {/* Field 12: Assigned Batch with Add New Option and Solo Intern */}
            <div className={styles.fieldGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.fieldLabel} style={{ margin: 0 }}>
                  <span>Assigned Batch / Solo Intern</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewBatch(!isAddingNewBatch)}
                  style={{ background: 'transparent', border: 'none', color: '#6D28D9', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <Plus size={12} />
                  <span>{isAddingNewBatch ? 'Cancel' : '+ Add New Batch'}</span>
                </button>
              </div>

              {isAddingNewBatch ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <input
                    type="text"
                    placeholder="Enter new batch name (e.g. Batch D - AI Track)"
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                    className={styles.inputField}
                  />
                  <button
                    type="button"
                    onClick={handleSaveNewBatch}
                    style={{ padding: '0 14px', background: '#7c3aed', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <select
                  value={formData.batch}
                  onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                  className={styles.inputField}
                >
                  {batchOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className={styles.actionStepRow}>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              Sequential validation: complete all required fields (<span className={styles.requiredStar}>*</span>) to unlock next step.
            </div>

            <button
              type="button"
              disabled={!isStep1Valid}
              onClick={() => setCurrentStep(2)}
              className={`${styles.btnPrimary} ${!isStep1Valid ? styles.btnPrimaryDisabled : ''}`}
            >
              <span>Proceed to Select Text Template & Add cc</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 2: SELECT / EDIT JINJA TEMPLATE & ADD CC --- */}
      {currentStep === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#0F172A', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#7C3AED" />
              <span>Select Text Template & Add cc</span>
            </h3>
          </div>

          <div className={styles.fieldGroup} style={{ marginBottom: '18px' }}>
            <label className={styles.fieldLabel}>
              <span>Choose Corporate Template</span>
            </label>
            <select
              value={formData.templateId || availableTemplates[0]?.id || ''}
              onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
              className={styles.inputField}
            >
              {availableTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup} style={{ marginBottom: '18px' }}>
            <label className={styles.fieldLabel}>
              <span>Email Subject (Jinja Text Format)</span>
            </label>
            <input
              type="text"
              placeholder="Official Internship Offer from Shortfundly - {{candidateName}}"
              value={formData.customSubject || activeTemplate?.subject || ''}
              onChange={(e) => setFormData({ ...formData, customSubject: e.target.value })}
              className={styles.inputField}
            />
          </div>

          <div className={styles.fieldGroup} style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className={styles.fieldLabel}>
                <span>Email Body (User-Friendly Jinja Plain Text Format)</span>
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['{{candidateName}}', '{{role}}', '{{internId}}', '{{stipend}}', '{{startDate}}', '{{deadline}}', '{{responseUrl}}'].map(tag => (
                  <span
                    key={tag}
                    onClick={() => setFormData({ ...formData, customBody: (formData.customBody || defaultJinjaBody) + ' ' + tag })}
                    style={{ fontSize: '12.5px', background: 'rgba(168, 85, 247, 0.15)', color: '#6D28D9', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}
                  >
                    + {tag}
                  </span>
                ))}
              </div>
            </div>
            <textarea
              rows={18}
              value={formData.customBody || activeTemplate?.emailBody || defaultJinjaBody}
              onChange={(e) => setFormData({ ...formData, customBody: e.target.value })}
              className={styles.templateTextarea}
              placeholder="Customize offer letter text..."
            />
          </div>

          <div className={styles.fieldGroup} style={{ marginBottom: '18px' }}>
            <label className={styles.fieldLabel}>
              <span>Add CC Email Recipients (Optional, comma-separated)</span>
            </label>
            <input
              type="text"
              placeholder="mentor@shortfundly.com, manager@shortfundly.com"
              value={formData.cc}
              onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
              className={styles.inputField}
            />
          </div>

          {/* Additional File and Image Attachments */}
          <div className={styles.attachmentsContainer} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <label className={styles.fieldLabel} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Paperclip size={15} color="#7C3AED" />
                <span style={{ color: '#0F172A', fontWeight: 700 }}>Attach Images &amp; Documents to Email (Optional)</span>
              </label>
              <label style={{ cursor: 'pointer', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid #a855f7', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', color: '#6D28D9', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <Upload size={13} />
                <span>+ Upload Files / Images</span>
                <input
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const selected = Array.from(e.target.files);
                      setAttachedFiles((prev) => [...prev, ...selected]);
                      showToast?.(`Attached ${selected.length} file(s)`, 'info');
                    }
                  }}
                />
              </label>
            </div>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              Add PDF handbook, onboarding materials, identity proof guidelines, or banner images to be sent alongside the formal Offer Letter PDF.
            </div>

            {attachedFiles.length > 0 && (
              <div className={styles.attachmentsList}>
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className={styles.attachmentItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Paperclip size={13} color="#a855f7" />
                      <span style={{ fontWeight: 600, color: '#f8fafc' }}>{file.name}</span>
                      <span style={{ fontSize: '12.5px', color: '#475569' }}>
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className={styles.attachmentRemoveBtn}
                      title="Remove attachment"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.actionStepRow}>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={styles.btnBack}
            >
              <ArrowLeft size={16} />
              <span>Back to Candidate Details</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={styles.btnPrimary}
            >
              <span>Proceed to Preview Email & PDF</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 3: PREVIEW EMAIL & PDF -> SEND --- */}
      {currentStep === 3 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#0F172A', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} color="#7C3AED" />
              <span>Preview Personalized Offer & Confirm Send</span>
            </h3>

            <div className={styles.previewTabs}>
              <button
                type="button"
                onClick={() => setPreviewTab('email')}
                className={`${styles.previewTab} ${previewTab === 'email' ? styles.previewTabActive : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Mail size={14} />
                <span>1. Email Content Preview</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewTab('pdf');
                  loadPdfPreview();
                }}
                className={`${styles.previewTab} ${previewTab === 'pdf' ? styles.previewTabActive : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FileText size={14} />
                <span>2. Offer Letter PDF Preview</span>
              </button>
            </div>
          </div>

          <div className={styles.previewBox}>
            {previewTab === 'email' ? (
              <div style={{ color: '#334155' }}>
                <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div><strong>To:</strong> {formData.email} ({formData.fullName})</div>
                      {formData.cc && <div><strong>CC:</strong> {formData.cc}</div>}
                      <div><strong>Subject:</strong> {renderJinja(formData.customSubject || activeTemplate?.subject || 'Official Internship Offer from Shortfundly - {{candidateName}}', previewContext)}</div>
                      <div><strong>Intern ID:</strong> <code style={{ color: '#6D28D9', fontWeight: 700 }}>{formData.internId}</code></div>
                      <div><strong>Expiration Deadline:</strong> {formData.deadline ? new Date(formData.deadline).toLocaleString() : '3 Days'}</div>
                      {attachedFiles.length > 0 && (
                        <div><strong>Attached Files:</strong> <span style={{ color: '#6D28D9' }}>{attachedFiles.length} file(s) ({attachedFiles.map(f => f.name).join(', ')})</span></div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewTab('pdf');
                        loadPdfPreview();
                      }}
                      style={{ background: 'rgba(168, 85, 247, 0.15)', border: '1px solid #a855f7', color: '#6D28D9', borderRadius: '4px', padding: '5px 12px', fontSize: '12.5px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', fontWeight: 600 }}
                    >
                      <FileText size={12} />
                      <span>Switch to PDF Preview &rarr;</span>
                    </button>
                  </div>
                  <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-default)', wordBreak: 'break-all', color: '#475569', fontSize: '13px' }}>
                    <Link2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    Generated Candidate Portal URL: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{previewContext.responseUrl}</span>
                  </div>
                </div>

                <div
                  style={{ background: '#ffffff', color: '#1e293b', padding: '24px', borderRadius: '8px', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{
                    __html: jinjaTextToEmailHtml(formData.customBody || activeTemplate?.emailBody || defaultJinjaBody, previewContext),
                  }}
                />
              </div>
            ) : (
              /* LIVE PDF OFFER LETTER PREVIEW */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    A4 Corporate Single-Page Offer Letter PDF Preview for <strong>{formData.fullName}</strong> ({formData.internId})
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={loadPdfPreview}
                      disabled={pdfLoading}
                      style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', borderRadius: '6px', padding: '4px 10px', fontSize: '12.5px', color: '#6D28D9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <RefreshCw size={12} className={pdfLoading ? 'animate-spin' : ''} />
                      <span>{pdfLoading ? 'Rendering...' : 'Refresh PDF'}</span>
                    </button>
                    {pdfPreviewHtml && (
                      <button
                        type="button"
                        onClick={() => {
                          const w = window.open('', '_blank');
                          w?.document.write(pdfPreviewHtml);
                          w?.document.close();
                        }}
                        style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-default)', borderRadius: '6px', padding: '4px 10px', fontSize: '12.5px', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Printer size={12} />
                        <span>Open / Print PDF</span>
                      </button>
                    )}
                  </div>
                </div>

                {pdfLoading ? (
                  <div style={{ textAlign: 'center', padding: '48px', color: '#a855f7' }}>
                    <Sparkles size={24} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    <span>Rendering corporate offer letter preview...</span>
                  </div>
                ) : pdfPreviewHtml ? (
                  <div className={styles.pdfIframeWrapper}>
                    <iframe
                      title="Offer Letter PDF Preview"
                      srcDoc={pdfPreviewHtml}
                      className={styles.pdfIframe}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#475569', padding: '36px' }}>
                    <FileText size={36} color="#7C3AED" style={{ margin: '0 auto 10px auto' }} />
                    <p style={{ color: '#0F172A', fontWeight: 700, margin: '0 0 6px 0' }}>Offer Letter PDF ready to render</p>
                    <button
                      type="button"
                      onClick={loadPdfPreview}
                      className={styles.btnPrimary}
                      style={{ padding: '6px 16px', fontSize: '13px', marginTop: '8px' }}
                    >
                      Load Live PDF Preview
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {sendError && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '12px',
              marginBottom: '4px',
              color: '#fca5a5',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px', color: '#f87171' }} />
              <div>
                <div style={{ fontWeight: 600, color: '#f87171', marginBottom: '2px' }}>Send Failed</div>
                <div>{sendError}</div>
              </div>
            </div>
          )}
          {sendSuccess && (
            <div style={{
              background: 'rgba(168,85,247,0.12)',
              border: '1px solid rgba(168,85,247,0.4)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '12px',
              marginBottom: '4px',
              color: '#581C87',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <CheckCircle2 size={16} style={{ color: '#a855f7' }} />
              <span>Offer letter dispatched successfully! Moving to next step...</span>
            </div>
          )}

          <div className={styles.actionStepRow}>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={styles.btnBack}
              disabled={sending}
            >
              <ArrowLeft size={16} />
              <span>Back to Template</span>
            </button>

            <button
              type="button"
              onClick={handleSendOffer}
              disabled={sending || sendSuccess}
              className={styles.btnPrimary}
            >
              {sending ? (
                <>
                  <span className={styles.spinner}></span>
                  <span>Generating PDF & Dispatching...</span>
                </>
              ) : sendSuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Dispatched Successfully!</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Confirm & Send Offer Letter</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
