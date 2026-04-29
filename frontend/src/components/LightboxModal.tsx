import React, { useEffect, useCallback } from 'react';
import type { ImageItem } from '../types';
import { downloadImageById } from '../api';

interface Props {
  images: ImageItem[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDelete: (image: ImageItem) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DownloadIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:16, height:16}}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const TrashIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:16, height:16}}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CloseIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:20, height:20}}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronLeft = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:24, height:24}}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{width:24, height:24}}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const LightboxModal: React.FC<Props> = ({ images, currentIndex, onClose, onPrev, onNext, onDelete }) => {
  const image = images[currentIndex];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') onPrev();
    if (e.key === 'ArrowRight') onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!image) return null;

  const handleDownload = () => {
    downloadImageById(image.id, image.name).catch(() => {
      window.open(image.url, '_blank');
    });
  };

  return (
    <div
      className="modal-backdrop"
      id="lightbox-modal"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="lightbox-card">
        {/* Header */}
        <div className="lightbox-header">
          <div className="lightbox-title-group">
            <div className="lightbox-filename">{image.name}</div>
            <div className="lightbox-meta">
              {formatDate(image.createdAt)} • {formatBytes(image.size)}
            </div>
          </div>
          <div className="lightbox-header-actions">
            <div className="lightbox-counter">
              {currentIndex + 1} / {images.length}
            </div>
            <button className="btn-close-modal" onClick={onClose}><CloseIcon /></button>
          </div>
        </div>

        {/* Body (Image) */}
        <div className="lightbox-body">
          <button
            className="lightbox-nav-btn prev"
            onClick={onPrev}
            disabled={currentIndex === 0}
            id="btn-lightbox-prev"
          >
            <ChevronLeft />
          </button>
          
          <img src={image.url} alt={image.name} className="lightbox-img" />

          <button
            className="lightbox-nav-btn next"
            onClick={onNext}
            disabled={currentIndex === images.length - 1}
            id="btn-lightbox-next"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Footer */}
        <div className="lightbox-footer">
          <button className="btn-download" onClick={handleDownload} id="btn-lightbox-download">
            <DownloadIcon /> Download
          </button>
          <button className="btn-delete-card" onClick={() => onDelete(image)} id="btn-lightbox-delete">
            <TrashIcon /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default LightboxModal;
