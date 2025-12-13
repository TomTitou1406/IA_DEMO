/**
 * Toast.tsx
 * 
 * Système de notifications toast + confirmations global pour PapiBricole
 * Remplace les alert() et confirm() natifs par des modales stylisées
 * 
 * Usage Toast:
 * const { showSuccess, showError, showInfo, showWarning } = useToast();
 * showSuccess('Chantier créé avec succès !');
 * 
 * Usage Confirm:
 * const { showConfirm } = useToast();
 * const confirmed = await showConfirm({ title: 'Supprimer ?', message: '...' });
 * if (confirmed) { ... }
 * 
 * @version 2.0
 * @date 13 décembre 2025
 */

'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ==================== TYPES ====================

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ToastContextType {
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  dismiss: (id: string) => void;
}

// ==================== CONTEXT ====================

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ==================== HOOK ====================

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ==================== CONFIG ====================

const TOAST_CONFIG: Record<ToastType, {
  icon: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  buttonBg: string;
}> = {
  success: {
    icon: '✅',
    color: 'var(--green)',
    bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
    borderColor: 'var(--green)',
    buttonBg: 'var(--green)'
  },
  error: {
    icon: '❌',
    color: 'var(--red)',
    bgGradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.1))',
    borderColor: 'var(--red)',
    buttonBg: 'var(--red)'
  },
  warning: {
    icon: '⚠️',
    color: 'var(--orange)',
    bgGradient: 'linear-gradient(135deg, rgba(255, 107, 53, 0.15), rgba(234, 88, 12, 0.1))',
    borderColor: 'var(--orange)',
    buttonBg: 'var(--orange)'
  },
  info: {
    icon: 'ℹ️',
    color: 'var(--blue)',
    bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1))',
    borderColor: 'var(--blue)',
    buttonBg: 'var(--blue)'
  }
};

const CONFIRM_CONFIG: Record<string, {
  icon: string;
  color: string;
  confirmBg: string;
}> = {
  warning: {
    icon: '⚠️',
    color: 'var(--orange)',
    confirmBg: 'var(--orange)'
  },
  danger: {
    icon: '🗑️',
    color: 'var(--red)',
    confirmBg: 'var(--red)'
  },
  info: {
    icon: 'ℹ️',
    color: 'var(--blue)',
    confirmBg: 'var(--blue)'
  }
};

// ==================== TOAST ITEM ====================

function ToastItem({ 
  toast, 
  onDismiss 
}: { 
  toast: Toast; 
  onDismiss: () => void;
}) {
  const config = TOAST_CONFIG[toast.type];
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  }, [onDismiss]);

  // Auto-dismiss
  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.duration, handleDismiss]);

  return (
    <div
      style={{
        background: 'rgba(13, 13, 13, 0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: `2px solid ${config.borderColor}`,
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${config.borderColor}40`,
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        minWidth: '300px',
        maxWidth: 'min(450px, calc(100vw - 2rem))',
        animation: isExiting 
          ? 'toastSlideOut 0.2s ease-out forwards'
          : 'toastSlideIn 0.3s ease-out',
        transform: 'translateX(0)',
      }}
    >
      {/* Icon */}
      <div style={{
        fontSize: '1.5rem',
        flexShrink: 0
      }}>
        {config.icon}
      </div>

      {/* Message */}
      <div style={{
        flex: 1,
        color: 'var(--gray-light)',
        fontSize: '0.95rem',
        lineHeight: 1.4,
        fontWeight: 500
      }}>
        {toast.message}
      </div>

      {/* Bouton OK */}
      <button
        onClick={handleDismiss}
        style={{
          padding: '0.5rem 1.25rem',
          background: config.buttonBg,
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontSize: '0.9rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s',
          flexShrink: 0,
          boxShadow: `0 0 15px ${config.buttonBg}60`
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = `0 0 25px ${config.buttonBg}80`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = `0 0 15px ${config.buttonBg}60`;
        }}
      >
        OK
      </button>
    </div>
  );
}

// ==================== CONFIRM MODAL ====================

function ConfirmModal({
  confirm,
  onConfirm,
  onCancel
}: {
  confirm: ConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const config = CONFIRM_CONFIG[confirm.type || 'warning'];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'rgba(13, 13, 13, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: `2px solid ${config.color}`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 30px ${config.color}30`,
          padding: '1.5rem',
          width: '100%',
          maxWidth: '400px',
          animation: 'confirmSlideIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          <span style={{ fontSize: '1.75rem' }}>{config.icon}</span>
          <h3 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--gray-light)'
          }}>
            {confirm.title}
          </h3>
        </div>

        {/* Message */}
        <p style={{
          margin: '0 0 1.5rem 0',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          color: 'var(--gray)',
          whiteSpace: 'pre-line'
        }}>
          {confirm.message}
        </p>

        {/* Boutons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem'
        }}>
          {/* Bouton Annuler */}
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '0.875rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              color: 'var(--gray-light)',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            {confirm.cancelText || 'Annuler'}
          </button>

          {/* Bouton Confirmer */}
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '0.875rem 1.5rem',
              background: config.confirmBg,
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: `0 0 20px ${config.confirmBg}50`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = `0 0 30px ${config.confirmBg}70`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = `0 0 20px ${config.confirmBg}50`;
            }}
          >
            {confirm.confirmText || 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== PROVIDER ====================

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    addToast('success', message, duration);
  }, [addToast]);

  const showError = useCallback((message: string, duration?: number) => {
    addToast('error', message, duration);
  }, [addToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    addToast('info', message, duration);
  }, [addToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    addToast('warning', message, duration);
  }, [addToast]);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState) {
      confirmState.resolve(true);
      setConfirmState(null);
    }
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    if (confirmState) {
      confirmState.resolve(false);
      setConfirmState(null);
    }
  }, [confirmState]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showWarning, showConfirm, dismiss }}>
      {children}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            pointerEvents: 'auto'
          }}
        >
          {toasts.map(toast => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => dismiss(toast.id)}
            />
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmState && (
        <ConfirmModal
          confirm={confirmState}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {/* Animations CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes toastSlideOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes confirmSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}} />
    </ToastContext.Provider>
  );
}

// ==================== EXPORT PAR DÉFAUT ====================

export default ToastProvider;
