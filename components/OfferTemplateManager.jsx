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
  Copy,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileCheck,
} from 'lucide-react';
import { renderJinja, jinjaTextToEmailHtml, normalizeToJinjaPlainText } from '../lib/jinjaEngine.js';

export default function OfferTemplateManager({
  templates = [],
  onTemplatesUpdated,
  showToast,
}) {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview'
  const [previewSubTab, setPreviewSubTab] = useState('email'); // 'email' | 'pdf'
  const [showAdvancedPdfHtml, setShowAdvancedPdfHtml] = useState(false);

  const availableTags = [
    '{{candidateName}}',
    '{{role}}',
    '{{internId}}',
    '{{startDate}}',
    '{{endDate}}',
    '{{duration}}',
    '{{stipend}}',
    '{{workMode}}',
    '{{deadline}}',
    '{{responseUrl}}',
  ];

  const defaultJinjaText = `Dear {{candidateName}},

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

  const samplePreviewContext = {
    candidateName: 'Rahul Sharma',
    role: 'Full Stack Engineer Intern',
    internId: 'INT-2026-00042',
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    duration: '3 Months',
    stipend: 'Rs. 10,000',
    workMode: 'Online / Remote',
    deadline: 'June 4, 2026 at 06:00 PM',
    responseUrl: 'https://internship-email-automation.vercel.app/offers/respond?token=sample_token_hash_00042',
  };

  const defaultPdfTextTemplate = `We are delighted to offer you an online internship as {{role}} at Shortfundly Media Technologies Pvt. Ltd.

Internship Terms & Schedule:
• Position & Role: {{role}}
• Intern ID: {{internId}}
• Duration & Period: {{startDate}} to {{endDate}} ({{duration}})
• Work Mode: {{workMode}}
• Monthly Stipend: {{stipend}}
• Reporting Manager: {{reportingManager}}
• Assigned Technical Mentor: {{assignedMentor}}

Roles & Responsibilities:
During this internship, you will participate in engineering sprints, collaborate with technical leads, and develop scalable features. All deliverables and source code developed during your tenure shall remain the intellectual property of Shortfundly Media Technologies Pvt. Ltd.

Upon satisfactory completion of your deliverables and milestone evaluation, you will receive an Official Internship Completion Certificate.

Please confirm your acceptance by signing and submitting your digital acceptance on your secure candidate portal before {{deadline}}.`;

  const displayTemplates = (templates && templates.length > 0)
    ? templates
    : [
        {
          id: 'default-standard-tmpl',
          name: 'Corporate Standard Offer Letter',
          subject: 'Official Internship Offer from Shortfundly - {{candidateName}}',
          emailBody: defaultJinjaText,
          pdfTemplate: defaultPdfTextTemplate,
          isDefault: true,
        },
        {
          id: 'default-fast-track-tmpl',
          name: 'Fast-Track Technical Internship Offer',
          subject: 'Fast-Track Technical Internship Offer Letter | Shortfundly - {{candidateName}}',
          emailBody: `Dear {{candidateName}},

Congratulations! Following your outstanding technical evaluation, we are thrilled to offer you the position of {{role}} at Shortfundly under our Fast-Track Engineering Program.

Internship Logistics:
• Role / Position: {{role}}
• Intern ID: {{internId}}
• Anticipated Start Date: {{startDate}}
• Duration: {{duration}}
• Monthly Stipend: {{stipend}}

Action Required:
Review your attached formal offer letter PDF and record your acceptance using your candidate portal link below:
{{responseUrl}}

Best regards,
Talent Acquisition Team
Shortfundly`,
          pdfTemplate: defaultPdfTextTemplate,
          isDefault: false,
        },
      ];

  const handleOpenCreate = () => {
    setIsNew(true);
    setActiveTab('editor');
    setPreviewSubTab('email');
    setShowAdvancedPdfHtml(false);
    setEditingTemplate({
      name: '',
      subject: 'Official Internship Offer from Shortfundly - {{candidateName}}',
      emailBody: defaultJinjaText,
      pdfTemplate: defaultPdfTextTemplate,
      isDefault: false,
    });
  };

  const handleOpenEdit = (t) => {
    setIsNew(false);
    setActiveTab('editor');
    setPreviewSubTab('email');
    setShowAdvancedPdfHtml(false);
    setEditingTemplate({
      ...t,
      emailBody: normalizeToJinjaPlainText(t.emailBody || defaultJinjaText),
      pdfTemplate: t.pdfTemplate || defaultPdfTextTemplate,
    });
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

      const payload = {
        ...editingTemplate,
        emailBody: normalizeToJinjaPlainText(editingTemplate.emailBody),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
          <span>Offer Letter Templates (Jinja Text Format)</span>
        </div>

        <button type="button" onClick={handleOpenCreate} className={styles.btnNew}>
          <Plus size={16} />
          <span>Create New Template</span>
        </button>
      </div>

      {/* Grid of Templates */}
      <div className={styles.templatesGrid}>
        {displayTemplates.map((tmpl) => (
          <div key={tmpl.id} className={styles.templateCard}>
            <div>
              <div className={styles.templateName}>
                <span>{tmpl.name}</span>
                {tmpl.isDefault && <span className={styles.defaultBadge}>Default</span>}
              </div>
              <div className={styles.templateSubject}>
                <strong>Subject:</strong> {tmpl.subject}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Format: <span style={{ color: '#c084fc' }}>Plain-Text Jinja Template</span>
              </div>
            </div>

            <div className={styles.cardActions}>
              <button
                type="button"
                onClick={() => handleOpenEdit(tmpl)}
                className={styles.btnEdit}
              >
                <Edit3 size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Customize Template
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: CUSTOMIZE / CREATE TEMPLATE */}
      {editingTemplate && (
        <div className={styles.editorModal}>
          <div className={styles.editorBox}>
            <div className={styles.editorHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#a855f7" />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>
                  {isNew ? 'Create New Offer Template' : `Customize: ${editingTemplate.name}`}
                </h3>
              </div>

              {/* Toggle Editor vs Live Preview */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: activeTab === 'editor' ? 'rgba(168, 85, 247, 0.25)' : '#141417',
                    border: `1px solid ${activeTab === 'editor' ? '#a855f7' : '#27272a'}`,
                    color: activeTab === 'editor' ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  Jinja Editor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: activeTab === 'preview' ? 'rgba(168, 85, 247, 0.25)' : '#141417',
                    border: `1px solid ${activeTab === 'preview' ? '#a855f7' : '#27272a'}`,
                    color: activeTab === 'preview' ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Eye size={13} />
                  <span>Live Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  style={{ color: '#94a3b8', cursor: 'pointer', marginLeft: '8px', background: 'transparent', border: 'none' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={styles.editorBody}>
              {activeTab === 'editor' ? (
                <>
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
                    <label className={styles.label}>Email Subject (Plain Text with Jinja Variables)</label>
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
                      <label className={styles.label}>Available Jinja Replacement Variables (Click to insert)</label>
                    </div>
                    <div className={styles.tagsHelperRow}>
                      {availableTags.map((t) => (
                        <span
                          key={t}
                          onClick={() => handleInsertTag(t, 'emailBody')}
                          className={styles.tagPill}
                          title={`Click to append ${t} into the Email Body`}
                        >
                          + {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className={styles.label}>Email Body (Clean Plain Text Jinja Format - No raw HTML tags)</label>
                      <span style={{ fontSize: '11px', color: '#a855f7' }}>Supports paragraphs, bullets, bolding, and links</span>
                    </div>
                    <textarea
                      rows={12}
                      value={editingTemplate.emailBody}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, emailBody: e.target.value })}
                      className={styles.textarea}
                      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '13px', lineHeight: 1.6 }}
                    />
                  </div>

                  {/* User-Friendly Plain Text PDF Content Customizer */}
                  <div style={{ background: '#111115', border: '1px solid #232328', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileCheck size={16} color="#a855f7" />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f4f4f5' }}>
                          Offer Letter PDF Terms & Body (User-Friendly Plain Text Format - No HTML)
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                        &bull; Auto-Formatted into Official A4 Letterhead
                      </span>
                    </div>

                    <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: '#94a3b8' }}>
                      Customize the text content of the formal A4 PDF attachment. No coding or HTML required. Uses variables like <code>&#123;&#123;candidateName&#125;&#125;</code>, <code>&#123;&#123;role&#125;&#125;</code>, <code>&#123;&#123;stipend&#125;&#125;</code>.
                    </p>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {availableTags.map((t) => (
                        <span
                          key={`pdf-${t}`}
                          onClick={() => handleInsertTag(t, 'pdfTemplate')}
                          className={styles.tagPill}
                          style={{ fontSize: '10.5px' }}
                          title={`Click to insert ${t}`}
                        >
                          + {t}
                        </span>
                      ))}
                    </div>

                    <textarea
                      rows={10}
                      value={editingTemplate.pdfTemplate}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, pdfTemplate: e.target.value })}
                      className={styles.textarea}
                      style={{ fontSize: '12.5px', fontFamily: 'monospace', lineHeight: 1.6 }}
                      placeholder="Enter the official terms for the offer letter PDF..."
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
                </>
              ) : (
                /* LIVE PREVIEW TAB */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Sub-tab switcher */}
                  <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #27272a', paddingBottom: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewSubTab('email')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: previewSubTab === 'email' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                        border: `1px solid ${previewSubTab === 'email' ? '#a855f7' : '#27272a'}`,
                        color: previewSubTab === 'email' ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Mail size={13} />
                      <span>Email Message Preview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewSubTab('pdf')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: previewSubTab === 'pdf' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                        border: `1px solid ${previewSubTab === 'pdf' ? '#a855f7' : '#27272a'}`,
                        color: previewSubTab === 'pdf' ? '#ffffff' : '#94a3b8',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <FileText size={13} />
                      <span>Offer Letter PDF Document Preview</span>
                    </button>
                  </div>

                  {previewSubTab === 'email' ? (
                    /* RENDERED EMAIL PREVIEW */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Email Header Info */}
                      <div style={{ background: '#141417', border: '1px solid #27272a', padding: '12px 16px', borderRadius: '8px', fontSize: '12.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><strong>From:</strong> Shortfundly HR Team &lt;hr@shortfundly.com&gt;</div>
                        <div><strong>To:</strong> {samplePreviewContext.candidateName} &lt;rahul.sharma@example.com&gt;</div>
                        <div><strong>Subject:</strong> {renderJinja(editingTemplate.subject, samplePreviewContext)}</div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid #232328' }}>
                          <div><strong>Intern ID:</strong> <code style={{ color: '#c084fc' }}>{samplePreviewContext.internId}</code></div>
                          <div><strong>Expiration Deadline:</strong> <span style={{ color: '#fbbf24' }}>{samplePreviewContext.deadline}</span></div>
                        </div>
                      </div>

                      {/* Rendered HTML Container */}
                      <div
                        style={{
                          background: '#ffffff',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        }}
                        dangerouslySetInnerHTML={{
                          __html: jinjaTextToEmailHtml(editingTemplate.emailBody, samplePreviewContext),
                        }}
                      />
                    </div>
                  ) : (
                    /* RENDERED PDF DOCUMENT PREVIEW */
                    <div style={{ background: '#ffffff', color: '#0f172a', padding: '36px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
                      {/* Shortfundly Header Letterhead */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #7c3aed', paddingBottom: '16px', marginBottom: '24px' }}>
                        <div>
                          <h2 style={{ margin: 0, fontSize: '22px', color: '#1e1b4b', fontWeight: 800, letterSpacing: '1px' }}>SHORTFUNDLY</h2>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Shortfundly Media Technologies Pvt. Ltd. &bull; Chennai, India</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'inline-block', background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', border: '1px solid rgba(124, 58, 237, 0.3)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            Ref: {samplePreviewContext.internId}
                          </span>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                      </div>

                      {/* Recipient Block */}
                      <div style={{ marginBottom: '20px', fontSize: '13px', lineHeight: 1.5 }}>
                        <div><strong>To,</strong></div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{samplePreviewContext.candidateName}</div>
                        <div style={{ color: '#475569' }}>Intern ID: {samplePreviewContext.internId}</div>
                      </div>

                      <div style={{ textAlign: 'center', margin: '20px 0', padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.5px', color: '#1e1b4b' }}>
                          OFFICIAL INTERNSHIP APPOINTMENT LETTER
                        </span>
                      </div>

                      <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#334155' }}>
                        Dear <strong>{samplePreviewContext.candidateName}</strong>, on behalf of Shortfundly, we are pleased to confirm your appointment for the position of <strong>{samplePreviewContext.role}</strong>.
                      </p>

                      {/* Key Details Table */}
                      <div style={{ margin: '20px 0', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <tbody>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, width: '35%', color: '#475569' }}>Position / Role</td>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>{samplePreviewContext.role}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Anticipated Start Date</td>
                              <td style={{ padding: '8px 12px', color: '#0f172a' }}>{samplePreviewContext.startDate}</td>
                            </tr>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Tenure / Duration</td>
                              <td style={{ padding: '8px 12px', color: '#0f172a' }}>{samplePreviewContext.duration}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Stipend / Compensation</td>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: '#15803d' }}>{samplePreviewContext.stipend}</td>
                            </tr>
                            <tr style={{ background: '#f8fafc' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Location / Work Mode</td>
                              <td style={{ padding: '8px 12px', color: '#0f172a' }}>Online / Remote</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Expiration Note */}
                      <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '10px 14px', borderRadius: '6px', fontSize: '11.5px', color: '#92400e', marginBottom: '24px' }}>
                        <strong>Offer Validity Deadline:</strong> Please confirm and submit your signature before <strong>{samplePreviewContext.deadline}</strong>.
                      </div>

                      {/* Signatory */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>For Shortfundly Media Technologies Pvt. Ltd.</div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>Talent Acquisition & People Operations</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ borderBottom: '1px dashed #94a3b8', width: '160px', marginBottom: '6px' }} />
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Authorized Corporate Seal</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                {saving ? 'Saving Template...' : 'Save & Confirm Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
