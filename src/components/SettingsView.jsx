'use client';

import React, { useState, useEffect } from 'react';
import styles from './SettingsView.module.css';
import {
  ServerIcon,
  UserPlusIcon,
  LockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CloseIcon,
  RefreshCwIcon,
  UserIcon,
} from './Icons';

export default function SettingsView({ session }) {
  const isAdmin = session?.role === 'admin';
  const [activeSubTab, setActiveSubTab] = useState('smtp');
  const [feedback, setFeedback] = useState(null);

  // SMTP Settings State
  const [smtpForm, setSmtpForm] = useState({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    from_name: 'Shortfundly Campus Outreach',
    from_email: '',
    auth_method: 'app_password',
  });
  const [loadingSmtp, setLoadingSmtp] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // User Management State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'manager',
    can_send: false,
  });
  const [addingUser, setAddingUser] = useState(false);

  // Reset Password State
  const [resetTarget, setResetTarget] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [resettingPw, setResettingPw] = useState(false);

  // Load SMTP config
  const fetchSmtpConfig = async () => {
    if (!isAdmin) return;
    try {
      setLoadingSmtp(true);
      const res = await fetch('/api/admin/smtp');
      if (res.ok) {
        const data = await res.json();
        setSmtpForm({
          host: data.host || 'smtp.gmail.com',
          port: data.port || 465,
          secure: Boolean(data.secure),
          user: data.user || '',
          pass: data.pass_masked || '',
          from_name: data.from_name || 'Shortfundly Campus Outreach',
          from_email: data.from_email || '',
          auth_method: data.auth_method || 'app_password',
        });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load SMTP configuration.' });
    } finally {
      setLoadingSmtp(false);
    }
  };

  // Load Users
  const fetchUsers = async () => {
    if (!isAdmin) return;
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load company users.' });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSmtpConfig();
      fetchUsers();
    }
  }, [isAdmin]);

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      setSavingSmtp(true);
      const res = await fetch('/api/admin/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: 'Google SMTP credentials and settings updated securely.' });
        fetchSmtpConfig();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save SMTP settings.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving SMTP settings.' });
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!isAdmin) return;
    try {
      setTestingSmtp(true);
      setTestResult(null);
      const res = await fetch('/api/admin/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpForm),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        setFeedback({ type: 'success', message: 'Google SMTP TLS handshake succeeded!' });
      } else {
        setFeedback({ type: 'error', message: data.message || 'SMTP Handshake failed.' });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Could not connect to SMTP server: ' + err.message,
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) return;

    try {
      setAddingUser(true);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: `Company account for ${newUser.email} created successfully.` });
        setIsAddUserOpen(false);
        setNewUser({ email: '', password: '', role: 'manager', can_send: false });
        fetchUsers();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to create user.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error creating company account.' });
    } finally {
      setAddingUser(false);
    }
  };

  const handleUpdateUser = async (userId, changes) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...changes }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: data.message || 'User updated.' });
        fetchUsers();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to update user.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error updating user.' });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTarget || !newPasswordVal || newPasswordVal.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }

    try {
      setResettingPw(true);
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resetTarget.id, password: newPasswordVal }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: `Password reset successfully for ${resetTarget.email}.` });
        setResetTarget(null);
        setNewPasswordVal('');
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to reset password.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error resetting password.' });
    } finally {
      setResettingPw(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>System Settings</h2>
          <p className={styles.description}>
            Authenticated Session & Access Profile
          </p>
        </div>

        <div className={styles.settingsCard}>
          <div className={styles.lockNotice}>
            <LockIcon size={32} />
            <div className={styles.lockTitle}>Administrator Access Required</div>
            <div className={styles.lockSub}>
              Google SMTP Gateway settings and Company User Management are restricted to Shortfundly Administrators.
              Your current profile details are shown below.
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Account Email</label>
              <input type="text" className={styles.input} value={session?.email || ''} disabled />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Assigned Role</label>
              <input type="text" className={styles.input} value={session?.role || ''} disabled />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Outreach Send Permission</label>
              <input
                type="text"
                className={styles.input}
                value={session?.role === 'team_lead' || session?.can_send ? 'Enabled' : 'Disabled (View Only)'}
                disabled
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Authentication Mechanism</label>
              <input type="text" className={styles.input} value="Company JWT Session (HS256)" disabled />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>System Settings & Administration</h2>
        <p className={styles.description}>
          Configure production Google SMTP email gateway parameters and manage company user credentials, roles, and dispatch permissions.
        </p>
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

      {/* Navigation Sub-Tabs */}
      <div className={styles.tabNav}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeSubTab === 'smtp' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveSubTab('smtp')}
        >
          <ServerIcon size={16} />
          <span>Google SMTP Gateway</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeSubTab === 'users' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveSubTab('users')}
        >
          <UserPlusIcon size={16} />
          <span>Company Accounts & Roles</span>
        </button>
      </div>

      {/* Tab 1: Google SMTP */}
      {activeSubTab === 'smtp' && (
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Google SMTP Server Configuration</div>
              <div className={styles.cardSubtitle}>
                Production mail delivery engine using Nodemailer pooled TLS connection to smtp.gmail.com.
              </div>
            </div>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleTestSmtp}
              disabled={testingSmtp || loadingSmtp}
            >
              <RefreshCwIcon size={14} />
              <span>{testingSmtp ? 'Testing Handshake...' : 'Test SMTP Handshake'}</span>
            </button>
          </div>

          {testResult && (
            <div className={`${styles.diagBox} ${testResult.success ? styles.diagSuccess : styles.diagFailure}`}>
              <div className={styles.diagTitle}>
                {testResult.success ? <CheckCircleIcon size={18} /> : <AlertCircleIcon size={18} />}
                <span>
                  {testResult.success
                    ? 'Google SMTP Transport Verified Successfully'
                    : 'SMTP Handshake / Authentication Failed'}
                </span>
              </div>
              <div className={styles.diagDetail}>
                {testResult.success ? (
                  <>
                    Host: {testResult.host}:{testResult.port} (Secure TLS) &bull; Verified in{' '}
                    {testResult.response_time_ms}ms
                  </>
                ) : (
                  <>Error: {testResult.message || 'Failed to authenticate with Google SMTP.'}</>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSaveSmtp}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>SMTP Host</label>
                <input
                  type="text"
                  className={styles.input}
                  value={smtpForm.host}
                  onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  required
                />
                <span className={styles.inputHint}>Google SMTP: smtp.gmail.com</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>SMTP Port & Security</label>
                <select
                  className={styles.select}
                  value={smtpForm.port}
                  onChange={(e) => {
                    const port = Number(e.target.value);
                    setSmtpForm({
                      ...smtpForm,
                      port,
                      secure: port === 465,
                    });
                  }}
                >
                  <option value={465}>Port 465 (SSL / Direct TLS - Recommended)</option>
                  <option value={587}>Port 587 (STARTTLS)</option>
                </select>
                <span className={styles.inputHint}>Use 465 with SSL for encrypted Google mail flow</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Google Account / SMTP Username</label>
                <input
                  type="email"
                  className={styles.input}
                  value={smtpForm.user}
                  onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                  placeholder="e.g. dharshana.shortfundly@gmail.com"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Google App Password (16 Characters)</label>
                <input
                  type="password"
                  className={styles.input}
                  value={smtpForm.pass}
                  onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                  placeholder="Enter 16-character Google App Password"
                />
                <span className={styles.inputHint}>
                  Masked for security. Leave as bullets to keep existing stored credentials.
                </span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Sender Display Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={smtpForm.from_name}
                  onChange={(e) => setSmtpForm({ ...smtpForm, from_name: e.target.value })}
                  placeholder="Shortfundly Campus Relations"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Sender / Reply-To Email</label>
                <input
                  type="email"
                  className={styles.input}
                  value={smtpForm.from_email}
                  onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })}
                  placeholder="dharshana.shortfundly@gmail.com"
                />
              </div>
            </div>

            <div className={styles.actionsBar}>
              <div className={styles.leftActions}>
                <span className={styles.inputHint}>
                  Changes take effect immediately across all background and manual dispatch workers.
                </span>
              </div>
              <div className={styles.rightActions}>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={savingSmtp || loadingSmtp}
                >
                  {savingSmtp ? 'Saving Configuration...' : 'Save Google SMTP Settings'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Company Accounts & Roles */}
      {activeSubTab === 'users' && (
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Company User Directory & RBAC Roles</div>
              <div className={styles.cardSubtitle}>
                Manage team member credentials, assign roles (Admin, Team Lead, Manager), and regulate outreach sending rights.
              </div>
            </div>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => setIsAddUserOpen(true)}
            >
              <UserPlusIcon size={16} />
              <span>Add Company Account</span>
            </button>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.userTable}>
              <thead>
                <tr>
                  <th>User Email</th>
                  <th>Role</th>
                  <th>Outreach Send Right</th>
                  <th>Account Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === session?.userId;
                  const canSend = u.role === 'admin' || u.role === 'team_lead' || Boolean(u.can_send);

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <UserIcon size={14} />
                          <strong>{u.email}</strong>
                          {isSelf && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(You)</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <select
                          className={styles.roleSelect}
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                        >
                          <option value="admin">Administrator</option>
                          <option value="team_lead">Team Lead</option>
                          <option value="manager">Manager</option>
                        </select>
                      </td>

                      <td>
                        {u.role === 'manager' ? (
                          <button
                            type="button"
                            className={`${styles.sendToggle} ${u.can_send ? styles.sendAllowed : styles.sendDenied}`}
                            onClick={() => handleUpdateUser(u.id, { can_send: !u.can_send })}
                          >
                            {u.can_send ? 'Send Enabled' : 'Send Disabled'}
                          </button>
                        ) : (
                          <span className={`${styles.sendToggle} ${styles.sendAllowed}`}>
                            Always Allowed ({u.role === 'admin' ? 'Admin' : 'Team Lead'})
                          </span>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`${styles.statusToggle} ${u.is_active ? styles.statusActive : styles.statusInactive}`}
                          disabled={isSelf}
                          onClick={() => handleUpdateUser(u.id, { is_active: !u.is_active })}
                          title={isSelf ? 'Cannot deactivate self' : 'Toggle active status'}
                        >
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </button>
                      </td>

                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>

                      <td>
                        <button
                          type="button"
                          className={styles.btnSecondary}
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                          onClick={() => {
                            setResetTarget(u);
                            setNewPasswordVal('');
                          }}
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsAddUserOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCreateUser}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>Add New Company Account</div>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setIsAddUserOpen(false)}
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Company Email Address</label>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="e.g. outreach.lead@shortfundly.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Temporary Password (min 8 chars)</label>
                  <input
                    type="password"
                    className={styles.input}
                    placeholder="Enter strong password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Access Role</label>
                  <select
                    className={styles.select}
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="manager">Manager (Read-only by default, assignable send)</option>
                    <option value="team_lead">Team Lead (Outreach, Templates, Full Sending)</option>
                    <option value="admin">Administrator (Complete System & User Control)</option>
                  </select>
                </div>

                {newUser.role === 'manager' && (
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={newUser.can_send}
                      onChange={(e) => setNewUser({ ...newUser, can_send: e.target.checked })}
                    />
                    <span>Grant outreach email sending authorization</span>
                  </label>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsAddUserOpen(false)}
                  disabled={addingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={addingUser}
                >
                  {addingUser ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className={styles.modalBackdrop} onClick={() => setResetTarget(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleResetPassword}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>Reset Password: {resetTarget.email}</div>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setResetTarget(null)}
                >
                  <CloseIcon size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>New Password (min 8 chars)</label>
                  <input
                    type="password"
                    className={styles.input}
                    placeholder="Enter new secure password"
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setResetTarget(null)}
                  disabled={resettingPw}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={resettingPw}
                >
                  {resettingPw ? 'Saving...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
