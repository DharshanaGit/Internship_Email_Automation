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

// RFC-compliant CSV parser handling quoted strings and commas
function parseCsv(text) {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

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
      } else if (char === ',' && !insideQuote) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    return row;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || values.every((v) => !v)) continue;

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });

    const college_name = rowObj['collegename'] || rowObj['college'] || rowObj['institution'] || values[0] || '';
    const email = rowObj['email'] || rowObj['emailaddress'] || rowObj['recipientemail'] || values[1] || '';
    const department = rowObj['department'] || rowObj['dept'] || rowObj['division'] || values[2] || '';
    const contact_person = rowObj['contactperson'] || rowObj['contact'] || rowObj['name'] || values[3] || '';
    const designation = rowObj['designation'] || rowObj['role'] || rowObj['title'] || values[4] || '';

    rows.push({
      id: 'row_' + i + '_' + Date.now(),
      college_name: college_name.trim(),
      email: email.trim(),
      department: department.trim(),
      contact_person: contact_person.trim(),
      designation: designation.trim(),
    });
  }

  return rows;
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

  // Template & Personalization
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || 'campus-collaboration-proposal');
  const [subjectTemplate, setSubjectTemplate] = useState('Collaboration with Shortfundly Campus - [College Name]');
  const [bodyTemplate, setBodyTemplate] = useState('');

  // Dispatch & Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [dispatchTargets, setDispatchTargets] = useState([]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState(null); // { total, current, sent, failed, skipped }
  const [campaignSummary, setCampaignSummary] = useState(null);

  // Sync default template
  useEffect(() => {
    if (templates.length > 0) {
      const active = templates.find((t) => t.id === selectedTemplateId) || templates[0];
      if (active) {
        setSubjectTemplate(active.subject_template || active.subjectTemplate || '');
        setBodyTemplate(active.body_template || active.bodyTemplate || '');
      }
    }
  }, [templates, selectedTemplateId]);

  const handleTemplateChange = (e) => {
    const id = e.target.value;
    setSelectedTemplateId(id);
    const chosen = templates.find((t) => t.id === id);
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

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const rawRows = parseCsv(text);

      if (rawRows.length === 0) {
        alert('The uploaded CSV file is empty or missing headers. Please verify and retry.');
        setAnalyzing(false);
        return;
      }

      // 1. Analyze format and file-level duplicates
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const seenEmails = new Set();
      const validEmailsToQuery = [];

      const initialAnalyzed = rawRows.map((row) => {
        const normEmail = row.email.toLowerCase();
        let status = 'eligible';
        let statusReason = '';

        if (!row.email || !emailRegex.test(normEmail)) {
          status = 'invalid';
          statusReason = 'Invalid email address format';
        } else if (!row.college_name) {
          status = 'invalid';
          statusReason = 'College name is required';
        } else if (seenEmails.has(normEmail)) {
          status = 'duplicate';
          statusReason = 'Duplicate entry in CSV file';
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

      // 2. Query database for previous outreach cooldowns in batch
      let cooldownMap = {};
      if (validEmailsToQuery.length > 0) {
        try {
          const res = await fetch('/api/outreach/check-batch-duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails: validEmailsToQuery }),
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
      setAnalyzing(false);
    };

    reader.readAsText(file);
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
    return text
      .replace(/\[College Name\]/gi, item.college_name || '[College Name]')
      .replace(/\[Contact Person\]/gi, item.contact_person || 'Sir/Madam')
      .replace(/\[Department\]/gi, item.department || '[Department]')
      .replace(/\[Designation\]/gi, item.designation || '[Designation]')
      .replace(/\[Recipient Email\]/gi, item.email || '[Recipient Email]');
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

      // Convert body to simple clean HTML
      const bodyHtml = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">
          ${personalizedBody.replace(/\n/g, '<br/>')}
        </div>
      `;

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
          accept=".csv,text/csv"
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
            Click or drag &amp; drop your college contacts CSV here
          </div>
          <div className={styles.dropzoneSubText}>
            Supported columns: college_name, email, department, contact_person, designation
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
                onClick={() => setFilterType('all')}
              >
                All ({totalRows})
              </button>
              <button
                type="button"
                className={`${styles.chipBtn} ${filterType === 'eligible' ? styles.chipBtnActive : ''}`}
                onClick={() => setFilterType('eligible')}
              >
                Eligible ({eligibleCount})
              </button>
              <button
                type="button"
                className={`${styles.chipBtn} ${filterType === 'cooldown' ? styles.chipBtnActive : ''}`}
                onClick={() => setFilterType('cooldown')}
              >
                Cooldown ({cooldownCount})
              </button>
              <button
                type="button"
                className={`${styles.chipBtn} ${filterType === 'duplicate' ? styles.chipBtnActive : ''}`}
                onClick={() => setFilterType('duplicate')}
              >
                Duplicates ({fileDuplicateCount})
              </button>
              <button
                type="button"
                className={`${styles.chipBtn} ${filterType === 'invalid' ? styles.chipBtnActive : ''}`}
                onClick={() => setFilterType('invalid')}
              >
                Invalid ({invalidCount})
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
                {filteredRecipients.map((r, idx) => {
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
                      return <span className={`${styles.statusBadge} ${styles.badgeDuplicate}`}>CSV Duplicate</span>;
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
                  {templates.map((t) => (
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

              <div className={styles.previewBody}>
                {mergePlaceholders(bodyTemplate, activeRecipient)}
              </div>
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
