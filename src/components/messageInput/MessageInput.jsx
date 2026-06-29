import React, { useRef } from 'react';
import styles from './MessageInput.module.css';

const MessageInput = ({ value = '', onChange, onSubmit, onImageUpload, disabled = false }) => {
  const fileInputRef = useRef(null);

  const handleImageButtonClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onImageUpload?.(file);
    // 同じファイルを再選択できるようリセット
    event.target.value = '';
  };

  return (
    <form className={styles.inputContainer} onSubmit={onSubmit}>
      {/* 非表示ファイル入力（画像専用） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* ペーパークリップアイコン（将来用） */}
      <button className={styles.actionBtn} type="button" title="ファイルを添付" disabled={disabled}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>

      {/* 画像アイコン → ファイル選択ダイアログを開く */}
      <button className={styles.actionBtn} type="button" title="画像を送信" disabled={disabled} onClick={handleImageButtonClick}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </button>

      <input
        type="text"
        className={styles.textField}
        placeholder="メッセージを入力..."
        value={value}
        onChange={onChange}
        disabled={disabled}
      />

      <button className={styles.sendBtn} type="submit" title="送信" disabled={disabled || value.trim() === ''}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateX(-1px)' }}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  );
};

export default MessageInput;
