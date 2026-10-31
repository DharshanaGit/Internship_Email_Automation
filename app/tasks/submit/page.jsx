'use client';

import { useState, useEffect } from 'react';
import styles from './submit.module.css';
import { Shield, Clock, CheckCircle2, AlertCircle, ArrowRight, ExternalLink, GitBranch, Globe } from 'lucide-react';

export default function TaskSubmitPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [projectUrl, setProjectUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [submissionDocs, setSubmissionDocs] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
      loadTask(t);
    } else {
      setErrorMessage('Missing task submission token in the link.');
      setLoading(false);
    }
  }, []);

  const loadTask = async (tok) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/submit?token=${encodeURIComponent(tok)}`);
      const data = await res.json();
      if (data.success && data.task) {
        setTask(data.task);
        setCandidate(data.candidate);
        if (data.task.projectUrl) setProjectUrl(data.task.projectUrl);
        if (data.task.githubUrl) setGithubUrl(data.task.githubUrl);
      } else {
        setErrorMessage(data.error || 'Failed to load task submission details.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error connecting to the verification server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!projectUrl && !githubUrl) {
      setErrorMessage('Please provide either a live Project Demo URL or a GitHub Repository URL.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          projectUrl,
          githubUrl,
          submissionDocs,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || 'Deliverables submitted successfully.');
        loadTask(token);
      } else {
        setErrorMessage(data.error || 'Failed to submit deliverables.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error communicating with server.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.container} style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ color: 'var(--text-muted)' }}>Loading task details...</div>
        </div>
      </div>
    );
  }

  if (errorMessage && !task) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <div className={styles.expiredBanner}>
            <AlertCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            <span>{errorMessage}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.companyTitle}>SHORTFUNDLY</div>
          <div className={styles.companySubtitle}>Shortfundly Media Technologies Pvt. Ltd. &bull; Task Submission Portal</div>

          <div className={styles.badgeBlock}>
            <div className={styles.internIdBadge}>
              INTERN ID: {candidate?.internId || 'SF-2026-INT'}
            </div>
            <div className={styles.scoreBadge}>
              Performance Score: {candidate?.performancePercentage?.toFixed(0) || 100}%
            </div>
            {task?.deadline && (
              <div className={styles.deadlineContainer}>
                <Clock size={14} />
                <span>Submission Deadline: {new Date(task.deadline).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {task?.isExpired && (
          <div className={styles.expiredBanner}>
            Notice: The deadline for this milestone task has expired. The submission portal is locked. If an extension was requested, contact your HR coordinator.
          </div>
        )}

        {successMessage && (
          <div className={styles.successBanner}>
            <CheckCircle2 size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            <span>{successMessage}</span>
          </div>
        )}

        {task?.alreadySubmitted && (
          <div className={styles.successBanner}>
            Milestone Submitted on {new Date(task.submittedAt).toLocaleString()}. Your work is currently under review by technical mentorship.
          </div>
        )}

        {/* Candidate Context Card */}
        <div className={styles.detailsCard}>
          <div className={styles.detailsGrid}>
            <div>
              <div className={styles.detailsLabel}>Candidate Name</div>
              <div className={styles.detailsValue}>{candidate?.fullName}</div>
            </div>
            <div>
              <div className={styles.detailsLabel}>Assigned Role</div>
              <div className={styles.detailsValue}>{candidate?.role}</div>
            </div>
            <div>
              <div className={styles.detailsLabel}>Batch</div>
              <div className={styles.detailsValue}>{candidate?.batch || 'Batch A - June 2026'}</div>
            </div>
            <div>
              <div className={styles.detailsLabel}>Submission Status</div>
              <div className={styles.detailsValue}>{task?.submissionStatus}</div>
            </div>
          </div>
        </div>

        {/* Task Specification Card */}
        <div className={styles.taskSpecCard}>
          <div className={styles.taskSpecTitle}>
            {task?.taskId}: {task?.taskName}
          </div>
          <div className={styles.taskSpecItem}>
            <strong>Core Objective:</strong>
            <div>{task?.objective}</div>
          </div>
          <div className={styles.taskSpecItem}>
            <strong>Functional Modules:</strong>
            <div>{task?.modules}</div>
          </div>
          <div className={styles.taskSpecItem}>
            <strong>Tools & Technologies:</strong>
            <div>{task?.toolsAndTech}</div>
          </div>
          <div className={styles.taskSpecItem}>
            <strong>Client / Technical Requirements:</strong>
            <div>{task?.clientRequirements}</div>
          </div>
        </div>

        {/* Submission Form */}
        {task?.alreadySubmitted ? (
          <div style={{ marginTop: '20px', padding: '18px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>SUBMITTED DELIVERABLE RECORDS:</div>
            {task.projectUrl && (
              <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                <Globe size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                <span>Demo URL: </span>
                <a href={task.projectUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                  {task.projectUrl}
                </a>
              </div>
            )}
            {task.githubUrl && (
              <div style={{ fontSize: '13px' }}>
                <GitBranch size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                <span>GitHub Repository: </span>
                <a href={task.githubUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                  {task.githubUrl}
                </a>
              </div>
            )}
          </div>
        ) : !task?.isExpired ? (
          <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Live Project Demo URL</label>
              <input
                type="url"
                className={styles.input}
                placeholder="https://your-project.vercel.app"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>GitHub Repository URL</label>
              <input
                type="url"
                className={styles.input}
                placeholder="https://github.com/username/project-repo"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Implementation Notes / Documentation Links (Optional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Summarize architectural decisions, setup instructions, or documentation links..."
                value={submissionDocs}
                onChange={(e) => setSubmissionDocs(e.target.value)}
              />
            </div>

            {errorMessage && (
              <div className={styles.expiredBanner} style={{ marginTop: '14px' }}>
                <AlertCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button type="submit" disabled={submitting} className={styles.submitBtn}>
              <span>{submitting ? 'Submitting Deliverables...' : 'Submit Project & GitHub Link'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
