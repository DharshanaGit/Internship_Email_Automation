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
  Clock
} from 'lucide-react';

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
    candidateId: '',
    internId: '',
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

  // Set default deadline to 3 days from now
  useEffect(() => {
    const defaultDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const formatted = defaultDate.toISOString().slice(0, 16);
    setFormData((prev) => ({
      ...prev,
      deadline: prev.deadline || formatted,
      templateId: prev.templateId || (templates[0]?.id || ''),
    }));
  }, [templates]);

  // When selecting candidate from DB
  const handleSelectFromDb = (candId) => {
    setSelectedCandidateId(candId);
    const cand = candidates.find((c) => c.id === candId || c.candidateId === candId);
    if (cand) {
      setFormData((prev) => ({
        ...prev,
        fullName: cand.fullName || '',
        candidateId: cand.candidateId || '',
        internId: cand.internId || '',
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
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({
      ...prev,
      candidateId: `SF-INT-2026-${randomNum}`,
      internId: `INT-2026-${String(randomNum).padStart(5, '0')}`,
      fullName: '',
      email: '',
      phone: '',
      degree: '',
      collegeName: '',
      role: 'Web Developer Intern',
      stipend: '10000',
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

    // 1. Candidate ID: Required string
    if (!formData.candidateId.trim()) {
      errs.candidateId = 'Candidate ID is required.';
    } else if (!/^[A-Z0-9_-]{4,}$/i.test(formData.candidateId.trim())) {
      errs.candidateId = 'Candidate ID must contain letters, numbers, hyphens or underscores (min 4 chars).';
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
  const sequenceOrder = ['fullName', 'candidateId', 'email', 'phone', 'degree', 'collegeName', 'role', 'stipend', 'logistics'];

  const isFieldLocked = (fieldKey) => {
    const idx = sequenceOrder.indexOf(fieldKey);
    if (idx <= 0) return false;
    // Check if any previous field has an error or is empty
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
      payload.append('candidateId', formData.candidateId);
      payload.append('fullName', formData.fullName);
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
        // Reset or step back
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

  return (
    <div className={styles.formContainer}>
      {/* 1. PROGRESS WORKFLOW STEPPER */}
      <div className={styles.stepIndicator}>
        <div className={`${styles.stepPill} ${currentStep === 1 ? styles.stepPillActive : isStep1Valid ? styles.stepPillCompleted : ''}`}>
          <span>1. Sequential Candidate Intake</span>
          {isStep1Valid && <CheckCircle2 size={14} color="#10b981" />}
        </div>

        <div className={`${styles.stepPill} ${currentStep === 2 ? styles.stepPillActive : currentStep > 2 ? styles.stepPillCompleted : ''}`}>
          <span>2. Select / Customize Template & CC</span>
        </div>

        <div className={`${styles.stepPill} ${currentStep === 3 ? styles.stepPillActive : ''}`}>
          <span>3. Preview Email & PDF $\rightarrow$ Send</span>
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

          {/* Rules Banner for Manual Entry Option */}
          {intakeMode === 'manual' && (
            <div className={styles.rulesCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Info size={16} color="#c084fc" />
                <strong style={{ color: '#e9d5ff', fontSize: '13px' }}>Candidate ID Creation Rules for HR:</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '12px', lineHeight: 1.6 }}>
                <li>Format must follow: <code>SF-INT-YYYY-XXXX</code> or <code>INT-YYYY-XXXXX</code>.</li>
                <li>Must contain uppercase letters, hyphens, and digits only (no spaces or special symbols).</li>
                <li>Enforce uniqueness before dispatch to prevent duplicate candidate records.</li>
              </ul>
            </div>
          )}

          {/* Database Selector Dropdown */}
          {intakeMode === 'database' && (
            <div className={styles.fieldGroup} style={{ marginBottom: '20px' }}>
              <label className={styles.fieldLabel}>
                <span>Select Existing Candidate Record <span className={styles.requiredStar}>*</span></span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Auto-populates unique Candidate ID & Details</span>
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

            {/* Field 1: Candidate ID (Sequential: locked until Name valid) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Candidate ID <span className={styles.requiredStar}>*</span></span>
                {isFieldLocked('candidateId') && <span className={styles.lockedBadge}>Locked</span>}
              </label>
              <input
                type="text"
                disabled={isFieldLocked('candidateId')}
                placeholder="e.g. SF-INT-2026-1001"
                value={formData.candidateId}
                onChange={(e) => setFormData({ ...formData, candidateId: e.target.value.toUpperCase() })}
                className={`${styles.inputField} ${isFieldLocked('candidateId') ? styles.inputLocked : ''} ${formData.candidateId && validationErrors.candidateId ? styles.inputError : formData.candidateId ? styles.inputValid : ''}`}
              />
              {!isFieldLocked('candidateId') && formData.candidateId && validationErrors.candidateId && (
                <div className={styles.fieldError}>
                  <AlertCircle size={12} />
                  <span>{validationErrors.candidateId}</span>
                </div>
              )}
            </div>

            {/* Field 2: Email ID (Locked until Candidate ID valid) */}
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

            {/* Field 8: Joining Date */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Joining Date <span className={styles.requiredStar}>*</span></span>
                {isFieldLocked('logistics') && <span className={styles.lockedBadge}>Locked</span>}
              </label>
              <input
                type="date"
                disabled={isFieldLocked('logistics')}
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
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

            {/* Field 11: Hiring Batch */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Assigned Batch</span>
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
              <span>Proceed to Template & CC</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 2: SELECT / EDIT TEMPLATE & ADD CC --- */}
      {currentStep === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#a855f7" />
              <span>Select Offer Letter Template & Add CC</span>
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
              <span>Email Subject</span>
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
                <div style={{ background: '#181524', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px' }}>
                  <div><strong>To:</strong> {formData.email} ({formData.fullName})</div>
                  {formData.cc && <div><strong>CC:</strong> {formData.cc}</div>}
                  <div><strong>Subject:</strong> Official Internship Offer from Shortfundly - {formData.fullName}</div>
                  <div><strong>Deadline:</strong> {new Date(formData.deadline).toLocaleString()}</div>
                </div>

                <div style={{ background: '#ffffff', color: '#1e293b', padding: '24px', borderRadius: '8px', lineHeight: 1.6 }}>
                  <p>Dear <strong>{formData.fullName}</strong>,</p>
                  <p>Congratulations! We are thrilled to offer you the position of <strong>{formData.role}</strong> at Shortfundly.</p>
                  <div style={{ background: '#f5f3ff', borderLeft: '4px solid #a855f7', padding: '12px 16px', margin: '14px 0' }}>
                    <p style={{ margin: '4px 0' }}>• <strong>Role:</strong> {formData.role}</p>
                    <p style={{ margin: '4px 0' }}>• <strong>Start Date:</strong> {formData.joiningDate}</p>
                    <p style={{ margin: '4px 0' }}>• <strong>Duration:</strong> {formData.duration}</p>
                    <p style={{ margin: '4px 0' }}>• <strong>Stipend:</strong> Rs. {Number(formData.stipend).toLocaleString('en-IN')}</p>
                    <p style={{ margin: '4px 0' }}>• <strong>Location:</strong> Online - Remote</p>
                  </div>
                  <p>To review the formal offer letter PDF and record your digital signature, access your portal link:</p>
                  <div style={{ textAlign: 'center', margin: '18px 0' }}>
                    <span style={{ display: 'inline-block', background: '#9333ea', color: '#fff', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold' }}>
                      👉 Access Your Secure Offer Portal & Sign Offer
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    Attachment: <code>Offer_Letter_{(formData.fullName || 'Candidate').replace(/\s+/g, '_')}.pdf</code>
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                  <FileText size={40} color="#a855f7" style={{ margin: '0 auto 10px auto' }} />
                  <h4>Playwright Single-Page A4 Corporate Template</h4>
                  <p style={{ fontSize: '13px' }}>
                    Personalized with {formData.fullName}, {formData.role}, stipend Rs. {formData.stipend}, tenure {formData.joiningDate} to {formData.endDate}.
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
