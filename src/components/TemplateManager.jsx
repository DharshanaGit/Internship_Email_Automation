'use client';

import React, { useState, useEffect } from 'react';
import styles from './TemplateManager.module.css';
import {
  TemplateIcon,
  PlusIcon,
  SearchIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  CloseIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from './Icons';
import { renderTemplate, formatBodyToHtml } from '@/lib/templates.js';

export default function TemplateManager({ session, onTemplatesUpdated }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Preview modal state
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Edit / Create modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subject_template: '',
    body_template: '',
  });
  const [saving, setSaving] = useState(false);

  const canManage = session?.role === 'admin' || session?.role === 'team_lead';
  const isAdmin = session?.role === 'admin';

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/outreach/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      } else {
        setFeedback({ type: 'error', message: 'Failed to load templates from database.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error connecting to templates service.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = templates.filter((tpl) => {
    const q = searchQuery.toLowerCase();
    return (
      tpl.title.toLowerCase().includes(q) ||
      tpl.subject_template.toLowerCase().includes(q) ||
      tpl.body_template.toLowerCase().includes(q)
    );
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({
      title: '',
      subject_template: 'Proposal for Shortfundly Campus Collaboration — Empowering Student Creators at [College Name]',
      body_template: 'Dear [Contact Person],\n\nGreetings from Shortfundly!\n\nWe propose a strategic collaboration with [College Name] ([Department]) through Shortfundly Campus to empower student creators.\n\nWarm regards,\n[Your Name]\nProduct Manager | Shortfundly',
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (tpl) => {
    setEditingTemplate(tpl);
    setFormData({
      title: tpl.title,
      subject_template: tpl.subject_template,
      body_template: tpl.body_template,
    });
    setIsEditorOpen(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.subject_template.trim() || !formData.body_template.trim()) {
      setFeedback({ type: 'error', message: 'Title, Subject, and Body template are all required.' });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        id: editingTemplate ? editingTemplate.id : undefined,
        title: formData.title.trim(),
        subject_template: formData.subject_template.trim(),
        body_template: formData.body_template.trim(),
      };

      const res = await fetch('/api/outreach/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setFeedback({ type: 'success', message: 'Template saved successfully.' });
        setIsEditorOpen(false);
        loadTemplates();
        if (onTemplatesUpdated) onTemplatesUpdated();
      } else {
        setFeedback({ type: 'error', message: result.error || 'Failed to save template.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving template.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tpl) => {
    if (tpl.is_default) {
      alert('System default templates cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete template "${tpl.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/outreach/templates?id=${encodeURIComponent(tpl.id)}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setFeedback({ type: 'success', message: 'Template deleted.' });
        loadTemplates();
        if (onTemplatesUpdated) onTemplatesUpdated();
      } else {
        setFeedback({ type: 'error', message: result.error || 'Failed to delete template.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error deleting template.' });
    }
  };

  const sampleVars = {
    college_name: 'PSG College of Technology',
    department: 'Visual Communication & Media Arts',
    contact_person: 'Dr. K. Ramesh',
    designation: 'Head of Department',
    email: 'hod.viscom@psgtech.ac.in',
    sender_name: 'Shortfundly Campus Outreach',
  };

  const renderSamplePreview = (text) => {
    if (!text) return '';
    return renderTemplate(text, sampleVars);
  };

  const insertVariable = (varName) => {
    setFormData((prev) => ({
      ...prev,
      body_template: prev.body_template + ' ' + varName + ' ',
    }));
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2 className={styles.title}>Email Templates</h2>
          <p className={styles.description}>
            Standardized outreach letters for college collaborations and creator activations. Placeholders like{' '}
            <code>[College Name]</code> and <code>[Contact Person]</code> are automatically merged during review.
          </p>
        </div>

        {canManage && (
          <button type="button" className={styles.createBtn} onClick={handleOpenCreate}>
            <PlusIcon size={16} />
            <span>Create New Template</span>
          </button>
        )}
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`${styles.feedbackBanner} ${
            feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError
          }`}
        >
          {feedback.type === 'success' ? <CheckCircleIcon size={16} /> : <AlertCircleIcon size={16} />}
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ marginLeft: 'auto', color: 'inherit' }}
          >
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <SearchIcon size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search templates by title, subject or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.templateCount}>
          {filteredTemplates.length} {filteredTemplates.length === 1 ? 'Template' : 'Templates'} Available
        </div>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className={styles.emptyState}>Loading templates from database...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className={styles.emptyState}>No matching templates found.</div>
      ) : (
        <div className={styles.templateGrid}>
          {filteredTemplates.map((tpl) => (
            <div key={tpl.id} className={styles.templateCard}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitle}>{tpl.title}</div>
                {Boolean(tpl.is_default) && <span className={styles.defaultBadge}>Default</span>}
              </div>

              <div className={styles.subjectPreview} title={tpl.subject_template}>
                <strong>Subject:</strong> {tpl.subject_template}
              </div>

              <div className={styles.bodySnippet}>{tpl.body_template}</div>

              <div className={styles.cardFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setPreviewTemplate(tpl)}
                >
                  <EyeIcon size={14} />
                  <span>Preview</span>
                </button>

                <div className={styles.actionGroup}>
                  {canManage && (
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => handleOpenEdit(tpl)}
                      title="Edit template content"
                    >
                      <EditIcon size={14} />
                      <span>Edit</span>
                    </button>
                  )}

                  {isAdmin && !tpl.is_default && (
                    <button
                      type="button"
                      className={styles.btnDanger}
                      onClick={() => handleDelete(tpl)}
                      title="Delete this template"
                    >
                      <TrashIcon size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className={styles.modalBackdrop} onClick={() => setPreviewTemplate(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Template Preview: {previewTemplate.title}</div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setPreviewTemplate(null)}
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.previewEmailView}>
                <div className={styles.previewHeaderItem}>
                  <strong>Subject:</strong> {renderSamplePreview(previewTemplate.subject_template)}
                </div>
                <div className={styles.previewHeaderItem}>
                  <strong>Sample Recipient:</strong> Dr. K. Ramesh &lt;hod.viscom@psgtech.ac.in&gt;
                </div>
                <div className={styles.previewHeaderItem}>
                  <strong>Sample College:</strong> PSG College of Technology (Visual Communication & Media Arts)
                </div>
                <div
                  className={styles.previewBodyContent}
                  dangerouslySetInnerHTML={{
                    __html: formatBodyToHtml(renderSamplePreview(previewTemplate.body_template)),
                  }}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setPreviewTemplate(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isEditorOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsEditorOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveTemplate} className={styles.modalForm}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>
                  {editingTemplate ? `Edit Template: ${editingTemplate.title}` : 'Create New Email Template'}
                </div>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setIsEditorOpen(false)}
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Template Title</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Media & Film Studies Department Collaboration"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email Subject</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Proposal for Shortfundly Campus Collaboration - [College Name]"
                    value={formData.subject_template}
                    onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Template Body (Plain text & formatting)</label>
                  <div className={styles.variablesHelper}>
                    <span className={styles.helperLabel}>Insert Placeholder:</span>
                    <button
                      type="button"
                      className={styles.variableChip}
                      onClick={() => insertVariable('[College Name]')}
                    >
                      + [College Name]
                    </button>
                    <button
                      type="button"
                      className={styles.variableChip}
                      onClick={() => insertVariable('[Department]')}
                    >
                      + [Department]
                    </button>
                    <button
                      type="button"
                      className={styles.variableChip}
                      onClick={() => insertVariable('[Contact Person]')}
                    >
                      + [Contact Person]
                    </button>
                    <button
                      type="button"
                      className={styles.variableChip}
                      onClick={() => insertVariable('[Designation]')}
                    >
                      + [Designation]
                    </button>
                    <button
                      type="button"
                      className={styles.variableChip}
                      onClick={() => insertVariable('[Your Name]')}
                    >
                      + [Your Name]
                    </button>
                    <button
                      type="button"
                      className={styles.variableChip}
                      onClick={() => insertVariable('[Recipient Email]')}
                    >
                      + [Recipient Email]
                    </button>
                  </div>
                  <textarea
                    className={styles.textarea}
                    value={formData.body_template}
                    onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsEditorOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.createBtn}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
