'use client';

import { useState, useEffect } from 'react';
import styles from './googleFormsBatch.module.css';
import {
  FileSpreadsheet,
  Layers,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldAlert,
  Clock
} from 'lucide-react';

export default function GoogleFormsBatchManager({
  batches = [],
  onBatchUpdated,
  onImportCompleted,
  showToast,
}) {
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [editingBatch, setEditingBatch] = useState(null);
  const [formUrl, setFormUrl] = useState('');

  // Validation & Fetch Results
  const [validating, setValidating] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [fetchedData, setFetchedData] = useState(null);

  // Selected candidates for import
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Initialize selected batch
  useEffect(() => {
    if (batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(batches[0].id);
      loadBatchConfig(batches[0]);
    }
  }, [batches]);

  const loadBatchConfig = (batch) => {
    if (!batch) return;
    let rolesArr = [];
    try {
      rolesArr = Array.isArray(batch.roles) ? batch.roles : JSON.parse(batch.roles);
    } catch {
      rolesArr = ['Web Developer Intern', 'AI Engineer Intern', 'UI/UX Designer Intern'];
    }

    setEditingBatch({
      id: batch.id,
      batchName: batch.batchName,
      roles: rolesArr,
      newRoleInput: '',
      stipend: batch.stipend || 'Rs. 10,000',
      joiningDate: batch.joiningDate || '2026-06-01',
      endDate: batch.endDate || '2026-08-31',
      duration: batch.duration || '3 Months',
      commonDeadline: batch.commonDeadline ? new Date(batch.commonDeadline).toISOString().slice(0, 16) : '',
      googleFormUrl: batch.googleFormUrl || '',
    });
    setFormUrl(batch.googleFormUrl || '');
    setValidationResult(null);
    setFetchedData(null);
  };

  const handleSelectBatch = (id) => {
    setSelectedBatchId(id);
    const b = batches.find((x) => x.id === id);
    if (b) loadBatchConfig(b);
  };

  const handleAddRole = () => {
    if (!editingBatch.newRoleInput?.trim()) return;
    const roleToAdd = editingBatch.newRoleInput.trim();
    if (!editingBatch.roles.includes(roleToAdd)) {
      setEditingBatch((prev) => ({
        ...prev,
        roles: [...prev.roles, roleToAdd],
        newRoleInput: '',
      }));
    }
  };

  const handleRemoveRole = (role) => {
    setEditingBatch((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r !== role),
    }));
  };

  // Save Batch Config to DB
  const handleSaveBatchConfig = async () => {
    try {
      const res = await fetch('/api/batches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBatch),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.('Batch configuration updated in database successfully.', 'success');
        onBatchUpdated?.();
      } else {
        showToast?.(data.error || 'Failed to update batch configuration', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  // Suggest or Create Next Batch
  const handleCreateNextBatch = async () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nextLetter = letters[batches.length % 26] || `${batches.length + 1}`;
    const nextName = `Batch ${nextLetter}`;

    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchName: nextName,
          roles: editingBatch?.roles || ['Web Developer Intern', 'AI Engineer Intern'],
          stipend: editingBatch?.stipend || 'Rs. 10,000',
          joiningDate: editingBatch?.joiningDate || '2026-06-01',
          endDate: editingBatch?.endDate || '2026-08-31',
          duration: editingBatch?.duration || '3 Months',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Created ${nextName} successfully!`, 'success');
        onBatchUpdated?.();
        setSelectedBatchId(data.batch.id);
        loadBatchConfig(data.batch);
      } else {
        showToast?.(data.error || 'Failed to create new batch', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  // Validate Google Form
  const handleValidateForm = async () => {
    if (!formUrl.trim()) {
      showToast?.('Please enter a Google Form or linked Sheet URL.', 'error');
      return;
    }

    try {
      setValidating(true);
      const res = await fetch('/api/google-forms/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formUrl, batchId: selectedBatchId }),
      });
      const data = await res.json();
      setValidationResult(data);
      if (data.isValid) {
        showToast?.('Google Form schema validated successfully against approved roles!', 'success');
      } else {
        showToast?.('Validation errors detected in Google Form questions.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setValidating(false);
    }
  };

  // Fetch Candidates from Google Form
  const handleFetchResponses = async () => {
    if (!formUrl.trim()) {
      showToast?.('Please enter a valid Google Form URL.', 'error');
      return;
    }

    try {
      setFetching(true);
      const res = await fetch('/api/google-forms/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formUrl, batchId: selectedBatchId }),
      });
      const data = await res.json();
      if (data.success) {
        setFetchedData(data);
        // Pre-select all valid candidates by default
        const validIds = data.candidates.filter((c) => c.isValid).map((c) => c.googleResponseId);
        setSelectedCandidates(validIds);
        showToast?.(`Fetched ${data.totalFetched} candidate records (${data.validCount} valid, ${data.duplicateCount} duplicate).`, 'success');
      } else {
        showToast?.(data.error || 'Failed to fetch form responses.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setFetching(false);
    }
  };

  // Import into Bulk Offer Letters
  const handleImportToBulk = async () => {
    if (!fetchedData?.candidates || selectedCandidates.length === 0) {
      showToast?.('Please select at least one candidate to import.', 'error');
      return;
    }

    const candidatesToImport = fetchedData.candidates.filter((c) =>
      selectedCandidates.includes(c.googleResponseId)
    );

    try {
      setImporting(true);
      const res = await fetch('/api/google-forms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatchId,
          candidates: candidatesToImport,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(data.message, 'success');
        onImportCompleted?.(data.candidates);
      } else {
        showToast?.(data.error || 'Failed to import candidates.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  // Export to Excel (100% schema compatible)
  const handleExportExcel = async () => {
    if (!fetchedData?.candidates || fetchedData.candidates.length === 0) {
      showToast?.('No candidate responses available to export.', 'error');
      return;
    }

    try {
      setExporting(true);
      const res = await fetch('/api/google-forms/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: fetchedData.candidates }),
      });

      if (!res.ok) throw new Error('Excel export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Shortfundly_${editingBatch?.batchName || 'Batch'}_Candidates_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast?.('Candidates exported to Excel successfully!', 'success');
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const toggleSelectAll = (checked) => {
    if (checked && fetchedData?.candidates) {
      setSelectedCandidates(fetchedData.candidates.filter((c) => c.isValid).map((c) => c.googleResponseId));
    } else {
      setSelectedCandidates([]);
    }
  };

  const toggleCandidateSelect = (respId) => {
    setSelectedCandidates((prev) =>
      prev.includes(respId) ? prev.filter((id) => id !== respId) : [...prev, respId]
    );
  };

  return (
    <div className={styles.batchContainer}>
      {/* 1. BATCH CONFIGURATION HEADER */}
      <div className={styles.stepHeader}>
        <div className={styles.stepTitle}>
          <Layers size={18} color="#a855f7" />
          <span>Internship Batch Management & Authoritative HR Configuration</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={selectedBatchId}
            onChange={(e) => handleSelectBatch(e.target.value)}
            className={styles.input}
            style={{ width: '160px', height: '36px' }}
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchName} ({b._count?.candidates || 0} interns)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleCreateNextBatch}
            className={styles.btnSecondary}
            title="Create next sequential batch (e.g. Batch B, Batch C)"
          >
            <Plus size={14} />
            <span>Create Next Batch</span>
          </button>
        </div>
      </div>

      {/* 2. HR AUTHORITATIVE CONFIGURATION CARD */}
      {editingBatch && (
        <div className={styles.configCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#6D28D9' }}>
              Authoritative Configuration for {editingBatch.batchName} (Protects Sent/Accepted Offers)
            </span>
            <button type="button" onClick={handleSaveBatchConfig} className={styles.btnAction} style={{ padding: '6px 14px', fontSize: '13px' }}>
              Save Batch Config
            </button>
          </div>

          <div className={styles.grid3Col}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Official Batch Name</label>
              <input
                type="text"
                value={editingBatch.batchName}
                onChange={(e) => setEditingBatch({ ...editingBatch, batchName: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Authoritative Monthly Stipend</label>
              <input
                type="text"
                value={editingBatch.stipend}
                onChange={(e) => setEditingBatch({ ...editingBatch, stipend: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Authoritative Duration</label>
              <input
                type="text"
                value={editingBatch.duration}
                onChange={(e) => setEditingBatch({ ...editingBatch, duration: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Common Joining Date</label>
              <input
                type="date"
                value={editingBatch.joiningDate}
                onChange={(e) => setEditingBatch({ ...editingBatch, joiningDate: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Internship End Date</label>
              <input
                type="date"
                value={editingBatch.endDate}
                onChange={(e) => setEditingBatch({ ...editingBatch, endDate: e.target.value })}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Common Offer Expiry Deadline</label>
              <input
                type="datetime-local"
                value={editingBatch.commonDeadline}
                onChange={(e) => setEditingBatch({ ...editingBatch, commonDeadline: e.target.value })}
                className={styles.input}
              />
            </div>
          </div>

          {/* Approved Roles Manager */}
          <div style={{ marginTop: '16px' }}>
            <label className={styles.label}>Approved Roles for this Batch</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input
                type="text"
                placeholder="Add role e.g. Mobile Developer Intern"
                value={editingBatch.newRoleInput || ''}
                onChange={(e) => setEditingBatch({ ...editingBatch, newRoleInput: e.target.value })}
                className={styles.input}
                style={{ flex: 1 }}
              />
              <button type="button" onClick={handleAddRole} className={styles.btnSecondary}>Add Role</button>
            </div>

            <div className={styles.rolesChipBox}>
              {editingBatch.roles.map((r) => (
                <span key={r} className={styles.roleChip}>
                  <span>{r}</span>
                  <button type="button" onClick={() => handleRemoveRole(r)} style={{ color: '#f87171', cursor: 'pointer' }}>&times;</button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. GOOGLE FORM CONNECT & VALIDATE */}
      <div className={styles.configCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <LinkIcon size={16} color="#7C3AED" />
          <strong style={{ color: '#0F172A', fontSize: '15px', fontWeight: 700 }}>Connect Google Form / Linked Responses</strong>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Paste Google Form URL (e.g., https://docs.google.com/forms/d/e/.../viewform) or Sheet URL"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            className={styles.input}
            style={{ flex: 1 }}
          />

          <button
            type="button"
            onClick={handleValidateForm}
            disabled={validating}
            className={styles.btnSecondary}
          >
            {validating ? 'Validating...' : 'Validate Schema'}
          </button>

          <button
            type="button"
            onClick={handleFetchResponses}
            disabled={fetching}
            className={styles.btnAction}
          >
            <RefreshCw size={14} className={fetching ? styles.spin : ''} />
            <span>{fetching ? 'Fetching...' : 'Fetch Responses'}</span>
          </button>
        </div>

        {/* Validation Result Feedback */}
        {validationResult && (
          <div style={{ marginTop: '14px' }}>
            {validationResult.isValid ? (
              <div className={styles.validationBanner}>
                <CheckCircle2 size={18} />
                <div>
                  <strong>Google Form Connected Successfully</strong>
                  <div style={{ fontSize: '13px', marginTop: '2px' }}>
                    Title: {validationResult.formTitle} &bull; All required fields and approved role mapping verified.
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.errorBanner}>
                <AlertCircle size={18} />
                <div>
                  <strong>Form Schema Validation Errors:</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', fontSize: '13px' }}>
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. SPREADSHEET CANDIDATE REVIEW & IMPORT */}
      {fetchedData && (
        <div className={styles.spreadsheetCard}>
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0' }}>
            <div>
              <strong style={{ color: '#0F172A', fontSize: '15px', fontWeight: 700 }}>
                Review Candidates & Duplicate Prevention ({fetchedData.totalFetched} responses)
              </strong>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                {fetchedData.validCount} valid &bull; {fetchedData.duplicateCount} duplicates &bull; {fetchedData.errorCount} errors detected. Authoritative HR configuration will apply.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting}
                className={styles.btnSecondary}
              >
                <Download size={14} />
                <span>Export to Excel (Bulk Schema)</span>
              </button>

              <button
                type="button"
                onClick={handleImportToBulk}
                disabled={importing || selectedCandidates.length === 0}
                className={styles.btnAction}
              >
                <Upload size={14} />
                <span>Import {selectedCandidates.length} into Bulk Offer Letters</span>
              </button>
            </div>
          </div>

          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedCandidates.length > 0 && selectedCandidates.length === fetchedData.candidates.filter(c => c.isValid).length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      style={{ accentColor: '#a855f7' }}
                    />
                  </th>
                  <th>INTERN ID</th>
                  <th>FULL NAME</th>
                  <th>EMAIL</th>
                  <th>PHONE</th>
                  <th>ROLE</th>
                  <th>COLLEGE / DEGREE</th>
                  <th>STIPEND & DATES (HR SOURCE)</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {fetchedData.candidates.map((cand) => (
                  <tr key={cand.googleResponseId}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={!cand.isValid}
                        checked={selectedCandidates.includes(cand.googleResponseId)}
                        onChange={() => toggleCandidateSelect(cand.googleResponseId)}
                        style={{ accentColor: '#a855f7' }}
                      />
                    </td>
                    <td><code style={{ color: '#6D28D9' }}>{cand.internId}</code></td>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>{cand.fullName}</td>
                    <td>{cand.email}</td>
                    <td>{cand.phone}</td>
                    <td>{cand.role}</td>
                    <td>{cand.collegeName} &bull; {cand.degree}</td>
                    <td>
                      <span style={{ color: '#34d399' }}>{cand.stipend}</span> &bull; {cand.joiningDate}
                    </td>
                    <td>
                      {cand.isValid ? (
                        <span className={styles.statusPillValid}>Valid</span>
                      ) : cand.isDuplicate ? (
                        <span className={styles.statusPillDuplicate} title="Record already exists in database">Duplicate</span>
                      ) : (
                        <span className={styles.statusPillError} title={cand.errors.join(', ')}>Error</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
