'use client';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getColor = () => {
    switch (type) {
      case 'danger': return 'var(--red)';
      case 'warning': return 'var(--orange)';
      case 'info': return 'var(--blue)';
      default: return 'var(--orange)';
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        onClick={onCancel}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s'
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        borderRadius: 'var(--card-radius)',
        padding: '1.5rem',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        zIndex: 9999,
        animation: 'slideIn 0.3s'
      }}>
        {/* Icon + Title */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: getColor() + '22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem'
          }}>
            {type === 'danger' ? '🗑️' : type === 'warning' ? '⚠️' : 'ℹ️'}
          </div>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1.25rem',
            color: 'var(--text)'
          }}>
            {title}
          </h3>
        </div>

        {/* Message */}
        <p style={{ 
          margin: 0, 
          marginBottom: '1.5rem',
          color: 'var(--gray-dark)',
          lineHeight: '1.5'
        }}>
          {message}
        </p>

        {/* Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            className="main-btn"
            style={{
              background: 'var(--gray-light)',
              color: 'var(--gray-dark)',
              padding: '0.6rem 1.5rem',
              minHeight: 'auto'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="main-btn"
            style={{
              background: getColor(),
              color: 'white',
              padding: '0.6rem 1.5rem',
              minHeight: 'auto'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
}
