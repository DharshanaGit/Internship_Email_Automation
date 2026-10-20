'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import Sidebar from '@/components/Sidebar.jsx';
import StatsCards from '@/components/StatsCards.jsx';
import ManualEntryForm from '@/components/ManualEntryForm.jsx';
import BulkEmailSender from '@/components/BulkEmailSender.jsx';
import EmailReviewModal from '@/components/EmailReviewModal.jsx';
import EmailRecordsTable from '@/components/EmailRecordsTable.jsx';
import TemplateManager from '@/components/TemplateManager.jsx';
import SettingsView from '@/components/SettingsView.jsx';
import SmtpDiagnosticsModal from '@/components/SmtpDiagnosticsModal.jsx';
import { RefreshCwIcon, ServerIcon, SendIcon, MailIcon } from '@/components/Icons.jsx';

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [senderSubMode, setSenderSubMode] = useState('manual'); // 'manual' | 'bulk'

  // Stats & Logs state
  const [stats, setStats] = useState({
    total: 0,
    accepted: 0,
    failed: 0,
    pending: 0,
    processing: 0,
    unknown: 0,
    duplicates_blocked: 0,
  });

  const [templates, setTemplates] = useState([]);
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeFormData, setActiveFormData] = useState(null);
  const [smtpModalOpen, setSmtpModalOpen] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // 1. Authenticate user
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // 2. Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/outreach/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('[Dashboard] Stats fetch error:', err);
    }
  }, []);

  // 3. Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/outreach/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('[Dashboard] Templates fetch error:', err);
    }
  }, []);

  // 4. Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      params.set('limit', '50');

      const res = await fetch(`/api/outreach/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setTotalRecords(data.total || 0);
      }
    } catch (err) {
      console.error('[Dashboard] Logs fetch error:', err);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchTemplates();
      fetchLogs();
    }
  }, [user, activeTab, fetchStats, fetchTemplates, fetchLogs]);

  // Handlers
  const handleOpenReview = (formData) => {
    setActiveFormData(formData);
    setReviewModalOpen(true);
  };

  const handleOutreachSuccess = () => {
    fetchStats();
    fetchLogs();
  };

  const handleRetryRecord = async (recordId) => {
    setRetryingId(recordId);
    try {
      const res = await fetch('/api/outreach/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to retry outreach.');
      }
      fetchStats();
      fetchLogs();
    } catch {
      alert('Network error while retrying outreach.');
    } finally {
      setRetryingId(null);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    setDeletingId(recordId);
    try {
      const res = await fetch('/api/outreach/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete outreach record.');
      } else {
        fetchStats();
        fetchLogs();
      }
    } catch {
      alert('Network error while deleting outreach record.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/');
    }
  };

  const getViewTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Campus Outreach Overview';
      case 'sender':
        return senderSubMode === 'manual' ? 'Manual Email Sender' : 'Bulk CSV Outreach Campaign';
      case 'templates':
        return 'Outreach Templates';
      case 'settings':
        return 'System & SMTP Settings';
      default:
        return 'Campus Outreach Portal';
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingOverlay}>
        <RefreshCwIcon size={32} className={styles.loadingSpinner} />
        <div>Authenticating Company Session...</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardWrapper}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        session={user}
        onLogout={handleLogout}
      />

      {/* Main Dynamic Viewport */}
      <div className={styles.mainArea}>
        {/* Sticky Top Bar */}
        <header className={styles.topBar}>
          <div className={styles.breadcrumbArea}>
            <span className={styles.viewTitle}>{getViewTitle()}</span>
            <span className={styles.viewTagline}>&bull; Shortfundly Campus Outreach Portal</span>
          </div>

          <div className={styles.topBarRight}>
            <div className={styles.statusPill}>
              <span className={styles.statusDot} />
              <span>SQLite Active</span>
            </div>

            <button
              type="button"
              className={styles.smtpBtn}
              onClick={() => setSmtpModalOpen(true)}
              title="Inspect Google SMTP handshake status"
            >
              <ServerIcon size={14} />
              <span>Google SMTP</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className={styles.pageContent}>
          {activeTab === 'dashboard' && (
            <>
              <div className={styles.introSection}>
                <h1 className={styles.headline}>Campus Outreach Automation Command Center</h1>
                <p className={styles.subheadline}>
                  Empower colleges and student creators with official Shortfundly Campus partnerships, screening festivals, and creator tools.
                </p>
              </div>

              {/* Real-time KPI Stats */}
              <StatsCards stats={stats} />

              {/* Email Audit & Records Table */}
              <EmailRecordsTable
                records={records}
                total={totalRecords}
                currentStatus={statusFilter}
                searchQuery={searchQuery}
                onStatusChange={setStatusFilter}
                onSearchChange={setSearchQuery}
                onRefresh={() => {
                  fetchStats();
                  fetchLogs();
                }}
                onRetryRecord={handleRetryRecord}
                isRetryingId={retryingId}
                onDeleteRecord={handleDeleteRecord}
                isDeletingId={deletingId}
              />
            </>
          )}

          {activeTab === 'sender' && (
            <>
              <div className={styles.introSection}>
                <h1 className={styles.headline}>Campus Outreach Dispatcher</h1>
                <p className={styles.subheadline}>
                  Choose single manual entry or import CSV lists for automated bulk outreach with duplicate prevention.
                </p>
              </div>

              {/* Sender Mode Switcher */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  width: 'fit-content',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                }}
              >
                <button
                  type="button"
                  style={{
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: senderSubMode === 'manual' ? 'var(--accent-subtle)' : 'transparent',
                    color: senderSubMode === 'manual' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => setSenderSubMode('manual')}
                >
                  <SendIcon size={15} />
                  <span>Single Outreach Entry</span>
                </button>

                <button
                  type="button"
                  style={{
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: senderSubMode === 'bulk' ? 'var(--accent-subtle)' : 'transparent',
                    color: senderSubMode === 'bulk' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => setSenderSubMode('bulk')}
                >
                  <MailIcon size={15} />
                  <span>Bulk CSV Upload &amp; Campaign</span>
                </button>
              </div>

              {senderSubMode === 'manual' ? (
                <ManualEntryForm
                  templates={templates}
                  onOpenReview={handleOpenReview}
                  user={user}
                />
              ) : (
                <BulkEmailSender
                  templates={templates}
                  session={user}
                  onCampaignFinished={handleOutreachSuccess}
                />
              )}
            </>
          )}

          {activeTab === 'templates' && (
            <TemplateManager session={user} onTemplatesUpdated={fetchTemplates} />
          )}

          {activeTab === 'settings' && (
            <SettingsView session={user} />
          )}
        </main>
      </div>

      {/* Email Review & Inline Edit Modal */}
      <EmailReviewModal
        isOpen={reviewModalOpen}
        initialData={activeFormData}
        templates={templates}
        user={user}
        onClose={() => setReviewModalOpen(false)}
        onSuccess={handleOutreachSuccess}
      />

      {/* SMTP Diagnostics Modal */}
      <SmtpDiagnosticsModal
        isOpen={smtpModalOpen}
        onClose={() => setSmtpModalOpen(false)}
      />
    </div>
  );
}
