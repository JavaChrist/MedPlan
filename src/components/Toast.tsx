'use client';

import { useState, useEffect } from 'react';
import { CheckIcon, XIcon, WarningIcon } from './Icons';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getToastConfig = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-600',
          icon: <CheckIcon className="w-5 h-5" />,
          emoji: '✅'
        };
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          icon: <XIcon className="w-5 h-5" />,
          emoji: '❌'
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          icon: <WarningIcon className="w-5 h-5" />,
          emoji: '⚠️'
        };
      case 'info':
      default:
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600',
          icon: <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">i</div>,
          emoji: 'ℹ️'
        };
    }
  };

  const config = getToastConfig(toast.type);

  return (
    <div className={`
      pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg 
      ${config.bgColor} ${config.borderColor} border shadow-lg
      transform transition-all duration-300 ease-in-out
      animate-in slide-in-from-right-full
    `}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-xl mr-2">{config.emoji}</span>
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className={`text-sm font-medium ${config.textColor}`}>
              {toast.title}
            </p>
            {toast.message && (
              <p className={`mt-1 text-sm ${config.textColor} opacity-90`}>
                {toast.message}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className={`
                inline-flex rounded-md ${config.bgColor} ${config.textColor} 
                hover:${config.textColor} focus:outline-none focus:ring-2 
                focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600
              `}
              onClick={() => onClose(toast.id)}
            >
              <span className="sr-only">Fermer</span>
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

// Hook pour gérer les toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    type: ToastMessage['type'],
    title: string,
    message?: string,
    duration?: number
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration
    };

    setToasts(prev => [...prev, newToast]);
  };

  const closeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Méthodes de raccourci
  const success = (title: string, message?: string, duration?: number) =>
    showToast('success', title, message, duration);

  const error = (title: string, message?: string, duration?: number) =>
    showToast('error', title, message, duration);

  const warning = (title: string, message?: string, duration?: number) =>
    showToast('warning', title, message, duration);

  const info = (title: string, message?: string, duration?: number) =>
    showToast('info', title, message, duration);

  return {
    toasts,
    showToast,
    closeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    ToastContainer: () => <ToastContainer toasts={toasts} onClose={closeToast} />
  };
} 