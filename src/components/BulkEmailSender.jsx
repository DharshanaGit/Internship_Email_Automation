'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './BulkEmailSender.module.css';
import {
  MailIcon,
  BuildingIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  CloseIcon,
  SendIcon,
} from './Icons.jsx';
import { renderTemplate, formatBodyToHtml } from '@/lib/templates.js';

import * as XLSX from 'xlsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EXTRACT_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function cleanString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function extractEmail(val) {
  if (!val) return '';
  const s = String(val).trim();
  const match = s.match(EXTRACT_EMAIL_REGEX);
  return match ? match[0].toLowerCase() : s.toLowerCase();
}

// Resilient Text CSV parser fallback for edge cases
function parseCsvTextTo2D(text) {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  const delimiters = [',', ';', '\t', '|'];
  let bestDelim = ',';
  let maxCount = -1;
  for (const d of delimiters) {
    const count = (firstLine.match(new RegExp('\\' + d, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelim = d;
    }
  }

  const parseLine = (line) => {
    const row = [];
    let insideQuote = false;
    let entry = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuote && line[i + 1] === '"') {
          entry += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === bestDelim && !insideQuote) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    return row;
  };

  return lines.map(parseLine);
}

// Universal spreadsheet parser supporting Excel (.xlsx, .xls), CSV, TSV with smart header detection
function parseSpreadsheetBuffer(buffer, fileName = '') {
  let raw2d = [];

  // 1. Attempt SheetJS binary parsing (supports .xlsx, .xls, .ods, .csv)
  try {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
    let maxRows = 0;
    let bestSheet = null;

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (data && data.length > maxRows) {
        maxRows = data.length;
        bestSheet = data;
      }
    }
    if (bestSheet && bestSheet.length > 0) {
      raw2d = bestSheet;
    }
  } catch (err) {
    console.warn('[SpreadsheetParser] SheetJS parse notice, attempting text decode fallback:', err?.message);
    try {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(buffer);
      raw2d = parseCsvTextTo2D(text);
    } catch {}
  }

  if (!raw2d || raw2d.length === 0) {
    return [];
  }

  const cleanRows = raw2d.filter((row) => Array.isArray(row) && row.some((cell) => cleanString(cell).length > 0));
  if (cleanRows.length === 0) return [];

  // 2. Identify header row index by scanning rows 0 to 10
  let headerRowIdx = 0;
  let highestHeaderScore = 0;

  for (let r = 0; r < Math.min(10, cleanRows.length); r++) {
    const row = cleanRows[r];
    let score = 0;
    for (const cell of row) {
      const norm = cleanString(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (norm.includes('email') || norm.includes('mailid') || norm === 'mail' || norm.includes('emailaddress')) score += 5;
      if (norm.includes('college') || norm.includes('institution') || norm.includes('institute') || norm.includes('university') || norm.includes('campus') || norm.includes('school')) score += 4;
      if (norm.includes('contact') || norm.includes('coordinator') || norm.includes('principal') || norm.includes('hod') || norm.includes('faculty') || norm === 'name') score += 2;
      if (norm.includes('dept') || norm.includes('department') || norm.includes('branch') || norm.includes('stream')) score += 2;
      if (norm.includes('designation') || norm.includes('role') || norm.includes('title')) score += 2;
    }
    if (score > highestHeaderScore) {
      highestHeaderScore = score;
      headerRowIdx = r;
    }
  }

  const rawHeaders = cleanRows[headerRowIdx];
  const normalizedHeaders = rawHeaders.map((h) => cleanString(h).toLowerCase().replace(/[^a-z0-9]/g, ''));

  let collegeCol = -1;
  let emailCol = -1;
  let departmentCol = -1;
  let contactCol = -1;
  let designationCol = -1;

  normalizedHeaders.forEach((h, idx) => {
    if (emailCol === -1 && (h.includes('email') || h.includes('mailid') || h === 'mail' || h.includes('emailaddress') || h.includes('contactemail') || h.includes('officialemail'))) {
      emailCol = idx;
    } else if (collegeCol === -1 && (h.includes('college') || h.includes('institution') || h.includes('institute') || h.includes('university') || h.includes('campus') || h.includes('school') || h.includes('academy') || h.includes('collegename'))) {
      collegeCol = idx;
    } else if (departmentCol === -1 && (h.includes('dept') || h.includes('department') || h.includes('branch') || h.includes('stream') || h.includes('course') || h.includes('division') || h.includes('discipline'))) {
      departmentCol = idx;
    } else if (contactCol === -1 && (h.includes('contactperson') || h.includes('contactname') || h.includes('faculty') || h.includes('coordinator') || h.includes('principal') || h.includes('hod') || h.includes('dean') || h.includes('personname') || h === 'name' || h === 'contact')) {
      contactCol = idx;
    } else if (designationCol === -1 && (h.includes('designation') || h.includes('role') || h.includes('title') || h.includes('position') || h.includes('post'))) {
      designationCol = idx;
    }
  });

  const dataRows = (highestHeaderScore > 0) ? cleanRows.slice(headerRowIdx + 1) : cleanRows;

  // Content-based fallback if header names did not identify email
  if (emailCol === -1 && dataRows.length > 0) {
    const maxCols = Math.max(...dataRows.slice(0, 50).map((r) => r.length), 1);
    const emailCounts = new Array(maxCols).fill(0);
    dataRows.slice(0, 50).forEach((row) => {
      row.forEach((cell, idx) => {
        if (EXTRACT_EMAIL_REGEX.test(cleanString(cell))) {
          emailCounts[idx]++;
        }
      });
    });
    const bestEmailCol = emailCounts.indexOf(Math.max(...emailCounts));
    if (emailCounts[bestEmailCol] > 0) {
      emailCol = bestEmailCol;
    }
  }

  // Content-based fallback for college name
  if (collegeCol === -1 && dataRows.length > 0) {
    const maxCols = Math.max(...dataRows.slice(0, 50).map((r) => r.length), 1);
    for (let c = 0; c < maxCols; c++) {
      if (c !== emailCol && c !== departmentCol && c !== contactCol && c !== designationCol) {
        collegeCol = c;
        break;
      }
    }
    if (collegeCol === -1) collegeCol = 0;
  }

  const results = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0) continue;

    const rawEmail = emailCol !== -1 ? row[emailCol] : '';
    const email = extractEmail(rawEmail);
    const collegeName = collegeCol !== -1 ? cleanString(row[collegeCol]) : '';
    const department = departmentCol !== -1 ? cleanString(row[departmentCol]) : '';
    const contactPerson = contactCol !== -1 ? cleanString(row[contactCol]) : '';
    const designation = designationCol !== -1 ? cleanString(row[designationCol]) : '';

    if (!email && !collegeName) continue;

    results.push({
      id: 'row_' + i + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      college_name: collegeName,
      email: email,
      department: department,
      contact_person: contactPerson,
      designation: designation,
    });
  }

  return results;
}

