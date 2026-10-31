'use client';

import { useState } from 'react';
import styles from './web3Deck.module.css';
import {
  Layers,
  Plus,
  Trash2,
  Users,
  Move,
  CheckCircle2,
  AlertCircle,
  Building,
  GraduationCap
} from 'lucide-react';

export default function BatchDragDropManager({
  candidates = [],
  batches = [],
  onBatchesUpdated,
  showToast,
}) {
  const [newBatchName, setNewBatchName] = useState('');
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [draggingCandidateId, setDraggingCandidateId] = useState(null);
  const [movingCandidate, setMovingCandidate] = useState(false);

  // Group active candidates by batch
  const batchNames = Array.from(new Set([
    ...batches.map(b => b.batchName),
    'Batch A',
    'Batch B',
    'Batch C',
    ...candidates.map(c => c.batch).filter(Boolean),
  ])).sort();

  // Drag handlers
  const handleDragStart = (e, candidateId) => {
    setDraggingCandidateId(candidateId);
    e.dataTransfer.setData('text/plain', candidateId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetBatchName) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData('text/plain') || draggingCandidateId;
    if (!candidateId || !targetBatchName) return;

    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate || candidate.batch === targetBatchName) {
      setDraggingCandidateId(null);
      return;
    }

    try {
      setMovingCandidate(true);
      const res = await fetch('/api/candidates/reorganize-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          targetBatchName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Moved ${candidate.fullName} to ${targetBatchName}!`, 'success');
        onBatchesUpdated?.();
      } else {
        showToast?.(data.error || 'Failed to move candidate.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setDraggingCandidateId(null);
      setMovingCandidate(false);
    }
  };

  // Create Batch
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!newBatchName.trim()) {
      showToast?.('Please enter a batch name.', 'error');
      return;
    }

    try {
      setCreatingBatch(true);
      const res = await fetch('/api/candidates/reorganize-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_BATCH',
          newBatchName: newBatchName.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Batch "${newBatchName}" created successfully!`, 'success');
        setNewBatchName('');
        onBatchesUpdated?.();
      } else {
        showToast?.(data.error || 'Failed to create batch.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setCreatingBatch(false);
    }
  };

  // Delete Batch
  const handleDeleteBatch = async (batchName) => {
    const confirm = window.confirm(`Delete empty batch "${batchName}"?`);
    if (!confirm) return;

    try {
      const res = await fetch('/api/candidates/reorganize-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_BATCH',
          targetBatchName: batchName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`Batch "${batchName}" removed.`, 'info');
        onBatchesUpdated?.();
      } else {
        showToast?.(data.error || 'Failed to delete batch.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '22px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', color: '#0F172A', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#7C3AED" />
              <span>Interactive Drag-and-Drop Batch Segregation & Swapping</span>
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#475569' }}>
              Drag any intern card from one batch column and drop into another batch to reassign cohorts based on college, role, or customized joining dates.
            </p>
          </div>

          {/* Create Custom Batch */}
          <form onSubmit={handleCreateBatch} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. Batch D (Special Cohort)"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              className={styles.searchInput}
              style={{ width: '220px' }}
            />
            <button
              type="submit"
              disabled={creatingBatch || !newBatchName.trim()}
              className={styles.btnPrimary}
              style={{ padding: '8px 14px' }}
            >
              <Plus size={14} />
              <span>Create Batch</span>
            </button>
          </form>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(3, batchNames.length)}, minmax(280px, 1fr))`, gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
        {batchNames.map((bName) => {
          const batchCandidates = candidates.filter(c => (c.batch || 'Batch A') === bName && !c.isLeaved);
          return (
            <div
              key={bName}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, bName)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '400px',
                maxHeight: '600px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-default)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ color: '#0F172A', fontSize: '15px', fontWeight: 700 }}>{bName}</strong>
                  <span className={styles.badgePurple} style={{ fontSize: '12.5px' }}>
                    {batchCandidates.length} Interns
                  </span>
                </div>

                {batchCandidates.length === 0 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteBatch(bName)}
                    style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px' }}
                    title="Delete Empty Batch"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {/* Candidates in this batch */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                {batchCandidates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: '#475569', fontSize: '13px', border: '1px dashed var(--border-medium)', borderRadius: '8px' }}>
                    Drop interns here to assign to {bName}
                  </div>
                ) : (
                  batchCandidates.map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, c.id)}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        cursor: 'grab',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '12.5px', color: '#6D28D9', fontWeight: 700 }}>
                          {c.internId || c.candidateId}
                        </span>
                        <Move size={12} color="#71717a" />
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', marginBottom: '2px' }}>
                        {c.fullName}
                      </div>

                      <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                        {c.role}
                      </div>

                      <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building size={10} />
                        <span>{c.collegeName || 'University'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
