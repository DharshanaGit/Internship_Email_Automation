'use client';

import { useState } from 'react';
import styles from './templateManager.module.css';
import {
  FileText,
  Plus,
  Edit3,
  CheckCircle2,
  X,
  Code,
  Mail,
  Eye,
  Star,
  Copy
} from 'lucide-react';

export default function OfferTemplateManager({
  templates = [],
  onTemplatesUpdated,
  showToast,
}) {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('email');

  const availableTags = [
    '{{candidateName}}',
    '{{role}}',
    '{{startDate}}',
    '{{endDate}}',
    '{{duration}}',
    '{{stipend}}',
    '{{workMode}}',
    '{{reportingManager}}',
    '{{deadline}}',
    '{{responseLink}}',
    '{{internId}}',
  ];

  const handleOpenCreate = () => {
    setIsNew(true);
    setEditingTemplate({
      name: '',
      subject: 'Official Internship Offer from Shortfundly - {{candidateName}}',
      emailBody: `<p>Dear {{candidateName}},</p>\n<p>Congratulations! We are thrilled to offer you the position of <strong>{{role}}</strong> at Shortfundly.</p>`,
      pdfTemplate: templates[0]?.pdfTemplate || '',
      isDefault: false,
    });
  };

  const handleOpenEdit = (t) => {
    setIsNew(false);
    setEditingTemplate({ ...t });
  };

  const handleInsertTag = (tag, field) => {
    if (!editingTemplate) return;
    setEditingTemplate((prev) => ({
      ...prev,
      [field]: prev[field] ? `${prev[field]} ${tag}` : tag,
    }));
  };

  const handleSave = async () => {
    if (!editingTemplate.name.trim()) {
      showToast?.('Template name is required.', 'error');
      return;
    }

    try {
      setSaving(true);
      const url = '/api/templates';
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Template "${editingTemplate.name}" saved successfully!`, 'success');
        setEditingTemplate(null);
        onTemplatesUpdated?.();
      } else {
        showToast?.(data.error || 'Failed to save template', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.managerContainer}>
      <div className={styles.headerRow}>
        <div className={styles.title}>
          <FileText size={20} color="#a855f7" />
          <span>Offer Letter Templates & Corporate Formats</span>
        </div>

        <button type="button" onClick={handleOpenCreate} className={styles.btnNew}>
          <Plus size={16} />
          <span>Create New Template</span>
        </button>
      </div>

      {/* Grid of Templates */}
      <div className={styles.templatesGrid}>
        {templates.map((tmpl) => (
          <div key={tmpl.id} className={styles.templateCard}>
            <div>
              <div className={styles.templateName}>
                <span>{tmpl.name}</span>
                {tmpl.isDefault && <span className={styles.defaultBadge}>Default</span>}
              </div>
              <div className={styles.templateSubject}>
                <strong>Subject:</strong> {tmpl.subject}
              </div>
            </div>

            <div className={styles.cardActions}>
              <button
                type="button"
                onClick={() => handleOpenEdit(tmpl)}
                className={styles.btnEdit}
              >
                <Edit3 size={12} style={{ display: 'inline', marginRight: '4px' }} />
                <span>Customize Template</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: EDIT / CREATE TEMPLATE */}
      {editingTemplate && (
        <div className={styles.editorModal} onClick={() => setEditingTemplate(null)}>
          <div className={styles.editorBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.editorHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} color="#a855f7" />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>
                  {isNew ? 'Create New Offer Letter Template' : `Customize: ${editingTemplate.name}`}
                </h3>
              </div>
              <button type="button" onClick={() => setEditingTemplate(null)} style={{ color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.editorBody}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. Standard 2026 Engineering Offer"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Email Subject</label>
                <input
                  type="text"
                  placeholder="Official Internship Offer from Shortfundly - {{candidateName}}"
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className={styles.label}>Dynamic Replacement Tags (Click to insert)</label>
                </div>
                <div className={styles.tagsHelperRow}>
                  {availableTags.map((t) => (
                    <span
                      key={t}
                      onClick={() => handleInsertTag(t, 'emailBody')}
                      className={styles.tagPill}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Email HTML Content Body</label>
                <textarea
                  rows={8}
                  value={editingTemplate.emailBody}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, emailBody: e.target.value })}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>PDF HTML / CSS Layout Template (Playwright Rendered)</label>
                <textarea
                  rows={10}
                  value={editingTemplate.pdfTemplate}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, pdfTemplate: e.target.value })}
                  className={styles.textarea}
                  style={{ fontSize: '11.5px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="isDefaultCheckbox"
                  checked={Boolean(editingTemplate.isDefault)}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, isDefault: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#a855f7', cursor: 'pointer' }}
                />
                <label htmlFor="isDefaultCheckbox" style={{ fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' }}>
                  Set as default offer letter template for single and bulk dispatches
                </label>
              </div>
            </div>

            <div className={styles.editorFooter}>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className={styles.btnCancel}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={styles.btnSave}
              >
                {saving ? 'Saving Template...' : 'Save & Apply Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
