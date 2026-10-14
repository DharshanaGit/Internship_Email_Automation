'use client';

import React, { useState, useEffect } from 'react';
import styles from './EmailReviewModal.module.css';
import {
  SendIcon,
  CloseIcon,
  EyeIcon,
  EditIcon,
  ShieldAlertIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  BuildingIcon,
  MailIcon
} from './Icons.jsx';
import { renderTemplate, formatBodyToHtml } from '@/lib/templates.js';

export default function EmailReviewModal({
  isOpen,
  initialData,
  templates = [],
  onClose,
  onSuccess,
  canSend = true,
  user,
}) {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'edit'
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');

  const getInterpolationVars = () => {
    if (!initialData) return {};
    return {
      college_name: initialData.college_name || '',
      department: initialData.department || '',
      contact_person: initialData.contact_person || '',
      designation: initialData.designation || '',
      email: initialData.email || '',
      sender_name: 'Shortfundly Campus Outreach',
    };
  };

  // Interpolate initial data into selected template
  useEffect(() => {
    if (!initialData) return;

    let allTemplates = [...templates];

    const applyTemplate = (tplList) => {
      const tpl = tplList.find((t) => t.id === initialData.template_id) || tplList[0];
      if (tpl) {
        const vars = {
          college_name: initialData.college_name || '',
          department: initialData.department || '',
          contact_person: initialData.contact_person || '',
          designation: initialData.designation || '',
          email: initialData.email || '',
          sender_name: 'Shortfundly Campus Outreach',
        };

        const rawSubject = tpl.subjectTemplate || tpl.subject_template || '';
        const rawBody = tpl.bodyTemplate || tpl.body_template || '';

        const renderedSubject = renderTemplate(rawSubject, vars);
        const renderedBody = renderTemplate(rawBody, vars);

        setSubject(renderedSubject);
        setBodyHtml(renderedBody);
      }
    };

    if (allTemplates.length === 0) {
      // Fetch fresh templates directly if props are empty
      fetch('/api/outreach/templates')
        .then((res) => res.json())
        .then((data) => {
          if (data.templates && data.templates.length > 0) {
            applyTemplate(data.templates);
          }
        })
        .catch(() => {});
    } else {
      applyTemplate(allTemplates);
    }

    setSendResult(null);
    setOverrideReason('');
    setActiveTab('preview');
  }, [initialData, templates]);

  if (!isOpen || !initialData) return null;

  const vars = getInterpolationVars();

  const handleSend = async () => {
    setIsSending(true);
    setSendResult(null);

    const hasDuplicate = Boolean(initialData.duplicateWarning?.isDuplicate);
    const finalSubject = renderTemplate(subject, vars);
    const finalBodyHtml = formatBodyToHtml(renderTemplate(bodyHtml, vars));

    try {
      const response = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          college_name: initialData.college_name,
          email: initialData.email,
          department: initialData.department,
          contact_person: initialData.contact_person || null,
          designation: initialData.designation || null,
          subject: finalSubject,
          body_html: finalBodyHtml,
          override_duplicate: hasDuplicate,
          override_reason: hasDuplicate ? overrideReason || 'Manual user override after review' : null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSendResult({
          type: 'SUCCESS',
          message: `Campus proposal successfully dispatched! SMTP Status: ${data.status} (250 OK)`,
          messageId: data.messageId,
        });
        if (onSuccess) onSuccess();
      } else {
        setSendResult({
          type: 'ERROR',
          message: data.error || 'Failed to dispatch email.',
          classification: data.classification?.category || null,
        });
      }
    } catch (err) {
      setSendResult({
        type: 'ERROR',
        message: 'Network communication failure during dispatch.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const isDuplicate = Boolean(initialData.duplicateWarning?.isDuplicate);

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <SendIcon size={18} />
            <span>Review &amp; Edit Proposal Before Dispatch</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Recipient Quick Summary */}
        <div className={styles.recipientBar}>
          <div className={styles.recipientItem}>
            <BuildingIcon size={14} />
            <span>Target: <strong>{initialData.college_name}</strong></span>
          </div>
          <div className={styles.recipientItem}>
            <MailIcon size={14} />
            <span>To: <strong>{initialData.email}</strong></span>
          </div>
          <div className={styles.recipientItem}>
            <span>Dept: <strong>{initialData.department}</strong></span>
          </div>
          {initialData.contact_person && (
            <div className={styles.recipientItem}>
              <span>Contact: <strong>{initialData.contact_person}</strong></span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className={styles.tabBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <EyeIcon size={14} />
            <span>Live Recipient View</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'edit' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            <EditIcon size={14} />
            <span>Inline Content Editor</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {activeTab === 'preview' ? (
            <div className={styles.previewContainer}>
              <div className={styles.previewSubject}>
                Subject: {renderTemplate(subject, vars)}
              </div>
              <div
                className={styles.previewHtml}
                dangerouslySetInnerHTML={{ __html: formatBodyToHtml(renderTemplate(bodyHtml, vars)) }}
              />
            </div>
          ) : (
            <div className={styles.editSection}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Email Subject Line</label>
                <input
                  type="text"
                  className={styles.subjectInput}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Email Body Content (HTML &amp; Plain Text Formatted)</label>
                <textarea
                  className={styles.bodyTextarea}
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder="Enter or refine HTML email proposal content..."
                />
              </div>
            </div>
          )}

          {/* Duplicate Override Panel */}
          {isDuplicate && (
            <div className={styles.duplicateAlertBox}>
              <div className={styles.duplicateHeader}>
                <ShieldAlertIcon size={16} />
                <span>Duplicate Outreach Detected (Within 30-Day Cooldown)</span>
              </div>
              <p>
                An outreach record already exists for <strong>{initialData.email}</strong> from{' '}
                {initialData.duplicateWarning?.daysAgo === 0 ? 'today' : `${initialData.duplicateWarning?.daysAgo} days ago`}.
                To proceed with re-contacting this institution, please provide a documented reason:
              </p>
              <input
                type="text"
                className={styles.overrideInput}
                placeholder="e.g. Follow-up meeting requested / Revised proposal / New department lead"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
          )}

          {/* Status Result */}
          {sendResult && (
            <div
              className={`${styles.resultBanner} ${
                sendResult.type === 'SUCCESS' ? styles.resultSuccess : styles.resultError
              }`}
            >
              <div className={styles.resultHeader}>
                {sendResult.type === 'SUCCESS' ? (
                  <CheckCircleIcon size={16} />
                ) : (
                  <AlertCircleIcon size={16} />
                )}
                <span>{sendResult.type === 'SUCCESS' ? 'SMTP Accepted' : 'Delivery Attempt Failed'}</span>
              </div>
              <p>{sendResult.message}</p>
              {sendResult.messageId && (
                <p style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  Message ID: {sendResult.messageId}
                </p>
              )}
              {sendResult.classification && (
                <p style={{ fontSize: '11px' }}>Category: {sendResult.classification}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            {sendResult?.type === 'SUCCESS' ? 'Done' : 'Back to Edit Fields'}
          </button>

          {sendResult?.type !== 'SUCCESS' && (
            canSend ? (
              <button
                type="button"
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={isSending || (isDuplicate && !overrideReason.trim())}
              >
                {isSending ? (
                  <>
                    <RefreshCwIcon size={16} className="spin" />
                    <span>Connecting to Google SMTP...</span>
                  </>
                ) : (
                  <>
                    <SendIcon size={16} />
                    <span>
                      {isDuplicate ? 'Authorize & Dispatch' : 'Finalize & Send Email'}
                    </span>
                  </>
                )}
              </button>
            ) : (
              <div style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}>
                Sending Restricted (Manager View-Only Mode)
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
