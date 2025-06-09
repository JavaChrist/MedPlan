'use client';

import { useMemo } from 'react';
import { CheckIcon, XIcon, WarningIcon, ClockIcon, CalendarIcon } from './Icons';
import { type MedicationDose } from '@/lib/planner';

// Interface pour les props du composant Timeline
interface TimelineProps {
  doses: MedicationDose[];
  currentTime?: Date;
  className?: string;
  showEmptyMessage?: boolean;
  onDoseAction?: (dose: MedicationDose, action: 'take' | 'skip' | 'delay') => void;
}

// Composant pour une pastille de statut avec icône
interface StatusIndicatorProps {
  status: MedicationDose['status'];
  isActive?: boolean;
}

function StatusIndicator({ status, isActive = false }: StatusIndicatorProps) {
  const getStatusConfig = (status: MedicationDose['status']) => {
    switch (status) {
      case 'upcoming':
        return {
          bgColor: 'bg-blue-100',
          ringColor: 'ring-blue-300',
          iconColor: 'text-blue-600',
          icon: <ClockIcon className="w-5 h-5" />,
          label: 'À venir'
        };
      case 'taken':
        return {
          bgColor: 'bg-green-100',
          ringColor: 'ring-green-300',
          iconColor: 'text-green-600',
          icon: <CheckIcon className="w-5 h-5" />,
          label: 'Pris'
        };
      case 'missed':
        return {
          bgColor: 'bg-red-100',
          ringColor: 'ring-red-300',
          iconColor: 'text-red-600',
          icon: <XIcon className="w-5 h-5" />,
          label: 'Oublié'
        };
      case 'delayed':
        return {
          bgColor: 'bg-orange-100',
          ringColor: 'ring-orange-300',
          iconColor: 'text-orange-600',
          icon: <WarningIcon className="w-5 h-5" />,
          label: 'En retard'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          ringColor: 'ring-gray-300',
          iconColor: 'text-gray-600',
          icon: '⭕',
          label: 'Inconnu'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div
      className={`
        flex items-center justify-center w-10 h-10 rounded-full 
        ${config.bgColor} ${config.ringColor} 
        ${isActive ? 'ring-4 scale-110' : 'ring-2'} 
        transition-all duration-300 flex-shrink-0
      `}
      title={config.label}
    >
      <div className={config.iconColor}>
        {config.icon}
      </div>
    </div>
  );
}

// Composant pour une entrée de la timeline
interface TimelineItemProps {
  dose: MedicationDose;
  isLast: boolean;
  isActive: boolean;
  onAction?: (dose: MedicationDose, action: 'take' | 'skip' | 'delay') => void;
}

function TimelineItem({ dose, isLast, isActive, onAction }: TimelineItemProps) {
  const getStatusStyle = (status: MedicationDose['status']) => {
    switch (status) {
      case 'upcoming':
        return 'border-blue-200 bg-blue-50';
      case 'taken':
        return 'border-green-200 bg-green-50';
      case 'missed':
        return 'border-red-200 bg-red-50';
      case 'delayed':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getTimeDisplay = () => {
    if (dose.status === 'taken' && dose.takenAt && dose.takenAt !== dose.time) {
      return (
        <div className="text-right">
          <p className="font-bold text-gray-900">{dose.time}</p>
          <p className="text-xs text-green-600">→ {dose.takenAt}</p>
        </div>
      );
    }
    return <p className="font-bold text-gray-900">{dose.time}</p>;
  };

  return (
    <div className="relative flex items-start space-x-4">
      {/* Ligne de connexion verticale */}
      {!isLast && (
        <div className="absolute left-5 top-10 w-0.5 h-full bg-gray-200"></div>
      )}

      {/* Indicateur de statut */}
      <StatusIndicator status={dose.status} isActive={isActive} />

      {/* Contenu de la dose */}
      <div className={`
        flex-1 min-w-0 p-4 rounded-lg border-2 transition-all duration-300
        ${getStatusStyle(dose.status)}
        ${isActive ? 'shadow-md scale-[1.02]' : 'shadow-sm'}
      `}>
        <div className="flex items-start justify-between">
          {/* Informations principales */}
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center justify-between mb-2">
              {getTimeDisplay()}
              <div className="flex items-center space-x-2">
                {dose.status === 'upcoming' && isActive && onAction && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => onAction(dose, 'take')}
                      className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                      title="Marquer comme pris"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => onAction(dose, 'delay')}
                      className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700 transition-colors"
                      title="Reporter"
                    >
                      ⏱️
                    </button>
                    <button
                      onClick={() => onAction(dose, 'skip')}
                      className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                      title="Ignorer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 text-lg truncate">
              💊 {dose.medicationName}
            </h3>

            {dose.dosage && (
              <p className="text-sm text-gray-600 mt-1">
                Dosage: {dose.dosage}
              </p>
            )}

            {dose.notes && (
              <p className="text-xs text-gray-500 mt-2 italic">
                📝 {dose.notes}
              </p>
            )}

            {/* Badge de statut mobile */}
            <div className="mt-3 sm:hidden">
              <span className={`
                inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                ${dose.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : ''}
                ${dose.status === 'taken' ? 'bg-green-100 text-green-800' : ''}
                ${dose.status === 'missed' ? 'bg-red-100 text-red-800' : ''}
                ${dose.status === 'delayed' ? 'bg-orange-100 text-orange-800' : ''}
              `}>
                {dose.status === 'upcoming' && 'À venir'}
                {dose.status === 'taken' && 'Pris'}
                {dose.status === 'missed' && 'Oublié'}
                {dose.status === 'delayed' && 'En retard'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant Timeline principal
export default function Timeline({
  doses,
  currentTime = new Date(),
  className = '',
  showEmptyMessage = true,
  onDoseAction
}: TimelineProps) {
  // Tri des doses par heure et calcul de la dose active
  const { sortedDoses, activeDoseIndex } = useMemo(() => {
    const sorted = [...doses].sort((a, b) => a.time.localeCompare(b.time));
    const currentTimeStr = currentTime.toTimeString().slice(0, 5); // Format HH:mm

    // Trouver la dose active (prochaine dose à venir ou en cours)
    let activeIndex = -1;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].status === 'upcoming' && sorted[i].time >= currentTimeStr) {
        activeIndex = i;
        break;
      }
    }

    return { sortedDoses: sorted, activeDoseIndex: activeIndex };
  }, [doses, currentTime]);

  // Statistiques pour l'en-tête
  const stats = useMemo(() => {
    const total = doses.length;
    const taken = doses.filter(d => d.status === 'taken').length;
    const missed = doses.filter(d => d.status === 'missed').length;
    const upcoming = doses.filter(d => d.status === 'upcoming').length;
    const delayed = doses.filter(d => d.status === 'delayed').length;

    return { total, taken, missed, upcoming, delayed };
  }, [doses]);

  if (doses.length === 0 && showEmptyMessage) {
    return (
      <div className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center ${className}`}>
        <div className="text-gray-400 text-4xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune prise programmée</h3>
        <p className="text-gray-500">Ajoutez un traitement pour voir votre planning quotidien.</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* En-tête avec statistiques */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center space-x-2">
            <CalendarIcon className="w-6 h-6 text-white" />
            <span>Planning du jour</span>
          </h2>
          <div className="text-right">
            <p className="text-blue-100 text-sm">
              {currentTime.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </p>
            <p className="text-white font-semibold">
              {currentTime.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* Statistiques compactes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-white bg-opacity-20 rounded-lg p-2">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-blue-100">Total</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-2">
            <p className="text-2xl font-bold text-green-300">{stats.taken}</p>
            <p className="text-xs text-blue-100">Pris</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-2">
            <p className="text-2xl font-bold text-yellow-300">{stats.upcoming}</p>
            <p className="text-xs text-blue-100">À venir</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-2">
            <p className="text-2xl font-bold text-red-300">{stats.missed + stats.delayed}</p>
            <p className="text-xs text-blue-100">Problèmes</p>
          </div>
        </div>
      </div>

      {/* Liste des doses */}
      <div className="p-6">
        {doses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">⏰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune dose programmée aujourd'hui
            </h3>
            <p className="text-gray-600">
              Ajoutez un traitement ou naviguez vers un autre jour pour voir votre planning.
            </p>
          </div>
        ) : (
          <>
            {/* En-tête avec informations sur l'algorithme */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-blue-600">🤖</span>
                <h4 className="font-medium text-blue-900">Planning intelligent généré automatiquement</h4>
              </div>
              <p className="text-blue-800 text-sm">
                {doses.length} dose{doses.length > 1 ? 's' : ''} répartie{doses.length > 1 ? 's' : ''}
                optimalement selon vos préférences horaires et la fréquence de vos traitements.
              </p>
              <div className="mt-2 text-xs text-blue-700">
                💡 <strong>Algorithme :</strong> Espacement uniforme sur votre plage horaire personnalisée
              </div>
            </div>

            {/* Liste des doses */}
            <div className="space-y-3">
              {doses.map((dose, index) => {
                const isPast = currentTime.toTimeString().slice(0, 5) > dose.time;
                const isCurrent = !isPast && index === doses.findIndex(d => currentTime.toTimeString().slice(0, 5) <= d.time);

                return (
                  <div
                    key={dose.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300 ${isCurrent
                        ? 'bg-blue-50 border-blue-300 shadow-lg ring-2 ring-blue-100'
                        : dose.status === 'taken'
                          ? 'bg-green-50 border-green-200'
                          : dose.status === 'missed'
                            ? 'bg-red-50 border-red-200'
                            : dose.status === 'delayed'
                              ? 'bg-orange-50 border-orange-200'
                              : isPast
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-white border-gray-200'
                      }`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Indicateur de statut visuel */}
                      <div className={`w-3 h-3 rounded-full ${dose.status === 'taken' ? 'bg-green-500' :
                          dose.status === 'missed' ? 'bg-red-500' :
                            dose.status === 'delayed' ? 'bg-orange-500' :
                              isCurrent ? 'bg-blue-500 animate-pulse' :
                                isPast ? 'bg-gray-400' : 'bg-gray-300'
                        }`} />

                      {/* Heure avec emphasis */}
                      <div className={`text-2xl font-bold ${isCurrent ? 'text-blue-600' :
                          dose.status === 'taken' ? 'text-green-600' :
                            dose.status === 'missed' ? 'text-red-600' :
                              dose.status === 'delayed' ? 'text-orange-600' :
                                'text-gray-900'
                        }`}>
                        {dose.time}
                      </div>

                      {/* Informations du médicament */}
                      <div>
                        <h4 className="font-semibold text-gray-900">{dose.medicationName}</h4>
                        <p className="text-sm text-gray-600">{dose.dosage}</p>
                        {dose.takenAt && (
                          <p className="text-xs text-green-600">✅ Pris à {dose.takenAt}</p>
                        )}
                      </div>
                    </div>

                    {/* Statut et actions */}
                    <div className="flex items-center space-x-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${dose.status === 'taken' ? 'bg-green-100 text-green-800' :
                          dose.status === 'missed' ? 'bg-red-100 text-red-800' :
                            dose.status === 'delayed' ? 'bg-orange-100 text-orange-800' :
                              isCurrent ? 'bg-blue-100 text-blue-800' :
                                isPast ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {dose.status === 'taken' ? '✅ Pris' :
                          dose.status === 'missed' ? '❌ Oublié' :
                            dose.status === 'delayed' ? '⏰ Retardé' :
                              isCurrent ? '🔔 Maintenant' :
                                isPast ? '⏳ Passé' : '📅 À venir'}
                      </div>

                      {/* Boutons d'action - À implémenter */}
                      {dose.status === 'upcoming' && (isCurrent || isPast) && onDoseAction && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => onDoseAction(dose, 'take')}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                          >
                            ✅ Pris
                          </button>
                          <button
                            onClick={() => onDoseAction(dose, 'skip')}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                          >
                            ❌ Oublié
                          </button>
                          <button
                            onClick={() => onDoseAction(dose, 'delay')}
                            className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                          >
                            ⏰ Plus tard
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Message d'encouragement */}
        {stats.taken > 0 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-center">
              🎉 Félicitations ! Vous avez pris {stats.taken} dose{stats.taken > 1 ? 's' : ''} aujourd'hui.
              {stats.total > 0 && ` Taux d&apos;adhérence: ${Math.round((stats.taken / stats.total) * 100)}%`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Les données de démonstration ont été supprimées
// L'application utilise maintenant les vrais traitements des utilisateurs

/*
=== EXEMPLES D'UTILISATION ===

// Utilisation de base
import Timeline from '@/components/Timeline';
import { type MedicationDose } from '@/lib/planner';

const doses: MedicationDose[] = [
  {
    id: '1',
    time: '08:00',
    medicationName: 'Paracétamol',
    dosage: '500mg',
    status: 'taken'
  },
  // ... autres doses
];

<Timeline 
  doses={doses} 
  onDoseAction={(dose, action) => {
    console.log(`Action ${action} pour ${dose.medicationName}`);
  }}
/>

// Avec données réelles
import Timeline from '@/components/Timeline';
import { getUserTreatments } from '@/lib/firebase';
import { generateTodaySchedule, type MedicationDose } from '@/lib/planner';

function MyComponent() {
  const [doses, setDoses] = useState<MedicationDose[]>([]);
  
  useEffect(() => {
    const loadDoses = async () => {
      const treatments = await getUserTreatments();
      const schedule = generateTodaySchedule(treatments, new Date());
      setDoses(schedule);
    };
    loadDoses();
  }, []);
  
  return (
    <Timeline 
      doses={doses}
      currentTime={new Date()}
      className="max-w-2xl mx-auto"
    />
  );
}

// Intégration avec le système de notifications
import { useNotificationManager } from '@/components/NotificationManager';
import { generateSchedule } from '@/lib/planner';

function DashboardPage() {
  const { scheduleMedicationReminder } = useNotificationManager();
  
  const handleDoseAction = (dose: MedicationDose, action: string) => {
    if (action === 'take') {
      // Marquer comme pris dans la base de données
      updateDoseStatus(dose.id, 'taken');
    } else if (action === 'delay') {
      // Reprogrammer pour plus tard
      const newTime = new Date(Date.now() + 30 * 60 * 1000); // +30 min
      scheduleMedicationReminder(dose.medicationName, newTime, dose.dosage);
    }
  };
  
  return (
    <Timeline 
      doses={dailyDoses}
      onDoseAction={handleDoseAction}
    />
  );
}

=== FIN DES EXEMPLES ===
*/ 