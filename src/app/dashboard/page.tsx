'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Timeline, { useTimelineData, type MedicationDose } from '@/components/Timeline';
import { useNotificationManager } from '@/components/NotificationManager';

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const { scheduleMedicationReminder, hasPermission } = useNotificationManager();

  // Données de démonstration
  const demoData = useTimelineData();

  // Mise à jour de l'heure toutes les minutes
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Initialiser avec les données de démonstration
  useEffect(() => {
    setDoses(demoData);
  }, [demoData]);

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
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                ← Retour
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">📊</span>
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
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card Taux d'adhérence */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux d'adhérence</p>
                <p className="text-3xl font-bold text-blue-600">{adherenceRate}%</p>
              </div>
              <div className="text-3xl">🎯</div>
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
              <div className="text-3xl">✅</div>
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
              <div className="text-3xl">⏰</div>
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
              <div className="text-3xl">⚠️</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">oubliés ou retardés</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/add-treatment"
              className="flex items-center justify-center p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="text-2xl mr-3">➕</span>
              <span className="font-medium text-green-800">Nouveau traitement</span>
            </Link>

            <Link
              href="/history"
              className="flex items-center justify-center p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <span className="text-2xl mr-3">📈</span>
              <span className="font-medium text-purple-800">Voir l'historique</span>
            </Link>

            <Link
              href="/settings"
              className="flex items-center justify-center p-4 bg-orange-50 border-2 border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <span className="text-2xl mr-3">⚙️</span>
              <span className="font-medium text-orange-800">Paramètres</span>
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
                  Votre taux d'adhérence de {adherenceRate}% est excellent. Continuez ainsi !
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
                    → Cliquez sur le bouton "Autoriser" en haut de page
                  </p>
                )}
              </div>
            </div>
          </div>
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
              <p>Un taux d'adhérence supérieur à 80% est considéré comme optimal</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600">•</span>
              <p>Les notifications peuvent augmenter l'adhérence de 40%</p>
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