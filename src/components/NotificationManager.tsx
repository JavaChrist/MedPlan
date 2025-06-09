'use client';

import { useState, useEffect, useCallback } from 'react';

// Interface pour définir une notification planifiée
interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  icon?: string;
  badge?: string;
  tag?: string;
  timeoutId?: NodeJS.Timeout;
}

// Interface pour les options de notification
interface NotificationOptions {
  title: string;
  body: string;
  scheduledTime: Date;
  icon?: string;
  badge?: string;
  tag?: string;
}

// Hook personnalisé pour le NotificationManager
export function useNotificationManager() {
  // États pour gérer les permissions et notifications
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [isSupported, setIsSupported] = useState(false);

  // Vérification du support des notifications au montage du composant
  useEffect(() => {
    // Vérifier si les notifications sont supportées par le navigateur
    const checkSupport = () => {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
        console.log('✅ Notifications supportées par le navigateur');
      } else {
        console.warn('❌ Notifications non supportées par ce navigateur');
      }
    };

    checkSupport();
  }, []);

  // Enregistrement et gestion du Service Worker
  useEffect(() => {
    // Fonction pour enregistrer le Service Worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // next-pwa génère automatiquement le SW, mais on peut en enregistrer un personnalisé
          let registration = await navigator.serviceWorker.getRegistration();

          if (!registration) {
            // Si next-pwa n'a pas encore enregistré le SW, on attend un peu
            await new Promise(resolve => setTimeout(resolve, 1000));
            registration = await navigator.serviceWorker.getRegistration();
          }

          if (registration) {
            console.log('✅ Service Worker déjà enregistré:', registration.scope);
            setIsServiceWorkerReady(true);

            // Écouter les mises à jour du Service Worker
            registration.addEventListener('updatefound', () => {
              console.log('🔄 Mise à jour du Service Worker détectée');
            });
          } else {
            console.log('⏳ Service Worker en attente d\'enregistrement par next-pwa');
          }
        } catch (error) {
          console.error('❌ Erreur lors de l\'enregistrement du Service Worker:', error);
        }
      }
    };

    if (isSupported) {
      registerServiceWorker();
    }
  }, [isSupported]);

  // Fonction pour demander la permission de notifications
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('❌ Notifications non supportées');
      return false;
    }

    try {
      // Demander la permission à l'utilisateur
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        console.log('✅ Permission de notifications accordée');
        return true;
      } else if (result === 'denied') {
        console.warn('❌ Permission de notifications refusée');
        return false;
      } else {
        console.log('⏳ Permission de notifications en attente');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la demande de permission:', error);
      return false;
    }
  }, [isSupported]);

  // Fonction pour afficher une notification immédiate
  const showNotification = useCallback((title: string, options: NotificationInit = {}) => {
    if (permission !== 'granted') {
      console.warn('❌ Permission de notifications requise');
      return;
    }

    try {
      // Créer et afficher la notification
      const notification = new Notification(title, {
        icon: '/icon-192x192.png', // Icône par défaut de l'app
        badge: '/icon-72x72.png',   // Badge pour mobile
        tag: 'medplan-reminder',    // Tag pour grouper les notifications
        requireInteraction: true,  // Nécessite une interaction pour disparaître
        ...options
      });

      // Gestion des événements de notification
      notification.onclick = () => {
        console.log('👆 Notification cliquée');
        // Réactiver la fenêtre de l'application
        window.focus();
        notification.close();
      };

      notification.onshow = () => {
        console.log('👁️ Notification affichée');
      };

      notification.onclose = () => {
        console.log('❌ Notification fermée');
      };

      return notification;
    } catch (error) {
      console.error('❌ Erreur lors de l\'affichage de la notification:', error);
    }
  }, [permission]);

  // Fonction pour planifier une notification à une heure précise
  const scheduleNotification = useCallback((options: NotificationOptions): string => {
    if (permission !== 'granted') {
      console.warn('❌ Permission de notifications requise pour planifier');
      return '';
    }

    // Générer un ID unique pour la notification
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculer le délai jusqu'à l'heure programmée
    const now = new Date();
    const delay = options.scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      console.warn('⚠️ L\'heure programmée est dans le passé');
      // Afficher immédiatement si l'heure est passée
      showNotification(options.title, {
        body: options.body,
        icon: options.icon,
        badge: options.badge,
        tag: options.tag
      });
      return id;
    }

    console.log(`⏰ Notification programmée pour ${options.scheduledTime.toLocaleTimeString()} (dans ${Math.round(delay / 1000 / 60)} minutes)`);

    // Programmer la notification avec setTimeout
    const timeoutId = setTimeout(() => {
      console.log(`🔔 Déclenchement de la notification: ${options.title}`);

      // Afficher la notification
      showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/icon-72x72.png',
        tag: options.tag || 'medplan-scheduled'
      });

      // Retirer la notification de la liste des programmées
      setScheduledNotifications(prev =>
        prev.filter(notif => notif.id !== id)
      );
    }, delay);

    // Ajouter la notification à la liste des programmées
    const scheduledNotification: ScheduledNotification = {
      id,
      title: options.title,
      body: options.body,
      scheduledTime: options.scheduledTime,
      icon: options.icon,
      badge: options.badge,
      tag: options.tag,
      timeoutId
    };

    setScheduledNotifications(prev => [...prev, scheduledNotification]);

    return id;
  }, [permission, showNotification]);

  // Fonction pour annuler une notification programmée
  const cancelScheduledNotification = useCallback((id: string): boolean => {
    const notification = scheduledNotifications.find(notif => notif.id === id);

    if (notification && notification.timeoutId) {
      clearTimeout(notification.timeoutId);
      setScheduledNotifications(prev =>
        prev.filter(notif => notif.id !== id)
      );
      console.log(`🚫 Notification annulée: ${notification.title}`);
      return true;
    }

    console.warn(`⚠️ Notification non trouvée: ${id}`);
    return false;
  }, [scheduledNotifications]);

  // Fonction pour annuler toutes les notifications programmées
  const cancelAllScheduledNotifications = useCallback(() => {
    scheduledNotifications.forEach(notification => {
      if (notification.timeoutId) {
        clearTimeout(notification.timeoutId);
      }
    });

    setScheduledNotifications([]);
    console.log('🚫 Toutes les notifications programmées ont été annulées');
  }, [scheduledNotifications]);

  // Fonction utilitaire pour programmer un rappel de médicament
  const scheduleMedicationReminder = useCallback((
    medicationName: string,
    scheduledTime: Date,
    dosage?: string
  ): string => {
    const title = `💊 Rappel de médicament`;
    const body = dosage
      ? `Il est temps de prendre ${medicationName} (${dosage})`
      : `Il est temps de prendre ${medicationName}`;

    return scheduleNotification({
      title,
      body,
      scheduledTime,
      icon: '/icon-192x192.png',
      tag: `medication-${medicationName.toLowerCase().replace(/\s+/g, '-')}`
    });
  }, [scheduleNotification]);

  // Nettoyage automatique des notifications expirées
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      const expired = scheduledNotifications.filter(
        notif => notif.scheduledTime.getTime() < now.getTime()
      );

      if (expired.length > 0) {
        console.log(`🧹 Nettoyage de ${expired.length} notifications expirées`);
        expired.forEach(notif => {
          if (notif.timeoutId) {
            clearTimeout(notif.timeoutId);
          }
        });

        setScheduledNotifications(prev =>
          prev.filter(notif => notif.scheduledTime.getTime() >= now.getTime())
        );
      }
    }, 60000); // Vérification toutes les minutes

    return () => clearInterval(cleanupInterval);
  }, [scheduledNotifications]);

  // Sauvegarde des notifications programmées dans le localStorage (pour persistence offline)
  useEffect(() => {
    try {
      const notificationsToSave = scheduledNotifications.map(notif => ({
        id: notif.id,
        title: notif.title,
        body: notif.body,
        scheduledTime: notif.scheduledTime.toISOString(),
        icon: notif.icon,
        badge: notif.badge,
        tag: notif.tag
      }));

      localStorage.setItem('medplan-notifications', JSON.stringify(notificationsToSave));
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde des notifications:', error);
    }
  }, [scheduledNotifications]);

  // Restauration des notifications depuis le localStorage au démarrage
  useEffect(() => {
    if (permission === 'granted') {
      try {
        const saved = localStorage.getItem('medplan-notifications');
        if (saved) {
          const notifications = JSON.parse(saved);

          notifications.forEach((notif: any) => {
            const scheduledTime = new Date(notif.scheduledTime);
            if (scheduledTime.getTime() > Date.now()) {
              scheduleNotification({
                title: notif.title,
                body: notif.body,
                scheduledTime,
                icon: notif.icon,
                badge: notif.badge,
                tag: notif.tag
              });
            }
          });

          console.log(`🔄 ${notifications.length} notifications restaurées depuis le stockage local`);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la restauration des notifications:', error);
      }
    }
  }, [permission, scheduleNotification]);

  // Retourner toutes les fonctions et états utiles
  return {
    // États
    permission,
    isSupported,
    isServiceWorkerReady,
    scheduledNotifications,

    // Actions
    requestPermission,
    showNotification,
    scheduleNotification,
    cancelScheduledNotification,
    cancelAllScheduledNotifications,
    scheduleMedicationReminder,

    // Utilitaires
    isReady: permission === 'granted' && isSupported,
    hasPermission: permission === 'granted',
    needsPermission: permission === 'default',
    isDenied: permission === 'denied'
  };
}

