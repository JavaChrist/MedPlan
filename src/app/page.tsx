'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import MedicationScheduler from '@/components/MedicationScheduler';
import Timeline, { useTimelineData, type MedicationDose } from '@/components/Timeline';

export default function HomePage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showScheduler, setShowScheduler] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Données de démonstration pour la timeline
  const timelineData = useTimelineData();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">💊</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">MedPlan</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{formatDate(currentTime)}</p>
              <p className="text-xl font-semibold text-gray-900">{formatTime(currentTime)}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Gestion intelligente des traitements
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Suivez et planifiez efficacement vos traitements quotidiens avec des rappels intelligents
            et une répartition automatique des prises dans la journée.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fonctionnalités clés</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">📱</div>
              <p className="text-sm text-gray-600 mt-1">PWA Compatible</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">🔔</div>
              <p className="text-sm text-gray-600 mt-1">Rappels Intelligents</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">☁️</div>
              <p className="text-sm text-gray-600 mt-1">Sync Cloud</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">📴</div>
              <p className="text-sm text-gray-600 mt-1">Mode Hors-ligne</p>
            </div>
          </div>
        </div>

        {/* Demo Section - Timeline */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">📅 Timeline des prises</h3>
            <p className="text-gray-600">Visualisez votre planning quotidien avec une timeline interactive</p>
          </div>
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 shadow-md"
            >
              {showTimeline ? '📋 Masquer la timeline' : '📅 Voir la timeline'}
            </button>
          </div>
          {showTimeline && (
            <div className="max-w-3xl mx-auto">
              <Timeline
                doses={timelineData}
                currentTime={currentTime}
                onDoseAction={(dose, action) => {
                  console.log(`Action ${action} pour ${dose.medicationName}`);
                  // Ici tu pourrais intégrer avec ton système de gestion d'état
                  alert(`Demo: ${action} pour ${dose.medicationName} à ${dose.time}`);
                }}
              />
            </div>
          )}
        </div>

        {/* Demo Section - Notifications */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">🧪 Testez les notifications</h3>
            <p className="text-gray-600">Programmez un rappel de médicament pour tester le système de notifications</p>
          </div>
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setShowScheduler(!showScheduler)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md"
            >
              {showScheduler ? '📋 Masquer le demo' : '🚀 Tester les notifications'}
            </button>
          </div>
          {showScheduler && (
            <div className="max-w-2xl mx-auto">
              <MedicationScheduler />
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Dashboard */}
          <Link href="/dashboard" className="group">
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-blue-100 hover:border-blue-300">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Tableau de bord</h3>
              <p className="text-gray-600">Vue d'ensemble de vos prises du jour avec timeline interactive</p>
            </div>
          </Link>

          {/* Add Treatment */}
          <Link href="/add-treatment" className="group">
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-green-100 hover:border-green-300">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <span className="text-2xl">➕</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nouveau traitement</h3>
              <p className="text-gray-600">Ajoutez un médicament avec planification automatique</p>
            </div>
          </Link>

          {/* History */}
          <Link href="/history" className="group">
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-purple-100 hover:border-purple-300">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Historique</h3>
              <p className="text-gray-600">Suivi des prises et statistiques d'adhérence</p>
            </div>
          </Link>

          {/* Settings */}
          <Link href="/settings" className="group">
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-orange-100 hover:border-orange-300">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                <span className="text-2xl">⚙️</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Paramètres</h3>
              <p className="text-gray-600">Notifications et préférences personnalisées</p>
            </div>
          </Link>

          {/* Profile */}
          <Link href="/profile" className="group">
            <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-indigo-100 hover:border-indigo-300">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
                <span className="text-2xl">👤</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Profil</h3>
              <p className="text-gray-600">Compte utilisateur et synchronisation cloud</p>
            </div>
          </Link>

          {/* Smart Features */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-md p-6 text-white">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🧠</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">IA Intégrée</h3>
            <p className="text-blue-100">Planification intelligente et recalcul automatique en cas de retard</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500 text-sm">
            <p>© 2024 MedPlan - Outil d'aide à la prise de médicaments</p>
            <p className="mt-1">Ne remplace pas un avis médical professionnel</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
