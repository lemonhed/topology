import React, { useState } from 'react';

export function InfoPopup() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} style={styles.openButton}>
        ?
      </button>
    );
  }

  return (
    <div style={styles.popup}>
      <button onClick={() => setIsOpen(false)} style={styles.closeButton}>
        ×
      </button>
      <h3 style={styles.title}>Need some inspiration?</h3>
      <p style={styles.description}>Try saying something like:</p>
      <p style={styles.example}>"Draw a database and a server, then connect them with an arrow."</p>
      <hr style={styles.hr} />
      <p style={styles.description}>Here are some items I can draw:</p>
      <ul style={styles.list}>
        <li>Database</li>
        <li>Server</li>
        <li>User</li>
        <li>Frontend</li>
        <li>GPT-5 (LLM)</li>
        <li>GPT Realtime</li>
      </ul>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  popup: {
    position: 'absolute',
    top: '50%',
    right: '20px',
    transform: 'translateY(-50%)',
    zIndex: 1000,
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    width: '280px',
    fontFamily: 'system-ui, sans-serif',
  },
  openButton: {
    position: 'absolute',
    top: '50%',
    right: '20px',
    transform: 'translateY(-50%)',
    zIndex: 1000,
    background: '#4a7dff',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    fontSize: '24px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#9ca3af',
    cursor: 'pointer',
  },
  title: {
    margin: '0 0 1rem',
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#111827',
  },
  description: {
    margin: '0 0 0.5rem',
    fontSize: '0.9rem',
    color: '#6b7280',
  },
  example: {
    margin: '0 0 1rem',
    fontSize: '0.9rem',
    fontStyle: 'italic',
    color: '#374151',
    background: '#f3f4f6',
    padding: '0.5rem',
    borderRadius: '6px',
  },
  hr: {
    border: 'none',
    borderTop: '1px solid #e5e7eb',
    margin: '1rem 0',
  },
  list: {
    margin: 0,
    paddingLeft: '1.5rem',
    fontSize: '0.9rem',
    color: '#4b5563',
  },
};
