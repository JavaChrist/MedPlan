'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addTreatment, onAuthChange } from '@/lib/firebase';
import { generateSchedule } from '@/lib/planner';
import { useNotificationManager } from '@/components/NotificationManager';
import { useToast } from '@/components/Toast';
import type { User } from 'firebase/auth';
import {
  ArrowLeftIcon,
  PlusIcon,
  LockIcon,
  MailIcon,
  CalendarIcon,
  LightbulbIcon,
  PillIcon,
  SpinnerIcon,
  CheckIcon
} from '@/components/Icons';

export default function AddTreatmentPage() {
  const router = useRouter();
  const { scheduleMedicationReminder, hasPermission } = useNotificationManager();
  const { success: showSuccessToast, error: showErrorToast, ToastContainer } = useToast();

  // État d'authentification
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // États du formulaire
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 3,
    duration: 7,
    startTime: '08:00',
    endTime: '22:00',
    startDate: (() => {
      // Utiliser la date locale pour éviter les problèmes de fuseau horaire
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(), // Format YYYY-MM-DD en heure locale
    notes: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Observer l'état d'authentification
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Redirection vers la page de connexion
  const handleGoToSignIn = () => {
    router.push('/profile?return=/add-treatment');
  };

  // Gestion des changements de formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Effacer l'erreur si l'utilisateur corrige
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validation du formulaire
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du médicament est requis';
    }

    if (!formData.dosage.trim()) {
      newErrors.dosage = 'Le dosage est requis';
    }

    if (formData.frequency < 1 || formData.frequency > 10) {
      newErrors.frequency = 'La fréquence doit être entre 1 et 10 prises par jour';
    }

    if (formData.duration < 1 || formData.duration > 365) {
      newErrors.duration = 'La durée doit être entre 1 et 365 jours';
    }

    if (formData.startTime >= formData.endTime) {
      newErrors.timeRange = 'L&apos;heure de début doit être avant l&apos;heure de fin';
    }

    const selectedDate = new Date(formData.startDate);
    const today = new Date();
    // Utiliser les dates locales pour la comparaison
    const selectedLocalDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const todayLocalDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (selectedLocalDate < todayLocalDate) {
      newErrors.startDate = 'La date de début ne peut pas être dans le passé';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Calculer la date de fin
      const startDate = new Date(formData.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + formData.duration - 1);

      // Ajouter le traitement à Firebase
      await addTreatment({
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        duration: formData.duration,
        startTime: formData.startTime,
        endTime: formData.endTime,
        startDate: startDate,
        endDate: endDate,
        isActive: true,
        notes: formData.notes || undefined,
        userId: '' // sera rempli automatiquement par la fonction avec l'ID stable
      });

      // Programmer les notifications pour les premiers jours si autorisées
      if (hasPermission) {
        const times = generateSchedule(
          parseInt(formData.startTime.split(':')[0]),
          parseInt(formData.endTime.split(':')[0]),
          formData.frequency
        );

        // Programmer pour aujourd'hui si la date de début est aujourd'hui
        const today = new Date();
        const todayLocalDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startLocalDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

        if (startLocalDate.getTime() === todayLocalDate.getTime()) {
          times.forEach(time => {
            const [hours, minutes] = time.split(':').map(Number);
            const scheduledTime = new Date();
            scheduledTime.setHours(hours, minutes, 0, 0);

            // Programmer seulement si l'heure n'est pas passée
            if (scheduledTime > new Date()) {
              scheduleMedicationReminder(formData.name, scheduledTime, formData.dosage);
            }
          });
        }
      }

      // Rediriger vers le dashboard
      router.push('/dashboard?success=treatment-added');

      showSuccessToast(
        'Traitement ajouté avec succès !',
        `${formData.name} (${formData.frequency} fois par jour) a été programmé.`
      );

    } catch (error: unknown) {
      console.error('Erreur ajout traitement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'ajout du traitement';
      setErrors({ submit: errorMessage });
      showErrorToast(
        'Erreur lors de l\'ajout',
        errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Aperçu des horaires calculés
  const previewTimes = () => {
    try {
      const startHour = parseInt(formData.startTime.split(':')[0]);
      const endHour = parseInt(formData.endTime.split(':')[0]);
      return generateSchedule(startHour, endHour, formData.frequency);
    } catch {
      return [];
    }
  };

  // État de chargement d'authentification
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Interface de connexion si utilisateur non connecté
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <LockIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Connexion requise</h2>
          <p className="text-gray-600 mb-6">
            Vous devez être connecté avec votre email et mot de passe pour ajouter un traitement.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleGoToSignIn}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-colors flex items-center justify-center space-x-2"
            >
              <LockIcon className="w-5 h-5" />
              <span>Se connecter</span>
            </button>

            <button
              onClick={handleGoToSignIn}
              className="w-full bg-blue-100 text-blue-800 px-6 py-3 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center space-x-2"
            >
              <MailIcon className="w-5 h-5" />
              <span>Créer un compte</span>
            </button>

            <Link
              href="/"
              className="block text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Toast Container */}
      <ToastContainer />

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
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <PlusIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Nouveau traitement</h1>
              </div>
            </div>
            {/* Indicateur utilisateur connecté */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {user.isAnonymous ? <LockIcon className="w-4 h-4" /> : <MailIcon className="w-4 h-4" />}
              <span>{user.isAnonymous ? 'Compte anonyme' : user.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Ajouter un nouveau médicament</h2>
            <p className="text-green-100">Remplissez les informations pour créer votre planning de traitement</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Erreur générale */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">❌ {errors.submit}</p>
              </div>
            )}

            {/* Informations du médicament */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du médicament *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ex: Paracétamol, Aspirine..."
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white ${errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dosage *
                </label>
                <input
                  type="text"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleChange}
                  placeholder="Ex: 500mg, 1 comprimé..."
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white ${errors.dosage ? 'border-red-300' : 'border-gray-300'
                    }`}
                />
                {errors.dosage && <p className="text-red-600 text-sm mt-1">{errors.dosage}</p>}
              </div>
            </div>

            {/* Fréquence et durée */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prises par jour *
                </label>
                <select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num} fois</option>
                  ))}
                </select>
                {errors.frequency && <p className="text-red-600 text-sm mt-1">{errors.frequency}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée (jours) *
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="1"
                  max="365"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white ${errors.duration ? 'border-red-300' : 'border-gray-300'
                    }`}
                />
                {errors.duration && <p className="text-red-600 text-sm mt-1">{errors.duration}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white ${errors.startDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                />
                {errors.startDate && <p className="text-red-600 text-sm mt-1">{errors.startDate}</p>}
              </div>
            </div>

            {/* Plage horaire */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure de début de la plage
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure de fin de la plage
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
                />
              </div>
            </div>

            {errors.timeRange && <p className="text-red-600 text-sm">{errors.timeRange}</p>}

            {/* Aperçu des horaires */}
            {formData.frequency && formData.startTime && formData.endTime && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-center mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xl">🤖</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-green-900 text-lg">
                        Planning intelligent généré
                      </h4>
                      <p className="text-green-700 text-sm">
                        Horaires optimisés automatiquement
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <p className="text-green-800 font-medium mb-3">
                    🎯 Vos {formData.frequency} prise{formData.frequency > 1 ? 's' : ''} {formData.frequency > 1 ? 'seront planifiées' : 'sera planifiée'} à :
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {previewTimes().map((time, index) => (
                      <div key={index} className="group">
                        <div className="bg-white border-2 border-green-300 px-4 py-3 rounded-xl text-xl font-bold text-green-800 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
                          ⏰ {time}
                        </div>
                        {index < previewTimes().length - 1 && (
                          <div className="hidden sm:block absolute transform translate-x-16 translate-y-3">
                            <span className="text-green-600 text-2xl">→</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white bg-opacity-70 rounded-lg p-4 space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-600 mt-1">✨</span>
                    <p className="text-green-800 text-sm">
                      <strong>Algorithme intelligent :</strong> Espacement uniforme optimal sur votre plage horaire personnalisée ({formData.startTime} → {formData.endTime})
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-600 mt-1">📱</span>
                    <p className="text-green-800 text-sm">
                      <strong>Notifications automatiques :</strong> {hasPermission ? 'Rappels programmés pour chaque prise' : 'Activez les notifications pour des rappels automatiques'}
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-600 mt-1">🎯</span>
                    <p className="text-green-800 text-sm">
                      <strong>Recalcul intelligent :</strong> L'application s'adapte automatiquement si vous prenez une dose en retard
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optionnel)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Instructions particulières, effets secondaires à surveiller..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white"
              />
            </div>

            {/* Informations sur les notifications */}
            {!hasPermission && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-800">
                  💡 <strong>Conseil :</strong> Autorisez les notifications pour recevoir des rappels automatiques
                  aux heures programmées.
                </p>
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Link
                href="/dashboard"
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors text-center"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Ajout en cours...</span>
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </span>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <PillIcon className="w-5 h-5" />
                    <span>Ajouter le traitement</span>
                    <span className="text-lg">✨</span>
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Conseils */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center space-x-2">
            <LightbulbIcon className="w-5 h-5" />
            <span>Conseils pour un traitement efficace</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">•</span>
              <p>Respectez les horaires pour maintenir un taux constant du médicament</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">•</span>
              <p>Notez les effets secondaires dans vos observations quotidiennes</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">•</span>
              <p>Consultez votre médecin avant d&apos;arrêter ou modifier un traitement</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">•</span>
              <p>Activez les notifications pour ne jamais oublier une prise</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 