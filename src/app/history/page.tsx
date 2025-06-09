'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdherenceStats } from '@/lib/firebase';
import { onAuthChange } from '@/lib/firebase';
import type { User } from 'firebase/auth';

interface HistoryStats {
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  delayedDoses: number;
  adherenceRate: number;
}

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week');
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Observer l'état d'authentification
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      // En mode local ou avec utilisateur Firebase
      loadStats(user?.uid, selectedPeriod);
    });

    return () => unsubscribe();
  }, [selectedPeriod]);

  // Charger les statistiques
  const loadStats = async (userId: string | undefined, period: 'week' | 'month' | 'quarter') => {
    setIsLoading(true);
    setError('');

    try {
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
      }

      // Appeler getAdherenceStats avec les paramètres (compatibles mode local)
      const adherenceStats = await getAdherenceStats(userId, startDate, endDate);
      setStats(adherenceStats);
    } catch (error: unknown) {
      console.error('Erreur chargement statistiques:', error);
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  // Changement de période
  const handlePeriodChange = (period: 'week' | 'month' | 'quarter') => {
    setSelectedPeriod(period);
    // Fonctionne avec ou sans utilisateur Firebase (mode local)
    loadStats(user?.uid, period);
  };

  // Obtenir la couleur selon le taux d'adhérence
  const getAdherenceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Obtenir le message selon le taux d'adhérence
  const getAdherenceMessage = (rate: number) => {
    if (rate >= 90) return 'Excellent ! Vous respectez parfaitement votre traitement.';
    if (rate >= 70) return 'Bien ! Quelques améliorations possibles.';
    if (rate >= 50) return 'Attention, essayez d&apos;améliorer votre régularité.';
    return 'Important : consultez votre médecin pour adapter votre traitement.';
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'week': return '7 derniers jours';
      case 'month': return '30 derniers jours';
      case 'quarter': return '3 derniers mois';
    }
  };

  // Plus de vérification d'utilisateur nécessaire - fonctionne en mode local

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
                ← Retour au tableau de bord
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">📈</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Historique & Statistiques</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sélecteur de période */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Période d&apos;analyse</h2>
          <div className="flex space-x-4">
            {[
              { key: 'week', label: '7 jours' },
              { key: 'month', label: '1 mois' },
              { key: 'quarter', label: '3 mois' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handlePeriodChange(key as 'week' | 'month' | 'quarter')}
                className={`px-4 py-2 rounded-lg transition-colors ${selectedPeriod === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Statistiques principales */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des statistiques...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-800">❌ {error}</p>
          </div>
        ) : stats ? (
          <>
            {/* Carte principale d'adhérence */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 mb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Taux d&apos;adhérence - {getPeriodLabel()}
                </h2>
                <div className={`text-6xl font-bold ${getAdherenceColor(stats.adherenceRate)} mb-4`}>
                  {stats.adherenceRate}%
                </div>
                <p className="text-gray-600 text-lg">
                  {getAdherenceMessage(stats.adherenceRate)}
                </p>
              </div>

              {/* Barre de progression */}
              <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${stats.adherenceRate >= 90 ? 'bg-green-500' :
                    stats.adherenceRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  style={{ width: `${stats.adherenceRate}%` }}
                ></div>
              </div>

              {/* Détails des statistiques */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalDoses}</div>
                  <div className="text-sm text-blue-800">Total programmé</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.takenDoses}</div>
                  <div className="text-sm text-green-800">Prises réussies</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{stats.missedDoses}</div>
                  <div className="text-sm text-red-800">Doses oubliées</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats.delayedDoses}</div>
                  <div className="text-sm text-orange-800">Doses retardées</div>
                </div>
              </div>
            </div>

            {/* Graphique de répartition */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Graphique circulaire simplifié */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des prises</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-gray-700">Prises réussies</span>
                    </div>
                    <span className="font-semibold">{stats.takenDoses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-gray-700">Doses oubliées</span>
                    </div>
                    <span className="font-semibold">{stats.missedDoses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-orange-500 rounded"></div>
                      <span className="text-gray-700">Doses retardées</span>
                    </div>
                    <span className="font-semibold">{stats.delayedDoses}</span>
                  </div>
                </div>
              </div>

              {/* Conseils personnalisés */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Conseils personnalisés</h3>
                <div className="space-y-3">
                  {stats.adherenceRate >= 90 ? (
                    <>
                      <div className="flex items-start space-x-2">
                        <span className="text-green-600">✅</span>
                        <p className="text-gray-700">Excellent travail ! Continuez ainsi.</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-600">💡</span>
                        <p className="text-gray-700">Partagez vos bonnes habitudes avec votre médecin.</p>
                      </div>
                    </>
                  ) : stats.adherenceRate >= 70 ? (
                    <>
                      <div className="flex items-start space-x-2">
                        <span className="text-yellow-600">⚠️</span>
                        <p className="text-gray-700">Activez les notifications pour ne plus oublier.</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-600">💡</span>
                        <p className="text-gray-700">Définissez des horaires fixes dans votre routine.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start space-x-2">
                        <span className="text-red-600">❌</span>
                        <p className="text-gray-700">Consultez votre médecin pour adapter votre traitement.</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-600">🔔</span>
                        <p className="text-gray-700">Utilisez des rappels multiples tout au long de la journée.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Objectifs */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4">🎯 Vos objectifs</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">85%</div>
                  <div className="text-purple-100">Objectif minimum</div>
                  <div className="text-sm text-purple-200 mt-1">
                    {stats.adherenceRate >= 85 ? '✅ Atteint' : '⏳ En cours'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">90%</div>
                  <div className="text-purple-100">Objectif optimal</div>
                  <div className="text-sm text-purple-200 mt-1">
                    {stats.adherenceRate >= 90 ? '✅ Atteint' : '⏳ En cours'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">100%</div>
                  <div className="text-purple-100">Objectif parfait</div>
                  <div className="text-sm text-purple-200 mt-1">
                    {stats.adherenceRate >= 100 ? '✅ Atteint' : '⏳ En cours'}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée disponible</h3>
            <p className="text-gray-500 mb-6">Ajoutez des traitements et commencez à les suivre pour voir vos statistiques.</p>
            <Link
              href="/add-treatment"
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Ajouter un traitement
            </Link>
          </div>
        )}

        {/* Actions rapides */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/dashboard"
              className="flex items-center justify-center p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="text-2xl mr-3">📊</span>
              <span className="font-medium text-blue-800">Voir le planning du jour</span>
            </Link>

            <Link
              href="/add-treatment"
              className="flex items-center justify-center p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="text-2xl mr-3">➕</span>
              <span className="font-medium text-green-800">Ajouter un traitement</span>
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
      </main>
    </div>
  );
} 