// Composant React pour l'interface utilisateur du gestionnaire de notifications
interface NotificationManagerProps {
  children?: React.ReactNode;
  className?: string;
}

export default function NotificationManager({ children, className = '' }: NotificationManagerProps) {
  const {
    permission,
    isSupported,
    isServiceWorkerReady,
    scheduledNotifications,
    requestPermission,
    showNotification,
    hasPermission,
    needsPermission,
    isDenied,
    isReady
  } = useNotificationManager();

  // Interface utilisateur pour la gestion des permissions
  if (!isSupported) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <span className="text-2xl mr-3">⚠️</span>
          <div>
            <h3 className="font-semibold text-yellow-800">Notifications non supportées</h3>
            <p className="text-yellow-700 text-sm">Votre navigateur ne supporte pas les notifications.</p>
          </div>
        </div>
      </div>
    );
  }

  if (needsPermission) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🔔</span>
            <div>
              <h3 className="font-semibold text-blue-800">Activer les notifications</h3>
              <p className="text-blue-700 text-sm">Autorisez les notifications pour recevoir vos rappels de médicaments.</p>
            </div>
          </div>
          <button
            onClick={requestPermission}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Autoriser
          </button>
        </div>
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <span className="text-2xl mr-3">🚫</span>
          <div>
            <h3 className="font-semibold text-red-800">Notifications bloquées</h3>
            <p className="text-red-700 text-sm">
              Les notifications sont bloquées. Activez-les dans les paramètres de votre navigateur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hasPermission && isReady) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <div>
              <h3 className="font-semibold text-green-800">Notifications activées</h3>
              <p className="text-green-700 text-sm">
                {scheduledNotifications.length > 0
                  ? `${scheduledNotifications.length} rappel(s) programmé(s)`
                  : 'Prêt à recevoir vos rappels de médicaments'
                }
              </p>
              {!isServiceWorkerReady && (
                <p className="text-orange-600 text-xs">Service Worker en cours de chargement...</p>
              )}
            </div>
          </div>
          <button
            onClick={() => showNotification('Test MedPlan', {
              body: 'Les notifications fonctionnent correctement !'
            })}
            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
          >
            Test
          </button>
        </div>
        {children}
      </div>
    );
  }

  return null;
}

// Export du hook pour utilisation dans d'autres composants
export { useNotificationManager }; 