export default function BulkEmailSender({ templates = [], session, onCampaignFinished }) {
  const canSend = session ? (session.role === 'admin' || session.role === 'team_lead' || Boolean(session.can_send)) : true;
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [filterType, setFilterType] = useState('all'); // all, eligible, duplicate, invalid, cooldown
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Template & Personalization
  const [availableTemplates, setAvailableTemplates] = useState(templates);
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || 'campus-collaboration-proposal');
  const [subjectTemplate, setSubjectTemplate] = useState('Collaboration with Shortfundly Campus - [College Name]');
  const [bodyTemplate, setBodyTemplate] = useState('');

  // Dispatch & Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [dispatchTargets, setDispatchTargets] = useState([]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState(null); // { total, current, sent, failed, skipped }
  const [campaignSummary, setCampaignSummary] = useState(null);

  // Sync available templates when props change
  useEffect(() => {
    if (templates && templates.length > 0) {
      setAvailableTemplates(templates);
    }
  }, [templates]);

  // Always fetch fresh templates directly from API on mount
  useEffect(() => {
    async function loadFreshTemplates() {
      try {
        const res = await fetch('/api/outreach/templates');
        if (res.ok) {
          const data = await res.json();
          if (data.templates && data.templates.length > 0) {
            setAvailableTemplates(data.templates);
          }
        }
      } catch {
        // Fallback to props
      }
    }
    loadFreshTemplates();
  }, []);

  // Sync default template
  useEffect(() => {
    if (availableTemplates.length > 0) {
      const active = availableTemplates.find((t) => t.id === selectedTemplateId) || availableTemplates[0];
      if (active) {
        setSubjectTemplate(active.subject_template || active.subjectTemplate || '');
        setBodyTemplate(active.body_template || active.bodyTemplate || '');
      }
    }
  }, [availableTemplates, selectedTemplateId]);

  const handleTemplateChange = (e) => {
    const id = e.target.value;
    setSelectedTemplateId(id);
    const chosen = availableTemplates.find((t) => t.id === id);
    if (chosen) {
      setSubjectTemplate(chosen.subject_template || chosen.subjectTemplate || '');
      setBodyTemplate(chosen.body_template || chosen.bodyTemplate || '');
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setAnalyzing(true);
    setCampaignSummary(null);
    setCurrentPage(1);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target.result;
      const rawRows = parseSpreadsheetBuffer(buffer, file.name);

      if (rawRows.length === 0) {
        alert('The uploaded spreadsheet/CSV file is empty or missing valid data rows. Please verify your file and retry.');
        setAnalyzing(false);
        return;
      }

      // 1. Analyze format and file-level duplicates
      const seenEmails = new Set();
      const validEmailsToQuery = [];

      const initialAnalyzed = rawRows.map((row) => {
        const normEmail = (row.email || '').toLowerCase().trim();
        let status = 'eligible';
        let statusReason = '';

        if (!normEmail || !EMAIL_REGEX.test(normEmail)) {
          status = 'invalid';
          statusReason = 'Invalid email address format';
        } else if (!row.college_name) {
          status = 'invalid';
          statusReason = 'College name is required';
        } else if (seenEmails.has(normEmail)) {
          status = 'duplicate';
          statusReason = 'Duplicate entry in spreadsheet';
        } else {
          seenEmails.add(normEmail);
          validEmailsToQuery.push(normEmail);
        }

        return {
          ...row,
          normalized_email: normEmail,
          status,
          statusReason,
          dispatchStatus: 'idle', // idle, sending, success, failed
          errorMessage: null,
        };
      });

      // 2. Query database for previous outreach cooldowns in batch (up to 10,000)
      let cooldownMap = {};
      if (validEmailsToQuery.length > 0) {
        try {
          const res = await fetch('/api/outreach/check-batch-duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails: validEmailsToQuery.slice(0, 10000) }),
          });
          if (res.ok) {
            const data = await res.json();
            cooldownMap = data.results || {};
          }
        } catch {
          // If network check fails, proceed with initial analysis
        }
      }

      // 3. Mark database cooldowns
      const finalAnalyzed = initialAnalyzed.map((row) => {
        if (row.status === 'eligible' && cooldownMap[row.normalized_email]?.isDuplicate) {
          const info = cooldownMap[row.normalized_email];
          return {
            ...row,
            status: 'cooldown',
            statusReason: `Contacted ${info.daysAgo === 0 ? 'today' : `${info.daysAgo}d ago`} (${info.lastRecord?.status})`,
          };
        }
        return row;
      });

      setRecipients(finalAnalyzed);

      // Default select all eligible rows
      const eligibleIds = new Set(
        finalAnalyzed.filter((r) => r.status === 'eligible').map((r) => r.id)
      );
      setSelectedIds(eligibleIds);
      setActivePreviewIndex(0);
      setCurrentPage(1);
      setAnalyzing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Metrics
  const totalRows = recipients.length;
  const validCount = recipients.filter((r) => r.status !== 'invalid').length;
  const invalidCount = recipients.filter((r) => r.status === 'invalid').length;
  const fileDuplicateCount = recipients.filter((r) => r.status === 'duplicate').length;
  const cooldownCount = recipients.filter((r) => r.status === 'cooldown').length;
  const eligibleCount = recipients.filter((r) => r.status === 'eligible').length;

  // Filtered rows
  const filteredRecipients = recipients.filter((r) => {
    if (filterType === 'eligible') return r.status === 'eligible';
    if (filterType === 'cooldown') return r.status === 'cooldown';
    if (filterType === 'duplicate') return r.status === 'duplicate';
    if (filterType === 'invalid') return r.status === 'invalid';
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecipients.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredRecipients.length);
  const paginatedRecipients = filteredRecipients.slice(startIndex, endIndex);

  const handleFilterChange = (type) => {
    setFilterType(type);
    setCurrentPage(1);
  };

  // Selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set(filteredRecipients.map((r) => r.id));
    setSelectedIds(all);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSelectEligibleOnly = () => {
    const eligible = new Set(recipients.filter((r) => r.status === 'eligible').map((r) => r.id));
    setSelectedIds(eligible);
  };

  // Personalization rendering
  const activeRecipient = recipients[activePreviewIndex] || recipients[0] || null;

  const mergePlaceholders = (text, item) => {
    if (!text || !item) return text || '';
    const vars = {
      college_name: item.college_name || '',
      department: item.department || '',
      contact_person: item.contact_person || '',
      designation: item.designation || '',
      email: item.email || '',
      sender_name: 'Shortfundly Campus Outreach',
    };
    return renderTemplate(text, vars);
  };

  const insertVariable = (varName) => {
    setBodyTemplate((prev) => prev + ' ' + varName + ' ');
  };

  // Dispatch Preparation
  const triggerSendSelected = () => {
    const targets = recipients.filter((r) => selectedIds.has(r.id));
    if (targets.length === 0) {
      alert('Please select at least one recipient to send outreach.');
      return;
    }
    setDispatchTargets(targets);
    setConfirmModalOpen(true);
  };

  const triggerSendAllEligible = () => {
    const targets = recipients.filter((r) => r.status === 'eligible');
    if (targets.length === 0) {
      alert('No eligible recipients found in this file.');
      return;
    }
    setDispatchTargets(targets);
    setConfirmModalOpen(true);
  };

  // Execute Safe Sequential Campaign Dispatch
  const executeCampaignDispatch = async () => {
    setConfirmModalOpen(false);
    setIsDispatching(true);

    const targets = [...dispatchTargets];
    const total = targets.length;
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    setCampaignProgress({
      total,
      current: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];

      // Mark row as sending
      setRecipients((prev) =>
        prev.map((r) => (r.id === target.id ? { ...r, dispatchStatus: 'sending' } : r))
      );

      // Merge individualized placeholders
      const personalizedSubject = mergePlaceholders(subjectTemplate, target);
      const personalizedBody = mergePlaceholders(bodyTemplate, target);

      // Convert body to well-aligned HTML preserving paragraphs and links
      const bodyHtml = formatBodyToHtml(personalizedBody);

      try {
        const res = await fetch('/api/outreach/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            college_name: target.college_name,
            email: target.email,
            department: target.department || 'Outreach & Partnerships',
            contact_person: target.contact_person || 'Sir/Madam',
            designation: target.designation || 'Faculty',
            subject: personalizedSubject,
            body_html: bodyHtml,
            override_duplicate: target.status === 'cooldown',
            override_reason: target.status === 'cooldown' ? 'Campaign batch dispatch explicitly authorized by operator.' : null,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          sentCount++;
          setRecipients((prev) =>
            prev.map((r) =>
              r.id === target.id
                ? { ...r, dispatchStatus: 'success', statusReason: 'Delivered via Google SMTP' }
                : r
            )
          );
        } else {
          failedCount++;
          const reason = data.error || 'Failed to dispatch email';
          setRecipients((prev) =>
            prev.map((r) =>
              r.id === target.id
                ? { ...r, dispatchStatus: 'failed', errorMessage: reason }
                : r
            )
          );
        }
      } catch (err) {
        failedCount++;
        setRecipients((prev) =>
          prev.map((r) =>
            r.id === target.id
              ? { ...r, dispatchStatus: 'failed', errorMessage: 'Network communication timeout' }
              : r
          )
        );
      }

      setCampaignProgress({
        total,
        current: i + 1,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
      });

      // Polite rate-limit delay between emails (300ms) to respect Google SMTP socket limits
      if (i < targets.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    setIsDispatching(false);
    setCampaignSummary({
      total,
      sent: sentCount,
      failed: failedCount,
      timestamp: new Date().toLocaleTimeString(),
    });

    if (onCampaignFinished) {
      onCampaignFinished();
    }
  };

  return (
    <div className={styles.container}>
      {/* Upload & Setup Card */}
      <div className={styles.uploadCard}>
        <div className={styles.uploadHeader}>
          <div>
            <div className={styles.uploadTitle}>Bulk Campus Outreach Dispatcher</div>
            <div className={styles.uploadSub}>
              Import campus contacts via CSV, select target recipients, personalize outreach letters, and dispatch individual customized emails.
            </div>
          </div>

          <a
            href="/sample_college_outreach.csv"
            download="sample_college_outreach.csv"
            className={styles.downloadSampleBtn}
          >
            Download Sample CSV Template
          </a>
        </div>

        {/* Dropzone */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,.xlsx,.xls,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        <div
          className={styles.dropzone}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
        >
          <MailIcon size={32} className={styles.dropzoneIcon} />
          <div className={styles.dropzoneMainText}>
            Click or drag &amp; drop your college contacts Excel (.xlsx, .xls) or CSV file here
          </div>
          <div className={styles.dropzoneSubText}>
            Supported: Excel (.xlsx, .xls), CSV &bull; Auto-detects: College Name, Email, Department, Contact Person, Designation
          </div>
        </div>

        {fileName && (
          <div className={styles.fileChosenBanner}>
            <span>File imported: {fileName} ({totalRows} rows parsed)</span>
            <button
              type="button"
              className={styles.btnActionSm}
              onClick={() => {
                setFileName('');
                setRecipients([]);
                setSelectedIds(new Set());
                setCampaignSummary(null);
                setCampaignProgress(null);
              }}
            >
              Clear File
            </button>
          </div>
        )}
      </div>

      {/* Recipient Breakdown Metrics */}
      {totalRows > 0 && (
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Total Contacts</span>
            <span className={styles.metricValue}>{totalRows}</span>
          </div>
          <div className={`${styles.metricCard} ${styles.metricEligible}`}>
            <span className={styles.metricLabel}>Eligible to Send</span>
            <span className={styles.metricValue}>{eligibleCount}</span>
          </div>
          <div className={`${styles.metricCard} ${styles.metricCooldown}`}>
            <span className={styles.metricLabel}>In 30d Cooldown</span>
            <span className={styles.metricValue}>{cooldownCount}</span>
          </div>
          <div className={`${styles.metricCard} ${styles.metricDuplicate}`}>
            <span className={styles.metricLabel}>CSV Duplicates</span>
            <span className={styles.metricValue}>{fileDuplicateCount}</span>
          </div>
          <div className={`${styles.metricCard} ${styles.metricInvalid}`}>
            <span className={styles.metricLabel}>Invalid Addresses</span>
            <span className={styles.metricValue}>{invalidCount}</span>
          </div>
        </div>
      )}

      {/* Campaign Progress Bar */}
      {campaignProgress && (
        <div className={styles.progressCard}>
          <div className={styles.progressTop}>
            <span>
              {isDispatching ? 'Campaign In Progress...' : 'Campaign Completed'}
            </span>
            <span>
              {campaignProgress.current} / {campaignProgress.total} (
              {Math.round((campaignProgress.current / campaignProgress.total) * 100)}%)
            </span>
          </div>

          <div className={styles.progressBarTrack}>
            <div
              className={styles.progressBarFill}
              style={{
                width: `${(campaignProgress.current / campaignProgress.total) * 100}%`,
              }}
            />
          </div>

          <div className={styles.progressStats}>
            <span className={styles.statItemSent}>Sent: {campaignProgress.sent}</span>
            <span className={styles.statItemFailed}>Failed: {campaignProgress.failed}</span>
            <span className={styles.statItemSkipped}>Remaining: {campaignProgress.total - campaignProgress.current}</span>
          </div>
        </div>
      )}

      {/* Final Campaign Summary Banner */}
      {campaignSummary && !isDispatching && (
        <div
          style={{
            background: campaignSummary.failed === 0 ? '#ecfdf5' : '#fffbeb',
            border: `1px solid ${campaignSummary.failed === 0 ? '#a7f3d0' : '#fde68a'}`,
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
              Campaign Dispatch Concluded at {campaignSummary.timestamp}
            </div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
              Successfully delivered: <strong>{campaignSummary.sent}</strong> &bull; Failed: <strong>{campaignSummary.failed}</strong>
            </div>
          </div>

          {campaignSummary.failed > 0 && (
            <button
              type="button"
              className={styles.btnDispatch}
              onClick={() => {
                const failedTargets = recipients.filter((r) => r.dispatchStatus === 'failed');
                setDispatchTargets(failedTargets);
                setConfirmModalOpen(true);
              }}
            >
              Retry {campaignSummary.failed} Failed Outreach
            </button>
          )}
        </div>
      )}

      {/* Interactive Recipient Table */}
      {totalRows > 0 && (
        <div className={styles.recipientCard}>
          <div className={styles.tableToolbar}>
            <div className={styles.selectionControls}>
              <button type="button" className={styles.btnActionSm} onClick={handleSelectAll}>
                Select All
              </button>
              <button type="button" className={styles.btnActionSm} onClick={handleDeselectAll}>
                Deselect All
              </button>
              <button type="button" className={styles.btnActionSm} onClick={handleSelectEligibleOnly}>
                Select Eligible Only ({eligibleCount})
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                {selectedIds.size} selected
              </span>
            </div>

            <div className={styles.filterChips}>
              <button
                type="button"
                className={`${styles.chipBtn} ${filterType === 'all' ? styles.chipBtnActive : ''}`}
                onClick={() => handleFilterChange('all')}
              >
                All ({totalRows.toLocaleString()})
              </button>
              <button
                type="button"
                className={`${styles.chipBtn} ${filterType === 'eligible' ? styles.chipBtnActive : ''}`}
                onClick={() => handleFilterChange('eligible')}
              >
                Eligible ({eligibleCount.toLocaleString()})
              </button>
              <button
                type="button"
                className={`${styles.chipBtn} ${filterType === 'cooldown' ? styles.chipBtnActive : ''}`}
                onClick={() => handleFilterChange('cooldown')}
              >
                Cooldown ({cooldownCount.toLocaleString()})
              </button>
              <button
                type="button"
                className={`${styles.chipBtn} ${filterType === 'duplicate' ? styles.chipBtnActive : ''}`}
                onClick={() => handleFilterChange('duplicate')}
              >
                Duplicates ({fileDuplicateCount.toLocaleString()})
              </button>
              <button
                type="button"
                className={`${styles.chipBtn} ${filterType === 'invalid' ? styles.chipBtnActive : ''}`}
                onClick={() => handleFilterChange('invalid')}
              >
                Invalid ({invalidCount.toLocaleString()})
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={filteredRecipients.length > 0 && filteredRecipients.every((r) => selectedIds.has(r.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectAll();
                        } else {
                          handleDeselectAll();
                        }
                      }}
                    />
                  </th>
                  <th>College Name</th>
                  <th>Recipient Email</th>
                  <th>Department</th>
                  <th>Contact Person</th>
                  <th>Status / Audit</th>
                  <th>Dispatch State</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecipients.map((r) => {
                  const isSelected = selectedIds.has(r.id);
                  const isPreviewed = activeRecipient?.id === r.id;

                  const getStatusBadge = () => {
                    if (r.status === 'eligible') {
                      return <span className={`${styles.statusBadge} ${styles.badgeEligible}`}>Eligible</span>;
                    }
                    if (r.status === 'cooldown') {
                      return (
                        <span className={`${styles.statusBadge} ${styles.badgeCooldown}`} title={r.statusReason}>
                          {r.statusReason}
                        </span>
                      );
                    }
                    if (r.status === 'duplicate') {
                      return <span className={`${styles.statusBadge} ${styles.badgeDuplicate}`}>Duplicate</span>;
                    }
                    return <span className={`${styles.statusBadge} ${styles.badgeInvalid}`}>Invalid Format</span>;
                  };

                  const getDispatchBadge = () => {
                    if (r.dispatchStatus === 'sending') {
                      return <span className={`${styles.statusBadge} ${styles.badgeSending}`}>Sending...</span>;
                    }
                    if (r.dispatchStatus === 'success') {
                      return <span className={`${styles.statusBadge} ${styles.badgeSent}`}>Sent (Accepted)</span>;
                    }
                    if (r.dispatchStatus === 'failed') {
                      return (
                        <span className={`${styles.statusBadge} ${styles.badgeFailed}`} title={r.errorMessage}>
                          Failed ({r.errorMessage || 'Error'})
                        </span>
                      );
                    }
                    return <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Queued</span>;
                  };

                  return (
                    <tr
                      key={r.id}
                      className={`${styles.row} ${isSelected ? styles.rowSelected : ''} ${
                        isPreviewed ? styles.rowPreviewSelected : ''
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        const originalIndex = recipients.findIndex((orig) => orig.id === r.id);
                        if (originalIndex !== -1) setActivePreviewIndex(originalIndex);
                      }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={isSelected}
                          onChange={() => handleToggleSelect(r.id)}
                        />
                      </td>
                      <td>
                        <strong>{r.college_name || '—'}</strong>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{r.email}</td>
                      <td>{r.department || '—'}</td>
                      <td>
                        {r.contact_person || 'Sir/Madam'}
                        {r.designation ? ` (${r.designation})` : ''}
                      </td>
                      <td>{getStatusBadge()}</td>
                      <td>{getDispatchBadge()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRecipients.length > 0 && (
            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                Showing <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of{' '}
                <strong>{filteredRecipients.length.toLocaleString()}</strong> contacts
                {filteredRecipients.length < totalRows && ` (filtered from ${totalRows.toLocaleString()} total)`}
              </div>

              <div className={styles.paginationButtons}>
                <button
                  type="button"
                  className={styles.paginationBtn}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                >
                  &larr; Previous
                </button>
                <span className={styles.paginationPageIndicator}>
                  Page {safeCurrentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.paginationBtn}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Personalization & Preview Section */}
      {totalRows > 0 && (
        <div className={styles.customizationCard}>
          <div className={styles.uploadTitle}>Email Template &amp; Personalization</div>
          <div className={styles.uploadSub}>
            Customize the message variables. Each recipient receives their own personalized copy merged with their institutional parameters.
          </div>

          <div className={styles.splitEditorGrid}>
            {/* Editor Pane */}
            <div className={styles.editorPane}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Select Base Template</label>
                <select
                  className={styles.select}
                  value={selectedTemplateId}
                  onChange={handleTemplateChange}
                >
                  {availableTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Subject Template</label>
                <input
                  type="text"
                  className={styles.input}
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email Body</label>
                <div className={styles.helperChips}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Insert:</span>
                  <button type="button" className={styles.variableChip} onClick={() => insertVariable('[College Name]')}>
                    + [College Name]
                  </button>
                  <button type="button" className={styles.variableChip} onClick={() => insertVariable('[Contact Person]')}>
                    + [Contact Person]
                  </button>
                  <button type="button" className={styles.variableChip} onClick={() => insertVariable('[Department]')}>
                    + [Department]
                  </button>
                  <button type="button" className={styles.variableChip} onClick={() => insertVariable('[Designation]')}>
                    + [Designation]
                  </button>
                </div>
                <textarea
                  className={styles.textarea}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                />
              </div>
            </div>

            {/* Live Preview Pane */}
            <div className={styles.previewPane}>
              <div className={styles.previewHeader}>
                <div className={styles.previewTitle}>Live Merged Preview</div>
                <div className={styles.previewRecipient}>
                  {activeRecipient ? (
                    <>Target: <strong>{activeRecipient.college_name}</strong> &lt;{activeRecipient.email}&gt;</>
                  ) : (
                    'No contact selected'
                  )}
                </div>
              </div>

              <div className={styles.previewSubject}>
                Subject: {mergePlaceholders(subjectTemplate, activeRecipient)}
              </div>

              <div
                className={styles.previewBody}
                dangerouslySetInnerHTML={{
                  __html: formatBodyToHtml(mergePlaceholders(bodyTemplate, activeRecipient)),
                }}
              />
            </div>
          </div>

          {/* Action Dispatch Bar */}
          <div className={styles.dispatchBar}>
            <div className={styles.dispatchLeft}>
              <span className={styles.selectedCount}>
                Selected: {selectedIds.size} recipient(s) &bull; Eligible: {eligibleCount}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className={styles.btnDispatchSecondary}
                onClick={triggerSendAllEligible}
                disabled={isDispatching || eligibleCount === 0 || !canSend}
              >
                Send to All Eligible ({eligibleCount})
              </button>

              <button
                type="button"
                className={styles.btnDispatch}
                onClick={triggerSendSelected}
                disabled={isDispatching || selectedIds.size === 0 || !canSend}
              >
                <SendIcon size={16} />
                <span>Send to Selected ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setConfirmModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Confirm Outreach Campaign Dispatch</div>
              <button
                type="button"
                style={{ padding: '4px', cursor: 'pointer' }}
                onClick={() => setConfirmModalOpen(false)}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>
                You are about to initiate an automated outreach campaign to{' '}
                <strong>{dispatchTargets.length} institution(s)</strong>.
              </p>

              <div className={styles.securityNote}>
                <strong>Privacy &amp; Compliance Guarantee:</strong> A separate, individually customized email will be sent to each recipient. Recipient email addresses will never be exposed or shared in To, CC, or BCC fields.
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Template: <strong>{templates.find((t) => t.id === selectedTemplateId)?.title || 'Custom'}</strong>
                <br />
                Delivery Channel: <strong>Production Google SMTP (SSL Port 465)</strong>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnDispatchSecondary}
                onClick={() => setConfirmModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnDispatch}
                onClick={executeCampaignDispatch}
              >
                Confirm &amp; Start Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
