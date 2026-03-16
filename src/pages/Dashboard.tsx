import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTreatments } from '../hooks/useTreatments';
import { SubjectProfile, Treatment, TreatmentTake } from '../types';
import { listSubjects } from '../services/subjectsService';
import { Plus, Check, Clock, Pill, Circle, Edit, Bell, BellOff, X } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { updateTreatment as updateTreatmentDoc } from '../services/treatmentService';
import TabBar from '../components/layout/TabBar';
import { requestNotificationPermission, getPermissionStatus, testNotification, isIOS, isPWAInstalled } from '../services/notificationService';

export default function Dashboard() {
  const navigate = useNavigate();
  const { treatments, getTakesForDate, ensureTakesForDate, markAsTaken, setTreatments, setTakes } = useTreatments();

  // État pour la date sélectionnée
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [subjects, setSubjects] = useState<SubjectProfile[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ME'); // 'ME' | subjectId
  // Cache local des dates "non pris" par traitement pour affichage instantané
  const [localSkippedByTreatment, setLocalSkippedByTreatment] = useState<Record<string, Record<string, boolean>>>({});
  // État notifications
  const [notifStatus, setNotifStatus] = useState<'idle' | 'needs-install' | 'denied' | 'granted' | 'unsupported'>('idle');
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Générer les prises pour la date sélectionnée (seulement quand nécessaire)
  useEffect(() => {
    ensureTakesForDate(selectedDate);
  }, [selectedDate, treatments, ensureTakesForDate]);

  // Charger les profils (sujets)
  const loadSubjects = async () => {
    try {
      const uid = (window as any).firebaseAuth?.currentUser?.uid || getAuth().currentUser?.uid || '';
      const list = await listSubjects(uid);
      if (Array.isArray(list)) setSubjects(list);
    } catch (_) {
      // ignore en mode démo
    }
  };

  useEffect(() => {
    loadSubjects();
    // Recharger les profils à chaque fois que l'utilisateur revient sur cette page
    const handleVisibility = () => { if (document.visibilityState === 'visible') loadSubjects(); };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', loadSubjects);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', loadSubjects);
    };
  }, []);

  // Initialiser le statut des notifications au chargement
  useEffect(() => {
    setNotifStatus(getPermissionStatus() as any);
  }, []);

  // Gérer le clic sur le bouton Notifications
  const handleNotifClick = async () => {
    // iOS sans installation PWA → afficher instructions
    if (isIOS() && !isPWAInstalled()) {
      setNotifStatus('needs-install');
      setShowNotifModal(true);
      return;
    }
    if (!('Notification' in window)) {
      setNotifStatus('unsupported');
      setShowNotifModal(true);
      return;
    }
    if (Notification.permission === 'denied') {
      setNotifStatus('denied');
      setShowNotifModal(true);
      return;
    }
    const result = await requestNotificationPermission();
    setNotifStatus(result as any);
    if (result === 'granted') {
      await testNotification();
    } else {
      setShowNotifModal(true);
    }
  };
  const selectedDateTakes = getTakesForDate(selectedDate);

  // Obtenir le traitement pour une prise (doit être défini avant usage)
  const getTreatmentForTake = (take: TreatmentTake): Treatment | undefined => {
    return treatments.find(t => t.id === take.treatmentId);
  };

  const subjectMatches = (treatment?: Treatment): boolean => {
    if (!treatment) return false;
    if (selectedSubjectId === 'ME') return !treatment.subjectId || treatment.subjectId === '' || treatment.subjectId === null;
    return (treatment.subjectId || '') === selectedSubjectId;
  };

  const pendingTakes = selectedDateTakes.filter((take: TreatmentTake) => take.status === 'pending' && subjectMatches(getTreatmentForTake(take)));
  const takenTakes = selectedDateTakes.filter((take: TreatmentTake) => take.status === 'taken' && subjectMatches(getTreatmentForTake(take)));
  const visibleTreatments = treatments.filter(t => subjectMatches(t));
  try { console.log('[Dashboard] treatments=', treatments.map(t => ({ id: t.id, name: t.name, subjectId: t.subjectId }))); } catch { }

  // Formater l'heure
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Clé de date locale (évite les décalages UTC)
  const formatLocalDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  // Type pour un jour dans la timeline
  interface TimelineDay {
    date: Date;
    label: string;
    isToday: boolean;
    isSelected: boolean;
    dayOffset: number;
    hasTaken: boolean;
    completionRatio: number;
    skippedRatio: number;
    takenCount?: number;
    skippedCount?: number;
    totalCount?: number;
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
      const dateStr = formatLocalDateKey(date);
      const hasTaken = treatments
        .filter(t => subjectMatches(t))
        .some(t => Boolean(t.taken?.[dateStr]));
      const hasSkipped = treatments
        .filter(t => subjectMatches(t))
        .some(t => Boolean((t as any).skipped?.[dateStr] || localSkippedByTreatment[t.id]?.[dateStr]));

      // Ratio pour le jour sélectionné (progression réelle), sinon binaire
      let completionRatio = 0;
      let skippedRatio = 0;
      let takenCount: number | undefined;
      let localSkippedCount: number | undefined;
      let totalCount: number | undefined;
      if (date.toDateString() === selectedDate.toDateString()) {
        const skippedCount = selectedDateTakes.filter(t => t.status === 'skipped' && subjectMatches(getTreatmentForTake(t))).length;
        const total = pendingTakes.length + takenTakes.length + skippedCount;
        completionRatio = total > 0 ? takenTakes.length / total : (hasTaken ? 1 : 0);
        skippedRatio = total > 0 ? skippedCount / total : 0;
        takenCount = takenTakes.length;
        localSkippedCount = skippedCount;
        totalCount = total;
      } else {
        // Pour les jours non sélectionnés, on affiche un état binaire
        // - plein bleu si au moins une prise est marquée prise
        // - sinon, plein gris si au moins une prise est marquée non prise
        completionRatio = hasTaken ? 1 : 0;
        skippedRatio = !hasTaken && hasSkipped ? 1 : 0;
      }

      days.push({
        date: date,
        label: dayLabels[dayOfWeek],
        isToday,
        isSelected,
        dayOffset: i,
        hasTaken,
        completionRatio,
        skippedRatio,
        takenCount,
        skippedCount: localSkippedCount,
        totalCount
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

  // Afficher une quantité fractionnée lisiblement
  const formatQuantity = (q: number | undefined, type: string): string => {
    if (!q || q === 1) return '';
    if (q === 0.25) return '¼ ';
    if (q === 0.5)  return '½ ';
    if (q === 0.75) return '¾ ';
    if (q === 1.5)  return '1½ ';
    return `${q} `;
  };

  // Afficher la fréquence réelle d'un traitement
  const formatFrequencyLabel = (treatment: Treatment): string => {
    const s = treatment.schedules?.[0];
    if (!s) return '';
    if (s.frequency === 'daily') return 'Tous les jours';
    if (s.frequency === 'as_needed') return 'Au besoin';
    if (s.frequency === 'specific_days' && s.days?.length) {
      const names = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      return s.days.map(d => names[d]).join(', ');
    }
    if (s.frequency === 'every_x_days' && s.intervalDays) {
      return `Tous les ${s.intervalDays} jours`;
    }
    if (s.frequency === 'cycle' && s.cycleConfig) {
      return `${s.cycleConfig.onDays}j actif / ${s.cycleConfig.offDays}j pause`;
    }
    return '';
  };

  // Afficher la dose complète : "½ comprimé · 250 mg" ou "500 mg"
  const formatDoseLabel = (treatment: Treatment): string => {
    const isFractionnable = ['comprime', 'gelule', 'comprime_sublingual', 'comprime_croquer', 'suppositoire'].includes(treatment.type);
    const qty = treatment.quantity ?? 1;
    if (isFractionnable && qty !== 1) {
      const label = treatment.type === 'gelule' ? 'gélule' : treatment.type === 'suppositoire' ? 'suppositoire' : 'comprimé';
      const fracStr = formatQuantity(qty, treatment.type);
      const totalMg = qty * treatment.dosage;
      const totalStr = Number.isInteger(totalMg) ? `${totalMg}` : totalMg.toFixed(2).replace(/\.?0+$/, '');
      return `${fracStr}${label} · ${totalStr} ${treatment.unit}`;
    }
    return `${treatment.dosage} ${treatment.unit}`;
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

  // Marquer une prise comme prise et mettre à jour le traitement (pour la timeline)
  const handleMarkTaken = async (take: TreatmentTake) => {
    try {
      // 1) Marquer la prise localement (timeline cartes)
      markAsTaken(take.id);

      // 2) Trouver le traitement et mettre à jour le champ taken (optimiste + Firestore)
      const treatment = getTreatmentForTake(take);
      if (!treatment) return;
      const dateStr = formatLocalDateKey(take.plannedTime);
      const newTaken = { ...(treatment.taken || {}), [dateStr]: true } as any;
      const newSkipped = { ...(treatment.skipped || {}) } as any;
      if (newSkipped[dateStr]) delete newSkipped[dateStr]; // si on marque pris, on enlève le "non pris"

      // Optimiste côté état
      setTreatments(prev => prev.map(t => t.id === treatment.id ? { ...t, taken: newTaken, skipped: newSkipped } : t));
      setLocalSkippedByTreatment(prev => {
        const next = { ...(prev || {}) } as any;
        if (next[treatment.id]?.[dateStr]) {
          const copyDates = { ...next[treatment.id] };
          delete copyDates[dateStr];
          next[treatment.id] = copyDates;
        }
        return next;
      });

      // Persistant côté Firestore
      const user = getAuth().currentUser;
      if (user) {
        await updateTreatmentDoc(user.uid, treatment.id!, { taken: newTaken, skipped: newSkipped });
      }
    } catch (e) {
      console.error('Erreur mark taken:', e);
    }
  };

  // Marquer une prise comme "non pris" (skipped) + persistance Firestore
  const handleSkipTake = async (take: TreatmentTake) => {
    try {
      // 1) Mettre à jour l'état local de la prise (pour la liste en cours)
      setTakes(prev => prev.map(t => t.id === take.id ? { ...t, status: 'skipped' as const, takenTime: new Date() } : t));

      // 2) Trouver le traitement et mettre à jour le champ skipped pour la date (optimiste + Firestore)
      const treatment = getTreatmentForTake(take);
      if (!treatment) return;
      const dateStr = formatLocalDateKey(take.plannedTime);
      const newSkipped = { ...(treatment.skipped || {}), [dateStr]: true } as any;
      const newTaken = { ...(treatment.taken || {}) } as any;
      if (newTaken[dateStr]) delete newTaken[dateStr]; // si on marque non pris, on enlève le "pris"

      // Optimiste côté état
      setTreatments(prev => prev.map(t => t.id === treatment.id ? { ...t, skipped: newSkipped, taken: newTaken } : t));
      setLocalSkippedByTreatment(prev => ({
        ...prev,
        [treatment.id]: { ...(prev[treatment.id] || {}), [dateStr]: true }
      }));

      // Persistant côté Firestore
      const user = getAuth().currentUser;
      if (user) {
        await updateTreatmentDoc(user.uid, treatment.id!, { skipped: newSkipped, taken: newTaken });
      }
    } catch (e) {
      console.error('Erreur mark skipped:', e);
    }
  };

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
      {/* Modal instructions notifications */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm relative">
            <button onClick={() => setShowNotifModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            {notifStatus === 'needs-install' && (
              <>
                <div className="flex items-center space-x-3 mb-4">
                  <Bell className="w-6 h-6 text-blue-400 flex-shrink-0" />
                  <h2 className="text-white font-bold text-lg">Activer les notifications</h2>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  Sur iPhone, les notifications nécessitent d'installer MedPlan sur l'écran d'accueil.
                </p>
                <ol className="text-gray-300 text-sm space-y-2 mb-5">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400 font-bold flex-shrink-0">1.</span>
                    <span>Appuie sur le bouton <strong className="text-white">Partager</strong> (⬆) en bas de Safari</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400 font-bold flex-shrink-0">2.</span>
                    <span>Sélectionne <strong className="text-white">"Sur l'écran d'accueil"</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400 font-bold flex-shrink-0">3.</span>
                    <span>Ouvre MedPlan depuis l'icône ajoutée et réessaie</span>
                  </li>
                </ol>
                <p className="text-xs text-gray-500">Requiert iOS 16.4 ou supérieur.</p>
              </>
            )}

            {notifStatus === 'denied' && (
              <>
                <div className="flex items-center space-x-3 mb-4">
                  <BellOff className="w-6 h-6 text-red-400 flex-shrink-0" />
                  <h2 className="text-white font-bold text-lg">Notifications bloquées</h2>
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  Tu as précédemment refusé les notifications. Pour les réactiver :
                </p>
                <ol className="text-gray-300 text-sm space-y-2 mb-5">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400 font-bold flex-shrink-0">1.</span>
                    <span>Ouvre les <strong className="text-white">Réglages</strong> de ton iPhone</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400 font-bold flex-shrink-0">2.</span>
                    <span>Va dans <strong className="text-white">MedPlan → Notifications</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400 font-bold flex-shrink-0">3.</span>
                    <span>Active <strong className="text-white">"Autoriser les notifications"</strong></span>
                  </li>
                </ol>
              </>
            )}

            {notifStatus === 'unsupported' && (
              <>
                <div className="flex items-center space-x-3 mb-4">
                  <BellOff className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                  <h2 className="text-white font-bold text-lg">Non supporté</h2>
                </div>
                <p className="text-gray-300 text-sm">
                  Les notifications ne sont pas disponibles sur ce navigateur. Utilise Safari sur iPhone (iOS 16.4+) avec l'app installée sur l'écran d'accueil.
                </p>
              </>
            )}

            <button onClick={() => setShowNotifModal(false)} className="mt-4 w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm">
              Compris
            </button>
          </div>
        </div>
      )}

      {/* En-tête avec date + sélecteur de profil - position fixe */}
      <div className="sticky top-0 z-10 px-4 pb-3" style={{ backgroundColor: '#000', paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-center justify-between mb-3 gap-2">
          <h1 className="text-lg sm:text-xl font-bold text-white capitalize truncate">{formatSelectedDate()}</h1>
          <button
            onClick={handleNotifClick}
            className={`flex-shrink-0 flex items-center space-x-1.5 text-xs border px-3 py-2.5 rounded-lg transition-colors min-h-[44px] ${
              notifStatus === 'granted'
                ? 'text-green-400 border-green-400/30 bg-green-400/10'
                : 'text-blue-400 border-blue-400/30'
            }`}
          >
            {notifStatus === 'granted'
              ? <><Check className="w-3.5 h-3.5" /><span>Notifs actives</span></>
              : notifStatus === 'denied'
              ? <><BellOff className="w-3.5 h-3.5" /><span>Bloquées</span></>
              : <><Bell className="w-3.5 h-3.5" /><span>Notifications</span></>
            }
          </button>
        </div>

        {/* Sélecteur de profil */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide" style={{ paddingTop: '3px', paddingBottom: '6px' }}>
          {/* Bouton "Moi" */}
          {(() => {
            const isSelected = selectedSubjectId === 'ME';
            return (
              <button
                onClick={() => setSelectedSubjectId('ME')}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center space-x-1.5 flex-shrink-0"
                style={isSelected
                  ? { backgroundColor: '#3b82f6', color: '#fff', border: '2px solid #3b82f6' }
                  : { backgroundColor: '#1f2937', color: '#9ca3af', border: '2px solid #3b82f6' }
                }
              >
                <span className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: isSelected ? '#fff' : '#3b82f6' }} />
                <span>Moi</span>
              </button>
            );
          })()}

          {/* Boutons profils secondaires */}
          {subjects.map(s => {
            const isSelected = selectedSubjectId === s.id;
            const color = s.color || '#60a5fa';
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSubjectId(s.id)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center space-x-1.5 flex-shrink-0"
                style={isSelected
                  ? { backgroundColor: color, color: '#fff', border: `2px solid ${color}` }
                  : { backgroundColor: '#1f2937', color: '#e5e7eb', border: `2px solid ${color}` }
                }
              >
                <span
                  className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: isSelected ? '#fff' : color }}
                />
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline journalière scrollable */}
      <div className="px-2 sm:px-3 pt-8 pb-6 relative z-0">
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
              <div className={`relative w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all duration-200 ${day.isSelected ? 'transform scale-110' : ''}`}
                title={typeof day.totalCount === 'number' ? `${day.takenCount || 0}/${day.totalCount} pris${(day.skippedCount || 0) ? `, ${day.skippedCount} non pris` : ''}` : ''}>
                {/* Fond (anneau) */}
                <div className="absolute inset-0 rounded-full" style={{ border: '2px solid #1DA1F2', opacity: day.isSelected ? 1 : (day.dayOffset < 0 ? 0.5 : day.dayOffset > 0 ? 0.6 : 0.8) }} />
                {/* Remplissage progressif (pris) */}
                <div className="absolute inset-0 overflow-hidden rounded-full" style={{ opacity: day.isSelected ? 1 : (day.dayOffset < 0 ? 0.5 : day.dayOffset > 0 ? 0.6 : 0.8) }}>
                  <div className="absolute left-0 top-0 h-full" style={{ width: `${Math.min(100, Math.max(0, Math.round(day.completionRatio * 100)))}%`, backgroundColor: '#1DA1F2' }} />
                </div>
                {/* Indicateur fin pour non pris (skipped) */}
                {day.skippedRatio > 0 && (
                  <div className="absolute inset-0 overflow-hidden rounded-full" style={{ pointerEvents: 'none', opacity: day.isSelected ? 1 : (day.dayOffset < 0 ? 0.5 : day.dayOffset > 0 ? 0.6 : 0.8) }}>
                    <div className="absolute right-0 top-0 h-full" style={{ width: `${Math.min(100, Math.max(0, Math.round(day.skippedRatio * 100)))}%`, backgroundColor: '#64748B' }} />
                  </div>
                )}
                {/* Lettre du jour */}
                <span className="relative" style={{ color: day.completionRatio > 0 ? '#ffffff' : '#1DA1F2' }}>{day.label}</span>
              </div>
              {day.isToday && (
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white mt-1"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full px-2 sm:px-3 space-y-6 max-w-none">

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
                                  (treatment.type === 'sirop' || treatment.type === 'suspension_buvable' || treatment.type === 'solution_buvable') ? 'Liquide' : 'Autre'} • {formatDoseLabel(treatment)}
                            </p>
                          </div>
                        </div>

                        {/* Boutons de validation */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleMarkTaken(take)}
                            className="flex-1 py-3 px-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors min-h-[44px]"
                          >
                            ✓ Pris
                          </button>
                          <button
                            onClick={() => handleSkipTake(take)}
                            className="flex-1 py-3 px-3 bg-transparent border border-gray-600 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors min-h-[44px]"
                          >
                            ✕ Non pris
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
                            (treatment.type === 'sirop' || treatment.type === 'suspension_buvable' || treatment.type === 'solution_buvable') ? 'Liquide' : 'Autre'} • {formatDoseLabel(treatment)}
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
            {visibleTreatments.map(treatment => (
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
                        (treatment.type === 'sirop' || treatment.type === 'suspension_buvable' || treatment.type === 'solution_buvable') ? 'Liquide' : 'Autre'} • {formatDoseLabel(treatment)}
                  </p>
                  <div className="flex items-center space-x-1 mt-1" style={{ color: '#B3B3B3' }}>
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">{formatFrequencyLabel(treatment) || 'Tous les jours'}</span>
                  </div>
                </div>
              </div>
            ))}
            {/* liens secondaires supprimés */}
          </div>
        </div>
      </div>

      <TabBar active="dashboard" />
    </div>
  );
} 