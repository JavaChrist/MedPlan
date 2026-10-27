import { Treatment } from '../types';

/**
 * Détecte si l'on est sur iOS (iPhone / iPad)
 */
export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Détecte si l'app est installée en mode PWA standalone (Add to Home Screen)
 */
export function isPWAInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Vérifie si les notifications Web Push sont supportées sur cet appareil/navigateur.
 * Sur iOS < 16.4 ou en navigateur Safari sans installation PWA → non supporté.
 */
export function isNotificationSupported(): boolean {
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;
  // Sur iOS, les notifications ne fonctionnent que depuis iOS 16.4 en mode PWA installée
  if (isIOS() && !isPWAInstalled()) return false;
  return true;
}

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

  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/service-worker.js');
        this.setupMessageListener();
      } catch (error) {
        console.error('Erreur enregistrement Service Worker:', error);
      }
    }
  }

  private setupMessageListener() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;
        if (type === 'mark-treatment-taken') {
          window.dispatchEvent(new CustomEvent('treatment-taken-from-notification', { detail: data }));
        }
      });
    }
  }

  /**
   * Demande la permission pour les notifications.
   * Retourne : 'granted' | 'denied' | 'unsupported' | 'needs-install'
   */
  public async requestNotificationPermission(): Promise<'granted' | 'denied' | 'unsupported' | 'needs-install'> {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return 'unsupported';
    }

    // iOS : doit être installée en PWA
    if (isIOS() && !isPWAInstalled()) {
      return 'needs-install';
    }

    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

  public areNotificationsEnabled(): boolean {
    return isNotificationSupported() && Notification.permission === 'granted';
  }

  public getPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' | 'needs-install' {
    if (!('Notification' in window)) return 'unsupported';
    if (isIOS() && !isPWAInstalled()) return 'needs-install';
    return Notification.permission;
  }

  /**
   * Planifie les notifications pour un traitement via le Service Worker
   */
  public async scheduleNotification(treatment: Treatment): Promise<void> {
    if (!this.areNotificationsEnabled()) return;

    const reg = this.serviceWorkerRegistration ?? await navigator.serviceWorker.ready;
    const controller = reg?.active ?? navigator.serviceWorker.controller;
    if (!controller) return;

    if (!treatment.isActive || !treatment.schedules?.length) return;

    const hasScheduledTimes = treatment.schedules.some(
      s => s.frequency !== 'as_needed' && s.time
    );
    if (!hasScheduledTimes) return;

    try {
      controller.postMessage({
        type: 'schedule-notifications',
        data: {
          id: treatment.id,
          name: treatment.name,
          dosage: treatment.dosage,
          unit: treatment.unit,
          schedules: treatment.schedules,
        },
      });
    } catch (error) {
      console.error('Erreur planification notification:', error);
    }
  }

  public async scheduleMultipleNotifications(treatments: Treatment[]): Promise<void> {
    const enabled = treatments.filter(
      t => t.isActive && t.schedules?.length && t.schedules.some(s => s.frequency !== 'as_needed')
    );
    for (const t of enabled) {
      await this.scheduleNotification(t);
      await new Promise(r => setTimeout(r, 100));
    }
  }

  public async cancelNotifications(treatmentId: string): Promise<void> {
    const reg = this.serviceWorkerRegistration ?? await navigator.serviceWorker.ready;
    const controller = reg?.active ?? navigator.serviceWorker.controller;
    if (!controller) return;
    try {
      controller.postMessage({ type: 'cancel-notifications', data: { treatmentId } });
    } catch (error) {
      console.error('Erreur annulation notification:', error);
    }
  }

  /**
   * Envoie une notification de test immédiate via le Service Worker
   * (compatible iOS PWA)
   */
  public async testNotification(): Promise<void> {
    if (!this.areNotificationsEnabled()) return;
    try {
      const reg = this.serviceWorkerRegistration ?? await navigator.serviceWorker.ready;
      await reg.showNotification('MedPlan', {
        body: 'Les notifications fonctionnent correctement !',
        icon: '/apple-touch-icon.png',
        badge: '/apple-touch-icon.png',
        tag: 'test-notification',
      });
    } catch (error) {
      console.error('Erreur test notification:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();

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

export const getPermissionStatus = () =>
  notificationService.getPermissionStatus();
