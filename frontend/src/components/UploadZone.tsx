import React, { useRef, useState, useCallback } from 'react';
import type { UploadingFile } from '../types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// No file size limit

interface Props {
  uploadingFiles: UploadingFile[];
  onFilesSelected: (files: File[]) => void;
  triggerRef?: React.RefObject<HTMLInputElement | null>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const UploadZone: React.FC<Props> = ({ uploadingFiles, onFilesSelected, triggerRef }) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // expose input ref to parent for header button
  if (triggerRef && inputRef.current) {
    (triggerRef as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current;
  }

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => ALLOWED_TYPES.includes(f.type));
    if (valid.length) onFilesSelected(valid);
  }, [onFilesSelected]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const statusIcon = (status: UploadingFile['status']) => {
    if (status === 'done') return '✅';
    if (status === 'error') return '❌';
    if (status === 'uploading') return '⏳';
    return '🕐';
  };

  return (
    <div className="upload-section">
      <div
        className={`upload-zone${dragOver ? ' drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload ảnh"
        id="upload-dropzone"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="visually-hidden"
          onChange={(e) => handleFiles(e.target.files)}
          id="file-input"
        />
        <div className="upload-zone-content">
          <div className="upload-icon">{dragOver ? '📂' : '🖼️'}</div>
          <div className="upload-title">
            {dragOver ? 'Thả ảnh vào đây!' : 'Kéo & thả ảnh hoặc click để chọn'}
          </div>
          <div className="upload-subtitle">Upload nhiều ảnh cùng lúc</div>
          <div className="upload-tags">
            <span className="upload-tag">JPG</span>
            <span className="upload-tag">PNG</span>
            <span className="upload-tag">WEBP</span>
            <span className="upload-tag">GIF</span>

          </div>
        </div>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="upload-queue">
          {uploadingFiles.map((item, i) => (
            <div className="upload-item" key={i} id={`upload-item-${i}`}>
              <div className="upload-item-thumb" style={{
                background: 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
              }}>🖼️</div>
              <div className="upload-item-info">
                <div className="upload-item-name">{item.file.name}</div>
                <div className="upload-item-meta">
                  {formatBytes(item.file.size)}
                  {item.status === 'uploading' && ` · ${item.progress}%`}
                  {item.error && ` · ${item.error}`}
                </div>
                {(item.status === 'uploading' || item.status === 'pending') && (
                  <div className="upload-progress-bar">
                    <div className="upload-progress-fill" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
              </div>
              <span className="upload-item-status">{statusIcon(item.status)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadZone;
