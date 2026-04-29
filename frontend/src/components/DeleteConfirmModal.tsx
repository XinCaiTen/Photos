import React from 'react';
import type { ImageItem } from '../types';

interface Props {
  image: ImageItem;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const DeleteConfirmModal: React.FC<Props> = ({ image, onConfirm, onCancel, loading }) => {
  return (
    <div
      className="modal-backdrop"
      id="delete-confirm-modal"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="confirm-modal">
        <div className="confirm-icon">🗑️</div>
        <div className="confirm-title">Xoá ảnh?</div>
        <div className="confirm-desc">
          Bạn có chắc muốn xoá{' '}
          <span className="confirm-filename">"{image.name}"</span>?
          <br />Hành động này không thể hoàn tác.
        </div>
        <div className="confirm-actions">
          <button
            className="btn-cancel"
            onClick={onCancel}
            disabled={loading}
            id="btn-delete-cancel"
          >
            Huỷ
          </button>
          <button
            className="btn-danger"
            onClick={onConfirm}
            disabled={loading}
            id="btn-delete-confirm"
          >
            {loading ? 'Đang xoá...' : 'Xoá ảnh'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
