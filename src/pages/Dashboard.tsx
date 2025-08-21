import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTreatments } from '../hooks/useTreatments';
import { SubjectProfile, Treatment, TreatmentTake } from '../types';
import { listSubjects } from '../services/subjectsService';
import { Plus, Check, Clock, Pill, Circle, Heart, Users, Grid3X3, Edit } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { treatments, getTakesForDate, ensureTakesForDate, markAsTaken } = useTreatments();

  // État pour la date sélectionnée
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [subjects, setSubjects] = useState<SubjectProfile[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL'); // 'ALL' | 'ME' | subjectId

  // Générer les prises pour la date sélectionnée (seulement quand nécessaire)
  useEffect(() => {
    ensureTakesForDate(selectedDate);
  }, [selectedDate, treatments, ensureTakesForDate]);

  // Charger les profils (sujets)
  useEffect(() => {
    (async () => {
      try {
        const list = await listSubjects((window as any).firebaseAuth?.currentUser?.uid || (await import('firebase/auth')).getAuth().currentUser?.uid || '');
        if (Array.isArray(list)) setSubjects(list);
      } catch (_) {
        // ignore en mode démo
      }
    })();
  }, []);

  // Obtenir les prises pour la date sélectionnée
  const selectedDateTakes = getTakesForDate(selectedDate);

  const subjectMatches = (treatment?: Treatment): boolean => {
    if (!treatment) return false;
    if (selectedSubjectId === 'ALL') return true;
    if (selectedSubjectId === 'ME') return !treatment.subjectId;
    return treatment.subjectId === selectedSubjectId;
  };

  const pendingTakes = selectedDateTakes.filter((take: TreatmentTake) => take.status === 'pending' && subjectMatches(getTreatmentForTake(take)));
  const takenTakes = selectedDateTakes.filter((take: TreatmentTake) => take.status === 'taken' && subjectMatches(getTreatmentForTake(take)));

  // Obtenir le traitement pour une prise
  const getTreatmentForTake = (take: TreatmentTake): Treatment | undefined => {
    return treatments.find(t => t.id === take.treatmentId);
  };
  try { console.log('[Dashboard] treatments=', treatments.map(t => ({ id: t.id, name: t.name, subjectId: t.subjectId }))); } catch { }

  // Formater l'heure
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Type pour un jour dans la timeline
  interface TimelineDay {
    date: Date;
    label: string;
    isToday: boolean;
    isSelected: boolean;
    dayOffset: number;
  }

  // Générer les jours avec une plage étendue (30 jours avant et après aujourd'hui)
  const generateExtendedDays = (): TimelineDay[] => {
    const days: TimelineDay[] = [];
    const today = new Date();
    const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

    // 30 jours avant aujourd'hui
    for (let i = -30; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dayOfWeek = date.getDay();
      const isToday = i === 0;
      const isSelected = date.toDateString() === selectedDate.toDateString();

      days.push({
        date: date,
        label: dayLabels[dayOfWeek],
        isToday,
        isSelected,
        dayOffset: i
      });
    }

    return days;
  };

  // Formater la date sélectionnée
  const formatSelectedDate = () => {
    return selectedDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  // Grouper les prises prises par heure
  const groupTakenTakesByTime = (source: TreatmentTake[]) => {
    const grouped: { [key: string]: { time: string, takes: Array<{ treatment: Treatment, take: TreatmentTake }> } } = {};

    source.forEach((take: TreatmentTake) => {
      if (take.takenTime) {
        const timeKey = formatTime(take.takenTime);
        const treatment = getTreatmentForTake(take);

        if (treatment) {
          if (!grouped[timeKey]) {
            grouped[timeKey] = { time: timeKey, takes: [] };
          }
          grouped[timeKey].takes.push({ treatment, take });
        }
      }
    });

    return Object.values(grouped).sort((a, b) => a.time.localeCompare(b.time));
  };

  // Grouper les prises à faire par heure
  const groupPendingTakesByTime = (source: TreatmentTake[]) => {
    const grouped: { [key: string]: { time: string, takes: Array<{ treatment: Treatment, take: TreatmentTake }> } } = {};

    source.forEach((take: TreatmentTake) => {
      const timeKey = formatTime(take.plannedTime);
      const treatment = getTreatmentForTake(take);

      if (treatment) {
        if (!grouped[timeKey]) {
          grouped[timeKey] = { time: timeKey, takes: [] };
        }
        grouped[timeKey].takes.push({ treatment, take });
      }
    });

    return Object.values(grouped).sort((a, b) => a.time.localeCompare(b.time));
  };

  // Composant pour l'icône du médicament
  const MedicationIcon = ({ treatment, size = 'w-10 h-10' }: { treatment: Treatment, size?: string }) => (
    <div
      className={`${size} rounded-full flex items-center justify-center text-white`}
      style={{ backgroundColor: '#1DA1F2' }}
    >
      {treatment.type === 'comprime' && <Circle className="w-5 h-5 fill-current" />}
      {treatment.type === 'gelule' && <Pill className="w-5 h-5" />}
      {(treatment.type === 'sirop' || treatment.type === 'suspension_buvable' || treatment.type === 'solution_buvable') && <div className="w-3 h-3 rounded-full bg-white"></div>}
    </div>
  );

  const extendedDays = generateExtendedDays();
  const groupedTakenTakes = groupTakenTakesByTime(takenTakes);
  const groupedPendingTakes = groupPendingTakesByTime(pendingTakes);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Gérer le scroll et centrer sur la date sélectionnée
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  // Centrer la timeline sur aujourd'hui au chargement
  useEffect(() => {
    if (scrollRef.current) {
      const todayIndex = extendedDays.findIndex(day => day.isToday);
      if (todayIndex !== -1) {
        const scrollPosition = todayIndex * 56 - (scrollRef.current.clientWidth / 2) + 28;
        scrollRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }
    }
  }, []);

  // Centrer la timeline quand la date sélectionnée change
  useEffect(() => {
    if (scrollRef.current) {
      const selectedIndex = extendedDays.findIndex(day => day.isSelected);
      if (selectedIndex !== -1) {
        const scrollPosition = selectedIndex * 56 - (scrollRef.current.clientWidth / 2) + 28;
        scrollRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }
    }
  }, [selectedDate]);

  return (
    <div style={{ backgroundColor: '#000' }} className="min-h-screen w-full">
      {/* En-tête avec date - position fixe */}
      <div className="sticky top-0 z-10 px-6 pt-8 pb-4" style={{ backgroundColor: '#000' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white capitalize">{formatSelectedDate()}</h1>
          <button
            onClick={async () => {
              const { requestNotificationPermission } = await import('../services/notificationService');
              await requestNotificationPermission();
            }}
            className="text-xs text-blue-400 border border-blue-400/30 px-2 py-1 rounded-lg"
          >Notifications</button>
        </div>
      </div>

      {/* Sélecteur de profil */}
      <div className="px-4 pt-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedSubjectId('ALL')}
            className={`px-3 py-1.5 rounded-full text-sm ${selectedSubjectId === 'ALL' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'}`}
          >Tous</button>
          <button
            onClick={() => setSelectedSubjectId('ME')}
            className={`px-3 py-1.5 rounded-full text-sm ${selectedSubjectId === 'ME' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'}`}
          >Moi</button>
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSubjectId(s.id)}
              className={`px-3 py-1.5 rounded-full text-sm ${selectedSubjectId === s.id ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'}`}
            >{s.name}</button>
          ))}
        </div>
      </div>

      {/* Timeline journalière scrollable */}
      <div className="px-4 pt-8 pb-6 relative z-0">
        <div
          ref={scrollRef}
          className="flex items-center space-x-4 overflow-x-auto scrollbar-hide py-4"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {extendedDays.map((day, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center flex-shrink-0 cursor-pointer"
              style={{ scrollSnapAlign: 'center' }}
              onClick={() => handleDayClick(day.date)}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium transition-all duration-200 ${day.isSelected ? 'transform scale-110' : ''
                  }`}
                style={{
                  backgroundColor: day.isSelected ? '#1DA1F2' : '#4AA8F0',
                  opacity: day.isSelected ? 1 : (day.dayOffset < 0 ? 0.5 : day.dayOffset > 0 ? 0.6 : 0.8)
                }}
              >
                {day.label}
              </div>
              {day.isToday && (
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white mt-1"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-6">

        {/* Section: Enregistrer */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Enregistrer</h2>
          {groupedPendingTakes.length === 0 ? (
            <div
              className="rounded-lg p-4 mb-3"
              style={{ backgroundColor: '#1E1E1E' }}
            >
              <p className="text-white text-center">
                Tous les traitements programmés ont été enregistrés
              </p>
            </div>
          ) : (
            <div className="space-y-4 mb-3">
              {groupedPendingTakes.map((group, index) => (
                <div key={index}>
                  {/* En-tête de groupe avec heure */}
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-white font-bold text-lg">
                      {group.time}
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: '#333' }}></div>
                  </div>

                  {/* Liste des traitements pour cette heure */}
                  <div className="space-y-3">
                    {group.takes.map(({ treatment, take }) => (
                      <div
                        key={take.id}
                        className="rounded-lg p-4"
                        style={{ backgroundColor: '#1E1E1E' }}
                      >
                        {/* Informations du traitement */}
                        <div className="flex items-center space-x-3 mb-3">
                          <MedicationIcon treatment={treatment} />
                          <div className="flex-1">
                            <p className="font-medium text-white">{treatment.name}</p>
                            <p className="text-sm" style={{ color: '#B3B3B3' }}>
                              {treatment.type === 'comprime' ? 'Comprimé' :
                                treatment.type === 'gelule' ? 'Gélule' :
                                  (treatment.type === 'sirop' || treatment.type === 'suspension_buvable' || treatment.type === 'solution_buvable') ? 'Liquide' : 'Autre'} • {treatment.dosage} {treatment.unit}
                            </p>
                          </div>
                        </div>

                        {/* Boutons de validation */}
                        <div className="space-y-1.5">
                          <button
                            onClick={() => markAsTaken(take.id)}
                            className="w-full py-1.5 px-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors"
                          >
                            Pris
                          </button>
                          <button
                            onClick={() => {/* TODO: gérer "non pris" */ }}
                            className="w-full py-1.5 px-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors"
                          >
                            Non pris
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/add-treatment')}
            className="w-full rounded-lg py-3 flex items-center justify-center space-x-2"
            style={{ backgroundColor: '#1E3A8A', color: 'white' }}
          >
            <span>Traitements au besoin</span>
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Section: Enregistrés */}
        {takenTakes.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3">Enregistrés</h2>
            <div className="space-y-3">
              {takenTakes.map((take: TreatmentTake) => {
                const treatment = getTreatmentForTake(take);
                if (!treatment) return null;

                return (
                  <div
                    key={take.id}
                    className="rounded-lg p-4 flex items-center space-x-3"
                    style={{ backgroundColor: '#1E1E1E' }}
                  >
                    <MedicationIcon treatment={treatment} />
                    <div className="flex-1">
                      <p className="font-medium text-white">{treatment.name}</p>
                      <p className="text-sm" style={{ color: '#B3B3B3' }}>
                        {treatment.type === 'comprime' ? 'Comprimé' :
                          treatment.type === 'gelule' ? 'Gélule' :
                            (treatment.type === 'sirop' || treatment.type === 'suspension_buvable' || treatment.type === 'solution_buvable') ? 'Liquide' : 'Autre'} • {treatment.dosage} {treatment.unit}
                      </p>
                      {take.takenTime && (
                        <div className="flex items-center space-x-1 mt-1" style={{ color: '#B3B3B3' }}>
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">Pris à {formatTime(take.takenTime)}</span>
                        </div>
                      )}
                    </div>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#1DA1F2' }}
                    >
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section: Vos traitements */}
        <div className="pb-20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Vos traitements</h2>
            <button onClick={() => navigate('/manage-treatments')} className="flex items-center space-x-1" style={{ color: '#1DA1F2' }}>
              <Edit className="w-4 h-4" />
              <span>Modifier</span>
            </button>
          </div>
          <div className="space-y-3">
            {treatments.map(treatment => (
              <div
                key={treatment.id}
                className="rounded-lg p-4 flex items-center space-x-3"
                style={{ backgroundColor: '#1E1E1E' }}
              >
                <MedicationIcon treatment={treatment} />
                <div className="flex-1">
                  <p className="font-medium text-white">{treatment.name}{treatment.subjectName ? ` • ${treatment.subjectName}` : ''}</p>
                  <p className="text-sm" style={{ color: '#B3B3B3' }}>
                    {treatment.type === 'comprime' ? 'Comprimé' :
                      treatment.type === 'gelule' ? 'Gélule' :
                        (treatment.type === 'sirop' || treatment.type === 'suspension_buvable' || treatment.type === 'solution_buvable') ? 'Liquide' : 'Autre'} • {treatment.dosage} {treatment.unit}
                  </p>
                  <div className="flex items-center space-x-1 mt-1" style={{ color: '#B3B3B3' }}>
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">Tous les jours</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={() => navigate('/add-treatment')}
                className="w-full py-3 text-center"
                style={{ color: '#1DA1F2' }}
              >
                Ajouter un traitement
              </button>
              <button onClick={() => navigate('/subjects')} className="w-full py-3 text-center" style={{ color: '#1DA1F2' }}>
                Profils
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de navigation inférieure */}
      <div
        className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-3 backdrop-blur-lg border-t"
        style={{ backgroundColor: 'rgba(30, 30, 30, 0.9)', borderColor: '#333' }}
      >
        <button className="flex flex-col items-center space-y-1">
          <Heart className="w-5 h-5" style={{ color: '#1DA1F2' }} />
          <span className="text-xs" style={{ color: '#1DA1F2' }}>Résumé</span>
        </button>
        <button className="flex flex-col items-center space-y-1">
          <Users className="w-5 h-5" style={{ color: '#B3B3B3' }} />
          <span className="text-xs" style={{ color: '#B3B3B3' }}>Partage</span>
        </button>
        <button className="flex flex-col items-center space-y-1">
          <Grid3X3 className="w-5 h-5" style={{ color: '#B3B3B3' }} />
          <span className="text-xs" style={{ color: '#B3B3B3' }}>Parcourir</span>
        </button>
      </div>
    </div>
  );
} 