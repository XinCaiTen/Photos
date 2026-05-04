import React, { useState } from 'react';
import type { Album } from '../types';

interface Props {
  albums: Album[];
  selectedIds: Set<string>;
  onClose: () => void;
  onMove: (albumId: string) => void;
}

const MoveToAlbumModal: React.FC<Props> = ({ albums, selectedIds, onClose, onMove }) => {
  const [selected, setSelected] = useState<string>('');

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="confirm-modal" style={{ maxWidth: 360 }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Di chuyển vào album</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {selectedIds.size} ảnh được chọn
        </div>

        {albums.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>
            Chưa có album nào. Hãy tạo album trong sidebar trước.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
            {albums.map(album => (
              <button
                key={album.id}
                onClick={() => setSelected(album.id)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${selected === album.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  background: selected === album.id ? 'rgba(91,88,235,0.1)' : 'var(--bg-card)',
                  color: selected === album.id ? 'var(--accent-primary)' : 'var(--text-primary)',
                  textAlign: 'left',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                📁 {album.name}
                <span style={{ float: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                  {album.imageIds.length} ảnh
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onClose}>Hủy</button>
          <button
            className="btn-danger"
            style={{ background: 'var(--accent-primary)' }}
            disabled={!selected}
            onClick={() => { if (selected) { onMove(selected); onClose(); } }}
          >
            Di chuyển
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveToAlbumModal;
