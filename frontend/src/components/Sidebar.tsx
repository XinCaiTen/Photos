import React from 'react';
import type { UploadingFile } from '../types';
import UploadZone from './UploadZone';

// Using inline SVGs for icons
const GalleryIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const HeartIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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
  uploadingFiles: UploadingFile[];
  onFilesSelected: (files: File[]) => void;
  uploadInputRef: React.MutableRefObject<HTMLInputElement | null>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const Sidebar: React.FC<Props> = ({ totalSize, uploadingFiles, onFilesSelected, uploadInputRef }) => {
  const maxSize = 10 * 1024 * 1024 * 1024; // Giả lập 10GB total space
  const percent = Math.min((totalSize / maxSize) * 100, 100);

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
        <a href="#" className="nav-item active">
          <GalleryIcon /> Gallery
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); alert('Favorites: Coming soon!'); }}>
          <HeartIcon /> Favorites
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); alert('Trash: Coming soon!'); }}>
          <TrashIcon /> Trash
        </a>
      </nav>

      <UploadZone 
        uploadingFiles={uploadingFiles} 
        onFilesSelected={onFilesSelected} 
        triggerRef={uploadInputRef}
      />

      <div className="storage-widget">
        <div className="storage-header">
          <CloudIcon /> Storage
        </div>
        <div className="storage-text">
          {formatBytes(totalSize)} of 10 GB used
        </div>
        <div className="storage-progress-bg">
          <div className="storage-progress-fill" style={{ width: `${Math.max(percent, 2)}%` }} />
        </div>
        <button className="btn-outline" onClick={() => alert('Upgrade Storage: Coming soon!')}>
          <CrownIcon /> Upgrade Storage
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
