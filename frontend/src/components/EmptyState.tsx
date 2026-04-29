import React from 'react';

interface Props {
  onUploadClick: () => void;
}

const EmptyState: React.FC<Props> = ({ onUploadClick }) => (
  <div className="empty-state" id="empty-state">
    <div className="empty-state-illustration">🌄</div>
    <h2 className="empty-state-title">Chưa có ảnh nào</h2>
    <p className="empty-state-subtitle">
      Upload ảnh đầu tiên của bạn để bắt đầu xây dựng bộ sưu tập!
    </p>
    <button className="btn-primary" onClick={onUploadClick} id="btn-upload-empty">
      <span>+</span>
      <span>Upload ảnh đầu tiên</span>
    </button>
  </div>
);

export default EmptyState;
