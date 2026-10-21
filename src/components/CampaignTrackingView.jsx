'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './CampaignTrackingView.module.css';
import {
  BarChartIcon,
  SendIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  DownloadIcon,
  RefreshCwIcon,
  EyeIcon,
  MousePointerIcon,
  GlobeIcon,
  BuildingIcon,
  HelpCircleIcon
} from './Icons.jsx';

export default function CampaignTrackingView({ session }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [activeCampaign, setActiveCampaign] = useState(null);

  // Recipient table state
  const [recipients, setRecipients] = useState([]);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Actions state
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState('');

  // 1. Fetch campaigns list
  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/tracking/campaigns?limit=50');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        if (data.campaigns && data.campaigns.length > 0 && !activeCampaignId) {
          setActiveCampaignId(data.campaigns[0].id);
        }
      }
    } catch (err) {
      console.error('[CampaignTracking] Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCampaignId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // 2. Fetch active campaign details and recipients
  const fetchCampaignDetails = useCallback(async (campaignId) => {
    if (!campaignId) return;
    setLoadingRecipients(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', '50');

      const res = await fetch(`/api/tracking/campaigns/${campaignId}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setActiveCampaign(data.campaign);
        setRecipients(data.recipients?.records || []);
        setTotalRecipients(data.recipients?.total || 0);
      }
    } catch (err) {
      console.error('[CampaignTracking] Error fetching details:', err);
    } finally {
      setLoadingRecipients(false);
    }
  }, [searchQuery, statusFilter, page]);

  useEffect(() => {
    if (activeCampaignId) {
      fetchCampaignDetails(activeCampaignId);
    }
  }, [activeCampaignId, fetchCampaignDetails]);

  // Overall totals across campaigns
  const aggregateTotals = campaigns.reduce(
    (acc, c) => {
      acc.totalRecipients += c.total_recipients || 0;
      acc.accepted += c.accepted_count || 0;
      acc.failed += c.failed_count || 0;
      acc.opened += c.opened_count || 0;
      acc.clicked += c.clicked_count || 0;
      return acc;
    },
    { totalRecipients: 0, accepted: 0, failed: 0, opened: 0, clicked: 0 }
  );

  // Export report
  const handleExportReport = () => {
    if (!activeCampaignId) return;
    window.open(`/api/tracking/campaigns/${activeCampaignId}/export`, '_blank');
  };

  // Retry failed emails in active campaign
  const handleRetryFailed = async () => {
    if (!activeCampaignId) return;
    if (!confirm('Retry dispatching all eligible failed recipients in this campaign?')) return;

    setRetrying(true);
    setRetryMessage('');
    try {
      const res = await fetch(`/api/tracking/campaigns/${activeCampaignId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setRetryMessage(data.message || 'Retry completed successfully.');
        fetchCampaigns();
        fetchCampaignDetails(activeCampaignId);
      } else {
        alert(data.error || 'Failed to retry campaign recipients.');
      }
    } catch {
      alert('Network error while retrying campaign recipients.');
    } finally {
      setRetrying(false);
    }
  };

  // Status pill formatter
  const getStatusClass = (status) => {
    switch (status) {
      case 'COMPLETED': return styles.statusCompleted;
      case 'PROCESSING': return styles.statusProcessing;
      case 'PARTIAL': return styles.statusPartial;
      case 'FAILED': return styles.statusFailed;
      default: return styles.statusQueued;
    }
  };

  if (loading) {
    return (
      <div className={styles.emptyState}>
        <RefreshCwIcon size={28} className={styles.loadingSpinner} />
        <p>Loading campaign reports and tracking telemetry...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Intro Header */}
      <div className={styles.introSection}>
        <h1 className={styles.headline}>Campaign Tracking &amp; Delivery Telemetry</h1>
        <p className={styles.subheadline}>
          End-to-end auditability for campus outreach dispatches: track SMTP acceptance status, failure diagnostics, pixel-based open rates, and engagement link clicks.
        </p>
      </div>

      {/* Deliverability & Open Tracking Disclosure */}
      <div className={styles.disclosureBanner}>
        <HelpCircleIcon size={20} className={styles.disclosureIcon} />
        <div className={styles.disclosureText}>
          <strong>Deliverability &amp; Tracking Disclosure:</strong> Emails marked <strong>&ldquo;SMTP ACCEPTED&rdquo;</strong> confirm that Google SMTP (upstream relay) validated credentials and accepted the message for transmission. Final mailbox placement is determined by the recipient&apos;s mail server antispam policies. Open tracking uses an invisible 1&times;1 pixel; open statistics may be underreported if recipient email clients enforce image blocking, Google image proxying, or Apple Mail Privacy Protection.
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Total Campaigns</span>
            <div className={styles.statIconWrap} style={{ background: '#f1f5f9', color: '#475569' }}>
              <BarChartIcon size={16} />
            </div>
          </div>
          <div className={styles.statValue}>{campaigns.length}</div>
          <div className={styles.statFootnote}>Recorded in database</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Total Recipients</span>
            <div className={styles.statIconWrap} style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <SendIcon size={16} />
            </div>
          </div>
          <div className={styles.statValue}>{aggregateTotals.totalRecipients.toLocaleString()}</div>
          <div className={styles.statFootnote}>Campus targets contacted</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>SMTP Accepted</span>
            <div className={styles.statIconWrap} style={{ background: '#dcfce7', color: '#16a34a' }}>
              <CheckCircleIcon size={16} />
            </div>
          </div>
          <div className={styles.statValue} style={{ color: '#15803d' }}>
            {aggregateTotals.accepted.toLocaleString()}
          </div>
          <div className={styles.statFootnote}>Relay 250 OK handshake</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Failed / Bounces</span>
            <div className={styles.statIconWrap} style={{ background: '#fee2e2', color: '#dc2626' }}>
              <AlertCircleIcon size={16} />
            </div>
          </div>
          <div className={styles.statValue} style={{ color: '#b91c1c' }}>
            {aggregateTotals.failed.toLocaleString()}
          </div>
          <div className={styles.statFootnote}>Eligible for safe retry</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Tracked Opens</span>
            <div className={styles.statIconWrap} style={{ background: '#eff6ff', color: '#2563eb' }}>
              <EyeIcon size={16} />
            </div>
          </div>
          <div className={styles.statValue} style={{ color: '#1d4ed8' }}>
            {aggregateTotals.opened.toLocaleString()}
          </div>
          <div className={styles.statFootnote}>
            {aggregateTotals.accepted > 0
              ? `${Math.round((aggregateTotals.opened / aggregateTotals.accepted) * 100)}% pixel detection rate`
              : 'Pixel tracking'}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Link Clicks</span>
            <div className={styles.statIconWrap} style={{ background: '#fdf4ff', color: '#c026d3' }}>
              <MousePointerIcon size={16} />
            </div>
          </div>
          <div className={styles.statValue} style={{ color: '#a21caf' }}>
            {aggregateTotals.clicked.toLocaleString()}
          </div>
          <div className={styles.statFootnote}>Portal &amp; festival clicks</div>
        </div>
      </div>

      {/* Main Master-Detail View */}
      {campaigns.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateTitle}>No campaigns dispatched yet</div>
          <p>Launch your first outreach campaign using the Campus Dispatcher to view real-time delivery telemetry and reports.</p>
        </div>
      ) : (
        <div className={styles.layoutGrid}>
          {/* Left: Campaign List */}
          <div className={styles.campaignListPanel}>
            <div className={styles.panelTitle}>
              <span>All Campaigns ({campaigns.length})</span>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={fetchCampaigns}
                title="Refresh campaigns list"
              >
                <RefreshCwIcon size={13} />
              </button>
            </div>

            {campaigns.map((camp) => {
              const isActive = camp.id === activeCampaignId;
              let targetCountries = [];
              let targetStates = [];
              try {
                targetCountries = JSON.parse(camp.target_countries || '[]');
                targetStates = JSON.parse(camp.target_states || '[]');
              } catch {}

              return (
                <div
                  key={camp.id}
                  className={`${styles.campaignItem} ${isActive ? styles.campaignItemActive : ''}`}
                  onClick={() => {
                    setActiveCampaignId(camp.id);
                    setPage(1);
                  }}
                >
                  <div className={styles.campaignItemHeader}>
                    <span className={styles.campaignItemName} title={camp.name}>
                      {camp.name}
                    </span>
                    <span className={`${styles.statusPill} ${getStatusClass(camp.status)}`}>
                      {camp.status}
                    </span>
                  </div>

                  <div className={styles.campaignItemMeta}>
                    <span>
                      <strong>{camp.total_recipients || 0}</strong> recipients &bull;{' '}
                      <span style={{ color: '#16a34a' }}>{camp.accepted_count || 0} ok</span>
                      {camp.failed_count > 0 && <span style={{ color: '#dc2626' }}> &bull; {camp.failed_count} failed</span>}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                      {targetCountries.join(', ') || 'India'} &bull; {targetStates.slice(0, 2).join(', ')}
                      {targetStates.length > 2 ? ` +${targetStates.length - 2}` : ''}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                      {new Date(camp.created_at).toLocaleDateString()} {new Date(camp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Campaign Details & Recipient Telemetry */}
          <div className={styles.detailPanel}>
            {activeCampaign ? (
              <>
                <div className={styles.detailHeader}>
                  <div className={styles.detailTitleArea}>
                    <h2 className={styles.detailTitle}>{activeCampaign.name}</h2>
                    <div className={styles.detailSubject}>Subject: &ldquo;{activeCampaign.subject}&rdquo;</div>
                    <div className={styles.detailBadges}>
                      <span className={styles.badge}>
                        <GlobeIcon size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {(() => {
                          try {
                            const c = JSON.parse(activeCampaign.target_countries || '[]');
                            return c.length > 0 ? c.join(', ') : 'India';
                          } catch { return 'India'; }
                        })()}
                      </span>
                      <span className={styles.badge}>
                        Regions:{' '}
                        {(() => {
                          try {
                            const s = JSON.parse(activeCampaign.target_states || '[]');
                            return s.length > 0 ? s.join(', ') : 'Andhra Pradesh';
                          } catch { return 'Andhra Pradesh'; }
                        })()}
                      </span>
                      <span className={styles.badge}>
                        <BuildingIcon size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {activeCampaign.selected_colleges_count || 0} Colleges Targeted
                      </span>
                    </div>
                  </div>

                  <div className={styles.actionButtons}>
                    <button
                      type="button"
                      className={styles.exportBtn}
                      onClick={handleExportReport}
                      title="Download full campaign telemetry as CSV"
                    >
                      <DownloadIcon size={14} />
                      <span>Export CSV Report</span>
                    </button>

                    {activeCampaign.failed_count > 0 && (
                      <button
                        type="button"
                        className={styles.retryBtn}
                        onClick={handleRetryFailed}
                        disabled={retrying}
                        title="Safely retry all eligible failed recipients"
                      >
                        <RefreshCwIcon size={14} className={retrying ? styles.loadingSpinner : ''} />
                        <span>{retrying ? 'Retrying...' : `Retry ${activeCampaign.failed_count} Failed`}</span>
                      </button>
                    )}
                  </div>
                </div>

                {retryMessage && (
                  <div className={styles.disclosureBanner} style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
                    <CheckCircleIcon size={18} style={{ color: '#16a34a' }} />
                    <span>{retryMessage}</span>
                  </div>
                )}

                {/* Progress Breakdown Bar */}
                <div className={styles.progressSection}>
                  <div className={styles.progressBarTrack}>
                    <div
                      className={styles.barAccepted}
                      style={{
                        width: `${activeCampaign.total_recipients > 0 ? (activeCampaign.accepted_count / activeCampaign.total_recipients) * 100 : 0}%`
                      }}
                      title={`Accepted: ${activeCampaign.accepted_count}`}
                    />
                    <div
                      className={styles.barFailed}
                      style={{
                        width: `${activeCampaign.total_recipients > 0 ? (activeCampaign.failed_count / activeCampaign.total_recipients) * 100 : 0}%`
                      }}
                      title={`Failed: ${activeCampaign.failed_count}`}
                    />
                    <div
                      className={styles.barPending}
                      style={{
                        width: `${activeCampaign.total_recipients > 0 ? (activeCampaign.queued_count / activeCampaign.total_recipients) * 100 : 0}%`
                      }}
                      title={`Queued/Pending: ${activeCampaign.queued_count}`}
                    />
                  </div>

                  <div className={styles.progressStatsRow}>
                    <div className={styles.progressStatItem}>
                      <span className={styles.progressStatLabel}>Total Dispatched</span>
                      <span className={styles.progressStatValue}>{activeCampaign.total_recipients}</span>
                    </div>
                    <div className={styles.progressStatItem}>
                      <span className={styles.progressStatLabel} style={{ color: '#16a34a' }}>SMTP Accepted</span>
                      <span className={styles.progressStatValue} style={{ color: '#16a34a' }}>{activeCampaign.accepted_count}</span>
                    </div>
                    <div className={styles.progressStatItem}>
                      <span className={styles.progressStatLabel} style={{ color: '#dc2626' }}>Failed Relay</span>
                      <span className={styles.progressStatValue} style={{ color: '#dc2626' }}>{activeCampaign.failed_count}</span>
                    </div>
                    <div className={styles.progressStatItem}>
                      <span className={styles.progressStatLabel} style={{ color: '#2563eb' }}>Tracked Opens</span>
                      <span className={styles.progressStatValue} style={{ color: '#2563eb' }}>{activeCampaign.opened_count || 0}</span>
                    </div>
                    <div className={styles.progressStatItem}>
                      <span className={styles.progressStatLabel} style={{ color: '#a21caf' }}>Link Clicks</span>
                      <span className={styles.progressStatValue} style={{ color: '#a21caf' }}>{activeCampaign.clicked_count || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Filter and Search Bar for Recipients */}
                <div className={styles.filterBar}>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search by college, recipient email, or contact..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />

                  <select
                    className={styles.statusSelect}
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="ACCEPTED">SMTP Accepted</option>
                    <option value="FAILED">Failed Only</option>
                    <option value="opened">Opened (Pixel Tracked)</option>
                    <option value="clicked">Clicked Links</option>
                    <option value="PENDING">Pending / Queued</option>
                  </select>
                </div>

                {/* Recipients Telemetry Table */}
                <div className={styles.tableWrapper}>
                  <table className={styles.recipientsTable}>
                    <thead>
                      <tr>
                        <th>College &amp; Department</th>
                        <th>Recipient Email</th>
                        <th>Location</th>
                        <th>SMTP Status</th>
                        <th>Open Tracking</th>
                        <th>Click Tracking</th>
                        <th>Sent / Attempt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingRecipients ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                            <RefreshCwIcon size={20} className={styles.loadingSpinner} />
                            <div style={{ marginTop: '8px', color: '#64748b' }}>Loading recipient records...</div>
                          </td>
                        </tr>
                      ) : recipients.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                            No recipient records match the selected search or filters.
                          </td>
                        </tr>
                      ) : (
                        recipients.map((rec) => {
                          const isAccepted = rec.status === 'ACCEPTED';
                          const isFailed = rec.status === 'FAILED';
                          const isPending = rec.status === 'PENDING' || rec.status === 'PROCESSING';

                          return (
                            <tr key={rec.id}>
                              <td>
                                <div className={styles.collegeCol} title={rec.college_name}>
                                  {rec.college_name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  {rec.contact_person || 'Official Rep'} &bull; {rec.department || 'Outreach'}
                                </div>
                              </td>

                              <td>
                                <div className={styles.emailCol}>{rec.email}</div>
                              </td>

                              <td>
                                <div className={styles.locationCol}>
                                  {rec.state || 'Andhra Pradesh'}, {rec.country || 'India'}
                                </div>
                              </td>

                              <td>
                                {isAccepted && (
                                  <span className={`${styles.statusBadge} ${styles.badgeAccepted}`} title={rec.smtp_response || '250 OK'}>
                                    <CheckCircleIcon size={12} />
                                    <span>SMTP Accepted</span>
                                  </span>
                                )}
                                {isFailed && (
                                  <div>
                                    <span className={`${styles.statusBadge} ${styles.badgeFailed}`}>
                                      <AlertCircleIcon size={12} />
                                      <span>Failed</span>
                                    </span>
                                    <div className={styles.errorText} title={rec.error_message}>
                                      {rec.error_message || 'Delivery error'}
                                    </div>
                                  </div>
                                )}
                                {isPending && (
                                  <span className={`${styles.statusBadge} ${styles.badgePending}`}>
                                    <ClockIcon size={12} />
                                    <span>{rec.status}</span>
                                  </span>
                                )}
                              </td>

                              <td>
                                {rec.opened_at ? (
                                  <span className={`${styles.trackingIndicator} ${styles.trackedYes}`} title={`Opened at ${rec.opened_at}`}>
                                    <EyeIcon size={12} />
                                    <span>Opened ({rec.open_count || 1}x)</span>
                                  </span>
                                ) : (
                                  <span className={`${styles.trackingIndicator} ${styles.trackedNo}`}>
                                    <span>Unopened</span>
                                  </span>
                                )}
                              </td>

                              <td>
                                {rec.clicked_at ? (
                                  <span className={`${styles.trackingIndicator} ${styles.trackedYes}`} title={`Clicked URL: ${rec.last_clicked_url || 'Target Link'}`}>
                                    <MousePointerIcon size={12} />
                                    <span>Clicked ({rec.click_count || 1}x)</span>
                                  </span>
                                ) : (
                                  <span className={`${styles.trackingIndicator} ${styles.trackedNo}`}>
                                    <span>No Clicks</span>
                                  </span>
                                )}
                              </td>

                              <td>
                                <div style={{ fontSize: '11px', color: '#475569' }}>
                                  {rec.sent_at ? new Date(rec.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Queued'}
                                </div>
                                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                  Attempts: {rec.attempts || 1}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className={styles.paginationRow}>
                  <span>
                    Showing {recipients.length} of {totalRecipients} recipients
                  </span>
                  <div className={styles.pageButtons}>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span style={{ padding: '6px 10px', fontWeight: 600 }}>Page {page}</span>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={page * 50 >= totalRecipients}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>Select a campaign to view telemetry</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
