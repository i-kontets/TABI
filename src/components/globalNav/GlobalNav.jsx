import React from 'react';
import styles from './GlobalNav.module.css';
import { useNavigate } from 'react-router-dom';

const GlobalNav = ({ activeCategory, onSelectCategory, onBack }) => {
  const navigate = useNavigate();
  const categories = [
    { 
      id: 'all', 
      title: 'すべて',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      )
    },
    { 
      id: 'hotel', 
      title: 'ホテル・宿泊',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M13 3l8 4v14"></path><path d="M9 9v2"></path><path d="M9 13v2"></path><path d="M17 13v2"></path><path d="M17 9v2"></path>
        </svg>
      )
    },
    { 
      id: 'friend', 
      title: '友達',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    },
    { 
      id: 'group', 
      title: 'グループ',
      icon: (
        /* より分かりやすいグループ（複数人）アイコンに変更 */
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
  ];

  return (
    <div className={styles.globalNav}>
      <button className={styles.backButton} onClick={() => {navigate(-1)}} title="前のページに戻る">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>

      <div className={styles.separator}></div>

      {categories.map(cat => (
        <button
          key={cat.id}
          className={`${styles.navItem} ${activeCategory === cat.id ? styles.activeItem : ''}`}
          onClick={() => onSelectCategory(cat.id)}
          title={cat.title}
        >
          {cat.icon}
        </button>
      ))}
    </div>
  );
};

export default GlobalNav;