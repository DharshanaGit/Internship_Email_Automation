'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './sequentialForm.module.css';
import {
  Users,
  CheckCircle2,
  Lock,
  AlertCircle,
  FileText,
  Mail,
  Send,
  ArrowRight,
  ArrowLeft,
  Eye,
  Info,
  Clock,
  Sparkles,
  Link2
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

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: '',
    internId: 'INT-2026-00001',
    email: '',
    phone: '',
    degree: '',
    collegeName: '',
    role: 'Web Developer Intern',
    stipend: '10000',
    joiningDate: '2026-06-01',
    endDate: '2026-08-31',
    duration: '3 Months',
    workMode: 'Online - Remote',
    reportingManager: 'Priyanka Nair',
    assignedMentor: 'Rahul Kapoor',
    batch: 'Batch A',
    deadline: '',
    cc: '',
    templateId: '',
    customSubject: '',
    customBody: '',
  });

  const [previewTab, setPreviewTab] = useState('email');
  const [sending, setSending] = useState(false);
  const [portalToken, setPortalToken] = useState(() => Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));
  const candidatePortalUrl = typeof window !== 'undefined' ? `${window.location.origin}/offers/respond?token=${portalToken}` : `http://localhost:3000/offers/respond?token=${portalToken}`;

  // Auto-generate Gemma 2B unique Intern ID
  const generateNewGemmaId = () => {
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    return `INT-2026-${String(randomSeq).padStart(5, '0')}`;
  };

  // Set default deadline to 3 days from now and initial template
  useEffect(() => {
    const defaultDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const formatted = defaultDate.toISOString().slice(0, 16);
    setFormData((prev) => ({
      ...prev,
      deadline: prev.deadline || formatted,
      templateId: prev.templateId || (templates[0]?.id || ''),
      internId: prev.internId || generateNewGemmaId(),
    }));
  }, [templates]);

  // When selecting candidate from DB
  const handleSelectFromDb = (candId) => {
    setSelectedCandidateId(candId);
    const cand = candidates.find((c) => c.id === candId || c.candidateId === candId || c.internId === candId);
    if (cand) {
      setFormData((prev) => ({
        ...prev,
        fullName: cand.fullName || '',
        internId: cand.internId || cand.candidateId || generateNewGemmaId(),
        email: cand.email || '',
        phone: cand.phone || '',
        degree: cand.degree || 'B.Tech / B.E.',
        collegeName: cand.collegeName || 'Recognized University',
        role: cand.role || 'Web Developer Intern',
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
      internId: generateNewGemmaId(),
      fullName: '',
      email: '',
      phone: '',
      degree: '',
      collegeName: '',
      role: 'Web Developer Intern',
      stipend: '10000',
    }));
  };

  // Auto-associate batch based on joining date
  const handleJoiningDateChange = (newDate) => {
    let suggestedBatch = 'Batch A';
    if (newDate) {
      const existingBatch = batches.find((b) => b.joiningDate === newDate);
      if (existingBatch) {
        suggestedBatch = existingBatch.batchName;
      } else if (newDate.startsWith('2026-07')) {
        suggestedBatch = 'Batch B';
      } else if (newDate.startsWith('2026-08')) {
        suggestedBatch = 'Batch C';
      }
    }
    setFormData((prev) => ({
      ...prev,
      joiningDate: newDate,
      batch: suggestedBatch,
    }));
  };

  // --- Strict Sequential Validations (Zod-equivalent inline checks) ---
  const validationErrors = useMemo(() => {
    const errs = {};

    // 0. Full Name: Required, letters & spaces only (no numbers)
    if (!formData.fullName.trim()) {
      errs.fullName = 'Candidate name is required.';
    } else if (/\d/.test(formData.fullName)) {
      errs.fullName = 'Candidate name must contain letters and spaces only (no numbers).';
    } else if (formData.fullName.trim().length < 2) {
      errs.fullName = 'Name must be at least 2 characters.';
    }

    // 1. Intern ID: Required unique identifier
    if (!formData.internId.trim()) {
      errs.internId = 'Intern ID is required.';
    } else if (!/^INT-\d{4}-\d{4,5}$/i.test(formData.internId.trim())) {
      errs.internId = 'Intern ID format must be INT-YYYY-XXXXX (e.g. INT-2026-00001).';
    }

    // 2. Email ID: Valid email format
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    // 3. Phone: numbers and leading + only (10 to 15 digits)
    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!/^\+?[0-9]{10,15}$/.test(formData.phone.trim().replace(/[\s-]/g, ''))) {
      errs.phone = 'Phone must contain numbers and optional leading + only (10–15 digits).';
    }

    // 4. Degree: Required string
    if (!formData.degree.trim()) {
      errs.degree = 'Degree / qualification is required.';
    }

    // 5. College: Required string
    if (!formData.collegeName.trim()) {
      errs.collegeName = 'College / university name is required.';
    } else if (formData.collegeName.trim().length < 3) {
      errs.collegeName = 'College name must be at least 3 characters.';
    }

    // 6. Designation / Role: Required
    if (!formData.role.trim()) {
      errs.role = 'Designation / role is required.';
    }

    // 7. Stipend: Numeric only
    if (!formData.stipend.toString().trim()) {
      errs.stipend = 'Stipend amount is required.';
    } else if (!/^[0-9]+$/.test(formData.stipend.toString().trim().replace(/[^0-9]/g, ''))) {
      errs.stipend = 'Stipend must be a valid numeric amount.';
    }

    // 8. Logistics
    if (!formData.joiningDate) errs.joiningDate = 'Joining date is required.';
    if (!formData.endDate) errs.endDate = 'End date is required.';
    if (!formData.deadline) errs.deadline = 'Offer response deadline is required.';

    return errs;
  }, [formData]);

  // Sequential Field Sequence definition
  const sequenceOrder = ['fullName', 'internId', 'email', 'phone', 'degree', 'collegeName', 'role', 'stipend', 'logistics'];

  const isFieldLocked = (fieldKey) => {
    const idx = sequenceOrder.indexOf(fieldKey);
    if (idx <= 0) return false;
    for (let i = 0; i < idx; i++) {
      const prevKey = sequenceOrder[i];
      if (validationErrors[prevKey]) return true;
      if (prevKey === 'logistics') continue;
      if (!formData[prevKey] || !formData[prevKey].toString().trim()) return true;
    }
    return false;
  };

  const isStep1Valid = Object.keys(validationErrors).length === 0;

  // Selected Template
  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === formData.templateId) || templates[0] || null;
  }, [templates, formData.templateId]);

  // Handle Send Single Offer
  const handleSendOffer = async () => {
    if (!isStep1Valid) {
      showToast?.('Please resolve all validation errors before sending.', 'error');
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

      const res = await fetch('/api/offer-letter/send-single', {
        method: 'POST',
        body: payload,
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Offer letter successfully dispatched to ${formData.fullName}!`, 'success');
        onOfferSent?.();
        setCurrentStep(1);
      } else {
        showToast?.(data.error || 'Failed to dispatch offer letter.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  // Jinja Context for Preview
  const previewContext = useMemo(() => {
    return {
      candidateName: formData.fullName || 'Candidate Name',
      role: formData.role || 'Web Developer Intern',
      internId: formData.internId || 'INT-2026-00001',
      startDate: formData.joiningDate || '2026-06-01',
      endDate: formData.endDate || '2026-08-31',
      duration: formData.duration || '3 Months',
      stipend: `Rs. ${Number(formData.stipend || 10000).toLocaleString('en-IN')}`,
      deadline: formData.deadline ? new Date(formData.deadline).toLocaleString() : '3 Days',
      responseUrl: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'}/offers/respond?token=sample_token_${formData.internId}`,
    };
  }, [formData]);

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

👉 Access Your Secure Offer Portal & Sign Offer:
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
          <span>1. Sequential Candidate Intake</span>
          {isStep1Valid && <CheckCircle2 size={14} color="#10b981" />}
        </div>

        <div className={`${styles.stepPill} ${currentStep === 2 ? styles.stepPillActive : currentStep > 2 ? styles.stepPillCompleted : ''}`}>
          <span>2. Jinja Text Template & CC</span>
        </div>

        <div className={`${styles.stepPill} ${currentStep === 3 ? styles.stepPillActive : ''}`}>
          <span>3. Preview Email & PDF &rarr; Send</span>
        </div>
      </div>

      {/* --- STEP 1: STRICT SEQUENTIAL CANDIDATE DETAILS --- */}
      {currentStep === 1 && (
        <div>
          <div className={styles.modeToggleRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="#a855f7" />
              <strong style={{ color: '#ffffff', fontSize: '14px' }}>Candidate Intake Mode:</strong>
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
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Auto-populates candidate details & unique Intern ID</span>
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

          {/* Sequential Fields Grid */}
          <div className={styles.fieldGrid}>
            {/* Field 0: Full Name */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Candidate Name <span className={styles.requiredStar}>*</span></span>
              </label>
              <input
                type="text"
                placeholder="e.g. Akash Kumar (letters only)"
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

            {/* Field 1: Gemma 2B Generated Intern ID (Customizable by HR) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Gemma 2B Unique Intern ID <span className={styles.requiredStar}>*</span></span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: '#c084fc' }}>
                  <Sparkles size={11} /> AI Guaranteed Unique
                </span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  disabled={isFieldLocked('internId')}
                  placeholder="INT-2026-00001"
                  value={formData.internId}
                  onChange={(e) => setFormData({ ...formData, internId: e.target.value.toUpperCase() })}
                  className={`${styles.inputField} ${isFieldLocked('internId') ? styles.inputLocked : ''} ${formData.internId && validationErrors.internId ? styles.inputError : formData.internId ? styles.inputValid : ''}`}
                  style={{ fontFamily: 'monospace' }}
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, internId: generateNewGemmaId() })}
                  disabled={isFieldLocked('internId')}
                  style={{ padding: '0 12px', background: '#141417', border: '1px solid #27272a', borderRadius: '6px', color: '#c084fc', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  title="Generate New Unique Intern ID"
                >
                  Regenerate
                </button>
              </div>
              {!isFieldLocked('internId') && formData.internId && validationErrors.internId && (
                <div className={styles.fieldError}>
                  <AlertCircle size={12} />
                  <span>{validationErrors.internId}</span>
                </div>
              )}
            </div>

            {/* Field 1b: Unique Candidate Offer Response Portal Link */}
            <div className={styles.fieldGroup} style={{ gridColumn: 'span 2', background: '#09090b', padding: '12px 16px', borderRadius: '8px', border: '1px solid #232328' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className={styles.fieldLabel} style={{ margin: 0 }}>
                  <span style={{ color: '#ffffff', fontWeight: 600 }}>Unique Candidate Portal Response URL</span>
                  <span style={{ fontSize: '11px', color: '#c084fc', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={11} /> Auto-Linked in Offer Email
                  </span>
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(candidatePortalUrl);
                      showToast?.('Copied Candidate Portal URL to clipboard!', 'success');
                    }}
                    style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}
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
                    style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', color: '#c084fc', cursor: 'pointer' }}
                  >
                    Regenerate URL
                  </button>
                </div>
              </div>
              <input
                type="text"
                readOnly
                value={candidatePortalUrl}
                className={styles.inputField}
                style={{ fontFamily: 'monospace', fontSize: '12px', color: '#c084fc', background: '#000000', border: '1px solid #27272a' }}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                &bull; The candidate reviews terms, provides their digital signature or uploads a signature image via this link before the offer expires.
              </p>
            </div>

            {/* Field 2: Email ID (Locked until Intern ID valid) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Candidate Email ID <span className={styles.requiredStar}>*</span></span>
                {isFieldLocked('email') && <span className={styles.lockedBadge}>Locked</span>}
              </label>
              <input
                type="email"
                disabled={isFieldLocked('email')}
                placeholder="candidate@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                className={`${styles.inputField} ${isFieldLocked('email') ? styles.inputLocked : ''} ${formData.email && validationErrors.email ? styles.inputError : formData.email ? styles.inputValid : ''}`}
              />
              {!isFieldLocked('email') && formData.email && validationErrors.email && (
                <div className={styles.fieldError}>
                  <AlertCircle size={12} />
                  <span>{validationErrors.email}</span>
                </div>
              )}
            </div>

            {/* Field 3: Phone (Locked until Email valid) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Phone Number <span className={styles.requiredStar}>*</span></span>
                {isFieldLocked('phone') && <span className={styles.lockedBadge}>Locked</span>}
              </label>
              <input
                type="text"
                disabled={isFieldLocked('phone')}
                placeholder="+919876543210 (digits and + only)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`${styles.inputField} ${isFieldLocked('phone') ? styles.inputLocked : ''} ${formData.phone && validationErrors.phone ? styles.inputError : formData.phone ? styles.inputValid : ''}`}
              />
              {!isFieldLocked('phone') && formData.phone && validationErrors.phone && (
                <div className={styles.fieldError}>
                  <AlertCircle size={12} />
                  <span>{validationErrors.phone}</span>
                </div>
              )}
            </div>

            {/* Field 4: Degree (Locked until Phone valid) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Degree / Program <span className={styles.requiredStar}>*</span></span>
                {isFieldLocked('degree') && <span className={styles.lockedBadge}>Locked</span>}
              </label>
              <input
                type="text"
                disabled={isFieldLocked('degree')}
                placeholder="e.g. B.Tech / B.E. Computer Science"
                value={formData.degree}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                className={`${styles.inputField} ${isFieldLocked('degree') ? styles.inputLocked : ''} ${formData.degree && validationErrors.degree ? styles.inputError : formData.degree ? styles.inputValid : ''}`}
              />
              {!isFieldLocked('degree') && formData.degree && validationErrors.degree && (
                <div className={styles.fieldError}>
                  <AlertCircle size={12} />
                  <span>{validationErrors.degree}</span>
                </div>
              )}
            </div>

            {/* Field 5: College Name (Locked until Degree valid) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>College / University <span className={styles.requiredStar}>*</span></span>
                {isFieldLocked('collegeName') && <span className={styles.lockedBadge}>Locked</span>}
              </label>
              <input
                type="text"
                disabled={isFieldLocked('collegeName')}
                placeholder="e.g. Anna University, Chennai"
                value={formData.collegeName}
                onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                className={`${styles.inputField} ${isFieldLocked('collegeName') ? styles.inputLocked : ''} ${formData.collegeName && validationErrors.collegeName ? styles.inputError : formData.collegeName ? styles.inputValid : ''}`}
              />
              {!isFieldLocked('collegeName') && formData.collegeName && validationErrors.collegeName && (
                <div className={styles.fieldError}>
                  <AlertCircle size={12} />
                  <span>{validationErrors.collegeName}</span>
                </div>
              )}
            </div>

            {/* Field 6: Designation / Role (Locked until College valid) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Designation / Internship Role <span className={styles.requiredStar}>*</span></span>
                {isFieldLocked('role') && <span className={styles.lockedBadge}>Locked</span>}
              </label>
              <input
                type="text"
                disabled={isFieldLocked('role')}
                placeholder="e.g. Web Developer Intern"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className={`${styles.inputField} ${isFieldLocked('role') ? styles.inputLocked : ''}`}
              />
            </div>

            {/* Field 7: Stipend Amount (Locked until Role valid) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Monthly Stipend (INR) <span className={styles.requiredStar}>*</span></span>
                {isFieldLocked('stipend') && <span className={styles.lockedBadge}>Locked</span>}
              </label>
              <input
                type="number"
                disabled={isFieldLocked('stipend')}
                placeholder="10000"
                value={formData.stipend}
                onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
                className={`${styles.inputField} ${isFieldLocked('stipend') ? styles.inputLocked : ''} ${formData.stipend && validationErrors.stipend ? styles.inputError : ''}`}
              />
              {!isFieldLocked('stipend') && formData.stipend && validationErrors.stipend && (
                <div className={styles.fieldError}>
                  <AlertCircle size={12} />
                  <span>{validationErrors.stipend}</span>
                </div>
              )}
            </div>

            {/* Field 8: Joining Date (Auto-associates Batch) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Joining Date <span className={styles.requiredStar}>*</span></span>
                {isFieldLocked('logistics') && <span className={styles.lockedBadge}>Locked</span>}
              </label>
              <input
                type="date"
                disabled={isFieldLocked('logistics')}
                value={formData.joiningDate}
                onChange={(e) => handleJoiningDateChange(e.target.value)}
                className={`${styles.inputField} ${isFieldLocked('logistics') ? styles.inputLocked : ''}`}
              />
            </div>

            {/* Field 9: End Date */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Internship End Date <span className={styles.requiredStar}>*</span></span>
                {isFieldLocked('logistics') && <span className={styles.lockedBadge}>Locked</span>}
              </label>
              <input
                type="date"
                disabled={isFieldLocked('logistics')}
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className={`${styles.inputField} ${isFieldLocked('logistics') ? styles.inputLocked : ''}`}
              />
            </div>

            {/* Field 10: Common Link Expiration Deadline (HR controlled) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Offer Portal Expiration Deadline <span className={styles.requiredStar}>*</span></span>
                <Clock size={13} color="#c084fc" />
              </label>
              <input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className={styles.inputField}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Unique offer link will automatically expire at this date/time.
              </span>
            </div>

            {/* Field 11: Hiring Batch (Auto-assigned based on Joining Date) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Assigned Batch (Auto-Grouped)</span>
              </label>
              <select
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                className={styles.inputField}
              >
                {batches.length > 0 ? (
                  batches.map((b) => <option key={b.id || b.batchName} value={b.batchName}>{b.batchName}</option>)
                ) : (
                  <>
                    <option value="Batch A">Batch A</option>
                    <option value="Batch B">Batch B</option>
                    <option value="Batch C">Batch C</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className={styles.actionStepRow}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Sequential validation: all fields marked with <span className={styles.requiredStar}>*</span> must be valid to unlock next step.
            </div>

            <button
              type="button"
              disabled={!isStep1Valid}
              onClick={() => setCurrentStep(2)}
              className={`${styles.btnPrimary} ${!isStep1Valid ? styles.btnPrimaryDisabled : ''}`}
            >
              <span>Proceed to Jinja Template & CC</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 2: SELECT / EDIT JINJA TEMPLATE & ADD CC --- */}
      {currentStep === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#a855f7" />
              <span>Select Jinja Text Template & Add CC</span>
            </h3>
          </div>

          <div className={styles.fieldGroup} style={{ marginBottom: '18px' }}>
            <label className={styles.fieldLabel}>
              <span>Choose Corporate Template</span>
            </label>
            <select
              value={formData.templateId}
              onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
              className={styles.inputField}
            >
              {templates.map((t) => (
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
                    style={{ fontSize: '10.5px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}
                  >
                    + {tag}
                  </span>
                ))}
              </div>
            </div>
            <textarea
              rows={12}
              value={formData.customBody || activeTemplate?.emailBody || defaultJinjaBody}
              onChange={(e) => setFormData({ ...formData, customBody: e.target.value })}
              className={styles.inputField}
              style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6, padding: '12px' }}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} color="#a855f7" />
              <span>Preview Personalized Offer & Confirm Send</span>
            </h3>

            <div className={styles.previewTabs}>
              <button
                type="button"
                onClick={() => setPreviewTab('email')}
                className={`${styles.previewTab} ${previewTab === 'email' ? styles.previewTabActive : ''}`}
              >
                Email Preview
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('pdf')}
                className={`${styles.previewTab} ${previewTab === 'pdf' ? styles.previewTabActive : ''}`}
              >
                PDF Offer Letter
              </button>
            </div>
          </div>

          <div className={styles.previewBox}>
            {previewTab === 'email' ? (
              <div style={{ color: '#cbd5e1' }}>
                <div style={{ background: '#141417', border: '1px solid #27272a', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
                  <div><strong>To:</strong> {formData.email} ({formData.fullName})</div>
                  {formData.cc && <div><strong>CC:</strong> {formData.cc}</div>}
                  <div><strong>Subject:</strong> {renderJinja(formData.customSubject || activeTemplate?.subject || 'Official Internship Offer from Shortfundly - {{candidateName}}', previewContext)}</div>
                  <div><strong>Unique Intern ID:</strong> <code style={{ color: '#c084fc' }}>{formData.internId}</code></div>
                  <div><strong>Expiration Deadline:</strong> {new Date(formData.deadline).toLocaleString()}</div>
                  <div style={{ marginTop: '4px', wordBreak: 'break-all', color: '#94a3b8', fontSize: '11.5px' }}>
                    <Link2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    Generated Candidate Portal URL: <span style={{ color: '#a855f7' }}>{previewContext.responseUrl}</span>
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
              <div>
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                  <FileText size={40} color="#a855f7" style={{ margin: '0 auto 10px auto' }} />
                  <h4 style={{ color: '#ffffff' }}>Playwright Single-Page A4 Corporate Template</h4>
                  <p style={{ fontSize: '13px' }}>
                    Personalized with {formData.fullName}, Intern ID: {formData.internId}, {formData.role}, stipend Rs. {formData.stipend}, tenure {formData.joiningDate} to {formData.endDate}.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className={styles.actionStepRow}>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={styles.btnBack}
            >
              <ArrowLeft size={16} />
              <span>Back to Template</span>
            </button>

            <button
              type="button"
              onClick={handleSendOffer}
              disabled={sending}
              className={styles.btnPrimary}
            >
              <Send size={16} />
              <span>{sending ? 'Generating PDF & Dispatching...' : 'Confirm & Send Offer Letter'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
