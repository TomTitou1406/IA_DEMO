/**
 * Toast.tsx
 * 
 * Système de notifications toast global pour PapiBricole
 * Remplace les alert() natifs par des toasts stylisés
 * 
 * Usage:
 * const { showSuccess, showError, showInfo, showWarning } = useToast();
 * showSuccess('Chantier créé avec succès !');
 * showError('Erreur lors de la création');
 * 
 * @version 1.0
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

interface ToastContextType {
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
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

// ==================== PROVIDER ====================

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showWarning, dismiss }}>
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
      `}} />
    </ToastContext.Provider>
  );
}

// ==================== EXPORT PAR DÉFAUT ====================

export default ToastProvider;
