'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './web3Deck.module.css';
import {
  Award,
  CheckCircle2,
  Filter,
  Search,
  ShieldCheck,
  Send,
  Eye,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';

export default function CertificateDeckView({
  batches = [],
  onRefresh,
  showToast,
}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [approving, setApproving] = useState(false);

  // Fetch certification evaluation candidates from API
  const loadCertCandidates = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/certificate/approve', window.location.origin);
      if (selectedBatch !== 'ALL') url.searchParams.set('batch', selectedBatch);
      if (selectedRole !== 'ALL') url.searchParams.set('role', selectedRole);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setCandidates(data.candidates);
      }
    } catch (err) {
      console.error('Error fetching certification candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertCandidates();
  }, [selectedBatch, selectedRole]);

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const nameMatch = c.fullName?.toLowerCase().includes(term);
        const idMatch = c.internId?.toLowerCase().includes(term);
        if (!nameMatch && !idMatch) return false;
      }
      return true;
    });
  }, [candidates, searchTerm]);

  // Select all / toggle
  const handleToggleSelectAll = () => {
    if (selectedCandidateIds.length === filteredCandidates.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(filteredCandidates.map((c) => c.id));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedCandidateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // CEO Approval Action
  const handleApproveCertificates = async () => {
    if (selectedCandidateIds.length === 0) {
      showToast?.('Please select candidates for certificate approval.', 'error');
      return;
    }

    try {
      setApproving(true);
      const res = await fetch('/api/certificate/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          approvedBy: 'CEO Selvam M',
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast?.(`CEO Approval Granted! High-resolution certificate PDFs generated and emailed to ${data.approvedCount} candidates!`, 'success');
        setSelectedCandidateIds([]);
        loadCertCandidates();
        onRefresh?.();
      } else {
        showToast?.(data.error || 'Failed to approve certificates.', 'error');
      }
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <div className={styles.titleIcon}>
            <Award size={22} />
          </div>
          <div>
            <h2 className={styles.mainTitle}>CEO Certificate Evaluation & Approval Deck</h2>
            <p className={styles.subtitle}>Dynamic Cumulative Score Averaging &bull; End-of-Tenure Review &bull; Canva-Style Certificate Generation with Selvam Signature</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleApproveCertificates}
          disabled={approving || selectedCandidateIds.length === 0}
          className={styles.btnPrimary}
        >
          <ShieldCheck size={16} />
          <span>{approving ? 'Generating Certificates & Dispatching...' : `CEO Approve & Issue Certificates (${selectedCandidateIds.length})`}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search candidate by name or Intern ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          className={styles.selectInput}
        >
          <option value="ALL">All Batches</option>
          {batches.map((b) => (
            <option key={b.id || b.batchName} value={b.batchName}>{b.batchName}</option>
          ))}
        </select>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className={styles.selectInput}
        >
          <option value="ALL">All Roles</option>
          <option value="Web Developer Intern">Web Developer Intern</option>
          <option value="Frontend Developer">Frontend Developer</option>
          <option value="Backend Developer">Backend Developer</option>
          <option value="Full Stack Intern">Full Stack Intern</option>
          <option value="AI/ML Engineer">AI/ML Engineer</option>
          <option value="UI/UX Designer">UI/UX Designer</option>
        </select>
      </div>

      {/* Candidates Certification Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={selectedCandidateIds.length === filteredCandidates.length && filteredCandidates.length > 0}
              onChange={handleToggleSelectAll}
              style={{ width: '16px', height: '16px', accentColor: '#a855f7', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
              {selectedCandidateIds.length} of {filteredCandidates.length} Selected for CEO Approval
            </span>
          </div>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Select</th>
                <th>Intern ID</th>
                <th>Candidate Name</th>
                <th>Role & College</th>
                <th>Batch</th>
                <th>Tenure End Date</th>
                <th>Tasks Cleared</th>
                <th>Overall Average Performance (%)</th>
                <th>CEO Approval Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#71717a' }}>
                    No candidates found for certificate evaluation.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => {
                  const isSelected = selectedCandidateIds.includes(c.id);
                  const isPassed = (c.overallAverageScore || 0) >= 70;
                  return (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(c.id)}
                          style={{ width: '16px', height: '16px', accentColor: '#a855f7', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#c084fc', fontWeight: 700 }}>{c.internId}</td>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>{c.fullName}</td>
                      <td>
                        <div>{c.role}</div>
                        <div style={{ fontSize: '11px', color: '#71717a' }}>{c.collegeName}</div>
                      </td>
                      <td><span className={styles.badgePurple}>{c.batch}</span></td>
                      <td style={{ fontSize: '12px' }}>{c.endDate}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {c.tasksCompleted} Completed
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: isPassed ? '#34d399' : '#fbbf24' }}>
                            {c.overallAverageScore?.toFixed(1)}%
                          </span>
                          <span style={{ fontSize: '11px', color: '#71717a' }}>
                            ({c.taskHistory?.length || 0} tasks avg)
                          </span>
                        </div>
                      </td>
                      <td>
                        {c.certificateApproved ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className={styles.badgeEmerald}>
                              <CheckCircle2 size={11} /> Approved by CEO
                            </span>
                            {c.certificateNumber && (
                              <span style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#a855f7' }}>
                                {c.certificateNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={styles.badgeAmber}>
                            <Clock size={11} /> Pending CEO Evaluation
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
