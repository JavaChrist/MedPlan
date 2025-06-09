'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNotificationManager } from '@/components/NotificationManager';
import { onAuthChange, getUserProfile, updateUserProfile, signOutUser } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import {
  ArrowLeftIcon,
  SettingsIcon,
  BellIcon,
  UserIcon,
  ShieldIcon,
  DoorIcon,
  SaveIcon,
  SpinnerIcon,
  DashboardIcon,
  PlusIcon,
  ChartIcon
} from '@/components/Icons';
import FirebaseStatus from '@/components/FirebaseStatus';

interface UserPreferences {
  notifications: boolean;
  reminderAdvance: number;
  dailyReportTime: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: true,
    reminderAdvance: 15,
    dailyReportTime: '20:00'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const {
    hasPermission,
    requestPermission,
    showNotification,
    cancelAllScheduledNotifications,
    scheduledNotifications
  } = useNotificationManager();

  // Observer l'état d'authentification
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user);
      if (user) {
        await loadUserPreferences(user.uid);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Charger les préférences utilisateur
  const loadUserPreferences = async (userId: string) => {
    try {
      const profile = await getUserProfile(userId);
      if (profile && profile.preferences) {
        setPreferences(profile.preferences);
      }
    } catch {
      console.error('Erreur chargement préférences');
    }
  };

  // Sauvegarder les préférences
  const savePreferences = async () => {
    if (!user) return;

    setIsSaving(true);
    setMessage(null);

    try {
      await updateUserProfile(user.uid, { preferences });
      setMessage({ type: 'success', text: 'Préférences sauvegardées avec succès !' });
    } catch (error: unknown) {
      console.error('Erreur sauvegarde:', error);

      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde des préférences';

      // Messages d'erreur plus explicites
      if (errorMessage.includes('localement')) {
        setMessage({
          type: 'success',
          text: 'Préférences sauvegardées localement - seront synchronisées à la reconnexion'
        });
      } else if (errorMessage.includes('connexion')) {
        setMessage({
          type: 'error',
          text: 'Problème de connexion - vérifiez votre réseau et les paramètres Firebase'
        });
      } else {
        setMessage({ type: 'error', text: errorMessage });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Gestion des changements de préférences
  const handlePreferenceChange = (key: keyof UserPreferences, value: boolean | number | string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Test de notification
  const testNotification = () => {
    showNotification('Test MedPlan', {
      body: 'Les notifications fonctionnent parfaitement ! 🎉'
    });
  };

  // Déconnexion
  const handleSignOut = async () => {
    try {
      await signOutUser();
      setMessage({ type: 'success', text: 'Déconnexion réussie' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la déconnexion' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connexion requise</h2>
          <p className="text-gray-600 mb-6">Vous devez être connecté pour accéder aux paramètres.</p>
          <Link
            href="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Retour au tableau de bord</span>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* État Firebase */}
        <FirebaseStatus className="mb-6" />

        {/* Message de retour */}
        {message && (
          <div className={`rounded-xl p-4 mb-6 ${message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4 rounded-t-xl">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <BellIcon className="w-6 h-6" />
              <span>Notifications</span>
            </h2>
            <p className="text-orange-100">Gérez vos rappels et alertes</p>
          </div>

          <div className="p-6 space-y-6">
            {/* État des permissions */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Permissions de notifications</h3>
                <p className="text-sm text-gray-600">
                  {hasPermission
                    ? '✅ Autorisées - Vous recevrez des rappels'
                    : '❌ Non autorisées - Activez pour recevoir des rappels'
                  }
                </p>
              </div>
              <div className="flex space-x-2">
                {!hasPermission && (
                  <button
                    onClick={requestPermission}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Autoriser
                  </button>
                )}
                {hasPermission && (
                  <button
                    onClick={testNotification}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Tester
                  </button>
                )}
              </div>
            </div>

            {/* Préférences de notifications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Activer les notifications</h3>
                  <p className="text-sm text-gray-600">Recevoir des rappels pour vos médicaments</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avance des rappels (minutes)
                </label>
                <select
                  value={preferences.reminderAdvance}
                  onChange={(e) => handlePreferenceChange('reminderAdvance', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
                >
                  <option value={0}>Au moment exact</option>
                  <option value={5}>5 minutes avant</option>
                  <option value={10}>10 minutes avant</option>
                  <option value={15}>15 minutes avant</option>
                  <option value={30}>30 minutes avant</option>
                  <option value={60}>1 heure avant</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure du rapport quotidien
                </label>
                <input
                  type="time"
                  value={preferences.dailyReportTime}
                  onChange={(e) => handlePreferenceChange('dailyReportTime', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Heure à laquelle vous recevrez un résumé de votre journée
                </p>
              </div>
            </div>

            {/* Notifications programmées */}
            {scheduledNotifications.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">
                    Rappels programmés ({scheduledNotifications.length})
                  </h3>
                  <button
                    onClick={cancelAllScheduledNotifications}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Tout annuler
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {scheduledNotifications.slice(0, 5).map((notification) => (
                    <div key={notification.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500">
                          {notification.scheduledTime.toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {scheduledNotifications.length > 5 && (
                    <p className="text-xs text-gray-500 text-center">
                      Et {scheduledNotifications.length - 5} autres...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Informations de compte */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 rounded-t-xl">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <UserIcon className="w-6 h-6" />
              <span>Compte utilisateur</span>
            </h2>
            <p className="text-blue-100">Informations et gestion du compte</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type de compte</label>
                <p className="mt-1 text-sm text-gray-900">
                  {user.isAnonymous ? '🔒 Compte anonyme' : '📧 Compte avec email'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">
                  {user.email || 'Non renseigné'}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <DoorIcon className="w-5 h-5" />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Données et confidentialité */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-8">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 rounded-t-xl">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <ShieldIcon className="w-6 h-6" />
              <span>Données & Confidentialité</span>
            </h2>
            <p className="text-green-100">Gestion de vos données personnelles</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Vos données sont :</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✅</span>
                  <span className="text-gray-700">Chiffrées et sécurisées</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✅</span>
                  <span className="text-gray-700">Stockées sur Firebase (Google)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✅</span>
                  <span className="text-gray-700">Conformes RGPD</span>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Vous pouvez :</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">📥</span>
                  <span className="text-gray-700">Exporter vos données</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-red-600">🗑️</span>
                  <span className="text-gray-700">Supprimer votre compte</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-purple-600">📧</span>
                  <span className="text-gray-700">Nous contacter</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton de sauvegarde */}
        <div className="flex justify-center">
          <button
            onClick={savePreferences}
            disabled={isSaving}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-3 rounded-lg hover:from-orange-600 hover:to-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <SpinnerIcon className="w-4 h-4 text-white" />
                <span>Sauvegarde...</span>
              </>
            ) : (
              <>
                <SaveIcon className="w-5 h-5" />
                <span>Sauvegarder les préférences</span>
              </>
            )}
          </button>
        </div>

        {/* Actions rapides */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-800 mb-4">🔗 Actions rapides</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/dashboard"
              className="flex items-center justify-center p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <DashboardIcon className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">Dashboard</span>
            </Link>

            <Link
              href="/add-treatment"
              className="flex items-center justify-center p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <PlusIcon className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">Nouveau traitement</span>
            </Link>

            <Link
              href="/history"
              className="flex items-center justify-center p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <ChartIcon className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">Historique</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
} 