'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './respond.module.css';
import { Shield, Clock, CheckCircle2, AlertCircle, Upload, PenTool, Type, FileText, Download, XCircle, ArrowRight, Eye, Check } from 'lucide-react';

export default function OfferRespondPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  // Decision State: 'ACCEPT' or 'REJECT'
  const [decision, setDecision] = useState('ACCEPT');
  const [rejectionReason, setRejectionReason] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);

  // Terms Consent
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Signature Mode: 'upload' | 'draw' | 'type'
  const [signatureMode, setSignatureMode] = useState('upload');
  const [typedName, setTypedName] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Canvas Refs
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token') || 'latest';
    setToken(t);
    loadOffer(t);
  }, []);

  const loadOffer = async (tok) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/offers/details?token=${encodeURIComponent(tok)}`);
      const data = await res.json();
      if (data.success && data.candidate) {
        setCandidate(data.candidate);
        setTypedName(data.candidate.fullName || '');
      } else {
        setErrorMessage(data.error || 'Failed to load offer details.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error connecting to the verification server.');
    } finally {
      setLoading(false);
    }
  };

  // Canvas Drawing Logic
  const startDrawing = (e) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#c084fc';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, or WEBP) for your signature.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureData(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDecision = async () => {
    setErrorMessage('');

    if (decision === 'ACCEPT') {
      if (!termsAccepted) {
        setErrorMessage('You must review and check the explicit consent box for Terms & Conditions.');
        return;
      }

      let finalSig = signatureData;
      let finalSigType = 'UPLOADED';

      if (signatureMode === 'upload') {
        if (!signatureData) {
          setErrorMessage('Please upload a photo or image file of your signature (PNG or JPG).');
          return;
        }
        finalSig = signatureData;
        finalSigType = 'UPLOADED';
      } else if (signatureMode === 'draw') {
        if (!signatureData) {
          setErrorMessage('Please draw your digital signature on the canvas area provided.');
          return;
        }
        finalSig = signatureData;
        finalSigType = 'DRAWN';
      } else if (signatureMode === 'type') {
        if (!typedName.trim()) {
          setErrorMessage('Please type your full legal name for digital signature.');
          return;
        }
        // Convert typed name to canvas signature image for Cloudinary storage
        try {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = 600;
          offCanvas.height = 150;
          const ctx = offCanvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);
          ctx.fillStyle = '#0f172a';
          ctx.font = 'italic bold 38px "Brush Script MT", "Caveat", "Dancing Script", cursive, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(typedName.trim(), offCanvas.width / 2, offCanvas.height / 2);
          finalSig = offCanvas.toDataURL('image/png');
          finalSigType = 'TYPED_IMAGE';
        } catch (e) {
          finalSig = typedName.trim();
          finalSigType = 'TYPED';
        }
      }

      try {
        setSubmitting(true);
        const res = await fetch('/api/offers/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            action: 'ACCEPT',
            signatureType: finalSigType,
            signatureData: finalSig,
            termsAccepted: true,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setSuccessMessage('Congratulations! Your acceptance and digital signature have been recorded successfully. Confirmation emails have been dispatched.');
          loadOffer(token);
        } else {
          setErrorMessage(data.error || 'Failed to submit acceptance.');
        }
      } catch (err) {
        setErrorMessage(err.message || 'An error occurred while submitting your decision.');
      } finally {
        setSubmitting(false);
      }
    } else if (decision === 'REJECT') {
      if (!confirmReject) {
        setConfirmReject(true);
        return;
      }

      try {
        setSubmitting(true);
        const res = await fetch('/api/offers/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            action: 'REJECT',
            rejectionReason: rejectionReason.trim(),
          }),
        });

        const data = await res.json();
        if (data.success) {
          setSuccessMessage('Your decision declining the internship offer has been recorded. Thank you for your consideration.');
          loadOffer(token);
        } else {
          setErrorMessage(data.error || 'Failed to submit response.');
        }
      } catch (err) {
        setErrorMessage(err.message || 'An error occurred while submitting your response.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}>
          <Shield size={36} color="#a855f7" className={styles.spinner} />
          <p style={{ marginTop: '16px', color: '#cbd5e1' }}>Authenticating secure candidate offer portal...</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !candidate) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <AlertCircle size={44} color="#ef4444" />
          <h2 style={{ marginTop: '14px', color: '#f8fafc' }}>Invalid or Expired Link</h2>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>{errorMessage}</p>
          <div className={styles.contactHrBox}>
            <p>If you believe this is an error or need your offer link renewed, please contact the talent team:</p>
            <a href="mailto:hr@shortfundly.com" className={styles.contactBtn}>Contact HR: hr@shortfundly.com</a>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = candidate?.isExpired;
  const isAlreadyResponded = candidate?.alreadyResponded;

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header Banner */}
        <div className={styles.headerCard}>
          <div className={styles.brandTitleRow}>
            <div>
              <span className={styles.brandBadge}>Official Offer Verification</span>
              <h1 className={styles.mainTitle}>Internship Offer Acceptance Portal</h1>
              <p className={styles.subTitle}>Shortfundly &bull; Talent Acquisition & Digital Onboarding</p>
            </div>
            <div className={styles.deadlineBadge}>
              <Clock size={16} color="#c084fc" />
              <span>
                Deadline: {candidate.offerDeadline ? new Date(candidate.offerDeadline).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Within 3 days'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Banners */}
        {successMessage && (
          <div className={styles.successBanner}>
            <CheckCircle2 size={20} color="#10b981" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className={styles.errorBanner}>
            <AlertCircle size={20} color="#ef4444" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isExpired && !isAlreadyResponded && (
          <div className={styles.expiredBanner}>
            <AlertCircle size={20} color="#f59e0b" />
            <div>
              <strong>Offer Link Has Expired</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                The official deadline to respond to this offer was {new Date(candidate.offerDeadline).toLocaleDateString()}. Please reach out to <a href="mailto:hr@shortfundly.com" style={{ textDecoration: 'underline' }}>hr@shortfundly.com</a> for an extension or renewal.
              </p>
            </div>
          </div>
        )}

        {isAlreadyResponded && (
          <div className={styles.completedBanner}>
            <CheckCircle2 size={22} color={candidate.offerLetterStatus === 'Accepted' ? '#10b981' : '#f43f5e'} />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>
                Offer Decision Recorded: {candidate.offerLetterStatus}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#cbd5e1' }}>
                {candidate.offerLetterStatus === 'Accepted'
                  ? `Your acceptance with verified digital signature was recorded on ${new Date(candidate.offerAcceptedAt).toUTCString()}. Welcome to the team!`
                  : `Your decision to decline this offer was recorded on ${new Date(candidate.offerRejectedAt || Date.now()).toUTCString()}. Reason: ${candidate.rejectionReason || 'None specified'}.`}
              </p>
            </div>
          </div>
        )}

        {/* Candidate & Internship Details Card */}
        <div className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>
            <Shield size={18} color="#a855f7" />
            <span>Internship Details & Candidate Record</span>
          </h2>

          <div className={styles.grid2Col}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Candidate Name</span>
              <strong className={styles.infoValue}>{candidate.fullName}</strong>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Permanent Intern ID</span>
              <strong className={styles.infoValue} style={{ color: '#c084fc' }}>{candidate.internId || candidate.candidateId}</strong>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Role / Designation</span>
              <strong className={styles.infoValue}>{candidate.role}</strong>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Hiring Batch</span>
              <strong className={styles.infoValue}>{candidate.batch}</strong>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Stipend / Compensation</span>
              <strong className={styles.infoValue} style={{ color: '#34d399' }}>{candidate.stipend}</strong>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Tenure / Duration</span>
              <strong className={styles.infoValue}>{candidate.joiningDate} to {candidate.endDate} ({candidate.duration})</strong>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Work Mode</span>
              <strong className={styles.infoValue}>{candidate.workMode}</strong>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Reporting Manager</span>
              <strong className={styles.infoValue}>{candidate.reportingManager}</strong>
            </div>
          </div>
        </div>

        {/* PDF Offer Letter Card - Compact without massive empty space */}
        <div className={styles.sectionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '10px', borderRadius: '8px', color: '#c084fc' }}>
                <FileText size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#ffffff', fontWeight: 700 }}>
                  Official Internship Offer Letter (PDF)
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Document: Shortfundly_Offer_{(candidate.fullName || 'Candidate').replace(/\s+/g, '_')}.pdf &bull; A4 Corporate Standard
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowPdfViewer(!showPdfViewer)}
                className={styles.btnSecondary}
              >
                <Eye size={14} />
                <span>{showPdfViewer ? 'Hide PDF Preview' : 'Preview Document'}</span>
              </button>
              <a
                href={candidate.pdfUrl}
                download={`Shortfundly_Offer_${(candidate.fullName || 'Candidate').replace(/\s+/g, '_')}.pdf`}
                className={styles.btnSecondary}
              >
                <Download size={14} />
                <span>Download PDF</span>
              </a>
            </div>
          </div>

          {showPdfViewer && (
            <div className={styles.pdfViewerBox} style={{ marginTop: '16px' }}>
              <iframe
                src={candidate.pdfUrl}
                title="Internship Offer Letter PDF"
                className={styles.pdfIframe}
              />
            </div>
          )}
        </div>

        {/* Decision & Digital Signature Form (Only visible if not responded & not expired) */}
        {!isAlreadyResponded && !isExpired && (
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <PenTool size={18} color="#a855f7" />
              <span>Record Your Decision & Digital Signature</span>
            </h2>

            {/* Decision Selector */}
            <div className={styles.decisionToggleRow}>
              <button
                type="button"
                onClick={() => { setDecision('ACCEPT'); setConfirmReject(false); }}
                className={`${styles.toggleBtn} ${decision === 'ACCEPT' ? styles.toggleBtnAcceptActive : ''}`}
              >
                <CheckCircle2 size={16} />
                <span>Accept Offer</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECT')}
                className={`${styles.toggleBtn} ${decision === 'REJECT' ? styles.toggleBtnRejectActive : ''}`}
              >
                <XCircle size={16} />
                <span>Decline Offer</span>
              </button>
            </div>

            {/* ACCEPT WORKFLOW */}
            {decision === 'ACCEPT' && (
              <div className={styles.acceptFlowBox}>
                {/* Terms and Conditions Consent */}
                <div className={styles.termsBox}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#e2e8f0', fontSize: '14px' }}>Terms & Conditions of Acceptance:</h4>
                  <ul style={{ paddingLeft: '18px', color: '#94a3b8', fontSize: '13px', lineHeight: 1.6 }}>
                    <li>I confirm that all personal and educational details provided are true and accurate.</li>
                    <li>I agree to adhere to Shortfundly confidentiality policies and intellectual property assignment.</li>
                    <li>I commit to the scheduled working hours, sprint deliverables, and final review cycles.</li>
                  </ul>

                  <label className={styles.consentLabel}>
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#a855f7', cursor: 'pointer' }}
                    />
                    <span>
                      I have read, understood, and explicitly agree to the terms outlined in this offer letter. <strong style={{ color: '#ec4899' }}>*</strong>
                    </span>
                  </label>
                </div>

                {/* Signature Mode Selector */}
                <div style={{ marginTop: '22px' }}>
                  <label className={styles.fieldLabel}>
                    Select Digital Signature Method <strong style={{ color: '#ec4899' }}>*</strong>
                  </label>
                  <div className={styles.sigModeTabs}>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('upload')}
                      className={`${styles.sigTab} ${signatureMode === 'upload' ? styles.sigTabActive : ''}`}
                    >
                      <Upload size={14} />
                      <span>Upload Signature Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('draw')}
                      className={`${styles.sigTab} ${signatureMode === 'draw' ? styles.sigTabActive : ''}`}
                    >
                      <PenTool size={14} />
                      <span>Draw on Canvas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('type')}
                      className={`${styles.sigTab} ${signatureMode === 'type' ? styles.sigTabActive : ''}`}
                    >
                      <Type size={14} />
                      <span>Type Full Name</span>
                    </button>
                  </div>

                  {/* Mode 1: Typed Name */}
                  {signatureMode === 'type' && (
                    <div style={{ marginTop: '14px' }}>
                      <input
                        type="text"
                        value={typedName}
                        onChange={(e) => setTypedName(e.target.value)}
                        placeholder="Type your full legal name"
                        className={styles.sigTextInput}
                      />
                      {typedName && (
                        <div className={styles.sigFontPreview}>
                          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Digital Signature Preview:</span>
                          <div className={styles.signatureStyledText}>{typedName}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Draw on Canvas */}
                  {signatureMode === 'draw' && (
                    <div style={{ marginTop: '14px' }}>
                      <div className={styles.canvasContainer}>
                        <canvas
                          ref={canvasRef}
                          width={580}
                          height={160}
                          className={styles.signatureCanvas}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Draw your signature using mouse or finger touch.</span>
                        <button type="button" onClick={clearCanvas} className={styles.btnClearCanvas}>Clear Canvas</button>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Upload Photo */}
                  {signatureMode === 'upload' && (
                    <div style={{ marginTop: '14px' }}>
                      <label className={styles.uploadArea}>
                        <Upload size={24} color="#a855f7" />
                        <span style={{ marginTop: '8px', fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
                          Click to upload signature image or photo (PNG / JPG / WEBP)
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
                          Image will be cryptographically verified and securely stored in Cloudinary
                        </span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                      </label>
                      {signatureData && signatureData.startsWith('data:image/') && (
                        <div style={{ marginTop: '12px', textAlign: 'center', background: '#09090b', padding: '12px', borderRadius: '8px', border: '1px solid #27272a' }}>
                          <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Check size={14} color="#10b981" />
                            <span>Signature Image Ready for Cloudinary Upload</span>
                          </div>
                          <img src={signatureData} alt="Uploaded signature" style={{ maxHeight: '90px', border: '1px solid #a855f7', borderRadius: '6px', background: '#ffffff', padding: '6px' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Final Submit Button */}
                <div style={{ marginTop: '28px', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={handleSubmitDecision}
                    disabled={submitting}
                    className={styles.btnSubmitAccept}
                  >
                    <span>{submitting ? 'Recording Digital Acceptance...' : 'Confirm & Sign Offer Letter'}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* REJECT WORKFLOW */}
            {decision === 'REJECT' && (
              <div className={styles.rejectFlowBox}>
                <div className={styles.rejectNotice}>
                  <AlertCircle size={20} color="#f43f5e" />
                  <div>
                    <strong>Are you sure you wish to decline this internship offer?</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#cbd5e1' }}>
                      Declining is final and will release your internship placement. No digital signature is required.
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <label className={styles.fieldLabel}>Reason for Declining (Optional):</label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g., Accepted another offer, scheduling conflict, etc."
                    className={styles.rejectTextarea}
                  />
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setDecision('ACCEPT'); setConfirmReject(false); }}
                    className={styles.btnSecondary}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitDecision}
                    disabled={submitting}
                    className={styles.btnSubmitReject}
                  >
                    <span>{submitting ? 'Recording Response...' : (confirmReject ? 'Yes, Decline This Offer' : 'Decline Offer')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
