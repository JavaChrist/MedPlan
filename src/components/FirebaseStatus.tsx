'use client';

import { useState, useEffect } from 'react';
import { CheckIcon, XIcon, WarningIcon } from './Icons';

interface FirebaseStatusProps {
  className?: string;
}

export default function FirebaseStatus({ className = '' }: FirebaseStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'offline' | 'error'>('checking');
  const [message, setMessage] = useState('Vérification...');

  useEffect(() => {
    checkFirebaseStatus();
  }, []);

  const checkFirebaseStatus = () => {
    // Vérifier si les variables d'environnement Firebase sont configurées
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      setStatus('error');
      setMessage('Configuration Firebase manquante - Mode local actif');
      return;
    }

    // Tenter une vérification basique
    try {
      if (typeof window !== 'undefined') {
        // Vérifier la connectivité
        if (navigator.onLine) {
          setStatus('connected');
          setMessage('Firebase configuré et en ligne');
        } else {
          setStatus('offline');
          setMessage('Hors ligne - Mode local actif');
        }
      }
    } catch (error) {
      setStatus('error');
      setMessage('Erreur de configuration Firebase');
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckIcon className="w-4 h-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'offline':
        return {
          icon: <WarningIcon className="w-4 h-4" />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'error':
        return {
          icon: <XIcon className="w-4 h-4" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: <div className="w-4 h-4 animate-spin border-2 border-blue-600 border-t-transparent rounded-full" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className={config.color}>
          {config.icon}
        </div>
        <span className={`text-sm ${config.color} font-medium`}>
          {message}
        </span>
      </div>

      {status === 'error' && (
        <div className="mt-2 text-xs text-red-600">
          💡 Consultez FIREBASE_SETUP.md pour la configuration
        </div>
      )}
    </div>
  );
} 