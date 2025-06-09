'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Timeline from '@/components/Timeline';
import { useNotificationManager } from '@/components/NotificationManager';
import NotificationManager from '@/components/NotificationManager';
import { getUserTreatments } from '@/lib/firebase';
import { generateTodaySchedule, type MedicationDose } from '@/lib/planner';
import {
  ArrowLeftIcon,
  DashboardIcon,
  TargetIcon,
  CheckIcon,
  ClockIcon,
  WarningIcon,
  PlusIcon,
  ChartIcon,
  SettingsIcon,
  PillIcon
} from '@/components/Icons';

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const [loading, setLoading] = useState(true);
  const { scheduleMedicationReminder, hasPermission } = useNotificationManager();

  // Mise à jour de l'heure toutes les minutes
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Charger les vrais traitements
  useEffect(() => {
    const loadUserTreatments = async () => {
      try {
        const treatments = await getUserTreatments();
        if (treatments.length > 0) {
          const today = new Date();
          const schedule = generateTodaySchedule(treatments, today);
          setDoses(schedule);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des traitements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserTreatments();
  }, []);

  // Gestionnaire d'actions sur les doses
  const handleDoseAction = (dose: MedicationDose, action: 'take' | 'skip' | 'delay') => {
    setDoses(prevDoses => {
      return prevDoses.map(d => {
        if (d.id === dose.id) {
          switch (action) {
            case 'take':
              return {
                ...d,
                status: 'taken' as const,
                takenAt: currentTime.toTimeString().slice(0, 5)
              };
            case 'skip':
              return {
                ...d,
                status: 'missed' as const
              };
            case 'delay':
              // Programmer une notification pour dans 30 minutes
              if (hasPermission) {
                const delayedTime = new Date(Date.now() + 30 * 60 * 1000);
                scheduleMedicationReminder(d.medicationName, delayedTime, d.dosage);
              }
              return {
                ...d,
                status: 'delayed' as const
              };
            default:
              return d;
          }
        }
        return d;
      });
    });
  };

  // Calcul des statistiques rapides
  const stats = {
    total: doses.length,
    taken: doses.filter(d => d.status === 'taken').length,
    upcoming: doses.filter(d => d.status === 'upcoming').length,
    missed: doses.filter(d => d.status === 'missed').length,
    delayed: doses.filter(d => d.status === 'delayed').length,
  };

  const adherenceRate = stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Retour</span>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <DashboardIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {currentTime.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </p>
              <p className="text-xl font-semibold text-gray-900">
                {currentTime.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification Manager - Intégré dans le contenu */}
        <NotificationManager className="mb-6" />

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de vos traitements...</p>
          </div>
        ) : doses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucun traitement configuré</h2>
            <p className="text-gray-600 mb-8">Commencez par ajouter votre premier traitement pour voir votre tableau de bord.</p>
            <Link href="/add-treatment" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2">
              <PlusIcon className="w-5 h-5" />
              <span>Ajouter un traitement</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Card Taux d'adhérence */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Taux d&apos;adhérence</p>
                    <p className="text-3xl font-bold text-blue-600">{adherenceRate}%</p>
                  </div>
                  <div>
                    <TargetIcon className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${adherenceRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Card Prises réussies */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Prises réussies</p>
                    <p className="text-3xl font-bold text-green-600">{stats.taken}</p>
                  </div>
                  <div>
                    <CheckIcon className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">sur {stats.total} programmées</p>
              </div>

              {/* Card À venir */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">À venir</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.upcoming}</p>
                  </div>
                  <div>
                    <ClockIcon className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">prises programmées</p>
              </div>

              {/* Card Problèmes */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Problèmes</p>
                    <p className="text-3xl font-bold text-red-600">{stats.missed + stats.delayed}</p>
                  </div>
                  <div>
                    <WarningIcon className="w-8 h-8 text-red-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">oubliés ou retardés</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/add-treatment"
                  className="group flex flex-col items-center justify-center h-24 p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 hover:scale-105 hover:shadow-lg transition-all duration-300"
                >
                  <PlusIcon className="w-6 h-6 text-green-600 mb-2 group-hover:scale-110 transition-transform duration-300" />
                  <span className="font-medium text-green-800 text-center text-sm">Nouveau traitement</span>
                </Link>

                <Link
                  href="/manage-treatments"
                  className="group flex flex-col items-center justify-center h-24 p-4 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 hover:scale-105 hover:shadow-lg transition-all duration-300"
                >
                  <PillIcon className="w-6 h-6 text-red-600 mb-2 group-hover:scale-110 transition-transform duration-300" />
                  <span className="font-medium text-red-800 text-center text-sm">Gérer traitements</span>
                </Link>

                <Link
                  href="/history"
                  className="group flex flex-col items-center justify-center h-24 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 hover:scale-105 hover:shadow-lg transition-all duration-300"
                >
                  <ChartIcon className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform duration-300" />
                  <span className="font-medium text-purple-800 text-center text-sm">Historique</span>
                </Link>

                <Link
                  href="/settings"
                  className="group flex flex-col items-center justify-center h-24 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg hover:bg-orange-100 hover:scale-105 hover:shadow-lg transition-all duration-300"
                >
                  <SettingsIcon className="w-6 h-6 text-orange-600 mb-2 group-hover:scale-110 transition-transform duration-300" />
                  <span className="font-medium text-orange-800 text-center text-sm">Paramètres</span>
                </Link>
              </div>
            </div>

            {/* Timeline principale */}
            <Timeline
              doses={doses}
              currentTime={currentTime}
              onDoseAction={handleDoseAction}
              className="mb-8"
            />

            {/* Conseils et encouragements */}
            {adherenceRate >= 80 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
                <div className="flex items-center">
                  <span className="text-3xl mr-4">🎉</span>
                  <div>
                    <h3 className="font-semibold text-green-800">Excellent travail !</h3>
                    <p className="text-green-700">
                      Votre taux d&apos;adhérence de {adherenceRate}% est excellent. Continuez ainsi !
                    </p>
                  </div>
                </div>
              </div>
            )}

            {adherenceRate < 60 && stats.total > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
                <div className="flex items-center">
                  <span className="text-3xl mr-4">💪</span>
                  <div>
                    <h3 className="font-semibold text-orange-800">Vous pouvez y arriver !</h3>
                    <p className="text-orange-700">
                      Activez les notifications pour ne plus oublier vos prises de médicaments.
                    </p>
                    {!hasPermission && (
                      <p className="text-orange-600 text-sm mt-1">
                        → Cliquez sur le bouton &quot;Autoriser&quot; en haut de page
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Informations utiles */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-800 mb-3">💡 Le saviez-vous ?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">•</span>
              <p>Prendre ses médicaments à heures régulières améliore leur efficacité</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">•</span>
              <p>Un taux d&apos;adhérence supérieur à 80% est considéré comme optimal</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">•</span>
              <p>Les notifications peuvent augmenter l&apos;adhérence de 40%</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">•</span>
              <p>Consulter régulièrement votre historique aide à maintenir de bonnes habitudes</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 