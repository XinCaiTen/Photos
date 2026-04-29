import React from 'react';
import type { ImageItem } from '../types';
import ImageCard from './ImageCard';
import EmptyState from './EmptyState';

interface Props {
  images: ImageItem[];
  loading: boolean;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onView: (index: number) => void;
  onDelete: (image: ImageItem) => void; // Maybe unused directly from card now, kept for compatibility if needed elsewhere
  onToggleSelect: (id: string) => void;
  onToggleSelectMode: () => void;
  onUploadClick: () => void;
}

const SKELETON_COUNT = 12;

const ChevronDown = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const GridIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{width:18, height:18}}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const ListIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{width:18, height:18}}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const Gallery: React.FC<Props> = ({
  images, loading,
  selectionMode, selectedIds,
  onView, onDelete, onToggleSelect, onToggleSelectMode, onUploadClick,
}) => {
  if (loading) {
    return (
      <div>
        <div className="gallery-toolbar">
          <div className="gallery-title-group">
            <h1>All Photos <ChevronDown /></h1>
            <div className="gallery-subtitle">Đang tải...</div>
          </div>
        </div>
        <div className="gallery-grid">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="skeleton" id={`skeleton-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return <EmptyState onUploadClick={onUploadClick} />;
  }

  return (
    <div>
      <div className="gallery-toolbar">
        <div className="gallery-title-group">
          <h1>{selectionMode ? 'Chế độ chọn' : 'All Photos'} <ChevronDown /></h1>
          <div className="gallery-subtitle">{images.length} photos</div>
        </div>

        <div className="gallery-controls">
          <button 
            className={`btn-select ${selectionMode ? 'active' : ''}`}
            onClick={onToggleSelectMode}
          >
            {selectionMode ? 'Cancel Select' : 'Select'}
          </button>
          <div className="sort-dropdown">
            Sort by: Newest <ChevronDown />
          </div>
          <div className="view-toggles">
            <button className="view-toggle-btn active"><GridIcon /></button>
            <button className="view-toggle-btn"><ListIcon /></button>
          </div>
        </div>
      </div>

      <div className="gallery-grid" id="gallery-grid">
        {images.map((img, index) => (
          <ImageCard
            key={img.id}
            image={img}
            index={index}
            onView={() => onView(index)}
            onDelete={() => onDelete(img)}
            selectionMode={selectionMode}
            selected={selectedIds.has(img.id)}
            onToggleSelect={() => onToggleSelect(img.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default Gallery;
