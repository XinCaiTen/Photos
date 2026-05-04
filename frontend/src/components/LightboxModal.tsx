import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ImageItem, Album } from '../types';
import { downloadImageById } from '../api';

interface Props {
  images: ImageItem[];
  currentIndex: number;
  isFavorite: boolean;
  albums: Album[];
  currentAlbumIds: string[]; // album IDs this image already belongs to
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDelete: (image: ImageItem) => void;
  onToggleFavorite: (image: ImageItem) => void;
  onRename: (image: ImageItem, newName: string) => Promise<void>;
  onAddToAlbum: (image: ImageItem, albumId: string) => void;
  onRemoveFromAlbum: (image: ImageItem, albumId: string) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DownloadIcon = () => (<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>);
const TrashIcon = () => (<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>);
const CloseIcon = () => (<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
const ChevronLeft = () => (<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>);
const ChevronRight = () => (<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>);
const PencilIcon = () => (<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>);

const LightboxModal: React.FC<Props> = ({
  images, currentIndex, isFavorite, albums, currentAlbumIds,
  onClose, onPrev, onNext, onDelete, onToggleFavorite, onRename,
  onAddToAlbum, onRemoveFromAlbum,
}) => {
  const image = images[currentIndex];
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [albumMenuOpen, setAlbumMenuOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const albumMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (albumMenuRef.current && !albumMenuRef.current.contains(e.target as Node)) setAlbumMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (renaming) return;
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') onPrev();
    if (e.key === 'ArrowRight') onNext();
  }, [onClose, onPrev, onNext, renaming]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = ''; };
  }, [handleKeyDown]);

  useEffect(() => { if (renaming) { renameInputRef.current?.focus(); renameInputRef.current?.select(); } }, [renaming]);

  if (!image) return null;

  const startRename = () => { setRenameValue(image.name); setRenaming(true); };
  const cancelRename = () => { setRenaming(false); setRenameValue(''); };
  const commitRename = async () => {
    const v = renameValue.trim();
    if (!v || v === image.name) { cancelRename(); return; }
    setRenameLoading(true);
    try { await onRename(image, v); setRenaming(false); }
    finally { setRenameLoading(false); }
  };

  return (
    <div className="modal-backdrop" id="lightbox-modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lightbox-card">
        {/* Header */}
        <div className="lightbox-header">
          <div className="lightbox-title-group">
            {renaming ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  ref={renameInputRef}
                  className="rename-input"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') cancelRename(); }}
                  disabled={renameLoading}
                />
                <button className="rename-confirm-btn" onClick={commitRename} disabled={renameLoading}>
                  {renameLoading ? '...' : '✓'}
                </button>
                <button className="rename-cancel-btn" onClick={cancelRename}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="lightbox-filename">{image.name}</div>
                <button onClick={startRename} title="Đổi tên" style={{ color: 'var(--text-muted)', padding: 4, borderRadius: 4, transition: 'color 0.2s' }}>
                  <PencilIcon />
                </button>
              </div>
            )}
            <div className="lightbox-meta">{formatDate(image.createdAt)} • {formatBytes(image.size)}</div>
          </div>
          <div className="lightbox-header-actions">
            <div className="lightbox-counter">{currentIndex + 1} / {images.length}</div>
            <button className="btn-close-modal" onClick={onClose}><CloseIcon /></button>
          </div>
        </div>

        {/* Body */}
        <div className="lightbox-body">
          <button className="lightbox-nav-btn prev" onClick={onPrev} disabled={currentIndex === 0} id="btn-lightbox-prev">
            <ChevronLeft />
          </button>
          <img src={image.url} alt={image.name} className="lightbox-img" />
          <button className="lightbox-nav-btn next" onClick={onNext} disabled={currentIndex === images.length - 1} id="btn-lightbox-next">
            <ChevronRight />
          </button>
        </div>

        {/* Footer */}
        <div className="lightbox-footer">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-download" onClick={() => downloadImageById(image.id, image.name).catch(() => window.open(image.url, '_blank'))} id="btn-lightbox-download">
              <DownloadIcon /> Download
            </button>
            <button
              className="btn-favorite"
              onClick={() => onToggleFavorite(image)}
              style={{ color: isFavorite ? '#e05252' : 'var(--text-secondary)' }}
              id="btn-lightbox-favorite"
            >
              {isFavorite ? '❤️' : '🤍'} {isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
            </button>

            {/* Album dropdown */}
            {albums.length > 0 && (
              <div ref={albumMenuRef} style={{ position: 'relative' }}>
                <button
                  className="btn-download"
                  onClick={() => setAlbumMenuOpen(o => !o)}
                  id="btn-lightbox-album"
                >
                  📁 Thêm vào Album {currentAlbumIds.length > 0 && `(${currentAlbumIds.length})`}
                </button>
                {albumMenuOpen && (
                  <div className="sort-dropdown-menu" style={{ bottom: 'calc(100% + 4px)', top: 'auto', minWidth: 180 }}>
                    {albums.map(album => {
                      const inAlbum = currentAlbumIds.includes(album.id);
                      return (
                        <button
                          key={album.id}
                          className="sort-dropdown-item"
                          style={{ color: inAlbum ? 'var(--accent-primary)' : undefined }}
                          onClick={() => {
                            inAlbum ? onRemoveFromAlbum(image, album.id) : onAddToAlbum(image, album.id);
                            setAlbumMenuOpen(false);
                          }}
                        >
                          {inAlbum ? '✓ ' : ''}{album.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <button className="btn-delete-card" onClick={() => onDelete(image)} id="btn-lightbox-delete">
            <TrashIcon /> Xóa
          </button>
        </div>
      </div>
    </div>
  );
};

export default LightboxModal;
