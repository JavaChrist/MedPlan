import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  autoClose?: boolean;
  duration?: number;
}

export default function Toast({
  isOpen,
  onClose,
  type = 'success',
  title,
  message,
  autoClose = true,
  duration = 3000
}: ToastProps) {

  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, duration, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-400" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-400" />;
      default:
        return <CheckCircle className="w-6 h-6 text-green-400" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      default:
        return 'bg-green-500/10 border-green-500/20 text-green-400';
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Toast */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto max-w-sm w-full">
          <div className={`${getColors()} border rounded-2xl p-4 shadow-lg backdrop-blur-sm`}>
            <div className="flex items-start space-x-3">
              {/* Icône */}
              <div className="flex-shrink-0 mt-0.5">
                {getIcon()}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium text-sm">{title}</h4>
                {message && (
                  <p className="text-gray-300 text-xs mt-1">{message}</p>
                )}
              </div>

              {/* Bouton fermer */}
              <button
                onClick={onClose}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 