import React, { useState, useCallback, useRef } from 'react';
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
  /** Called once the real image dimensions are known so the layout can reflow */
  onAspectRatio?: (id: string, ratio: number) => void;
  onRemoveFromAlbum?: () => void;
}

const ImageCard: React.FC<Props> = React.memo(({
  image, index, onView,
  selectionMode, selected, isFavorite, onToggleSelect,
  onAspectRatio, onRemoveFromAlbum,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const reportedRef = useRef(false);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    if (onAspectRatio && !reportedRef.current) {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      if (naturalWidth > 0 && naturalHeight > 0) {
        reportedRef.current = true;
        onAspectRatio(image.id, naturalWidth / naturalHeight);
      }
    }
  }, [image.id, onAspectRatio]);

  const handleError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  const handleClick = useCallback(() => {
    if (selectionMode) onToggleSelect();
    else onView();
  }, [selectionMode, onToggleSelect, onView]);

  // Use thumbnail if available, otherwise fallback to full image
  const displayUrl = image.thumbnailUrl || image.url;

  return (
    <div
      className={`image-card${selected ? ' selected' : ''}`}
      id={`image-card-${index}`}
      onClick={handleClick}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Skeleton while loading */}
      {!loaded && !error && (
        <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
      )}

      {error ? (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 8, color: 'var(--text-muted)', fontSize: 13,
        }}>
          <span style={{ fontSize: 32 }}>🖼️</span>
          <span>Không thể tải</span>
        </div>
      ) : (
        <img
          src={displayUrl}
          alt={image.name}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          style={{
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.25s ease',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
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
        <div
          className={`image-card-checkbox${selected ? ' checked' : ''}`}
          onClick={e => { e.stopPropagation(); onToggleSelect(); }}
        >
          {selected ? '✓' : ''}
        </div>
      )}
    </div>
  );
});

ImageCard.displayName = 'ImageCard';
export default ImageCard;
