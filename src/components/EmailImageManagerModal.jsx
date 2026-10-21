'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './EmailImageManagerModal.module.css';
import {
  ImageIcon,
  CloseIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  PlusIcon
} from './Icons.jsx';

export default function EmailImageManagerModal({ isOpen, onClose, onInsertImage }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'library' | 'url'
  const [libraryImages, setLibraryImages] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Form & Image config state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewSrc, setPreviewSrc] = useState('');
  const [altText, setAltText] = useState('');
  const [category, setCategory] = useState('poster'); // 'poster', 'banner', 'logo', 'general'
  const [imageWidth, setImageWidth] = useState('100%');
  const [alignment, setAlignment] = useState('center');
  const [linkUrl, setLinkUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Load media images
  useEffect(() => {
    if (isOpen) {
      setError('');
      fetchLibrary();
    }
  }, [isOpen]);

  const fetchLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const res = await fetch('/api/outreach/upload-image');
      if (res.ok) {
        const data = await res.json();
        setLibraryImages(data.images || []);
        if (data.images && data.images.length > 0 && !selectedAsset) {
          setSelectedAsset(data.images[0]);
          if (activeTab === 'library') {
            setPreviewSrc(data.images[0].url);
            setAltText(data.images[0].original_name || '');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching images:', err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Selected image exceeds 5 MB size limit.');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Please choose a valid PNG, JPG, GIF, WebP, or SVG image.');
      return;
    }

    setSelectedFile(file);
    setAltText(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewSrc(event.target?.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset);
    setPreviewSrc(asset.url);
    setAltText(asset.original_name || '');
    if (asset.category === 'banner' || asset.category === 'poster') {
      setImageWidth('100%');
    } else if (asset.category === 'logo') {
      setImageWidth('240px');
    }
  };

  const handleExternalUrlChange = (url) => {
    setExternalUrl(url);
    setPreviewSrc(url);
    setError('');
  };

  const handleInsert = async () => {
    setError('');

    let finalImageUrl = previewSrc;

    // If uploading a new file first
    if (activeTab === 'upload') {
      if (!selectedFile) {
        setError('Please select an image file to upload.');
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('category', category);
        formData.append('title', altText || selectedFile.name);

        const res = await fetch('/api/outreach/upload-image', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to upload image.');
          setUploading(false);
          return;
        }

        finalImageUrl = data.image.url;
      } catch {
        setError('Network error while uploading image.');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    } else if (activeTab === 'url') {
      if (!externalUrl.trim()) {
        setError('Please enter an image URL.');
        return;
      }
      finalImageUrl = externalUrl.trim();
    } else if (activeTab === 'library') {
      if (!selectedAsset) {
        setError('Please select an image from the library.');
        return;
      }
      finalImageUrl = selectedAsset.url;
    }

    // Build responsive HTML snippet for email clients
    const safeAlt = (altText || 'Promotional Asset').replace(/"/g, '&quot;');
    const widthStyle = imageWidth === '100%' ? 'width: 100%; max-width: 620px;' : `width: ${imageWidth}; max-width: 100%;`;
    const alignStyle = alignment === 'center' ? 'text-align: center;' : alignment === 'right' ? 'text-align: right;' : 'text-align: left;';

    let imgHtml = `<img src="${finalImageUrl}" alt="${safeAlt}" style="${widthStyle} height: auto; border-radius: 8px; display: inline-block; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.06);" />`;

    if (linkUrl.trim()) {
      imgHtml = `<a href="${linkUrl.trim()}" target="_blank" style="display: inline-block; text-decoration: none;">${imgHtml}</a>`;
    }

    const containerHtml = `<div style="${alignStyle} margin: 20px 0;">\n  ${imgHtml}\n</div>\n`;

    onInsertImage(containerHtml);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleArea}>
            <ImageIcon size={20} style={{ color: '#e11d48' }} />
            <h3 className={styles.modalTitle}>Insert Image or Promotional Asset</h3>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={styles.tabBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'upload' ? styles.tabBtnActive : ''}`}
            onClick={() => {
              setActiveTab('upload');
              setError('');
            }}
          >
            <span>Upload New Image</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'library' ? styles.tabBtnActive : ''}`}
            onClick={() => {
              setActiveTab('library');
              setError('');
              if (selectedAsset) setPreviewSrc(selectedAsset.url);
            }}
          >
            <span>Brand Assets &amp; Library ({libraryImages.length})</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'url' ? styles.tabBtnActive : ''}`}
            onClick={() => {
              setActiveTab('url');
              setError('');
              if (externalUrl) setPreviewSrc(externalUrl);
            }}
          >
            <span>External Image URL</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && (
            <>
              <div
                className={styles.dropzone}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                />
                <ImageIcon size={32} className={styles.dropzoneIcon} />
                <div className={styles.dropzoneText}>
                  {selectedFile ? selectedFile.name : 'Click or drag an image here to upload'}
                </div>
                <div className={styles.dropzoneHint}>
                  Supports PNG, JPG, GIF, WebP, SVG &bull; Maximum file size 5 MB
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Asset Category</label>
                  <select
                    className={styles.selectInput}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="poster">Event / Festival Poster</option>
                    <option value="banner">Promotional Banner</option>
                    <option value="logo">Institutional / Brand Logo</option>
                    <option value="general">General Illustration</option>
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Image Alt Text / Caption</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="e.g. National Campus Film Festival Poster"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* TAB 2: LIBRARY */}
          {activeTab === 'library' && (
            <>
              <div className={styles.libraryGrid}>
                {libraryImages.map((asset) => {
                  const isSelected = selectedAsset?.id === asset.id;
                  return (
                    <div
                      key={asset.id}
                      className={`${styles.assetCard} ${isSelected ? styles.assetCardActive : ''}`}
                      onClick={() => handleSelectAsset(asset)}
                    >
                      <div className={styles.assetThumbWrap}>
                        <img src={asset.url} alt={asset.original_name} className={styles.assetThumb} />
                      </div>
                      <div className={styles.assetName} title={asset.original_name}>
                        {asset.original_name}
                      </div>
                      <span className={styles.assetCategoryTag}>{asset.category}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* TAB 3: EXTERNAL URL */}
          {activeTab === 'url' && (
            <div className={styles.formRow}>
              <div className={styles.fieldGroup} style={{ gridColumn: 'span 2' }}>
                <label className={styles.fieldLabel}>Image Direct URL (https://...)</label>
                <input
                  type="url"
                  className={styles.textInput}
                  placeholder="https://example.com/images/campus-poster.png"
                  value={externalUrl}
                  onChange={(e) => handleExternalUrlChange(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Common Layout & Styling Controls */}
          <div className={styles.formRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Display Width</label>
              <select
                className={styles.selectInput}
                value={imageWidth}
                onChange={(e) => setImageWidth(e.target.value)}
              >
                <option value="100%">Full Width (100% - ideal for posters/banners)</option>
                <option value="600px">Standard (600px)</option>
                <option value="420px">Medium (420px)</option>
                <option value="260px">Logo / Badge (260px)</option>
                <option value="160px">Compact Thumbnail (160px)</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Alignment</label>
              <select
                className={styles.selectInput}
                value={alignment}
                onChange={(e) => setAlignment(e.target.value)}
              >
                <option value="center">Center (Standard)</option>
                <option value="left">Left Aligned</option>
                <option value="right">Right Aligned</option>
              </select>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Optional Clickable Hyperlink (Destination URL)</label>
            <input
              type="url"
              className={styles.textInput}
              placeholder="e.g. https://example.com/event or https://example.com/initiative"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>

          {/* Live Preview */}
          {previewSrc && (
            <div className={styles.previewContainer}>
              <div className={styles.previewHeader}>
                <span>Live In-Email Preview</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Width: {imageWidth} &bull; Align: {alignment}
                </span>
              </div>
              <div
                className={styles.previewWrap}
                style={{ textAlign: alignment }}
              >
                <img
                  src={previewSrc}
                  alt={altText || 'Preview'}
                  className={styles.previewImg}
                  style={{
                    width: imageWidth === '100%' ? '100%' : imageWidth,
                    maxWidth: '100%',
                    display: 'inline-block',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.insertBtn}
            onClick={handleInsert}
            disabled={uploading || (!previewSrc && !selectedFile)}
          >
            {uploading ? <RefreshCwIcon size={14} className={styles.loadingSpinner} /> : <PlusIcon size={14} />}
            <span>{uploading ? 'Processing...' : 'Insert into Email Body'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
