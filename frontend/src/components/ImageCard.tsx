import React, { useState } from 'react';
import type { ImageItem } from '../types';

interface Props {
  image: ImageItem;
  index: number;
  onView: () => void;
  onDelete: () => void;
  selectionMode: boolean;
  selected: boolean;
  isFavorite: boolean;
  onToggleSelect: () => void;
  onRemoveFromAlbum?: () => void; // only passed when viewing an album
}

const ImageCard: React.FC<Props> = ({
  image, index, onView,
  selectionMode, selected, isFavorite, onToggleSelect, onRemoveFromAlbum,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleClick = () => { if (selectionMode) onToggleSelect(); else onView(); };

  return (
    <div
      className={`image-card${selected ? ' selected' : ''}`}
      style={{ animationDelay: `${Math.min(index * 0.04, 0.5)}s` }}
      id={`image-card-${index}`}
      onClick={handleClick}
    >
      {!loaded && !error && <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />}

      {error ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
          <span style={{ fontSize: 32 }}>🖼️</span>
          <span>Không thể tải</span>
        </div>
      ) : (
        <img
          src={image.url} alt={image.name} loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(true); }}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
        />
      )}

      {/* Favorite badge */}
      {isFavorite && !selectionMode && (
        <div className="image-card-favorite">❤️</div>
      )}

      {/* Remove from album button */}
      {onRemoveFromAlbum && !selectionMode && (
        <button
          className="image-card-remove-album"
          onClick={e => { e.stopPropagation(); onRemoveFromAlbum(); }}
          title="Xóa khỏi album"
        >
          ✕
        </button>
      )}

      {/* Selection checkbox */}
      {(selectionMode || selected) && (
        <div className={`image-card-checkbox${selected ? ' checked' : ''}`}
          onClick={e => { e.stopPropagation(); onToggleSelect(); }}>
          {selected ? '✓' : ''}
        </div>
      )}
    </div>
  );
};

export default ImageCard;
