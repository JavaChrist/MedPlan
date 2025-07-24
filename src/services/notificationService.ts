import { Treatment } from '../types';

/**
 * Service de gestion des notifications locales PWA
 */
export class NotificationService {
  private static instance: NotificationService;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {
    this.initializeServiceWorker();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialise le service worker
   */
  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker enregistré:', this.serviceWorkerRegistration);

        // Écouter les messages du service worker
        this.setupMessageListener();
      } catch (error) {
        console.error('Erreur enregistrement Service Worker:', error);
      }
    } else {
      console.warn('Service Worker non supporté dans ce navigateur');
    }
  }

  /**
   * Écoute les messages du service worker
   */
  private setupMessageListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;

        switch (type) {
          case 'mark-treatment-taken':
            this.handleMarkTreatmentTaken(data);
            break;
          default:
            console.log('Message non géré depuis le SW:', type);
        }
      });
    }
  }

  /**
   * Gère le marquage d'un traitement comme pris depuis une notification
   */
  private handleMarkTreatmentTaken(data: any) {
    // Envoyer un événement personnalisé que Home.tsx peut écouter
    window.dispatchEvent(new CustomEvent('treatment-taken-from-notification', {
      detail: data
    }));
  }

  /**
   * Demande la permission pour les notifications
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Ce navigateur ne supporte pas les notifications');
      return false;
    }

    // Si déjà accordée
    if (Notification.permission === 'granted') {
      return true;
    }

    // Si refusée définitivement
    if (Notification.permission === 'denied') {
      console.warn('Notifications refusées par l\'utilisateur');
      return false;
    }

    // Demander la permission
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Erreur demande permission:', error);
      return false;
    }
  }

  /**
   * Vérifie si les notifications sont supportées et autorisées
   */
  public areNotificationsEnabled(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  /**
   * Planifie les notifications pour un traitement
   */
  public async scheduleNotification(treatment: Treatment): Promise<void> {
    if (!this.areNotificationsEnabled()) {
      console.warn('Notifications non autorisées');
      return;
    }

    if (!this.serviceWorkerRegistration || !navigator.serviceWorker.controller) {
      console.warn('Service Worker non disponible');
      return;
    }

    // Ne planifier que les traitements actifs avec horaires
    if (!treatment.isActive || !treatment.schedules || treatment.schedules.length === 0) {
      return;
    }

    // Exclure les traitements "au besoin"
    const hasScheduledTimes = treatment.schedules.some(schedule =>
      schedule.frequency !== 'as_needed' && schedule.time
    );

    if (!hasScheduledTimes) {
      return;
    }

    try {
      // Envoyer au service worker
      navigator.serviceWorker.controller.postMessage({
        type: 'schedule-notifications',
        data: {
          id: treatment.id,
          name: treatment.name,
          dosage: treatment.dosage,
          unit: treatment.unit,
          schedules: treatment.schedules
        }
      });

      console.log('Notifications planifiées pour:', treatment.name);
    } catch (error) {
      console.error('Erreur planification notification:', error);
    }
  }

  /**
   * Planifie les notifications pour plusieurs traitements
   */
  public async scheduleMultipleNotifications(treatments: Treatment[]): Promise<void> {
    const enabledTreatments = treatments.filter(t =>
      t.isActive &&
      t.schedules &&
      t.schedules.length > 0 &&
      t.schedules.some(s => s.frequency !== 'as_needed')
    );

    console.log(`Planification de ${enabledTreatments.length} traitements avec notifications`);

    // Planifier chaque traitement
    for (const treatment of enabledTreatments) {
      await this.scheduleNotification(treatment);
      // Petit délai pour éviter de surcharger le service worker
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Annule les notifications pour un traitement
   */
  public async cancelNotifications(treatmentId: string): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      console.warn('Service Worker non disponible');
      return;
    }

    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'cancel-notifications',
        data: { treatmentId }
      });

      console.log('Notifications annulées pour:', treatmentId);
    } catch (error) {
      console.error('Erreur annulation notification:', error);
    }
  }

  /**
   * Marque une notification comme traitée
   */
  public async markNotificationTaken(notificationId: string): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      return;
    }

    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'mark-taken',
        data: { notificationId }
      });
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  }

  /**
   * Teste les notifications (pour développement)
   */
  public async testNotification(): Promise<void> {
    if (!this.areNotificationsEnabled()) {
      console.warn('Notifications non autorisées');
      return;
    }

    try {
      new Notification('🧪 Test MedPlan', {
        body: 'Les notifications fonctionnent correctement !',
        icon: '/logo192.png',
        tag: 'test-notification'
      });
    } catch (error) {
      console.error('Erreur test notification:', error);
    }
  }

  /**
   * Obtient le statut des permissions
   */
  public getPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }
}

// Exportation de l'instance singleton et des fonctions utilitaires
export const notificationService = NotificationService.getInstance();

// Fonctions helpers pour compatibilité
export const requestNotificationPermission = () =>
  notificationService.requestNotificationPermission();

export const scheduleNotification = (treatment: Treatment) =>
  notificationService.scheduleNotification(treatment);

export const scheduleMultipleNotifications = (treatments: Treatment[]) =>
  notificationService.scheduleMultipleNotifications(treatments);

export const cancelNotifications = (treatmentId: string) =>
  notificationService.cancelNotifications(treatmentId);

export const areNotificationsEnabled = () =>
  notificationService.areNotificationsEnabled();

export const testNotification = () =>
  notificationService.testNotification(); 