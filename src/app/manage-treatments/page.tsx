'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUserTreatments, deleteTreatment, clearAllTreatments } from '@/lib/firebase';
import type { Treatment } from '@/lib/firebase';
import {
  ArrowLeftIcon,
  PillIcon,
  TrashIcon,
  EditIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@/components/Icons';

export default function ManageTreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);

  useEffect(() => {
    loadTreatments();
  }, []);

  const loadTreatments = async () => {
    try {
      const userTreatments = await getUserTreatments();
      setTreatments(userTreatments);
    } catch (error) {
      console.error('Erreur lors du chargement des traitements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTreatment = async (treatmentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce traitement ?')) {
      return;
    }

    setDeletingId(treatmentId);
    try {
      await deleteTreatment(treatmentId);
      await loadTreatments(); // Recharger la liste
      alert('Traitement supprimé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du traitement');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllTreatments = async () => {
    try {
      await clearAllTreatments();
      await loadTreatments();
      setShowConfirmClearAll(false);
      alert('Tous les traitements ont été supprimés !');
    } catch (error) {
      console.error('Erreur lors de la suppression totale:', error);
      alert('Erreur lors de la suppression de tous les traitements');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de vos traitements...</p>
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
                <span>Retour</span>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <PillIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Gérer les traitements</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {treatments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Aucun traitement trouvé</h2>
            <p className="text-gray-600 mb-8">Vous n&apos;avez pas encore de traitements enregistrés.</p>
            <Link href="/add-treatment" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2">
              <PillIcon className="w-5 h-5" />
              <span>Ajouter un traitement</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Actions en haut */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {treatments.length} traitement{treatments.length > 1 ? 's' : ''} trouvé{treatments.length > 1 ? 's' : ''}
              </h2>
              <div className="flex space-x-3">
                <Link href="/add-treatment" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                  <PillIcon className="w-4 h-4" />
                  <span>Ajouter</span>
                </Link>
                <button
                  onClick={() => setShowConfirmClearAll(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Tout supprimer</span>
                </button>
              </div>
            </div>

            {/* Liste des traitements */}
            <div className="grid gap-6">
              {treatments.map((treatment) => (
                <div key={treatment.id} className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <PillIcon className="w-5 h-5 text-blue-600" />
                        <h3 className="text-xl font-semibold text-gray-900">{treatment.name}</h3>
                        {!treatment.isActive && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Inactif</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Dosage</p>
                          <p className="font-medium text-gray-900">{treatment.dosage}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">Fréquence</p>
                          <p className="font-medium text-gray-900">{treatment.frequency} prise{treatment.frequency > 1 ? 's' : ''} par jour</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1 flex items-center space-x-1">
                            <ClockIcon className="w-4 h-4" />
                            <span>Horaires</span>
                          </p>
                          <p className="font-medium text-gray-900">{treatment.startTime} - {treatment.endTime}</p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1 flex items-center space-x-1">
                            <CalendarIcon className="w-4 h-4" />
                            <span>Période</span>
                          </p>
                          <p className="font-medium text-gray-900 text-sm">
                            Du {formatDate(treatment.startDate)} au {formatDate(treatment.endDate)}
                          </p>
                        </div>
                      </div>

                      {treatment.notes && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-1">Notes</p>
                          <p className="text-gray-700 bg-gray-50 p-2 rounded text-sm">{treatment.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2 ml-4">
                      <Link
                        href={`/edit-treatment?id=${treatment.id}`}
                        className="bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center"
                        title="Modifier"
                      >
                        <EditIcon className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => treatment.id && handleDeleteTreatment(treatment.id)}
                        disabled={deletingId === treatment.id}
                        className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Supprimer"
                      >
                        {deletingId === treatment.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <TrashIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Modal de confirmation pour supprimer tout */}
        {showConfirmClearAll && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Confirmation</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer <strong>tous</strong> vos traitements ?
                Cette action est irréversible.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmClearAll(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleClearAllTreatments}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Tout supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 