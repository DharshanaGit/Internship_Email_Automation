'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import {
  Send,
  Users,
  Calendar,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Paperclip,
  Upload,
  Eye,
  RefreshCw,
  LogOut,
  Search,
  CheckSquare,
  Square,
  X,
  UserCheck,
  Shield,
  Sparkles,
  ExternalLink,
  Clock,
  Video,
  Award,
  Settings,
  Mail,
  Filter,
  ArrowRight,
  Sliders,
  FileText,
  Trash2,
} from 'lucide-react';
import { generateGemmaTask, generateGemmaFeedback } from '@/lib/gemmaEngine';
import { formatToDdMmYy, getRandomIstTime, getExplanationSchedule } from '@/lib/dateUtils';
import { generateGoogleMeetLink } from '@/lib/googleCalendar';

export default function DashboardPage() {
  const router = useRouter();

  // Navigation State
  // Strictly: 'offer-letter' | 'tasks' | 'reviews' | 'certificates' | 'emails' | 'settings'
  const [activeTab, setActiveTab] = useState('offer-letter');

  // Sub-tabs
  const [offerSubTab, setOfferSubTab] = useState('single'); // 'single' | 'bulk'
  const [taskSubTab, setTaskSubTab] = useState('bulk'); // 'bulk' | 'single'
  const [reviewSubTab, setReviewSubTab] = useState('auto'); // 'auto' | 'manual'
  const [certSubTab, setCertSubTab] = useState('bulk'); // 'bulk' | 'single'

  // Admin Profile & Role
  const [adminUser, setAdminUser] = useState({
    name: 'System Administrator',
    email: 'admin@shortfundly.com',
    role: 'ADMIN',
  });
  const [profileModal, setProfileModal] = useState(false);

  // Real Database Statistics
  const [stats, setStats] = useState({
    totalCandidates: 0,
    offerLetters: { sent: 0, failed: 0, waiting: 0, queued: 0, delivered: 0, total: 0 },
    tasks: { notAssigned: 0, inProgress: 0, underReview: 0, completed: 0, total: 0 },
    emails: { total: 0, delivered: 0, failed: 0, sent: 0 },
    recentActivity: [],
  });

  // Candidate Data & Email Logs from DB
  const [candidates, setCandidates] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);

  // Settings State
  const [sysSettings, setSysSettings] = useState({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: 'dharshana.shortfundly@gmail.com',
    hasPassword: true,
    senderEmail: 'hr@shortfundly.com',
    senderName: 'Shortfundly HR Team',
    adminRole: 'ADMIN',
    defaultMeetLinkPrefix: 'https://meet.google.com',
    simulationMode: false,
  });

  // Toast Notification State
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // --- MODULE 1 (OFFER LETTER): SINGLE SENDER STATE ---
  const [singleCandidateSource, setSingleCandidateSource] = useState('existing'); // 'existing' | 'manual'
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [recentOfferCandidate, setRecentOfferCandidate] = useState(null);
  const [singleOfferForm, setSingleOfferForm] = useState({
    candidateId: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'Web Developer Intern',
    department: 'Engineering',
    collegeName: '',
    degree: 'B.Tech / B.E.',
    joiningDate: '2026-06-01',
    endDate: '2026-08-31',
    duration: '3 Months',
    workMode: 'Online - Remote',
    reportingManager: 'Priyanka Nair',
    assignedMentor: 'Rahul Kapoor',
    stipend: 'Rs. 10,000',
    cc: '',
    subject: '',
    body: '',
  });
  const [singleOfferFiles, setSingleOfferFiles] = useState([]);
  const [singleOfferSending, setSingleOfferSending] = useState(false);

  // --- MODULE 1 (OFFER LETTER): BULK SPREADSHEET STATE ---
  const [bulkValidationReport, setBulkValidationReport] = useState(null);
  const [bulkTableSearch, setBulkTableSearch] = useState('');
  const [bulkTableRoleFilter, setBulkTableRoleFilter] = useState('ALL');
  const [selectedCandidateKeys, setSelectedCandidateKeys] = useState(new Set());
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);
  const [bulkCustomSubject, setBulkCustomSubject] = useState('');
  const [bulkCustomBody, setBulkCustomBody] = useState('');
  const [bulkCustomCc, setBulkCustomCc] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, status: '' });
  const [bulkDispatchResults, setBulkDispatchResults] = useState(null);

  // --- PREVIEW MODAL STATE (GMAIL STYLE SPLIT EMAIL & PDF) ---
  const [previewModal, setPreviewModal] = useState({
    open: false,
    candidate: null,
    to: '',
    cc: '',
    subject: '',
    emailHtml: '',
    letterHtml: '',
    attachments: [],
    loading: false,
  });

  // --- MODULE 2 (ASSIGN TASK): STATE ---
  const [bulkTaskRoleFilter, setBulkTaskRoleFilter] = useState('ALL');
  const [bulkTaskSelectedKeys, setBulkTaskSelectedKeys] = useState(new Set());
  const [bulkTaskExpDate, setBulkTaskExpDate] = useState(() => formatToDdMmYy(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)));
  const [bulkTaskSending, setBulkTaskSending] = useState(false);
  const [bulkTaskCc, setBulkTaskCc] = useState('');
  const [bulkTaskSubject, setBulkTaskSubject] = useState('');
  const [bulkTaskBody, setBulkTaskBody] = useState('');
  const [singleTaskForm, setSingleTaskForm] = useState({
    candidateId: '',
    candidateName: '',
    email: '',
    role: 'Web Developer Intern',
    title: '',
    description: '',
    explanationDate: formatToDdMmYy(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
    explanationTime: '11:00 AM IST',
    meetLink: generateGoogleMeetLink(),
    cc: '',
    customSubject: '',
    customBody: '',
  });
  const [singleTaskSending, setSingleTaskSending] = useState(false);
  const [meetGenerating, setMeetGenerating] = useState(false);

  // --- MODULE 3 (REVIEWS): STATE ---
  const [reviewModal, setReviewModal] = useState({
    open: false,
    task: null,
    feedback: '',
    isComplete: false,
    cc: '',
    customSubject: '',
    customBody: '',
  });

  const [manualReviewForm, setManualReviewForm] = useState({
    candidateId: '',
    candidateName: '',
    email: '',
    role: 'Web Developer Intern',
    reviewType: 'review_1',
    reviewTitle: 'Milestone Sprint Review 1',
    reviewDate: formatToDdMmYy(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
    reviewTime: '11:00 AM IST',
    meetLink: generateGoogleMeetLink(),
    feedbackNotes: '',
    isTaskComplete: false,
    cc: '',
    customSubject: '',
    customBody: '',
  });
  const [manualReviewSending, setManualReviewSending] = useState(false);

  // Bulk Review 2 State (Manual Feedback per candidate)
  const [bulkReview2Feedbacks, setBulkReview2Feedbacks] = useState({});
  const [bulkReview2Dates, setBulkReview2Dates] = useState({});
  const [bulkReview2SelectedKeys, setBulkReview2SelectedKeys] = useState(new Set());
  const [bulkReview2Sending, setBulkReview2Sending] = useState(false);
  const [bulkReview2Cc, setBulkReview2Cc] = useState('');
  const [bulkReview2Subject, setBulkReview2Subject] = useState('');
  const [bulkReview2CustomMessage, setBulkReview2CustomMessage] = useState('');

  // Automated Review 1 Batch Customization
  const [autoReview1Cc, setAutoReview1Cc] = useState('');
  const [autoReview1Subject, setAutoReview1Subject] = useState('');
  const [autoReview1CustomBody, setAutoReview1CustomBody] = useState('');

  // --- MODULE 5 (CERTIFICATES): STATE ---
  const [certCandidateId, setCertCandidateId] = useState('');
  const [singleCertForm, setSingleCertForm] = useState({
    fullName: '',
    email: '',
    role: 'Web Developer Intern',
    issueDate: new Date().toISOString().split('T')[0],
    cc: '',
    customSubject: '',
    customBody: '',
  });
  const [certSending, setCertSending] = useState(false);
  const [bulkCertSelectedKeys, setBulkCertSelectedKeys] = useState(new Set());
  const [bulkCertSending, setBulkCertSending] = useState(false);
  const [bulkCertCc, setBulkCertCc] = useState('');
  const [bulkCertSubject, setBulkCertSubject] = useState('');
  const [bulkCertBody, setBulkCertBody] = useState('');

  // --- MODULE 6 (TRACK EMAILS): FILTER STATE ---
  const [emailSearch, setEmailSearch] = useState('');
  const [emailTypeFilter, setEmailTypeFilter] = useState('ALL');
  const [emailStatusFilter, setEmailStatusFilter] = useState('ALL');

  // 1. DATA LOADERS
  const loadUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setAdminUser({
          id: data.user.id,
          name: data.user.name || 'Admin',
          email: data.user.email,
          role: data.user.role,
        });
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Error loading session:', err);
      router.push('/login');
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/overview/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadCandidates = async () => {
    try {
      const res = await fetch(`/api/candidates?limit=200`);
      const data = await res.json();
      if (data.success) {
        setCandidates(data.data);
      }
    } catch (err) {
      console.error('Error loading candidates:', err);
    }
  };

  const loadEmails = async () => {
    try {
      const res = await fetch('/api/emails?limit=100');
      const data = await res.json();
      if (data.success) {
        setEmailLogs(data.data);
      }
    } catch (err) {
      console.error('Error loading email logs:', err);
    }
  };

  const handleDeleteEmailLog = async (logId) => {
    if (!confirm('Are you sure you want to delete this email log record?')) return;
    try {
      const res = await fetch(`/api/emails?id=${logId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Email log deleted successfully', 'success');
        setEmailLogs((prev) => prev.filter((item) => item.id !== logId));
      } else {
        showToast(data.error || 'Failed to delete email log', 'error');
      }
    } catch (e) {
      showToast('Error deleting email log', 'error');
    }
  };

  const handleClearAllEmailLogs = async () => {
    if (!confirm('Are you sure you want to clear all email tracking history?')) return;
    try {
      const res = await fetch('/api/emails?all=true', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('All email logs cleared successfully', 'success');
        setEmailLogs([]);
      } else {
        showToast(data.error || 'Failed to clear email logs', 'error');
      }
    } catch (e) {
      showToast('Error clearing email logs', 'error');
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSysSettings(data.data);
      }
    } catch (err) {}
  };

  // Real-time SQLite Queue Stats & Cron Loading State
  const [queueStats, setQueueStats] = useState({ pending: 0, processing: 0, completed: 0, failed: 0, total: 0 });
  const [cronLoading, setCronLoading] = useState(false);

  const loadQueueStats = async () => {
    try {
      const res = await fetch('/api/queue/status');
      const data = await res.json();
      if (data.success && data.stats) {
        setQueueStats(data.stats);
        if (data.stats.pending > 0 || data.stats.processing > 0) {
          loadStats();
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    loadUser();
    loadStats();
    loadCandidates();
    loadEmails();
    loadSettings();
    loadQueueStats();

    const interval = setInterval(() => {
      loadQueueStats();
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleRunReviewCron = async () => {
    setCronLoading(true);
    try {
      const res = await fetch('/api/cron/process-reviews', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Review pipeline executed! Scheduled ${data.scheduledCount} milestone review(s).`, 'success');
        loadCandidates();
        loadStats();
      } else {
        showToast(data.error || 'Failed to run review cron', 'error');
      }
    } catch (err) {
      showToast('Cron execution failed: ' + err.message, 'error');
    } finally {
      setCronLoading(false);
    }
  };

  // Persona Role Switching
  const handleRoleSwitch = async (newRole) => {
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminUser((prev) => ({ ...prev, role: newRole }));
        showToast(`Active persona switched to ${newRole}`, 'success');
      }
    } catch (err) {
      console.error('Role switch failed:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {}
    window.location.href = '/';
  };

  // --- MODULE 1: SINGLE CANDIDATE SELECTION ---
  const handleSelectExistingCandidate = (candId) => {
    setSelectedCandidateId(candId);
    if (!candId) {
      setSingleOfferForm({
        candidateId: '',
        fullName: '',
        email: '',
        phone: '',
        role: 'Web Developer Intern',
        department: 'Engineering',
        collegeName: '',
        degree: 'B.Tech / B.E.',
        stipend: 'Rs. 10,000',
        joiningDate: '2026-06-01',
        endDate: '2026-08-31',
        duration: '3 Months',
        workMode: 'Online - Remote',
        reportingManager: 'Priyanka Nair',
        assignedMentor: 'Rahul Kapoor',
        cc: '',
        subject: '',
        body: '',
      });
      return;
    }
    const cand = candidates.find((c) => c.id === candId);
    if (cand) {
      setSingleOfferForm({
        candidateId: cand.id,
        fullName: cand.fullName || '',
        email: cand.email || '',
        phone: cand.phone || '',
        role: cand.role || 'Web Developer Intern',
        department: cand.department || 'Engineering',
        collegeName: cand.collegeName || '',
        degree: cand.degree || 'B.Tech / B.E.',
        joiningDate: cand.joiningDate || '2026-06-01',
        endDate: cand.endDate || '2026-08-31',
        duration: cand.duration || '3 Months',
        workMode: cand.workMode || 'Online - Remote',
        reportingManager: cand.reportingManager || 'Priyanka Nair',
        assignedMentor: cand.assignedMentor || 'Rahul Kapoor',
        stipend: cand.stipend || 'Rs. 10,000',
        cc: '',
        subject: `Internship Offer Letter - ${cand.fullName || ''} (${cand.candidateId || ''}) | Shortfundly`,
        body: '',
      });
    }
  };

  // --- MODULE 1: PREVIEW TRIGGER ---
  const triggerOfferPreview = async (candidateData, customSub = '', customBdy = '') => {
    if (
      !candidateData.fullName?.trim() ||
      !candidateData.email?.trim() ||
      !candidateData.role?.trim() ||
      !candidateData.joiningDate ||
      !candidateData.endDate
    ) {
      showToast('Validation Error: Candidate Name, Designation, Joining Date, Ending Date, and Mail ID are required before preview.', 'error');
      return;
    }

    try {
      setPreviewModal({
        open: true,
        candidate: candidateData,
        subject: 'Generating preview...',
        emailHtml: '<div style="padding: 20px; color: #64748b;">Rendering live preview...</div>',
        letterHtml: '<div style="padding: 20px; color: #64748b;">Rendering A4 PDF document preview...</div>',
        loading: true,
      });

      const res = await fetch('/api/offer-letter/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateData,
          customSubject: customSub || singleOfferForm.subject,
          customBody: customBdy || singleOfferForm.body,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPreviewModal({
          open: true,
          candidate: data.candidate,
          to: `${data.candidate.fullName} <${data.candidate.email}>`,
          cc: candidateData.cc || '',
          subject: data.subject,
          emailHtml: data.emailBodyHtml,
          letterHtml: data.letterHtml,
          attachments: [
            { name: `Offer_Letter_${data.candidate.candidateId || 'SF-2026'}.pdf`, type: 'application/pdf', size: 'A4 Document' },
          ],
          loading: false,
        });
      } else {
        showToast(data.error || 'Failed to generate preview', 'error');
        setPreviewModal((prev) => ({ ...prev, loading: false }));
      }
    } catch (err) {
      showToast('Error rendering preview', 'error');
      setPreviewModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Google Calendar Live Meet Room Generator
  const generateLiveGoogleMeetRoom = async (candName = 'Candidate', candEmail = 'intern@shortfundly.com') => {
    try {
      setMeetGenerating(true);
      showToast('Contacting Google Calendar API (conferenceDataVersion: 1) for live Meet room...', 'info');
      const res = await fetch('/api/meet/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: candName,
          candidateEmail: candEmail,
          callDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        }),
      });
      const data = await res.json();
      if (data.success && data.meetUrl) {
        showToast('Live Google Meet room provisioned successfully!', 'success');
        return data.meetUrl;
      } else {
        showToast(data.error || 'Failed to generate live meet room', 'warning');
        return generateGoogleMeetLink();
      }
    } catch (err) {
      showToast('Could not reach Google Calendar API', 'warning');
      return generateGoogleMeetLink();
    } finally {
      setMeetGenerating(false);
    }
  };

  const triggerReviewPreview = (form) => {
    const candidateName = form.candidateName || form.fullName || 'Candidate';
    const candidateEmail = form.email || 'intern@shortfundly.com';
    const scheduleDate = form.reviewDate || '25.10.26';
    const scheduleTime = form.reviewTime || '11:00 AM IST';
    const scheduleMeetLink = form.meetLink || 'https://meet.google.com/sf-sync';
    const feedbackNotes = form.feedbackNotes || form.feedback || '';
    const isRev1 = form.reviewType === 'review_1' || form.reviewTitle?.toLowerCase().includes('review 1');
    const subject = form.customSubject || `[Shortfundly] ${form.reviewTitle} - ${candidateName} (${form.role || 'Intern'})`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 620px; margin: 0 auto; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #090d16, #1e293b); padding: 26px 24px; text-align: center; border-bottom: 3px solid ${isRev1 ? '#38bdf8' : '#f59e0b'};">
          <h1 style="color: ${isRev1 ? '#38bdf8' : '#fbbf24'}; margin: 0; font-size: 22px; letter-spacing: 1.5px;">SHORTFUNDLY</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">${form.reviewTitle}</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="font-size: 15px;">Dear <strong>${candidateName}</strong>,</p>
          ${form.customBody ? `
          <div style="margin: 16px 0; font-size: 14px; color: #334155; white-space: pre-line;">
            ${form.customBody
              .replace(/{{candidate_name}}/gi, candidateName)
              .replace(/{{designation}}/gi, form.role || 'Intern')
              .replace(/{{review_date}}/gi, scheduleDate)
              .replace(/{{review_time}}/gi, scheduleTime)
              .replace(/{{meet_link}}/gi, scheduleMeetLink)}
          </div>` : `
          <p>${isRev1 ? 'Following your virtual task briefing call, your First Milestone Review has been scheduled:' : 'Your mentor has scheduled an official review session for your milestone sprint evaluation:'}</p>`}
          
          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Session Type:</strong> ${form.reviewTitle}</p>
            <p style="margin: 4px 0;"><strong>Scheduled Date:</strong> ${scheduleDate}</p>
            <p style="margin: 4px 0;"><strong>Time (IST):</strong> ${scheduleTime}</p>
            <p style="margin: 8px 0 0 0;"><strong>Google Meet Link:</strong> <a href="${scheduleMeetLink}" target="_blank" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${scheduleMeetLink}</a></p>
          </div>

          ${!isRev1 && feedbackNotes ? `
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin: 0 0 6px 0; color: #b45309; font-size: 13px;">Mentor Feedback & Review Agenda Notes:</h4>
            <p style="margin: 0; color: #92400e; font-size: 13px; white-space: pre-line;">${feedbackNotes}</p>
          </div>` : ''}

          <p style="font-size: 13px; color: #64748b;">${isRev1 ? 'Please prepare your progress demo and deliverables for evaluation on this call. An official calendar invitation (.ics) is attached.' : 'Please be ready to present your work and code demo. An official RFC-5545 calendar invitation (.ics) is attached.'}</p>
          <p style="margin-top: 24px; font-size: 13px; color: #475569;">Best regards,<br><strong style="color: #0f172a;">Technical Mentorship & HR Team</strong><br>Shortfundly Media Technologies Pvt. Ltd.</p>
        </div>
      </div>
    `;

    setPreviewModal({
      open: true,
      candidate: { fullName: candidateName, role: form.role || 'Intern' },
      to: `${candidateName} <${candidateEmail}>`,
      cc: form.cc || '',
      subject,
      emailHtml,
      letterHtml: `<div style="padding: 30px; font-family: sans-serif; background: #ffffff; color: #0f172a;">
        <h2 style="color: #0284c7;">Scheduled Review Session Details</h2>
        <p>Candidate: <strong>${candidateName}</strong></p>
        <p>Role: <strong>${form.role || 'Intern'}</strong></p>
        <p>Review Date: <strong>${scheduleDate}</strong> at <strong>${scheduleTime}</strong></p>
        <p>Google Meet: <a href="${scheduleMeetLink}" target="_blank" style="color: #2563eb; font-weight: bold;">${scheduleMeetLink}</a></p>
        ${!isRev1 && feedbackNotes ? `
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p><strong>Mentor Feedback & Agenda Notes:</strong></p>
        <p style="background: #f1f5f9; padding: 14px; border-radius: 6px; font-size: 13px;">${feedbackNotes}</p>` : ''}
      </div>`,
      attachments: [
        { name: 'review_session_invitation.ics', type: 'text/calendar', size: 'Synchronized Calendar Event' },
      ],
      loading: false,
    });
  };

  const triggerCertificatePreview = async (form) => {
    const fullName = form.fullName || form.candidateName;
    const email = form.email;
    if (!fullName || !email) {
      showToast('Candidate Name and Mail ID are required for certificate preview.', 'warning');
      return;
    }
    try {
      showToast('Generating Canva-style certificate preview...', 'info');
      const res = await fetch('/api/certificate/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: form.id || form.candidateId,
          candidateData: form,
          customSubject: form.customSubject,
          customBody: form.customBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewModal({
          open: true,
          candidate: data.candidate,
          to: `${fullName} <${email}>`,
          cc: form.cc || '',
          subject: data.subject,
          emailHtml: data.emailHtml,
          letterHtml: data.html,
          attachments: [
            { name: `Certificate_${String(fullName).replace(/\s+/g, '_')}.pdf`, type: 'application/pdf', size: 'Signed Official PDF' },
          ],
          loading: false,
        });
      } else {
        showToast(data.error || 'Failed to generate certificate preview', 'error');
      }
    } catch (e) {
      showToast('Error generating certificate preview', 'error');
    }
  };

  const triggerTaskPreview = async (form) => {
    if (!form.candidateName?.trim() || !form.email?.trim() || !form.role?.trim()) {
      showToast('Candidate Name, Email ID, and Designation are required for preview.', 'error');
      return;
    }
    try {
      showToast('Generating task email preview...', 'info');
      const res = await fetch('/api/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, previewOnly: true }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewModal({
          open: true,
          candidate: { fullName: form.candidateName, role: form.role },
          to: `${form.candidateName} <${form.email}>`,
          cc: form.cc || '',
          subject: data.preview.subject,
          emailHtml: data.preview.html,
          letterHtml: `<div style="padding: 30px; font-family: sans-serif; background: #ffffff; color: #1e293b;">
            <h3 style="color: #2563eb; margin-top: 0;">Virtual Sprint Briefing Call</h3>
            <p><strong>Candidate:</strong> ${form.candidateName} (${form.role})</p>
            <p><strong>Explanation Date:</strong> ${form.explanationDate} at ${form.explanationTime}</p>
            <p><strong>Google Meet Room:</strong> <a href="${form.meetLink}" target="_blank" style="color: #2563eb; font-weight: bold;">${form.meetLink}</a></p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <h4 style="color: #334155; margin-bottom: 6px;">Sprint Task: ${form.title || 'Role Milestone Task'}</h4>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; white-space: pre-wrap; font-size: 13px; color: #334155; line-height: 1.6;">${form.description || ''}</div>
          </div>`,
          attachments: [
            { name: 'briefing_session.ics', type: 'text/calendar', size: 'RFC-5545 Calendar Event' },
          ],
          loading: false,
        });
      } else {
        showToast(data.error || 'Failed to preview task', 'error');
      }
    } catch (e) {
      showToast('Error generating task preview', 'error');
    }
  };

  // --- MODULE 1: SINGLE OFFER DISPATCH WITH NON-NULL VALIDATION & TRANSITION TO ASSIGN TASK ---
  const handleSingleOfferSend = async (e) => {
    e.preventDefault();

    if (
      !singleOfferForm.fullName?.trim() ||
      !singleOfferForm.email?.trim() ||
      !singleOfferForm.role?.trim() ||
      !singleOfferForm.joiningDate ||
      !singleOfferForm.endDate
    ) {
      showToast('Validation Error: Candidate Name, Designation, Joining Date, Ending Date, and Mail ID are required.', 'error');
      return;
    }

    try {
      setSingleOfferSending(true);
      showToast('Compiling personalized Playwright PDF & dispatching via Google SMTP...', 'info');

      const formData = new FormData();
      Object.keys(singleOfferForm).forEach((key) => {
        formData.append(key, singleOfferForm[key]);
      });

      singleOfferFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await fetch('/api/offer-letter/send-single', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Offer letter dispatched to ${data.candidate.fullName}! Candidate is now ready for task assignment.`, 'success');
        setSingleOfferFiles([]);

        // Update local candidates state so they immediately appear in Assign Task
        setCandidates((prev) => {
          const exists = prev.some((c) => c.id === data.candidate.id || c.email === data.candidate.email);
          if (exists) {
            return prev.map((c) =>
              c.id === data.candidate.id || c.email === data.candidate.email
                ? { ...c, offerLetterStatus: 'Sent' }
                : c
            );
          }
          return [{ ...data.candidate, offerLetterStatus: 'Sent' }, ...prev];
        });

        // Pre-configure the single task form with this candidate
        const gemma = generateGemmaTask(data.candidate.role, 0);
        const expSchedule = getExplanationSchedule(new Date());
        setSingleTaskForm({
          candidateId: data.candidate.id,
          candidateName: data.candidate.fullName,
          email: data.candidate.email,
          role: data.candidate.role,
          title: gemma.title,
          description: gemma.description,
          explanationDate: expSchedule.dateStr,
          explanationTime: expSchedule.timeStr,
          meetLink: generateGoogleMeetLink(),
          customSubject: '',
          customBody: '',
        });

        setRecentOfferCandidate(data.candidate);
        loadStats();
        loadEmails();
      } else {
        showToast(data.error || 'Dispatch failed', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Error sending single offer', 'error');
    } finally {
      setSingleOfferSending(false);
    }
  };

  // --- MODULE 1: LOAD PROJECT SPREADSHEET ---
  const handleLoadProjectSampleExcel = async () => {
    try {
      showToast('Parsing Shortfundly_Internship_Candidates_Dummy.xlsx from repository...', 'info');
      const res = await fetch('/api/candidates/load-sample-excel');
      const data = await res.json();
      if (data.success) {
        setBulkValidationReport(data.report);
        const autoSelected = new Set(
          data.report.rows
            .filter((r) => r.isValid && (skipAlreadySent ? r.offerLetterStatus !== 'Sent' : true))
            .map((r) => r.candidateId)
        );
        setSelectedCandidateKeys(autoSelected);
        showToast(`Loaded ${data.report.validCount} candidate records with Joining & Ending dates!`, 'success');
      } else {
        showToast(data.error || 'Failed to load sample dataset', 'error');
      }
    } catch (err) {
      showToast('Error loading dataset', 'error');
    }
  };

  // --- MODULE 1: UPLOAD SPREADSHEET / CSV FILE ---
  const handleBulkFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast(`Ingesting and parsing ${file.name}...`, 'info');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/candidates/validate-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setBulkValidationReport(data.report);
        const autoSelected = new Set(
          data.report.rows
            .filter((r) => r.isValid && (skipAlreadySent ? r.offerLetterStatus !== 'Sent' : true))
            .map((r) => r.candidateId)
        );
        setSelectedCandidateKeys(autoSelected);
        showToast(`Parsed ${data.report.validCount} valid candidates from uploaded file!`, 'success');
      } else {
        showToast(data.error || 'File validation failed', 'error');
      }
    } catch (err) {
      showToast('Error parsing file', 'error');
    }
  };

  // Bulk Filtered Rows
  const filteredBulkRows = bulkValidationReport
    ? bulkValidationReport.rows.filter((r) => {
        const matchesSearch =
          r.fullName?.toLowerCase().includes(bulkTableSearch.toLowerCase()) ||
          r.email?.toLowerCase().includes(bulkTableSearch.toLowerCase()) ||
          r.candidateId?.toLowerCase().includes(bulkTableSearch.toLowerCase());
        const matchesRole = bulkTableRoleFilter === 'ALL' || r.role?.includes(bulkTableRoleFilter);
        return matchesSearch && matchesRole;
      })
    : [];

  const handleSelectAllFiltered = () => {
    const newSet = new Set(selectedCandidateKeys);
    filteredBulkRows.forEach((r) => {
      if (r.isValid) newSet.add(r.candidateId);
    });
    setSelectedCandidateKeys(newSet);
  };

  const handleDeselectAll = () => {
    setSelectedCandidateKeys(new Set());
  };

  const handleToggleRowSelect = (candId) => {
    const newSet = new Set(selectedCandidateKeys);
    if (newSet.has(candId)) newSet.delete(candId);
    else newSet.add(candId);
    setSelectedCandidateKeys(newSet);
  };

  // --- MODULE 1: BULK DISPATCH EXECUTION ---
  const handleExecuteBulkOfferSend = async () => {
    if (selectedCandidateKeys.size === 0) {
      showToast('Select at least one candidate record before dispatching.', 'warning');
      return;
    }

    try {
      setBulkSending(true);
      setBulkProgress({ current: 0, total: selectedCandidateKeys.size, status: 'Initializing dispatch queue...' });

      const selectedRecords = bulkValidationReport.rows
        .filter((r) => selectedCandidateKeys.has(r.candidateId))
        .map((r) => r.raw || r);

      const res = await fetch('/api/offer-letter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateRecords: selectedRecords,
          customSubject: bulkCustomSubject,
          customBody: bulkCustomBody,
          cc: bulkCustomCc,
          forceResend: !skipAlreadySent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBulkDispatchResults(data);
        showToast(
          `Batch complete: ${data.summary.sent} dispatched, ${data.summary.skipped} skipped, ${data.summary.failed} failed.`,
          data.summary.failed > 0 ? 'warning' : 'success'
        );
        loadStats();
        loadCandidates();
        loadEmails();
      } else {
        showToast(data.error || 'Bulk dispatch failed', 'error');
      }
    } catch (err) {
      showToast('Error executing bulk send', 'error');
    } finally {
      setBulkSending(false);
    }
  };

  // Candidates who have RECEIVED offer letter (Gate condition for Module 2)
  const eligibleTaskCandidates = candidates.filter(
    (c) => c.offerLetterStatus === 'Sent' || c.offerLetterStatus === 'Accepted'
  );

  return (
    <div className={styles.dashboardLayout}>
      {/* 1. TOP OPERATIONAL APP HEADER */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.logoBadge}>
            <div className={styles.logoIcon}>
              <Send size={18} />
            </div>
            <div className={styles.logoInfo}>
              <span className={styles.logoTitle}>Shortfundly Automation Portal</span>
              <span className={styles.logoSubtitle}>Internship Operations Deck</span>
            </div>
          </div>

          {/* Left-side View Profile Option */}
          <button
            type="button"
            onClick={() => setProfileModal(true)}
            className={styles.userPill}
            style={{
              cursor: 'pointer',
              background: 'rgba(30, 41, 59, 0.85)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#f8fafc',
            }}
            title="View Operational Persona Profile"
          >
            <UserCheck size={14} style={{ color: '#38bdf8' }} />
            <span style={{ color: '#f8fafc', fontWeight: 600 }}>View Profile</span>
          </button>

          <div className={styles.systemBadge}>
            <span className={styles.beaconDot} />
            <span style={{ color: '#86efac', fontWeight: 600 }}>SQLite Prisma &bull; Google SMTP Production Ready</span>
          </div>

          {/* Master Sheet Download Button */}
          <a
            href="/api/candidates/export-master"
            download
            className={styles.userPill}
            style={{
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))',
              border: '1px solid rgba(16, 185, 129, 0.45)',
              color: '#34d399',
              textDecoration: 'none',
              fontWeight: 700,
            }}
            title="Download fresh Master Excel Roster from SQLite"
          >
            <FileSpreadsheet size={14} style={{ color: '#34d399' }} />
            <span style={{ color: '#34d399' }}>Download Master Sheet</span>
          </a>

          {/* Real-time Queue Status Indicator */}
          {(queueStats.pending > 0 || queueStats.processing > 0) && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(168, 85, 247, 0.18)',
                border: '1px solid rgba(168, 85, 247, 0.45)',
                padding: '5px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#c084fc',
              }}
            >
              <RefreshCw size={12} className={styles.spin} style={{ color: '#c084fc' }} />
              <span>Queue Active: {queueStats.completed} sent &bull; {queueStats.pending} pending (1 every 2.5s)</span>
            </div>
          )}
        </div>

        <div className={styles.topBarRight}>
          {/* Operational Role Switcher */}
          <div className={styles.roleSelectWrapper}>
            <Shield size={14} style={{ color: 'var(--accent-indigo)' }} />
            <span className={styles.roleLabel}>Role:</span>
            <select
              className={styles.roleSelect}
              value={adminUser.role}
              onChange={(e) => handleRoleSwitch(e.target.value)}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="HR">HR DIRECTOR</option>
              <option value="CEO">FOUNDER & CEO</option>
            </select>
          </div>

          <div className={styles.userPill}>
            <div className={styles.userAvatar}>
              {adminUser.role ? adminUser.role.slice(0, 2) : 'AD'}
            </div>
            <span className={styles.userName}>{adminUser.name}</span>
          </div>

          <button type="button" onClick={handleLogout} className={styles.btnLogout} title="Terminate Admin Session">
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* 2. PRIMARY OPERATIONS NAVIGATION */}
      <nav className={styles.navBar}>
        <button
          onClick={() => setActiveTab('offer-letter')}
          className={`${styles.navTab} ${activeTab === 'offer-letter' ? styles.navTabActive : ''}`}
        >
          <FileCheck size={16} />
          <span>Automate Offer Letter</span>
          <span className={styles.tabBadge}>{stats.offerLetters?.total || 0}</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`${styles.navTab} ${activeTab === 'tasks' ? styles.navTabActive : ''}`}
        >
          <Calendar size={16} />
          <span>Assign tasks</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`${styles.navTab} ${activeTab === 'reviews' ? styles.navTabActive : ''}`}
        >
          <Clock size={16} />
          <span>Reviews</span>
        </button>

        <button
          onClick={() => setActiveTab('certificates')}
          className={`${styles.navTab} ${activeTab === 'certificates' ? styles.navTabActive : ''}`}
        >
          <Award size={16} />
          <span>Internship certificates</span>
        </button>

        <button
          onClick={() => setActiveTab('emails')}
          className={`${styles.navTab} ${activeTab === 'emails' ? styles.navTabActive : ''}`}
        >
          <Mail size={16} />
          <span>Track emails</span>
          <span className={styles.tabBadge}>{stats.emails?.total || 0}</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`${styles.navTab} ${activeTab === 'settings' ? styles.navTabActive : ''}`}
        >
          <Settings size={16} />
          <span>Setting</span>
        </button>
      </nav>

      {/* 3. MAIN WORKSPACE */}
      <main className={styles.mainWorkspace}>
        {/* ============================================================== */}
        {/* MODULE 1: AUTOMATE OFFER LETTER                                */}
        {/* ============================================================== */}
        {activeTab === 'offer-letter' && (
          <div>
            <div className={styles.pageHeader}>
              <div className={styles.pageHeaderLeft}>
                <h2 className={styles.pageTitle}>Automate Offer Letter</h2>
                <p className={styles.pageSubtitle}>
                  Personalized Playwright A4 PDF offer letter generation and dispatch with Google SMTP.
                </p>
              </div>

              {/* Segmented Sub-Tabs */}
              <div className={styles.segmentedTabs}>
                <button
                  type="button"
                  onClick={() => setOfferSubTab('single')}
                  className={`${styles.segmentedTab} ${offerSubTab === 'single' ? styles.segmentedTabActive : ''}`}
                >
                  <Send size={14} />
                  <span>Single Email Dispatcher</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOfferSubTab('bulk')}
                  className={`${styles.segmentedTab} ${offerSubTab === 'bulk' ? styles.segmentedTabActive : ''}`}
                >
                  <FileSpreadsheet size={14} />
                  <span>Bulk Dataset Loader (CSV / Excel)</span>
                </button>
              </div>
            </div>

            {/* LIVE TELEMETRY COUNTER BANNER: Sent, Failed, Waiting, Queued */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '22px' }}>
              <div className={styles.metricCard} style={{ padding: '18px 20px', borderLeft: '4px solid #10b981', background: 'rgba(14, 20, 34, 0.85)' }}>
                <div className={styles.metricTitle} style={{ color: '#34d399', fontWeight: 700 }}>OFFER LETTERS SENT</div>
                <div className={styles.metricValue} style={{ fontSize: '28px', color: '#ffffff', fontWeight: 800 }}>
                  {stats.offerLetters?.sent || 0}
                </div>
                <div className={styles.metricSubtitle} style={{ color: '#94a3b8' }}>Successfully Dispatched</div>
              </div>

              <div className={styles.metricCard} style={{ padding: '18px 20px', borderLeft: '4px solid #f43f5e', background: 'rgba(14, 20, 34, 0.85)' }}>
                <div className={styles.metricTitle} style={{ color: '#fb7185', fontWeight: 700 }}>OFFER LETTERS FAILED</div>
                <div className={styles.metricValue} style={{ fontSize: '28px', color: '#ffffff', fontWeight: 800 }}>
                  {stats.offerLetters?.failed || 0}
                </div>
                <div className={styles.metricSubtitle} style={{ color: '#94a3b8' }}>Delivery Failures</div>
              </div>

              <div className={styles.metricCard} style={{ padding: '18px 20px', borderLeft: '4px solid #f59e0b', background: 'rgba(14, 20, 34, 0.85)' }}>
                <div className={styles.metricTitle} style={{ color: '#fbbf24', fontWeight: 700 }}>WAITING (READY TO SEND)</div>
                <div className={styles.metricValue} style={{ fontSize: '28px', color: '#ffffff', fontWeight: 800 }}>
                  {stats.offerLetters?.waiting || stats.offerLetters?.readyToSend || 0}
                </div>
                <div className={styles.metricSubtitle} style={{ color: '#94a3b8' }}>Pending Dispatch Confirmation</div>
              </div>

              <div className={styles.metricCard} style={{ padding: '18px 20px', borderLeft: '4px solid #8b5cf6', background: 'rgba(14, 20, 34, 0.85)' }}>
                <div className={styles.metricTitle} style={{ color: '#c084fc', fontWeight: 700 }}>QUEUED CANDIDATES</div>
                <div className={styles.metricValue} style={{ fontSize: '28px', color: '#ffffff', fontWeight: 800 }}>
                  {queueStats.pending > 0 ? queueStats.pending : (stats.offerLetters?.queued || 0)}
                </div>
                <div className={styles.metricSubtitle} style={{ color: '#94a3b8' }}>Background Dispatch Buffer</div>
              </div>
            </div>

            {/* Quick Action Banner when Offer Letter was just sent */}
            {recentOfferCandidate && (
              <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.15))', border: '1px solid var(--accent-indigo)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14.5px' }}>
                    Offer Letter Dispatched to {recentOfferCandidate.fullName} ({recentOfferCandidate.role})
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Candidate is now fully qualified to receive role sprint deliverables and a Google Meet briefing.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('tasks');
                    setTaskSubTab('single');
                  }}
                  className={styles.btnPrimaryAction}
                  style={{ fontSize: '12.5px', padding: '8px 16px' }}
                >
                  <span>Assign Task & Google Meet</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* --- WORKFLOW A: SINGLE CANDIDATE DISPATCH --- */}
            {offerSubTab === 'single' && (
              <form onSubmit={handleSingleOfferSend}>
                <div className={styles.formCard}>
                  <div className={styles.cardSectionHeader}>
                    <div className={styles.cardSectionTitle}>
                      <Users size={16} />
                      <span>Candidate Source & Intake Mode</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setSingleCandidateSource('existing')}
                        className={singleCandidateSource === 'existing' ? styles.btnPrimaryAction : styles.btnAction}
                        style={{ fontSize: '12px', padding: '5px 12px' }}
                      >
                        Select from Database
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSingleCandidateSource('manual');
                          setSelectedCandidateId('');
                          setSingleOfferForm({
                            candidateId: `SF-INT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                            fullName: '',
                            email: '',
                            phone: '',
                            role: 'Web Developer Intern',
                            department: 'Engineering',
                            collegeName: '',
                            degree: 'B.Tech / B.E.',
                            stipend: 'Rs. 10,000',
                            joiningDate: '2026-06-01',
                            endDate: '2026-08-31',
                            duration: '3 Months',
                            workMode: 'Online - Remote',
                            reportingManager: 'Priyanka Nair',
                            assignedMentor: 'Rahul Kapoor',
                            cc: '',
                            subject: '',
                            body: '',
                          });
                        }}
                        className={singleCandidateSource === 'manual' ? styles.btnPrimaryAction : styles.btnAction}
                        style={{ fontSize: '12px', padding: '5px 12px' }}
                      >
                        Manual Entry Option
                      </button>
                    </div>
                  </div>

                  {singleCandidateSource === 'existing' && (
                    <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                      <label className={styles.label}>
                        <span>Select Existing Candidate Record</span>
                        <span className={styles.labelHelper}>Auto-populates candidate details</span>
                      </label>
                      <select
                        className={styles.inputField}
                        value={selectedCandidateId}
                        onChange={(e) => handleSelectExistingCandidate(e.target.value)}
                      >
                        <option value="">-- Choose Candidate ({candidates.length} available) --</option>
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.candidateId} &bull; {c.fullName} &bull; {c.role} ({c.offerLetterStatus})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Candidate Name *</label>
                      <input
                        type="text"
                        required
                        className={styles.inputField}
                        placeholder="e.g. Akash Kumar"
                        value={singleOfferForm.fullName || ''}
                        onChange={(e) => setSingleOfferForm({ ...singleOfferForm, fullName: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Designation / Internship Role *</label>
                      <input
                        type="text"
                        required
                        className={styles.inputField}
                        placeholder="e.g. Web Developer Intern"
                        value={singleOfferForm.role || ''}
                        onChange={(e) => setSingleOfferForm({ ...singleOfferForm, role: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Joining Date *</label>
                      <input
                        type="date"
                        required
                        className={styles.inputField}
                        value={singleOfferForm.joiningDate || ''}
                        onChange={(e) => setSingleOfferForm({ ...singleOfferForm, joiningDate: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Ending Date *</label>
                      <input
                        type="date"
                        required
                        className={styles.inputField}
                        value={singleOfferForm.endDate || ''}
                        onChange={(e) => setSingleOfferForm({ ...singleOfferForm, endDate: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Mail Id *</label>
                      <input
                        type="email"
                        required
                        className={styles.inputField}
                        placeholder="candidate@example.com"
                        value={singleOfferForm.email || ''}
                        onChange={(e) => setSingleOfferForm({ ...singleOfferForm, email: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Department</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder="e.g. Engineering"
                        value={singleOfferForm.department || ''}
                        onChange={(e) => setSingleOfferForm({ ...singleOfferForm, department: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Degree</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder="e.g. B.Tech / B.E. / MCA"
                        value={singleOfferForm.degree || ''}
                        onChange={(e) => setSingleOfferForm({ ...singleOfferForm, degree: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Required University / College Name</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder="e.g. SRM Institute of Science and Technology"
                        value={singleOfferForm.collegeName || ''}
                        onChange={(e) => setSingleOfferForm({ ...singleOfferForm, collegeName: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Phone Number</label>
                      <input
                        type="tel"
                        className={styles.inputField}
                        placeholder="e.g. +91 9876543210"
                        value={singleOfferForm.phone || ''}
                        onChange={(e) => setSingleOfferForm({ ...singleOfferForm, phone: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Stipend Amount</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder="e.g. Rs. 10,000"
                        value={singleOfferForm.stipend || ''}
                        onChange={(e) => setSingleOfferForm({ ...singleOfferForm, stipend: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Email Subject & Body Customization */}
                <div className={styles.formCard}>
                  <div className={styles.cardSectionHeader}>
                    <div className={styles.cardSectionTitle}>
                      <Mail size={16} />
                      <span>Email Template Customization</span>
                    </div>
                  </div>

                  <div className={styles.formGrid} style={{ marginBottom: '14px' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Email Subject Line</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder={`Internship Offer Letter - ${singleOfferForm.fullName || '{{candidate_name}}'} | Shortfundly`}
                        value={singleOfferForm.subject || ''}
                        onChange={(e) => setSingleOfferForm({ ...singleOfferForm, subject: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className={styles.label}>Cc (Carbon Copy)</label>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Optional &bull; comma separated</span>
                      </div>
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder="hr-archive@shortfundly.com, mentor@shortfundly.com"
                        value={singleOfferForm.cc || ''}
                        onChange={(e) => setSingleOfferForm({ ...singleOfferForm, cc: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className={styles.label}>Custom Body Content (Leave empty to use official Shortfundly offer template)</label>
                      <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>Google Mail Styled Template</span>
                    </div>
                    <textarea
                      className={styles.textareaField}
                      rows={4}
                      placeholder="Customized greetings or instructions. Click tags below to insert automatically."
                      value={singleOfferForm.body || ''}
                      onChange={(e) => setSingleOfferForm({ ...singleOfferForm, body: e.target.value })}
                    />
                    <div className={styles.tagPillsBar}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginRight: '4px' }}>Insert Tags:</span>
                      {['{{candidate_name}}', '{{designation}}', '{{joining_date}}', '{{end_date}}', '{{department}}', '{{stipend}}', '{{degree}}', '{{college_name}}', '{{phone}}'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={styles.tagPill}
                          onClick={() => setSingleOfferForm((prev) => ({ ...prev, body: (prev.body ? prev.body + ' ' : '') + tag }))}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Supplemental Attachments (Images, Annexures, Guidelines)</label>
                    <input
                      type="file"
                      multiple
                      className={styles.inputField}
                      onChange={(e) => setSingleOfferFiles(Array.from(e.target.files || []))}
                    />
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => triggerOfferPreview(singleOfferForm)}
                      className={styles.btnAction}
                    >
                      <Eye size={15} />
                      <span>Preview Offer Letter & PDF</span>
                    </button>

                    <button
                      type="submit"
                      disabled={singleOfferSending}
                      className={styles.btnPrimaryAction}
                    >
                      <Send size={15} />
                      <span>{singleOfferSending ? 'Compiling & Sending...' : 'Send Offer Letter'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* --- WORKFLOW B: BULK DATASET CSV / EXCEL LOADER --- */}
            {offerSubTab === 'bulk' && (
              <div>
                <div className={styles.formCard}>
                  <div className={styles.cardSectionHeader}>
                    <div className={styles.cardSectionTitle}>
                      <FileSpreadsheet size={16} />
                      <span>Dataset Ingestion & Validation</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleLoadProjectSampleExcel}
                        className={styles.btnAction}
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        <RefreshCw size={13} />
                        <span>Load Project Dataset (Shortfundly_Internship_Candidates_Dummy.xlsx)</span>
                      </button>

                      <label className={styles.btnPrimaryAction} style={{ fontSize: '12px', padding: '6px 12px', cursor: 'pointer' }}>
                        <Upload size={13} />
                        <span>Upload CSV / Excel File</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          style={{ display: 'none' }}
                          onChange={handleBulkFileUpload}
                        />
                      </label>
                    </div>
                  </div>

                  {bulkValidationReport ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                      <div className={styles.metricCard} style={{ padding: '14px 18px' }}>
                        <div className={styles.metricTitle}>Total Ingested</div>
                        <div className={styles.metricValue} style={{ fontSize: '22px' }}>{bulkValidationReport.totalRows}</div>
                      </div>
                      <div className={styles.metricCard} style={{ padding: '14px 18px' }}>
                        <div className={styles.metricTitle} style={{ color: '#34d399' }}>Valid Records</div>
                        <div className={styles.metricValue} style={{ fontSize: '22px', color: '#34d399' }}>{bulkValidationReport.validCount}</div>
                      </div>
                      <div className={styles.metricCard} style={{ padding: '14px 18px' }}>
                        <div className={styles.metricTitle} style={{ color: '#fbbf24' }}>Duplicate Flags</div>
                        <div className={styles.metricValue} style={{ fontSize: '22px', color: '#fbbf24' }}>{bulkValidationReport.duplicateCount}</div>
                      </div>
                      <div className={styles.metricCard} style={{ padding: '14px 18px' }}>
                        <div className={styles.metricTitle} style={{ color: '#fb7185' }}>Invalid Rows</div>
                        <div className={styles.metricValue} style={{ fontSize: '22px', color: '#fb7185' }}>{bulkValidationReport.invalidCount}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                      Click <strong>Load Project Dataset</strong> or upload a CSV / Excel file to parse candidate records with ExcelJS and Zod.
                    </div>
                  )}
                </div>

                {bulkValidationReport && (
                  <div className={styles.tableContainer}>
                    <div className={styles.tableToolbar}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <div className={styles.tableSearchWrapper}>
                          <Search size={14} className={styles.tableSearchIcon} />
                          <input
                            type="text"
                            placeholder="Search by name, email, or candidate ID..."
                            className={styles.tableSearchInput}
                            value={bulkTableSearch}
                            onChange={(e) => setBulkTableSearch(e.target.value)}
                          />
                        </div>

                        <select
                          className={styles.tableFilterSelect}
                          value={bulkTableRoleFilter}
                          onChange={(e) => setBulkTableRoleFilter(e.target.value)}
                        >
                          <option value="ALL">All Internship Roles</option>
                          <option value="Web Developer">Web Developer</option>
                          <option value="Digital Marketing">Digital Marketing</option>
                          <option value="Data Analytics">Data Analytics</option>
                          <option value="UI/UX">UI/UX Design</option>
                          <option value="Python">Python / AI</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={handleSelectAllFiltered}
                          className={styles.btnAction}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          <CheckSquare size={13} />
                          <span>Select All ({filteredBulkRows.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAll}
                          className={styles.btnAction}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          <Square size={13} />
                          <span>Deselect All</span>
                        </button>

                        <div className={styles.tabBadge} style={{ padding: '6px 12px', background: 'rgba(99, 102, 241, 0.2)' }}>
                          <strong>{selectedCandidateKeys.size}</strong> selected
                        </div>
                      </div>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                            <th>Candidate ID</th>
                            <th>Candidate Name</th>
                            <th>Mail Id</th>
                            <th>Designation</th>
                            <th>Joining Date</th>
                            <th>Ending Date</th>
                            <th>Offer Status</th>
                            <th style={{ textAlign: 'right' }}>Preview</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBulkRows.slice(0, 50).map((row) => {
                            const isSelected = selectedCandidateKeys.has(row.candidateId);
                            const joining = row.joiningDate || row.raw?.joiningDate || '18-05-2026';
                            const ending = row.endDate || row.raw?.endDate || '17-08-2026';

                            return (
                              <tr
                                key={row.candidateId}
                                style={{ background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent' }}
                              >
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleRowSelect(row.candidateId)}
                                  />
                                </td>
                                <td><code>{row.candidateId}</code></td>
                                <td><strong>{row.fullName}</strong></td>
                                <td>{row.email}</td>
                                <td>{row.role}</td>
                                <td><span style={{ color: 'var(--accent-indigo)', fontWeight: 600 }}>{joining}</span></td>
                                <td><span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{ending}</span></td>
                                <td>
                                  <span className={`${styles.statusBadge} ${row.offerLetterStatus === 'Sent' ? styles.statusDelivered : styles.statusPending}`}>
                                    {row.offerLetterStatus || 'Ready to Send'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => triggerOfferPreview({ ...row.raw, ...row }, bulkCustomSubject, bulkCustomBody)}
                                    className={styles.btnAction}
                                    style={{ fontSize: '11px', padding: '3px 8px' }}
                                  >
                                    <Eye size={12} />
                                    <span>Preview</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Template Customizer & Dispatch Trigger */}
                    <div style={{ padding: '18px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)' }}>
                      <div className={styles.formGrid} style={{ marginBottom: '14px' }}>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Custom Subject Line (All Selected Candidates)</label>
                          <input
                            type="text"
                            className={styles.inputField}
                            placeholder="Internship Offer Letter - {{candidate_name}} ({{candidate_id}}) | Shortfundly"
                            value={bulkCustomSubject}
                            onChange={(e) => setBulkCustomSubject(e.target.value)}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.label}>Cc Recipients (Carbon Copy)</label>
                          <input
                            type="text"
                            className={styles.inputField}
                            placeholder="hr@shortfundly.com, ceo@shortfundly.com"
                            value={bulkCustomCc}
                            onChange={(e) => setBulkCustomCc(e.target.value)}
                          />
                        </div>

                        <div className={styles.formFull}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label className={styles.label}>Insert Template Dynamic Variables</label>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click to append to subject line</span>
                          </div>
                          <div className={styles.tagPillsBar}>
                            {[
                              { label: 'Candidate Name', val: '{{candidate_name}}' },
                              { label: 'Designation', val: '{{designation}}' },
                              { label: 'Joining Date', val: '{{joining_date}}' },
                              { label: 'Ending Date', val: '{{end_date}}' },
                              { label: 'Candidate ID', val: '{{candidate_id}}' },
                            ].map((tag) => (
                              <button
                                key={tag.val}
                                type="button"
                                className={styles.tagPill}
                                onClick={() => setBulkCustomSubject(prev => `${prev} ${tag.val}`.trim())}
                              >
                                + {tag.label} ({tag.val})
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={skipAlreadySent}
                            onChange={(e) => setSkipAlreadySent(e.target.checked)}
                          />
                          <span>Skip candidates with already sent offer letters (Duplicate Protection)</span>
                        </label>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            type="button"
                            disabled={selectedCandidateKeys.size === 0}
                            onClick={() => {
                              const firstKey = Array.from(selectedCandidateKeys)[0];
                              const row = bulkValidationReport?.rows.find(r => r.candidateId === firstKey);
                              if (row) {
                                triggerOfferPreview(
                                  { ...row.raw, ...row, cc: bulkCustomCc },
                                  bulkCustomSubject,
                                  bulkCustomBody
                                );
                              } else {
                                showToast('Select at least one candidate to preview.', 'warning');
                              }
                            }}
                            className={styles.btnAction}
                          >
                            <Eye size={14} />
                            <span>Preview Sample Email</span>
                          </button>

                          <button
                            type="button"
                            disabled={bulkSending || selectedCandidateKeys.size === 0}
                            onClick={handleExecuteBulkOfferSend}
                            className={styles.btnPrimaryAction}
                          >
                            <Send size={15} />
                            <span>{bulkSending ? 'Dispatching Batch...' : `Send Bulk Offer Letters (${selectedCandidateKeys.size})`}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODULE 2: ASSIGN TASKS                                         */}
        {/* ============================================================== */}
        {activeTab === 'tasks' && (
          <div>
            <div className={styles.pageHeader}>
              <div className={styles.pageHeaderLeft}>
                <h2 className={styles.pageTitle}>Assign Tasks</h2>
                <p className={styles.pageSubtitle}>
                  Role-based sprint tasks and unique Google Meet briefings. Gated to candidates who received their Offer Letter.
                </p>
              </div>

              <div className={styles.segmentedTabs}>
                <button
                  type="button"
                  onClick={() => setTaskSubTab('bulk')}
                  className={`${styles.segmentedTab} ${taskSubTab === 'bulk' ? styles.segmentedTabActive : ''}`}
                >
                  <Users size={14} />
                  <span>Bulk Task Dispatcher (Role-Based)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTaskSubTab('single')}
                  className={`${styles.segmentedTab} ${taskSubTab === 'single' ? styles.segmentedTabActive : ''}`}
                >
                  <Send size={14} />
                  <span>Single Task Dispatcher</span>
                </button>
              </div>
            </div>

            {/* Guidance banner for task assignment workflow */}
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '12px 18px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', color: 'var(--text-primary)', fontSize: '13px' }}>
              <strong>Task Assignment Workflow:</strong> Candidates who receive their Offer Letter appear here. When one task and its 2 review cycles finish, candidates remain here as <strong>Sprint 2 Ready</strong> so their next milestone can be assigned immediately.
            </div>

            {/* --- WORKFLOW A: BULK TASK DISPATCHER --- */}
            {taskSubTab === 'bulk' && (
              <div className={styles.formCard}>
                <div className={styles.cardSectionHeader}>
                  <div className={styles.cardSectionTitle}>
                    <Calendar size={16} />
                    <span>Candidates for Task Briefing (Registered: {candidates.length} &bull; Offer Letter Sent: {eligibleTaskCandidates.length})</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const targetList = eligibleTaskCandidates.length > 0 ? eligibleTaskCandidates : candidates;
                        setBulkTaskSelectedKeys(new Set(targetList.map(c => c.id)));
                      }}
                      className={styles.btnAction}
                      style={{ fontSize: '12px', padding: '5px 12px' }}
                    >
                      Select All ({eligibleTaskCandidates.length > 0 ? eligibleTaskCandidates.length : candidates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkTaskSelectedKeys(new Set())}
                      className={styles.btnAction}
                      style={{ fontSize: '12px', padding: '5px 12px' }}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '20px' }}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                        <th>Candidate Name</th>
                        <th>Mail Id</th>
                        <th>Designation</th>
                        <th>Offer Status</th>
                        <th>Current Task Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(eligibleTaskCandidates.length > 0 ? eligibleTaskCandidates : candidates).map((c) => {
                        const isSelected = bulkTaskSelectedKeys.has(c.id);
                        return (
                          <tr key={c.id} style={{ background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent' }}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const s = new Set(bulkTaskSelectedKeys);
                                  if (s.has(c.id)) s.delete(c.id);
                                  else s.add(c.id);
                                  setBulkTaskSelectedKeys(s);
                                }}
                              />
                            </td>
                            <td><strong>{c.fullName}</strong></td>
                            <td>{c.email}</td>
                            <td>{c.role}</td>
                            <td>
                              <span className={styles.statusBadge} style={{ background: c.offerLetterStatus === 'Sent' || c.offerLetterStatus === 'Accepted' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(148, 163, 184, 0.1)', color: c.offerLetterStatus === 'Sent' || c.offerLetterStatus === 'Accepted' ? '#34d399' : 'var(--text-muted)' }}>
                                {c.offerLetterStatus}
                              </span>
                            </td>
                            <td>
                              {c.taskStatus === 'Completed' || c.taskStatus === 'Milestone Completed' ? (
                                <span className={styles.statusBadge} style={{ background: 'rgba(52, 211, 153, 0.12)', color: '#34d399', fontWeight: 600 }}>
                                  Sprint {(c.tasksCompleted || 0) + 1} Ready (Sprint {c.tasksCompleted || 1} Finished)
                                </span>
                              ) : c.taskStatus === 'Assigned' || c.taskStatus === 'In Progress' ? (
                                <span className={styles.statusBadge} style={{ background: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24', fontWeight: 600 }}>
                                  Sprint {(c.tasksCompleted || 0) + 1} In Progress
                                </span>
                              ) : (
                                <span className={styles.tabBadge}>
                                  Sprint 1 Ready
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Explanation Call Date (2 Days Post Task Mail)</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      value={bulkTaskExpDate}
                      onChange={(e) => setBulkTaskExpDate(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Cc Recipients (Carbon Copy)</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder="mentor@shortfundly.com, teamlead@shortfundly.com"
                      value={bulkTaskCc}
                      onChange={(e) => setBulkTaskCc(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Meeting Time Window</label>
                    <input
                      type="text"
                      disabled
                      className={styles.inputField}
                      value="Standard IST (9:00 AM - 7:00 PM)"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Google Meet Room Provisioning</label>
                    <input
                      type="text"
                      disabled
                      className={styles.inputField}
                      value="Google Calendar API creates / reuses unique Google Meet room"
                    />
                  </div>

                  <div className={styles.formFull}>
                    <label className={styles.label}>Custom Subject Line (Optional)</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder="Internship Sprint 1 Task Briefing - {{candidate_name}} ({{designation}}) | Shortfundly"
                      value={bulkTaskSubject}
                      onChange={(e) => setBulkTaskSubject(e.target.value)}
                    />
                  </div>

                  <div className={styles.formFull}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className={styles.label}>Template Dynamic Variables</label>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click to append to subject line</span>
                    </div>
                    <div className={styles.tagPillsBar}>
                      {[
                        { label: 'Candidate Name', val: '{{candidate_name}}' },
                        { label: 'Designation', val: '{{designation}}' },
                        { label: 'Explanation Date', val: '{{explanation_date}}' },
                        { label: 'Meeting Time', val: '{{explanation_time}}' },
                        { label: 'Google Meet', val: '{{meet_link}}' },
                      ].map((tag) => (
                        <button
                          key={tag.val}
                          type="button"
                          className={styles.tagPill}
                          onClick={() => setBulkTaskSubject(prev => `${prev} ${tag.val}`.trim())}
                        >
                          + {tag.label} ({tag.val})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <button
                    type="button"
                    disabled={bulkTaskSelectedKeys.size === 0}
                    onClick={() => {
                      const firstId = Array.from(bulkTaskSelectedKeys)[0];
                      const cand = eligibleTaskCandidates.find(c => c.id === firstId);
                      if (cand) {
                        const gemma = generateGemmaTask(cand.role, cand.tasksCompleted || 0);
                        const expSchedule = getExplanationSchedule(new Date());
                        triggerTaskPreview({
                          candidateName: cand.fullName,
                          email: cand.email,
                          role: cand.role,
                          title: gemma.title,
                          description: gemma.description,
                          explanationDate: bulkTaskExpDate || expSchedule.dateStr,
                          explanationTime: expSchedule.timeStr,
                          meetLink: cand.googleMeetUrl || 'https://meet.google.com/sf-sync-preview',
                          cc: bulkTaskCc,
                          customSubject: bulkTaskSubject,
                          customBody: bulkTaskBody,
                        });
                      } else {
                        showToast('Select a candidate to preview bulk task email.', 'warning');
                      }
                    }}
                    className={styles.btnAction}
                  >
                    <Eye size={14} />
                    <span>Preview Sample Task Email</span>
                  </button>

                  <button
                    type="button"
                    disabled={bulkTaskSending || bulkTaskSelectedKeys.size === 0}
                    onClick={async () => {
                      try {
                        setBulkTaskSending(true);
                        showToast(`Dispatching role tasks and unique Google Meet links to ${bulkTaskSelectedKeys.size} candidates...`, 'info');
                        const res = await fetch('/api/tasks/bulk-assign-by-role', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            candidateIds: Array.from(bulkTaskSelectedKeys),
                            cc: bulkTaskCc,
                            customSubject: bulkTaskSubject,
                            customBody: bulkTaskBody,
                          }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          showToast(`Tasks & Meet briefings dispatched to ${data.assignedCount} candidates!`, 'success');
                          loadStats();
                          loadCandidates();
                          loadEmails();
                        } else {
                          showToast(data.error || 'Failed to dispatch tasks', 'error');
                        }
                      } catch (err) {
                        showToast('Error assigning tasks', 'error');
                      } finally {
                        setBulkTaskSending(false);
                      }
                    }}
                    className={styles.btnPrimaryAction}
                  >
                    <Send size={15} />
                    <span>{bulkTaskSending ? 'Dispatching...' : `Dispatch Tasks to Selected Candidates (${bulkTaskSelectedKeys.size})`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* --- WORKFLOW B: SINGLE TASK DISPATCHER --- */}
            {taskSubTab === 'single' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!singleTaskForm.candidateName?.trim() || !singleTaskForm.email?.trim() || !singleTaskForm.role?.trim()) {
                    showToast('Candidate Name, Email ID, and Designation are required.', 'error');
                    return;
                  }

                  try {
                    setSingleTaskSending(true);
                    showToast('Assigning task and dispatching unique Google Meet briefing invite...', 'info');
                    const res = await fetch('/api/tasks/assign', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(singleTaskForm),
                    });
                    const data = await res.json();
                    if (data.success) {
                      showToast(`Task successfully assigned to ${singleTaskForm.candidateName}!`, 'success');
                      loadStats();
                      loadCandidates();
                      loadEmails();
                    } else {
                      showToast(data.error || 'Failed to assign task', 'error');
                    }
                  } catch (err) {
                    showToast('Error assigning task', 'error');
                  } finally {
                    setSingleTaskSending(false);
                  }
                }}
                className={styles.formCard}
              >
                <div className={styles.cardSectionHeader}>
                  <div className={styles.cardSectionTitle}>
                    <Send size={16} />
                    <span>Individual Candidate Task Dispatcher</span>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formFull}>
                    <label className={styles.label}>Select Candidate (Who Received Offer Letter)</label>
                    <select
                      className={styles.inputField}
                      value={singleTaskForm.candidateId}
                      onChange={(e) => {
                        const candId = e.target.value;
                        const c = candidates.find((cand) => cand.id === candId);
                        if (c) {
                          const gemma = generateGemmaTask(c.role, c.tasksCompleted || 0);
                          const expSchedule = getExplanationSchedule(new Date());
                          setSingleTaskForm({
                            candidateId: c.id,
                            candidateName: c.fullName || '',
                            email: c.email || '',
                            role: c.role || '',
                            title: gemma.title || '',
                            description: gemma.description || '',
                            explanationDate: expSchedule.dateStr || '',
                            explanationTime: expSchedule.timeStr || '',
                            meetLink: generateGoogleMeetLink(),
                            cc: '',
                            customSubject: '',
                            customBody: '',
                          });
                        } else {
                          setSingleTaskForm(prev => ({ ...prev, candidateId: '' }));
                        }
                      }}
                    >
                      <option value="">-- Choose Candidate or Enter Details Below --</option>
                      {candidates.map((c) => {
                        const sprintNum = (c.tasksCompleted || 0) + 1;
                        let statusText = `Sprint ${sprintNum} Ready`;
                        if (c.taskStatus === 'Completed' || c.taskStatus === 'Milestone Completed') {
                          statusText = `Sprint ${sprintNum} Ready (Milestone ${c.tasksCompleted || 1} Finished)`;
                        } else if (c.taskStatus === 'Assigned' || c.taskStatus === 'In Progress') {
                          statusText = `Sprint ${sprintNum} In Progress`;
                        }
                        return (
                          <option key={c.id} value={c.id}>
                            {c.candidateId} &bull; {c.fullName} &bull; {c.role} [{statusText}]
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Candidate Name *</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      placeholder="Candidate full name"
                      value={singleTaskForm.candidateName || ''}
                      onChange={(e) => setSingleTaskForm({ ...singleTaskForm, candidateName: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Mail Id *</label>
                    <input
                      type="email"
                      required
                      className={styles.inputField}
                      placeholder="candidate@example.com"
                      value={singleTaskForm.email || ''}
                      onChange={(e) => setSingleTaskForm({ ...singleTaskForm, email: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Cc Recipients (Carbon Copy)</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder="mentor@shortfundly.com, teamlead@shortfundly.com"
                      value={singleTaskForm.cc || ''}
                      onChange={(e) => setSingleTaskForm({ ...singleTaskForm, cc: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Designation *</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      placeholder="e.g. Web Developer Intern"
                      value={singleTaskForm.role || ''}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        const gemma = generateGemmaTask(newRole, 0);
                        setSingleTaskForm({
                          ...singleTaskForm,
                          role: newRole,
                          title: gemma.title,
                          description: gemma.description,
                        });
                      }}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Explanation Call Date (&lt;dd.mm.yy&gt;)</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      value={singleTaskForm.explanationDate || ''}
                      onChange={(e) => setSingleTaskForm({ ...singleTaskForm, explanationDate: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Time (Indian Standard Time: 9 AM - 7 PM)</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      value={singleTaskForm.explanationTime || ''}
                      onChange={(e) => setSingleTaskForm({ ...singleTaskForm, explanationTime: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className={styles.label}>Unique Google Meet Link</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          disabled={meetGenerating}
                          onClick={async () => {
                            const liveLink = await generateLiveGoogleMeetRoom(singleTaskForm.candidateName, singleTaskForm.email);
                            if (liveLink) {
                              setSingleTaskForm(prev => ({ ...prev, meetLink: liveLink }));
                            }
                          }}
                          className={styles.btnAction}
                          style={{ fontSize: '10.5px', padding: '2px 8px', color: 'var(--accent-cyan)' }}
                          title="Generate a genuine, non-expired Google Meet room via Google Calendar API"
                        >
                          <Video size={11} />
                          <span>{meetGenerating ? 'Creating...' : 'Live Meet (API)'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSingleTaskForm({ ...singleTaskForm, meetLink: generateGoogleMeetLink() })}
                          className={styles.btnAction}
                          style={{ fontSize: '10.5px', padding: '2px 6px' }}
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      value={singleTaskForm.meetLink || ''}
                      onChange={(e) => setSingleTaskForm({ ...singleTaskForm, meetLink: e.target.value })}
                    />
                  </div>

                  <div className={styles.formFull}>
                    <label className={styles.label}>Sprint Task Title (Based on Designation)</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      value={singleTaskForm.title || ''}
                      onChange={(e) => setSingleTaskForm({ ...singleTaskForm, title: e.target.value })}
                    />
                  </div>

                  <div className={styles.formFull}>
                    <label className={styles.label}>Task Description & Deliverables</label>
                    <textarea
                      className={styles.textareaField}
                      rows={4}
                      value={singleTaskForm.description || ''}
                      onChange={(e) => setSingleTaskForm({ ...singleTaskForm, description: e.target.value })}
                    />
                  </div>

                  <div className={styles.formFull}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className={styles.label}>Template Tag Support</label>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click to append to task description</span>
                    </div>
                    <div className={styles.tagPillsBar}>
                      {[
                        { label: 'Candidate Name', val: '{{candidate_name}}' },
                        { label: 'Designation', val: '{{designation}}' },
                        { label: 'Explanation Date', val: '{{explanation_date}}' },
                        { label: 'Time', val: '{{explanation_time}}' },
                        { label: 'Meet Link', val: '{{meet_link}}' },
                      ].map((tag) => (
                        <button
                          key={tag.val}
                          type="button"
                          className={styles.tagPill}
                          onClick={() => setSingleTaskForm(prev => ({ ...prev, description: `${prev.description}\n${tag.val}` }))}
                        >
                          + {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => triggerTaskPreview(singleTaskForm)}
                    className={styles.btnAction}
                  >
                    <Eye size={15} />
                    <span>Preview Task Email</span>
                  </button>

                  <button
                    type="submit"
                    disabled={singleTaskSending}
                    className={styles.btnPrimaryAction}
                  >
                    <Send size={15} />
                    <span>{singleTaskSending ? 'Dispatching...' : 'Send Task & Google Meet Invite'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODULE 3: REVIEWS (REVIEW UNTIL TASK COMPLETE)                 */}
        {/* ============================================================== */}
        {activeTab === 'reviews' && (
          <div>
            <div className={styles.pageHeader}>
              <div className={styles.pageHeaderLeft}>
                <h2 className={styles.pageTitle}>Reviews - Review Until Task Complete</h2>
                <p className={styles.pageSubtitle}>
                  Scheduled review cycles with automated role-specific feedback and manual review dispatch flow.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <button
                    type="button"
                    onClick={handleRunReviewCron}
                    disabled={cronLoading}
                    className={styles.btnPrimaryAction}
                    style={{
                      background: 'linear-gradient(135deg, #059669, #10b981)',
                      border: '1px solid #059669',
                      boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                      padding: '8px 16px',
                    }}
                    title="Manual trigger to execute background review evaluation pipeline immediately without waiting for cron timer"
                  >
                    <RefreshCw size={14} className={cronLoading ? styles.spin : ''} />
                    <span>{cronLoading ? 'Running Review Cron...' : 'Run Review Cron Pipeline'}</span>
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Auto-evaluates schedule dates &amp; advances pending Review 1 / 2 cycles
                  </span>
                </div>

                {/* Review Sub-Tabs: Automated Review 1 vs Bulk Review 2 vs Single Review Dispatcher */}
                <div className={styles.segmentedTabs} style={{ marginBottom: 0 }}>
                  <button
                    type="button"
                    onClick={() => setReviewSubTab('auto')}
                    className={`${styles.segmentedTab} ${reviewSubTab === 'auto' ? styles.segmentedTabActive : ''}`}
                  >
                    <Clock size={14} />
                    <span>Automated Review 1 & Cycles</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewSubTab('bulk2')}
                    className={`${styles.segmentedTab} ${reviewSubTab === 'bulk2' ? styles.segmentedTabActive : ''}`}
                  >
                    <Users size={14} />
                    <span>Bulk Review 2 (Manual Feedback)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewSubTab('manual')}
                    className={`${styles.segmentedTab} ${reviewSubTab === 'manual' ? styles.segmentedTabActive : ''}`}
                  >
                    <Sliders size={14} />
                    <span>Single Review Dispatcher</span>
                  </button>
                </div>
              </div>
            </div>

            {/* FLOW A: AUTOMATED REVIEW CYCLES */}
            {reviewSubTab === 'auto' && (
              <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Sprint Milestone</th>
                      <th>Explanation Call</th>
                      <th>Review 1 Date</th>
                      <th>Review 2 Date & Feedback</th>
                      <th>Meeting Room</th>
                      <th>Cycle</th>
                      <th style={{ textAlign: 'right' }}>Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates
                      .filter((c) => c.tasks && c.tasks.length > 0)
                      .map((c) => {
                        const task = c.tasks[0];
                        return (
                          <tr key={task.id}>
                            <td>
                              <strong>{c.fullName}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.role}</div>
                            </td>
                            <td>
                              <div>{task.title}</div>
                              <span className={styles.tabBadge} style={{ fontSize: '10.5px' }}>{task.status}</span>
                            </td>
                            <td>
                              <div>{task.explanationDate || 'Pending'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{task.explanationTime}</div>
                            </td>
                            <td>
                              <div style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                                {task.firstReviewDate || task.reviewDate || 'Pending'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{task.firstReviewStatus || 'Pending'}</div>
                            </td>
                            <td>
                              <div>{task.secondReviewDate || 'Pending'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{task.secondReviewStatus || 'Pending'}</div>
                            </td>
                            <td>
                              <a
                                href={task.meetLink}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Video size={13} />
                                <span>Join Meet</span>
                              </a>
                            </td>
                            <td>
                              <span className={styles.tabBadge}>Cycle {task.reviewCount || 1}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                {/* Review 1 Preview & Send (Automated: No feedback) */}
                                {(!task.firstReviewStatus || task.firstReviewStatus === 'Pending') && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        triggerReviewPreview({
                                          candidateName: c.fullName,
                                          email: c.email,
                                          role: c.role,
                                          reviewTitle: 'Review 1 Call Scheduled',
                                          reviewType: 'review_1',
                                          reviewDate: task.explanationDate || '25.10.26',
                                          reviewTime: '14:00 IST',
                                          meetLink: task.meetLink,
                                          feedbackNotes: '',
                                        });
                                      }}
                                      className={styles.btnAction}
                                      style={{ fontSize: '11px', padding: '3px 7px' }}
                                    >
                                      <Eye size={11} />
                                      <span>Preview</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          showToast(`Dispatching automated Review 1 to ${c.fullName}...`, 'info');
                                          const res = await fetch('/api/tasks/review', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ taskId: task.id, action: 'review_1' }),
                                          });
                                          const data = await res.json();
                                          if (data.success) {
                                            showToast(`Automated Review 1 scheduled for ${data.reviewDate}!`, 'success');
                                            loadCandidates();
                                            loadEmails();
                                          }
                                        } catch (e) {
                                          showToast('Error scheduling Review 1', 'error');
                                        }
                                      }}
                                      className={styles.btnPrimaryAction}
                                      style={{ fontSize: '11px', padding: '4px 8px' }}
                                    >
                                      <span>Send Review 1</span>
                                    </button>
                                  </>
                                )}

                                {/* Review 2 Manual Feedback Trigger (Opens manual input dialog) */}
                                {task.firstReviewStatus === 'Scheduled' && (!task.secondReviewStatus || task.secondReviewStatus === 'Pending') && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReviewModal({
                                        open: true,
                                        task: { ...task, candidate: c },
                                        feedback: task.feedback || '',
                                        isComplete: false,
                                      });
                                    }}
                                    className={styles.btnAction}
                                    style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--accent-amber)' }}
                                    title="Open manual review 2 dialog to type personalized mentor feedback before dispatch"
                                  >
                                    <Sparkles size={11} />
                                    <span>Fill Review 2 Feedback</span>
                                  </button>
                                )}

                                {/* Inspect & Feedback Modal */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewModal({
                                      open: true,
                                      task: { ...task, candidate: c },
                                      feedback: '',
                                      isComplete: false,
                                    });
                                  }}
                                  className={styles.btnAction}
                                  style={{ fontSize: '11px', padding: '4px 8px' }}
                                >
                                  <span>Inspect</span>
                                </button>

                                {/* Direct Complete Task & Stop Review */}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      showToast(`Completing task and updating Excel for ${c.fullName}...`, 'info');
                                      const res = await fetch('/api/tasks/complete', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ taskId: task.id, candidateId: c.id }),
                                      });
                                      const data = await res.json();
                                      if (data.success) {
                                        showToast(`Task completed! Excel updated on disk with 'No of tasks completed: ${data.tasksCompleted}'. Candidate approved for Certificate!`, 'success');
                                        loadCandidates();
                                        loadStats();
                                        loadEmails();
                                      } else {
                                        showToast(data.error || 'Failed to complete task', 'error');
                                      }
                                    } catch (e) {
                                      showToast('Error completing task', 'error');
                                    }
                                  }}
                                  className={styles.btnPrimaryAction}
                                  style={{ fontSize: '11px', padding: '4px 8px', background: 'var(--accent-emerald)' }}
                                >
                                  <span>Complete Task</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* FLOW B: BULK REVIEW 2 WITH MANUAL FEEDBACK PER CANDIDATE */}
            {reviewSubTab === 'bulk2' && (
              <div className={styles.formCard}>
                <div className={styles.cardSectionHeader}>
                  <div className={styles.cardSectionTitle}>
                    <Users size={16} />
                    <span>Bulk Review 2 Dispatcher &bull; Candidate-Specific Manual Feedback</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = candidates.filter(c => c.tasks && c.tasks.length > 0).map(c => c.id);
                        setBulkReview2SelectedKeys(new Set(allIds));
                      }}
                      className={styles.btnAction}
                      style={{ fontSize: '12px', padding: '5px 12px' }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkReview2SelectedKeys(new Set())}
                      className={styles.btnAction}
                      style={{ fontSize: '12px', padding: '5px 12px' }}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px', color: 'var(--text-primary)' }}>
                  <strong>Manual Review 2 Policy:</strong> For Review 2, each candidate receives distinct manual feedback filled by HR or their mentor. Type or customize notes for each selected candidate, then dispatch them in bulk.
                </div>

                <div style={{ maxHeight: '420px', overflowY: 'auto', marginBottom: '20px' }}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                        <th>Candidate Details</th>
                        <th>Sprint Task</th>
                        <th style={{ width: '130px' }}>Review 2 Date</th>
                        <th>Manual Mentor Feedback (HR Custom Notes) *</th>
                        <th style={{ textAlign: 'right', width: '85px' }}>Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates
                        .filter((c) => c.tasks && c.tasks.length > 0)
                        .map((c) => {
                          const task = c.tasks[0];
                          const isSelected = bulkReview2SelectedKeys.has(c.id);
                          const customFb = bulkReview2Feedbacks[task.id] !== undefined ? bulkReview2Feedbacks[task.id] : (task.feedback || '');
                          const reviewDate = bulkReview2Dates[task.id] || formatToDdMmYy(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000));

                          return (
                            <tr key={task.id} style={{ background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent' }}>
                              <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '16px' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const s = new Set(bulkReview2SelectedKeys);
                                    if (s.has(c.id)) s.delete(c.id);
                                    else s.add(c.id);
                                    setBulkReview2SelectedKeys(s);
                                  }}
                                />
                              </td>
                              <td style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                                <strong>{c.fullName}</strong>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</div>
                                <span className={styles.tabBadge} style={{ fontSize: '10.5px', marginTop: '4px' }}>{c.role}</span>
                              </td>
                              <td style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                                <div><strong>{task.title}</strong></div>
                                <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                                  <a href={task.meetLink} target="_blank" rel="noreferrer">{task.meetLink}</a>
                                </div>
                              </td>
                              <td style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                                <input
                                  type="text"
                                  className={styles.inputField}
                                  style={{ fontSize: '12px', padding: '6px 8px' }}
                                  value={reviewDate}
                                  onChange={(e) => setBulkReview2Dates({ ...bulkReview2Dates, [task.id]: e.target.value })}
                                />
                              </td>
                              <td style={{ verticalAlign: 'top' }}>
                                <textarea
                                  rows={4}
                                  className={styles.textareaField}
                                  style={{ fontSize: '12.5px', minHeight: '110px', padding: '10px', lineHeight: '1.5', resize: 'vertical' }}
                                  placeholder="Type manual mentor feedback, code evaluation notes, and deliverables for this candidate..."
                                  value={customFb}
                                  onChange={(e) => setBulkReview2Feedbacks({ ...bulkReview2Feedbacks, [task.id]: e.target.value })}
                                />
                              </td>
                              <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '14px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    triggerReviewPreview({
                                      candidateName: c.fullName,
                                      email: c.email,
                                      role: c.role,
                                      reviewTitle: 'Shortfundly Sprint Review 2',
                                      reviewType: 'review_2',
                                      reviewDate,
                                      reviewTime: '15:00 IST',
                                      meetLink: task.meetLink,
                                      feedbackNotes: customFb || 'Manual mentor feedback pending from HR.',
                                      cc: bulkReview2Cc,
                                    });
                                  }}
                                  className={styles.btnAction}
                                  style={{ fontSize: '11px', padding: '4px 8px' }}
                                >
                                  <Eye size={12} />
                                  <span>Preview</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
                    <label className={styles.label} style={{ margin: 0, whiteSpace: 'nowrap' }}>Cc (All Review 2):</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder="mentor@shortfundly.com, hr@shortfundly.com"
                      value={bulkReview2Cc}
                      onChange={(e) => setBulkReview2Cc(e.target.value)}
                      style={{ maxWidth: '360px' }}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={bulkReview2Sending || bulkReview2SelectedKeys.size === 0}
                    onClick={async () => {
                      try {
                        setBulkReview2Sending(true);
                        showToast(`Dispatching bulk Review 2 with manual feedback to ${bulkReview2SelectedKeys.size} candidates...`, 'info');

                        const payloadReviews = [];
                        for (const candId of bulkReview2SelectedKeys) {
                          const c = candidates.find(cand => cand.id === candId);
                          if (c && c.tasks && c.tasks.length > 0) {
                            const task = c.tasks[0];
                            payloadReviews.push({
                              taskId: task.id,
                              candidateId: c.id,
                              feedback: bulkReview2Feedbacks[task.id] || task.feedback || 'Sprint milestone deliverables reviewed by mentor.',
                              reviewDate: bulkReview2Dates[task.id] || formatToDdMmYy(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)),
                              reviewTime: '15:00 IST',
                            });
                          }
                        }

                        const res = await fetch('/api/tasks/bulk-review-2', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            reviews: payloadReviews,
                            globalCc: bulkReview2Cc,
                          }),
                        });

                        const data = await res.json();
                        if (data.success) {
                          showToast(data.message || `Bulk Review 2 dispatched!`, 'success');
                          loadCandidates();
                          loadStats();
                          loadEmails();
                        } else {
                          showToast(data.error || 'Failed to dispatch bulk Review 2', 'error');
                        }
                      } catch (err) {
                        showToast('Error dispatching bulk Review 2', 'error');
                      } finally {
                        setBulkReview2Sending(false);
                      }
                    }}
                    className={styles.btnPrimaryAction}
                  >
                    <Send size={15} />
                    <span>{bulkReview2Sending ? 'Dispatching...' : `Dispatch Bulk Review 2 (${bulkReview2SelectedKeys.size})`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* FLOW C: SINGLE MANUAL REVIEW DISPATCHER (Direct Candidate Name, Mail, Role entry) */}
            {reviewSubTab === 'manual' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!manualReviewForm.candidateName?.trim() || !manualReviewForm.email?.trim()) {
                    showToast('Candidate Name and Mail ID are required.', 'error');
                    return;
                  }

                  try {
                    setManualReviewSending(true);
                    showToast('Scheduling review session and dispatching Google Meet invitation...', 'info');
                    const res = await fetch('/api/tasks/review', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'manual_review',
                        candidateName: manualReviewForm.candidateName,
                        candidateEmail: manualReviewForm.email,
                        email: manualReviewForm.email,
                        role: manualReviewForm.role,
                        reviewType: manualReviewForm.reviewType,
                        reviewTitle: manualReviewForm.reviewTitle,
                        reviewDate: manualReviewForm.reviewDate,
                        reviewTime: manualReviewForm.reviewTime,
                        meetLink: manualReviewForm.meetLink,
                        feedbackNotes: manualReviewForm.feedbackNotes,
                        isTaskComplete: manualReviewForm.isTaskComplete,
                        customSubject: manualReviewForm.customSubject,
                        customBody: manualReviewForm.customBody,
                        cc: manualReviewForm.cc,
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      showToast(data.message || 'Review session successfully dispatched!', 'success');
                      loadCandidates();
                      loadStats();
                      loadEmails();
                    } else {
                      showToast(data.error || 'Failed to schedule manual review', 'error');
                    }
                  } catch (err) {
                    showToast('Error scheduling manual review', 'error');
                  } finally {
                    setManualReviewSending(false);
                  }
                }}
                className={styles.formCard}
              >
                <div className={styles.cardSectionHeader}>
                  <div className={styles.cardSectionTitle}>
                    <Sliders size={16} />
                    <span>Single Review Dispatcher &bull; Manual Candidate & Stage Entry</span>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  {/* Optional Quick Populate Helper */}
                  <div className={styles.formFull}>
                    <label className={styles.label}>Quick-Select Candidate (Optional - Or enter any details manually below)</label>
                    <select
                      className={styles.inputField}
                      value={manualReviewForm.candidateId}
                      onChange={(e) => {
                        const candId = e.target.value;
                        const c = candidates.find(cand => cand.id === candId);
                        if (c) {
                          const t = c.tasks && c.tasks.length > 0 ? c.tasks[0] : null;
                          setManualReviewForm({
                            ...manualReviewForm,
                            candidateId: c.id,
                            candidateName: c.fullName,
                            email: c.email,
                            role: c.role,
                            meetLink: c.googleMeetUrl || (t ? t.meetLink : generateGoogleMeetLink()),
                            feedbackNotes: t ? t.feedback || '' : '',
                          });
                        }
                      }}
                    >
                      <option value="">-- Choose Registered Candidate or Enter Manually Below --</option>
                      {candidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.candidateId} &bull; {c.fullName} &bull; {c.role} ({c.taskStatus})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Candidate Name *</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      placeholder="Candidate full name"
                      value={manualReviewForm.candidateName || ''}
                      onChange={(e) => setManualReviewForm({ ...manualReviewForm, candidateName: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Mail Id *</label>
                    <input
                      type="email"
                      required
                      className={styles.inputField}
                      placeholder="candidate@example.com"
                      value={manualReviewForm.email || ''}
                      onChange={(e) => setManualReviewForm({ ...manualReviewForm, email: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Designation *</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      placeholder="e.g. Frontend Developer Intern"
                      value={manualReviewForm.role || ''}
                      onChange={(e) => setManualReviewForm({ ...manualReviewForm, role: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Review Stage / Type *</label>
                    <select
                      className={styles.inputField}
                      value={manualReviewForm.reviewType}
                      onChange={(e) => {
                        const rType = e.target.value;
                        setManualReviewForm({
                          ...manualReviewForm,
                          reviewType: rType,
                          reviewTitle: rType === 'review_1' ? 'Milestone Sprint Review 1' : 'Milestone Sprint Review 2',
                        });
                      }}
                    >
                      <option value="review_1">Review 1 (No Feedback - Date, Time & Meet Link only)</option>
                      <option value="review_2">Review 2 (Requires Manual Mentor/HR Feedback)</option>
                      <option value="milestone">Milestone Technical Review</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Review Session Title</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      value={manualReviewForm.reviewTitle || ''}
                      onChange={(e) => setManualReviewForm({ ...manualReviewForm, reviewTitle: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Cc Recipients (Carbon Copy)</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder="reviewer@shortfundly.com, hr@shortfundly.com"
                      value={manualReviewForm.cc || ''}
                      onChange={(e) => setManualReviewForm({ ...manualReviewForm, cc: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Scheduled Review Date (&lt;dd.mm.yy&gt;)</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      value={manualReviewForm.reviewDate || ''}
                      onChange={(e) => setManualReviewForm({ ...manualReviewForm, reviewDate: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Review Time (IST)</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      value={manualReviewForm.reviewTime || ''}
                      onChange={(e) => setManualReviewForm({ ...manualReviewForm, reviewTime: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className={styles.label}>Google Meet Room (Official)</label>
                      <button
                        type="button"
                        disabled={meetGenerating}
                        onClick={async () => {
                          const liveLink = await generateLiveGoogleMeetRoom(manualReviewForm.candidateName, manualReviewForm.email);
                          if (liveLink) {
                            setManualReviewForm(prev => ({ ...prev, meetLink: liveLink }));
                          }
                        }}
                        className={styles.btnAction}
                        style={{ fontSize: '10.5px', padding: '2px 8px', color: 'var(--accent-cyan)' }}
                        title="Generate an active, non-expired Google Meet room via Google Calendar API"
                      >
                        <Video size={11} />
                        <span>{meetGenerating ? 'Creating...' : 'Live Meet (API)'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      value={manualReviewForm.meetLink || ''}
                      onChange={(e) => setManualReviewForm({ ...manualReviewForm, meetLink: e.target.value })}
                    />
                  </div>

                  <div className={styles.formFull}>
                    <label className={styles.label}>Custom Subject Line (Optional)</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder="Shortfundly Sprint Review Session - {{candidate_name}} ({{designation}})"
                      value={manualReviewForm.customSubject || ''}
                      onChange={(e) => setManualReviewForm({ ...manualReviewForm, customSubject: e.target.value })}
                    />
                  </div>

                  {manualReviewForm.reviewType === 'review_1' ? (
                    <div className={styles.formFull} style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '14px', borderRadius: 'var(--radius-sm)', color: '#38bdf8', fontSize: '13px' }}>
                      <strong>Review 1 Automated Notice:</strong> Review 1 contains only the virtual meeting schedule and Google Meet room. No feedback is included in Review 1 emails.
                    </div>
                  ) : (
                    <div className={styles.formFull}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className={styles.label} style={{ marginBottom: 0 }}>Manual Mentor Feedback & Review Agenda Notes *</label>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Expanded editor for comprehensive mentor feedback, code review, and deliverables
                        </span>
                      </div>
                      <textarea
                        className={styles.textareaField}
                        rows={8}
                        style={{ minHeight: '180px', lineHeight: '1.6', fontSize: '14px', resize: 'vertical' }}
                        placeholder="Enter mentor notes, code feedback, and required deliverables for this review..."
                        value={manualReviewForm.feedbackNotes || ''}
                        onChange={(e) => setManualReviewForm({ ...manualReviewForm, feedbackNotes: e.target.value })}
                      />
                    </div>
                  )}

                  <div className={styles.formFull}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className={styles.label}>Template Tag Support</label>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click to append to subject line</span>
                    </div>
                    <div className={styles.tagPillsBar}>
                      {[
                        { label: 'Candidate Name', val: '{{candidate_name}}' },
                        { label: 'Designation', val: '{{designation}}' },
                        { label: 'Review Date', val: '{{review_date}}' },
                        { label: 'Review Time', val: '{{review_time}}' },
                        { label: 'Google Meet', val: '{{meet_link}}' },
                      ].map((tag) => (
                        <button
                          key={tag.val}
                          type="button"
                          className={styles.tagPill}
                          onClick={() => setManualReviewForm(prev => ({ ...prev, customSubject: `${prev.customSubject} ${tag.val}`.trim() }))}
                        >
                          + {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formFull}>
                    <div style={{ background: manualReviewForm.isTaskComplete ? 'rgba(52, 211, 153, 0.1)' : 'var(--bg-surface-elevated)', border: `1px solid ${manualReviewForm.isTaskComplete ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`, padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: manualReviewForm.isTaskComplete ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={manualReviewForm.isTaskComplete}
                          onChange={(e) => setManualReviewForm({ ...manualReviewForm, isTaskComplete: e.target.checked })}
                        />
                        <span>Complete Task & Stop Review Loops (Updates Excel on Disk & Qualifies for Certificate)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => triggerReviewPreview(manualReviewForm)}
                    className={styles.btnAction}
                  >
                    <Eye size={15} />
                    <span>Preview Review Email</span>
                  </button>

                  <button
                    type="submit"
                    disabled={manualReviewSending}
                    className={styles.btnPrimaryAction}
                  >
                    <Send size={15} />
                    <span>{manualReviewSending ? 'Scheduling...' : 'Send Review Invitation & Calendar Invite'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODULE 5: INTERNSHIP CERTIFICATES                              */}
        {/* ============================================================== */}
        {activeTab === 'certificates' && (
          <div>
            <div className={styles.pageHeader}>
              <div className={styles.pageHeaderLeft}>
                <h2 className={styles.pageTitle}>Internship Certificates</h2>
                <p className={styles.pageSubtitle}>
                  Evaluation rule: Candidates with score/completed tasks &lt; 1 get NO certificate. Eligible candidates receive official Playwright signed certificate.
                </p>
              </div>

              <div className={styles.segmentedTabs}>
                <button
                  type="button"
                  onClick={() => setCertSubTab('bulk')}
                  className={`${styles.segmentedTab} ${certSubTab === 'bulk' ? styles.segmentedTabActive : ''}`}
                >
                  <Users size={14} />
                  <span>Bulk Certificate Issuance (Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCertSubTab('single')}
                  className={`${styles.segmentedTab} ${certSubTab === 'single' ? styles.segmentedTabActive : ''}`}
                >
                  <Award size={14} />
                  <span>Single Candidate Certificate</span>
                </button>
              </div>
            </div>

            {/* --- WORKFLOW A: BULK CERTIFICATES WITH EVALUATION --- */}
            {certSubTab === 'bulk' && (
              <div className={styles.formCard}>
                <div className={styles.cardSectionHeader}>
                  <div className={styles.cardSectionTitle}>
                    <FileSpreadsheet size={16} />
                    <span>Candidate Evaluation & Certificate Qualification</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const eligibleIds = candidates.filter(c => (c.tasksCompleted || 0) >= 1 || c.taskStatus === 'Completed').map(c => c.id);
                        setBulkCertSelectedKeys(new Set(eligibleIds));
                      }}
                      className={styles.btnAction}
                      style={{ fontSize: '12px', padding: '5px 12px' }}
                    >
                      Select All Eligible
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkCertSelectedKeys(new Set())}
                      className={styles.btnAction}
                      style={{ fontSize: '12px', padding: '5px 12px' }}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div style={{ maxHeight: '380px', overflowY: 'auto', marginBottom: '20px' }}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                        <th>Candidate Name</th>
                        <th>Mail Id</th>
                        <th>Designation</th>
                        <th>Completed Tasks</th>
                        <th>Evaluation Status</th>
                        <th>Certificate Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((c) => {
                        const tasksDone = c.tasksCompleted || (c.taskStatus === 'Completed' ? 1 : 0);
                        const isEligible = tasksDone >= 1;
                        const isSelected = bulkCertSelectedKeys.has(c.id);

                        return (
                          <tr key={c.id} style={{ background: isSelected ? 'rgba(52, 211, 153, 0.05)' : 'transparent' }}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                disabled={!isEligible}
                                checked={isSelected}
                                onChange={() => {
                                  const s = new Set(bulkCertSelectedKeys);
                                  if (s.has(c.id)) s.delete(c.id);
                                  else s.add(c.id);
                                  setBulkCertSelectedKeys(s);
                                }}
                              />
                            </td>
                            <td><strong>{c.fullName}</strong></td>
                            <td>{c.email}</td>
                            <td>{c.role}</td>
                            <td>
                              <span className={styles.tabBadge}>
                                {tasksDone} Milestone(s)
                              </span>
                            </td>
                            <td>
                              {isEligible ? (
                                <span className={styles.statusBadge} style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#34d399' }}>
                                  Eligible (Approved)
                                </span>
                              ) : (
                                <span className={styles.statusBadge} style={{ background: 'rgba(251, 113, 133, 0.1)', color: '#fb7185' }}>
                                  Ineligible (0 Completed Tasks)
                                </span>
                              )}
                            </td>
                            <td>
                              {c.certificates && c.certificates.length > 0 ? (
                                <span style={{ color: 'var(--accent-cyan)', fontSize: '12px' }}>
                                  Issued: {c.certificates[0].certificateNumber}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not Issued</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Cc Recipients (Carbon Copy)</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder="certificates@shortfundly.com, hr@shortfundly.com"
                        value={bulkCertCc}
                        onChange={(e) => setBulkCertCc(e.target.value)}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Custom Subject Line</label>
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder="Shortfundly Internship Completion Certificate - {{candidate_name}} ({{certificate_id}})"
                        value={bulkCertSubject}
                        onChange={(e) => setBulkCertSubject(e.target.value)}
                      />
                    </div>

                    <div className={styles.formFull}>
                      <label className={styles.label}>Custom Email Message (Markdown / HTML Supported)</label>
                      <textarea
                        className={styles.textareaField}
                        rows={4}
                        placeholder="Dear {{candidate_name}},\n\nCongratulations on successfully completing your internship as {{designation}} at Shortfundly! Your official signed certificate is attached as a PDF."
                        value={bulkCertBody}
                        onChange={(e) => setBulkCertBody(e.target.value)}
                      />
                    </div>

                    <div className={styles.formFull}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className={styles.label}>Template Tag Support</label>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click to append to subject line</span>
                      </div>
                      <div className={styles.tagPillsBar}>
                        {[
                          { label: 'Candidate Name', val: '{{candidate_name}}' },
                          { label: 'Designation', val: '{{designation}}' },
                          { label: 'Issue Date', val: '{{issue_date}}' },
                          { label: 'Certificate ID', val: '{{certificate_id}}' },
                        ].map((tag) => (
                          <button
                            key={tag.val}
                            type="button"
                            className={styles.tagPill}
                            onClick={() => setBulkCertSubject(prev => `${prev} ${tag.val}`.trim())}
                          >
                            + {tag.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '8px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Selected Eligible Candidates: <strong>{bulkCertSelectedKeys.size}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        disabled={candidates.length === 0}
                        onClick={() => {
                          const sampleCand = candidates.find(c => bulkCertSelectedKeys.has(c.id)) || candidates[0];
                          if (!sampleCand) {
                            showToast('No candidates available to preview.', 'warning');
                            return;
                          }
                          triggerCertificatePreview({
                            id: sampleCand.id,
                            fullName: sampleCand.fullName,
                            candidateName: sampleCand.fullName,
                            email: sampleCand.email,
                            role: sampleCand.role,
                            issueDate: sampleCand.endDate || new Date().toISOString().split('T')[0],
                            cc: bulkCertCc,
                            customSubject: bulkCertSubject,
                            customBody: bulkCertBody,
                          });
                        }}
                        className={styles.btnAction}
                      >
                        <Eye size={15} />
                        <span>Preview Sample Bulk Certificate</span>
                      </button>

                      <button
                        type="button"
                        disabled={bulkCertSending || bulkCertSelectedKeys.size === 0}
                        onClick={async () => {
                          try {
                            setBulkCertSending(true);
                            showToast(`Compiling signed Playwright certificates for ${bulkCertSelectedKeys.size} candidates...`, 'info');
                            const res = await fetch('/api/certificate/bulk-send', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                candidateIds: Array.from(bulkCertSelectedKeys),
                                cc: bulkCertCc,
                                customSubject: bulkCertSubject,
                                customBody: bulkCertBody,
                              }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              showToast(`Certificates successfully dispatched to ${data.results?.length || bulkCertSelectedKeys.size} candidates!`, 'success');
                              loadCandidates();
                              loadStats();
                              loadEmails();
                            } else {
                              showToast(data.error || 'Bulk certificate issuance failed', 'error');
                            }
                          } catch (err) {
                            showToast('Error issuing certificates', 'error');
                          } finally {
                            setBulkCertSending(false);
                          }
                        }}
                        className={styles.btnPrimaryAction}
                      >
                        <Award size={15} />
                        <span>{bulkCertSending ? 'Generating & Sending...' : `Send Certificates to Selected (${bulkCertSelectedKeys.size})`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- WORKFLOW B: SINGLE CERTIFICATE ISSUANCE WITH PREVIEW --- */}
            {certSubTab === 'single' && (
              <div className={styles.formCard}>
                <div className={styles.cardSectionHeader}>
                  <div className={styles.cardSectionTitle}>
                    <Award size={16} />
                    <span>Single Candidate Certificate Dispatcher</span>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formFull}>
                    <label className={styles.label}>Select Candidate from Registry</label>
                    <select
                      className={styles.inputField}
                      value={certCandidateId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setCertCandidateId(id);
                        const c = candidates.find(cand => cand.id === id);
                        if (c) {
                          setSingleCertForm({
                            fullName: c.fullName || '',
                            email: c.email || '',
                            cc: '',
                            role: c.role || '',
                            issueDate: c.endDate || new Date().toISOString().split('T')[0],
                          });
                        }
                      }}
                    >
                      <option value="">-- Choose Candidate --</option>
                      {candidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.candidateId} &bull; {c.fullName} &bull; {c.role} ({c.tasksCompleted || 0} tasks completed)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Candidate Name *</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      value={singleCertForm.fullName || ''}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, fullName: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Mail Id *</label>
                    <input
                      type="email"
                      required
                      className={styles.inputField}
                      value={singleCertForm.email || ''}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, email: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Cc Recipients (Carbon Copy)</label>
                    <input
                      type="text"
                      className={styles.inputField}
                      placeholder="hr@shortfundly.com, ceo@shortfundly.com"
                      value={singleCertForm.cc || ''}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, cc: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Designation *</label>
                    <input
                      type="text"
                      required
                      className={styles.inputField}
                      value={singleCertForm.role || ''}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, role: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Completion / Issue Date *</label>
                    <input
                      type="date"
                      required
                      className={styles.inputField}
                      value={singleCertForm.issueDate || ''}
                      onChange={(e) => setSingleCertForm({ ...singleCertForm, issueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  {/* PREVIEW OPTION IN SINGLE CANDIDATE CERTIFICATE */}
                  <button
                    type="button"
                    disabled={!singleCertForm.fullName || !singleCertForm.email}
                    onClick={async () => {
                      try {
                        showToast('Generating Canva-style certificate preview...', 'info');
                        const res = await fetch('/api/certificate/generate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            candidateId: certCandidateId,
                            candidateData: singleCertForm,
                          }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          setPreviewModal({
                            open: true,
                            candidate: data.candidate,
                            to: `${singleCertForm.fullName} <${singleCertForm.email}>`,
                            cc: singleCertForm.cc || '',
                            subject: data.subject,
                            emailHtml: data.emailHtml,
                            letterHtml: data.html,
                            attachments: [
                              { name: `Certificate_${singleCertForm.fullName.replace(/\\s+/g, '_')}.pdf`, type: 'application/pdf', size: 'Playwright Signed Credential' },
                            ],
                            loading: false,
                          });
                        } else {
                          showToast(data.error || 'Failed to generate certificate preview', 'error');
                        }
                      } catch (e) {
                        showToast('Error generating certificate preview', 'error');
                      }
                    }}
                    className={styles.btnAction}
                  >
                    <Eye size={15} />
                    <span>Preview Certificate & PDF</span>
                  </button>

                  <button
                    type="button"
                    disabled={certSending || !singleCertForm.fullName || !singleCertForm.email}
                    onClick={async () => {
                      try {
                        setCertSending(true);
                        showToast('Generating signed Playwright Canva certificate & dispatching...', 'info');
                        const res = await fetch('/api/certificate/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            candidateId: certCandidateId,
                            candidateName: singleCertForm.fullName,
                            email: singleCertForm.email,
                            role: singleCertForm.role,
                            issueDate: singleCertForm.issueDate,
                            cc: singleCertForm.cc,
                          }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          showToast(`Certificate ${data.certificateNumber} emailed to ${singleCertForm.fullName}!`, 'success');
                          loadCandidates();
                          loadStats();
                          loadEmails();
                        } else {
                          showToast(data.error || 'Failed to issue certificate', 'error');
                        }
                      } catch (err) {
                        showToast('Error issuing certificate', 'error');
                      } finally {
                        setCertSending(false);
                      }
                    }}
                    className={styles.btnPrimaryAction}
                  >
                    <Award size={15} />
                    <span>{certSending ? 'Generating & Sending...' : 'Send Internship Certificate'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODULE 6: TRACK EMAILS                                         */}
        {/* ============================================================== */}
        {activeTab === 'emails' && (
          <div>
            <div className={styles.pageHeader}>
              <div className={styles.pageHeaderLeft}>
                <h2 className={styles.pageTitle}>Track Emails</h2>
                <p className={styles.pageSubtitle}>
                  Real-time production audit log of all communications dispatched across Offer Letters, Tasks, Reviews, and Certificates.
                </p>
              </div>

              <div className={styles.headerActions}>
                <button onClick={loadEmails} className={styles.btnAction}>
                  <RefreshCw size={14} />
                  <span>Refresh Logs</span>
                </button>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <div className={styles.tableToolbar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div className={styles.tableSearchWrapper}>
                    <Search size={14} className={styles.tableSearchIcon} />
                    <input
                      type="text"
                      placeholder="Search by candidate name, email, or subject..."
                      className={styles.tableSearchInput}
                      value={emailSearch}
                      onChange={(e) => setEmailSearch(e.target.value)}
                    />
                  </div>

                  <select
                    className={styles.tableFilterSelect}
                    value={emailTypeFilter}
                    onChange={(e) => setEmailTypeFilter(e.target.value)}
                  >
                    <option value="ALL">All Email Types</option>
                    <option value="OFFER_LETTER">Offer Letters</option>
                    <option value="TASK_ASSIGNMENT">Task Assignments</option>
                    <option value="TASK_REVIEW_1">Review 1</option>
                    <option value="TASK_REVIEW_2">Review 2</option>
                    <option value="TASK_COMPLETED">Task Completed</option>
                    <option value="COMPLETION_CERTIFICATE">Certificates</option>
                  </select>

                  <select
                    className={styles.tableFilterSelect}
                    value={emailStatusFilter}
                    onChange={(e) => setEmailStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Delivery Statuses</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Failed">Failed</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleClearAllEmailLogs}
                    className={styles.btnAction}
                    style={{ color: '#ef4444', borderColor: '#ef444444', fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    title="Clear all email tracking records"
                  >
                    <Trash2 size={13} />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Candidate Name</th>
                    <th>Recipient Mail Id</th>
                    <th>Email Subject</th>
                    <th>Type</th>
                    <th>Attachments</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                        No email dispatch records found. Dispatched emails across Offer Letters, Tasks, Reviews, and Certificates will be tracked here in real time.
                      </td>
                    </tr>
                  ) : (
                    emailLogs
                      .filter((log) => {
                        const matchesSearch =
                          log.recipientName?.toLowerCase().includes(emailSearch.toLowerCase()) ||
                          log.recipientEmail?.toLowerCase().includes(emailSearch.toLowerCase()) ||
                          log.subject?.toLowerCase().includes(emailSearch.toLowerCase());
                        const matchesType = emailTypeFilter === 'ALL' || log.emailType === emailTypeFilter;
                        const matchesStatus = emailStatusFilter === 'ALL' || log.status === emailStatusFilter;
                        return matchesSearch && matchesType && matchesStatus;
                      })
                      .map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.sentAt).toLocaleString()}</td>
                          <td>
                            <strong>{log.recipientName || 'Candidate'}</strong>
                          </td>
                          <td>
                            <div>{log.recipientEmail}</div>
                            {log.cc && (
                              <div style={{ fontSize: '11px', color: 'var(--accent-indigo)', marginTop: '2px' }}>
                                Cc: {log.cc}
                              </div>
                            )}
                          </td>
                          <td>{log.subject}</td>
                          <td>
                            <span className={styles.tabBadge}>{log.emailType}</span>
                          </td>
                          <td>
                            {log.attachments && log.attachments !== '[]' ? (
                              <span style={{ fontSize: '11px', color: 'var(--text-accent)' }}>
                                <Paperclip size={11} style={{ marginRight: '4px' }} />
                                {JSON.parse(log.attachments).length} File(s)
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>None</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`${styles.statusBadge} ${
                                log.status === 'Delivered' ? styles.statusDelivered : styles.statusFailed
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteEmailLog(log.id)}
                              className={styles.btnAction}
                              style={{
                                color: '#ef4444',
                                borderColor: '#ef444444',
                                padding: '4px 8px',
                                fontSize: '11px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Delete email log"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SETTING                                                        */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <div>
            <div className={styles.pageHeader}>
              <div className={styles.pageHeaderLeft}>
                <h2 className={styles.pageTitle}>Setting</h2>
                <p className={styles.pageSubtitle}>
                  Configure Google SMTP authentication, production live mode, and sender identity.
                </p>
              </div>
            </div>

            <div className={styles.formCard}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>SMTP Host</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={sysSettings.smtpHost}
                    onChange={(e) => setSysSettings({ ...sysSettings, smtpHost: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>SMTP Port</label>
                  <input
                    type="number"
                    className={styles.inputField}
                    value={sysSettings.smtpPort}
                    onChange={(e) => setSysSettings({ ...sysSettings, smtpPort: parseInt(e.target.value) || 465 })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Google Account User (Email)</label>
                  <input
                    type="email"
                    className={styles.inputField}
                    value={sysSettings.smtpUser}
                    onChange={(e) => setSysSettings({ ...sysSettings, smtpUser: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Google App Password</label>
                  <input
                    type="password"
                    className={styles.inputField}
                    placeholder="16-character Google App Password"
                    onChange={(e) => setSysSettings({ ...sysSettings, smtpPassword: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Sender Profile Name</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={sysSettings.senderName}
                    onChange={(e) => setSysSettings({ ...sysSettings, senderName: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Sender Email Address</label>
                  <input
                    type="email"
                    className={styles.inputField}
                    value={sysSettings.senderEmail}
                    onChange={(e) => setSysSettings({ ...sysSettings, senderEmail: e.target.value })}
                  />
                </div>
              </div>

              {/* Safe Simulation Mode Toggle */}
              <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={sysSettings.simulationMode}
                    onChange={(e) => setSysSettings({ ...sysSettings, simulationMode: e.target.checked })}
                  />
                  <span>Safe Mailer Simulation Mode (Unchecked = Real Production Google SMTP Sending)</span>
                </label>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '24px' }}>
                  When unchecked, real emails are dispatched via Google SMTP using your authenticated Google App password.
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      showToast('Testing SMTP connection with Google...', 'info');
                      const res = await fetch('/api/settings/test-smtp', { method: 'POST' });
                      const data = await res.json();
                      if (data.success) {
                        showToast('SMTP Connection Successful! Ready for production.', 'success');
                      } else {
                        showToast(data.error || 'SMTP Connection Failed', 'error');
                      }
                    } catch (e) {
                      showToast('Error testing SMTP connection', 'error');
                    }
                  }}
                  className={styles.btnAction}
                >
                  <span>Test SMTP Connection</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(sysSettings),
                      });
                      const data = await res.json();
                      if (data.success) {
                        showToast('Settings saved successfully!', 'success');
                      }
                    } catch (e) {
                      showToast('Error saving settings', 'error');
                    }
                  }}
                  className={styles.btnPrimaryAction}
                >
                  <span>Save Configuration</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: LIVE SPLIT PREVIEW (EMAIL BODY & A4 PDF / CERTIFICATE)*/}
      {/* ============================================================== */}
      {previewModal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                Personalized Preview: {previewModal.candidate?.fullName || 'Candidate'} ({previewModal.candidate?.role || 'Intern'})
              </div>
              <button
                onClick={() => setPreviewModal({ open: false, candidate: null, subject: '', emailHtml: '', letterHtml: '', loading: false })}
                className={styles.modalClose}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Professional Gmail-Style Inspection & Header Bar */}
              <div className={styles.gmailHeaderCard}>
                <div className={styles.gmailSubjectLine}>
                  <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: '15px' }}>
                    {previewModal.subject || '(No Subject Line)'}
                  </div>
                  <span className={styles.gmailBadge}>Inbox</span>
                </div>

                <div className={styles.gmailMetaRow}>
                  <div className={styles.gmailAddressRow}>
                    <span style={{ color: 'var(--text-muted)', width: '42px', display: 'inline-block' }}>From:</span>
                    <strong>Shortfundly Operations Team</strong> &lt;{sysSettings.senderEmail || 'hr@shortfundly.com'}&gt;
                  </div>
                  <div className={styles.gmailSecurityBadge}>
                    <Shield size={12} style={{ color: '#10b981' }} />
                    <span>standard encryption (TLS) &bull; verified sender</span>
                  </div>
                </div>

                <div className={styles.gmailAddressRow} style={{ marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-muted)', width: '42px', display: 'inline-block' }}>To:</span>
                  <span>{previewModal.to || (previewModal.candidate?.email ? `${previewModal.candidate.fullName} <${previewModal.candidate.email}>` : 'candidate@shortfundly.com')}</span>
                </div>

                {previewModal.cc && (
                  <div className={styles.gmailAddressRow} style={{ marginTop: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', width: '42px', display: 'inline-block' }}>Cc:</span>
                    <span className={styles.gmailCcBadge}>{previewModal.cc}</span>
                  </div>
                )}

                {previewModal.attachments && previewModal.attachments.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                      Attachments ({previewModal.attachments.length}):
                    </span>
                    {previewModal.attachments.map((att, i) => (
                      <div key={i} className={styles.attachmentChip}>
                        {att.type?.includes('pdf') ? (
                          <FileText size={13} style={{ color: '#ef4444' }} />
                        ) : (
                          <Calendar size={13} style={{ color: '#3b82f6' }} />
                        )}
                        <span>{att.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({att.size || 'Attached'})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.splitPreviewContainer}>
                {/* Column 1: Rendered Email Body */}
                <div className={styles.previewColumn}>
                  <div className={styles.previewColumnHeader}>Personalized Email Body</div>
                  <div
                    style={{ padding: '20px', overflowY: 'auto', flex: 1, background: '#ffffff', color: '#1e293b' }}
                    dangerouslySetInnerHTML={{ __html: previewModal.emailHtml }}
                  />
                </div>

                {/* Column 2: Rendered Official Document / PDF */}
                <div className={styles.previewColumn}>
                  <div className={styles.previewColumnHeader}>Official Document / PDF Preview</div>
                  <iframe
                    title="Document Preview"
                    srcDoc={previewModal.letterHtml}
                    className={styles.previewIframe}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setPreviewModal({ open: false, candidate: null, subject: '', emailHtml: '', letterHtml: '', loading: false })}
                className={styles.btnAction}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: REVIEW CYCLE & FEEDBACK MODAL                         */}
      {/* ============================================================== */}
      {reviewModal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: '640px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                Review Feedback: {reviewModal.task?.candidate?.fullName || 'Candidate'}
              </div>
              <button
                onClick={() => setReviewModal({ open: false, task: null, feedback: '', isComplete: false })}
                className={styles.modalClose}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ background: 'var(--bg-app)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                <div><strong>Milestone Task:</strong> {reviewModal.task?.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Role: {reviewModal.task?.role} &bull; Explanation Call: {reviewModal.task?.explanationDate} at {reviewModal.task?.explanationTime}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                  Google Meet: <a href={reviewModal.task?.meetLink} target="_blank" rel="noreferrer">{reviewModal.task?.meetLink}</a>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className={styles.label}>Mentor Feedback Notes</label>
                  <button
                    type="button"
                    className={styles.btnAction}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => {
                      const auto = generateGemmaFeedback(reviewModal.task?.role || 'Web Developer', reviewModal.task?.taskNumber || 1, 2);
                      setReviewModal(prev => ({ ...prev, feedback: auto.feedback }));
                    }}
                  >
                    <Sparkles size={12} />
                    <span>Auto-Fill AI Feedback</span>
                  </button>
                </div>
                <textarea
                  className={styles.textareaField}
                  rows={4}
                  placeholder="Enter evaluation notes and action items for next review..."
                  value={reviewModal.feedback}
                  onChange={(e) => setReviewModal({ ...reviewModal, feedback: e.target.value })}
                />
              </div>

              <div style={{ background: reviewModal.isComplete ? 'rgba(52, 211, 153, 0.1)' : 'var(--bg-surface-elevated)', border: `1px solid ${reviewModal.isComplete ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`, padding: '14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: reviewModal.isComplete ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={reviewModal.isComplete}
                    onChange={(e) => setReviewModal({ ...reviewModal, isComplete: e.target.checked })}
                  />
                  <span>Complete Task & Stop Review Loops (Updates Excel & Qualifies for Certificate)</span>
                </label>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '24px' }}>
                  When checked, marks milestone task as completed, writes updated count to Shortfundly_Internship_Candidates_Dummy.xlsx on disk, and qualifies candidate for Internship Certificate.
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setReviewModal({ open: false, task: null, feedback: '', isComplete: false })}
                className={styles.btnAction}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    showToast('Submitting review evaluation...', 'info');
                    const res = await fetch('/api/tasks/review', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        taskId: reviewModal.task.id,
                        feedback: reviewModal.feedback,
                        isTaskComplete: reviewModal.isComplete,
                        action: reviewModal.isComplete ? 'complete' : (reviewModal.task.reviewCount === 0 ? 'review_1' : 'review_2'),
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      showToast(data.message || 'Review cycle updated!', 'success');
                      setReviewModal({ open: false, task: null, feedback: '', isComplete: false });
                      loadCandidates();
                      loadStats();
                      loadEmails();
                    } else {
                      showToast(data.error || 'Failed to submit review', 'error');
                    }
                  } catch (err) {
                    showToast('Error submitting review', 'error');
                  }
                }}
                className={styles.btnPrimaryAction}
              >
                {reviewModal.isComplete ? 'Approve & Complete Task' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: VIEW / SWITCH OPERATIONAL PERSONA PROFILE             */}
      {/* ============================================================== */}
      {profileModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: '460px' }}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Operational Persona Profile</div>
              <button onClick={() => setProfileModal(false)} className={styles.modalClose}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label className={styles.label}>Active Persona Role</label>
                <select
                  className={styles.inputField}
                  value={adminUser.role}
                  onChange={(e) => handleRoleSwitch(e.target.value)}
                >
                  <option value="ADMIN">ADMIN - System Administrator</option>
                  <option value="HR">HR - Human Resources Director</option>
                  <option value="CEO">CEO - Founder & Chief Executive Officer</option>
                </select>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label className={styles.label}>Name</label>
                <input
                  type="text"
                  className={styles.inputField}
                  value={adminUser.name}
                  onChange={(e) => setAdminUser({ ...adminUser, name: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <input
                  type="email"
                  className={styles.inputField}
                  value={adminUser.email}
                  disabled
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={() => setProfileModal(false)} className={styles.btnPrimaryAction}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Stack */}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            {toast.type === 'success' && <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} />}
            {toast.type === 'error' && <AlertCircle size={16} style={{ color: 'var(--accent-rose)' }} />}
            {toast.type === 'warning' && <AlertCircle size={16} style={{ color: 'var(--accent-amber)' }} />}
            {toast.type === 'info' && <Sparkles size={16} style={{ color: 'var(--accent-cyan)' }} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
