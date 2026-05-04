import React, { useState, useRef, useEffect } from 'react';
import type { Album, View } from '../types';

const GalleryIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);
const FolderIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);
const PlusIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const TrashIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const CloudIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);
const CrownIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

interface Props {
  totalSize: number;
  uploadingFiles: import('../types').UploadingFile[];
  onFilesSelected: (files: File[]) => void;
  uploadInputRef: React.MutableRefObject<HTMLInputElement | null>;
  currentView: View;
  onViewChange: (view: View) => void;
  albums: Album[];
  onCreateAlbum: (name: string) => void;
  onDeleteAlbum: (albumId: string) => void;
  favoriteCount: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const Sidebar: React.FC<Props> = ({
  totalSize, uploadingFiles, onFilesSelected, uploadInputRef,
  currentView, onViewChange, albums, onCreateAlbum, onDeleteAlbum, favoriteCount,
}) => {
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const maxSize = 10 * 1024 * 1024 * 1024;
  const percent = Math.min((totalSize / maxSize) * 100, 100);

  useEffect(() => { if (creatingAlbum) inputRef.current?.focus(); }, [creatingAlbum]);

  const handleCreateAlbum = () => {
    const name = newAlbumName.trim();
    if (name) { onCreateAlbum(name); }
    setNewAlbumName(''); setCreatingAlbum(false);
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="sidebar-logo-text">PicVault</div>
      </div>

      <nav className="sidebar-nav">
        <a href="#" className={`nav-item ${currentView === 'all' ? 'active' : ''}`}
          onClick={e => { e.preventDefault(); onViewChange('all'); }}>
          <GalleryIcon /> Gallery
        </a>
        <a href="#" className={`nav-item ${currentView === 'favorites' ? 'active' : ''}`}
          onClick={e => { e.preventDefault(); onViewChange('favorites'); }}>
          <HeartIcon filled={currentView === 'favorites'} /> Favorites
          {favoriteCount > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 11, background: 'var(--accent-primary)', color: '#fff', borderRadius: 10, padding: '1px 7px' }}>
              {favoriteCount}
            </span>
          )}
        </a>
      </nav>

      {/* Albums section */}
      <div className="sidebar-albums">
        <div className="sidebar-albums-header">
          <span>Albums</span>
          <button className="sidebar-add-album-btn" onClick={() => setCreatingAlbum(true)} title="Tạo album mới">
            <PlusIcon />
          </button>
        </div>

        {creatingAlbum && (
          <div style={{ padding: '4px 8px' }}>
            <input
              ref={inputRef}
              className="album-name-input"
              value={newAlbumName}
              onChange={e => setNewAlbumName(e.target.value)}
              placeholder="Tên album..."
              onKeyDown={e => { if (e.key === 'Enter') handleCreateAlbum(); if (e.key === 'Escape') { setCreatingAlbum(false); setNewAlbumName(''); } }}
              onBlur={handleCreateAlbum}
            />
          </div>
        )}

        <div className="sidebar-album-list">
          {albums.map(album => (
            <div key={album.id} className={`album-nav-item ${currentView === album.id ? 'active' : ''}`}
              onClick={() => onViewChange(album.id)}>
              <FolderIcon />
              <span className="album-nav-name">{album.name}</span>
              <span className="album-nav-count">{album.imageIds.length}</span>
              <button className="album-delete-btn" onClick={e => { e.stopPropagation(); onDeleteAlbum(album.id); }} title="Xóa album">
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Upload zone */}
      <div className="upload-section">
        <div
          className="upload-zone"
          onClick={() => uploadInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
          onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
          onDrop={e => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) onFilesSelected(files);
          }}
        >
          <div className="upload-icon">📷</div>
          <div className="upload-title">Upload ảnh</div>
          <div className="upload-subtitle">Kéo thả hoặc click</div>
        </div>
        <input ref={uploadInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
          onChange={e => { const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/')); if (files.length) onFilesSelected(files); e.target.value = ''; }} />
        {uploadingFiles.length > 0 && (
          <div className="upload-queue">
            {uploadingFiles.map((item, i) => (
              <div key={i} className="upload-item">
                <div className="upload-item-info">
                  <div className="upload-item-name">{item.file.name}</div>
                  {item.status === 'uploading' && (
                    <div className="upload-progress-bar"><div className="upload-progress-fill" style={{ width: `${item.progress}%` }} /></div>
                  )}
                  <div className="upload-item-meta">
                    {item.status === 'done' ? 'Xong' : item.status === 'error' ? item.error : `${item.progress}%`}
                  </div>
                </div>
                <div className="upload-item-status">{item.status === 'done' ? '✅' : item.status === 'error' ? '❌' : '⏳'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="storage-widget">
        <div className="storage-header"><CloudIcon /> Storage</div>
        <div className="storage-text">{formatBytes(totalSize)} of 10 GB used</div>
        <div className="storage-progress-bg">
          <div className="storage-progress-fill" style={{ width: `${Math.max(percent, 2)}%` }} />
        </div>
        <button className="btn-outline" onClick={() => alert('Coming soon!')}>
          <CrownIcon /> Upgrade Storage
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
