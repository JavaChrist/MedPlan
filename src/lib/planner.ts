// Types pour les traitements
export interface Treatment {
  id: string;
  name: string;
  dosage: string;
  frequency: number; // nombre de prises par jour
  duration: number; // durée en jours
  startTime: string; // heure de début de la plage (format HH:mm)
  endTime: string; // heure de fin de la plage (format HH:mm)
  createdAt: Date;
}

export interface ScheduledDose {
  treatmentId: string;
  treatmentName: string;
  dosage: string;
  scheduledTime: Date;
  taken: boolean;
  takenAt?: Date;
}

/**
 * Calcule les horaires de prise pour un traitement donné
 * @param treatment Le traitement à planifier
 * @param date La date pour laquelle planifier les prises
 * @returns Un tableau des prises planifiées
 */
export function calculateDailySchedule(treatment: Treatment, date: Date): ScheduledDose[] {
  const { frequency, startTime, endTime } = treatment;
  const doses: ScheduledDose[] = [];

  // Conversion des heures de début et fin en minutes
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;

  // Gestion du passage de minuit (ex: 22h -> 06h)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Ajouter 24h
  }

  const totalPeriod = endMinutes - startMinutes;
  const interval = totalPeriod / frequency;

  // Création des créneaux
  for (let i = 0; i < frequency; i++) {
    const doseTime = new Date(date);
    const timeInMinutes = startMinutes + (i * interval);

    // Gestion du passage de minuit
    const actualHour = Math.floor(timeInMinutes / 60) % 24;
    const actualMin = Math.floor(timeInMinutes % 60);

    doseTime.setHours(actualHour, actualMin, 0, 0);

    doses.push({
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      dosage: treatment.dosage,
      scheduledTime: doseTime,
      taken: false,
    });
  }

  return doses.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
}

/**
 * Recalcule les horaires après une prise en retard
 * @param treatment Le traitement concerné
 * @param missedDose La dose manquée
 * @param currentTime L'heure actuelle
 * @returns Les nouveaux horaires pour les prises restantes
 */
export function recalculateAfterDelay(
  treatment: Treatment,
  missedDose: ScheduledDose,
  currentTime: Date
): ScheduledDose[] {
  const remainingDoses: ScheduledDose[] = [];
  const today = new Date(currentTime);
  today.setHours(0, 0, 0, 0);

  const todaysSchedule = calculateDailySchedule(treatment, today);
  const missedIndex = todaysSchedule.findIndex(dose =>
    dose.scheduledTime.getTime() === missedDose.scheduledTime.getTime()
  );

  if (missedIndex === -1) return [];

  // Prendre la dose maintenant
  const nowDose = { ...missedDose, scheduledTime: currentTime };
  remainingDoses.push(nowDose);

  // Recalculer les doses restantes
  const remainingCount = todaysSchedule.length - missedIndex - 1;
  if (remainingCount > 0) {
    const [endHour, endMin] = treatment.endTime.split(':').map(Number);
    const endTime = new Date(currentTime);
    endTime.setHours(endHour, endMin, 0, 0);

    // Si l'heure de fin est le lendemain
    if (endTime <= currentTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    const remainingTime = endTime.getTime() - currentTime.getTime();
    const interval = remainingTime / (remainingCount + 1);

    for (let i = 1; i <= remainingCount; i++) {
      const nextDoseTime = new Date(currentTime.getTime() + (interval * i));
      const originalDose = todaysSchedule[missedIndex + i];

      remainingDoses.push({
        ...originalDose,
        scheduledTime: nextDoseTime,
      });
    }
  }

  return remainingDoses;
}

/**
 * Calcule le taux d'adhérence pour un traitement
 * @param doses Toutes les doses planifiées
 * @returns Le pourcentage d'adhérence (0-100)
 */
export function calculateAdherenceRate(doses: ScheduledDose[]): number {
  if (doses.length === 0) return 0;

  const takenCount = doses.filter(dose => dose.taken).length;
  return Math.round((takenCount / doses.length) * 100);
}

/**
 * Génère un planning d'horaires répartis intelligemment sur une plage horaire
 * @param startHour Heure de début (ex: 7 pour 7h00)
 * @param endHour Heure de fin (ex: 23 pour 23h00)
 * @param numberOfDoses Nombre de prises à répartir
 * @param delayInMinutes Délai en minutes si prise en retard (optionnel)
 * @returns Tableau d'heures au format HH:mm
 */
export function generateSchedule(
  startHour: number,
  endHour: number,
  numberOfDoses: number,
  delayInMinutes?: number
): string[] {
  // Validation des paramètres
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
    throw new Error('Les heures doivent être entre 0 et 23');
  }

  if (numberOfDoses <= 0) {
    throw new Error('Le nombre de doses doit être positif');
  }

  // Conversion en minutes
  const startMinutes = startHour * 60;
  let endMinutes = endHour * 60;

  // Gestion du passage de minuit (ex: 22h -> 6h)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Ajouter 24h
  }

  // Calcul de la répartition normale
  if (!delayInMinutes) {
    return generateNormalSchedule(startMinutes, endMinutes, numberOfDoses);
  }

  // Recalcul avec prise en retard
  return generateDelayedSchedule(startMinutes, endMinutes, numberOfDoses, delayInMinutes);
}

/**
 * Génère un planning normal sans retard
 */
function generateNormalSchedule(startMinutes: number, endMinutes: number, numberOfDoses: number): string[] {
  const schedule: string[] = [];

  if (numberOfDoses === 1) {
    // Une seule dose : au milieu de la plage
    const middleTime = startMinutes + (endMinutes - startMinutes) / 2;
    schedule.push(formatTime(middleTime));
  } else {
    // Plusieurs doses : répartition uniforme
    const totalPeriod = endMinutes - startMinutes;
    const interval = totalPeriod / (numberOfDoses - 1);

    for (let i = 0; i < numberOfDoses; i++) {
      const timeInMinutes = startMinutes + (i * interval);
      schedule.push(formatTime(timeInMinutes));
    }
  }

  return schedule;
}

/**
 * Génère un planning avec recalcul après retard
 */
function generateDelayedSchedule(
  startMinutes: number,
  endMinutes: number,
  numberOfDoses: number,
  delayInMinutes: number
): string[] {
  const schedule: string[] = [];
  const MIN_INTERVAL = 120; // 2 heures minimum entre doses

  // Temps actuel avec retard
  const currentTime = startMinutes + delayInMinutes;

  // Première dose : maintenant (en retard)
  schedule.push(formatTime(currentTime));

  if (numberOfDoses === 1) {
    return schedule;
  }

  // Calculer le temps restant pour les autres doses
  const remainingDoses = numberOfDoses - 1;
  let availableTime = endMinutes - currentTime;

  // Vérifier si on peut respecter l'intervalle minimum
  const requiredMinTime = remainingDoses * MIN_INTERVAL;

  if (availableTime < requiredMinTime) {
    // Pas assez de temps, étendre au lendemain si nécessaire
    availableTime = requiredMinTime;
    endMinutes = currentTime + availableTime;
  }

  // Répartir les doses restantes
  const interval = Math.max(MIN_INTERVAL, availableTime / remainingDoses);

  for (let i = 1; i <= remainingDoses; i++) {
    const nextTime = currentTime + (i * interval);
    schedule.push(formatTime(nextTime));
  }

  return schedule;
}

/**
 * Formate les minutes en chaîne HH:mm
 */
function formatTime(minutes: number): string {
  // Gestion du passage de minuit
  const totalMinutes = Math.round(minutes) % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Interface pour MedicationDose (Timeline)
export interface MedicationDose {
  id: string;
  time: string; // Format HH:mm
  medicationName: string;
  dosage?: string;
  status: 'upcoming' | 'taken' | 'missed' | 'delayed';
  takenAt?: string; // Heure réelle de prise si différente
  notes?: string;
  treatmentId?: string;
}

// Interface pour Firebase Treatment
export interface FirebaseTreatment {
  id?: string;
  name: string;
  dosage: string;
  frequency: number;
  duration: number;
  startTime: string;
  endTime: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Génère le planning quotidien complet pour la Timeline à partir des traitements Firebase
 * @param treatments Liste des traitements Firebase
 * @param date Date pour laquelle générer le planning (défaut: aujourd'hui)
 * @returns Planning formaté pour la Timeline (MedicationDose[])
 */
export function generateTodaySchedule(treatments: FirebaseTreatment[], date: Date = new Date()): MedicationDose[] {
  const schedule: MedicationDose[] = [];
  let doseIdCounter = 1;

  treatments.forEach((treatment, index) => {
    // Vérifier si le traitement est actif pour cette date
    const treatmentDate = new Date(date);
    treatmentDate.setHours(0, 0, 0, 0);

    const startDate = new Date(treatment.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(treatment.endDate);
    endDate.setHours(23, 59, 59, 999);

    if (treatmentDate < startDate || treatmentDate > endDate) {
      return; // Traitement pas actif pour cette date
    }

    // Convertir le traitement Firebase en format planner
    const plannerTreatment: Treatment = {
      id: treatment.id || `treatment_${Date.now()}`,
      name: treatment.name,
      dosage: treatment.dosage,
      frequency: treatment.frequency,
      duration: treatment.duration,
      startTime: treatment.startTime,
      endTime: treatment.endTime,
      createdAt: treatment.createdAt || new Date()
    };

    // Calculer les horaires pour ce traitement
    const dailyDoses = calculateDailySchedule(plannerTreatment, date);

    // Convertir en format MedicationDose pour la Timeline
    dailyDoses.forEach(dose => {
      const medicationDose: MedicationDose = {
        id: `dose_${doseIdCounter++}`,
        time: dose.scheduledTime.toTimeString().slice(0, 5), // Format HH:mm
        medicationName: dose.treatmentName,
        dosage: dose.dosage,
        status: 'upcoming',
        treatmentId: dose.treatmentId
      };

      schedule.push(medicationDose);
    });
  });

  // Trier par heure
  return schedule.sort((a, b) => a.time.localeCompare(b.time));
}

/*
=== TESTS DE LA FONCTION generateSchedule ===

// Test 1: Répartition normale - 3 doses de 7h à 23h
const schedule1 = generateSchedule(7, 23, 3);
console.log(schedule1); // Attendu: ["07:00", "15:00", "23:00"]

// Test 2: Une seule dose - milieu de plage
const schedule2 = generateSchedule(8, 20, 1);
console.log(schedule2); // Attendu: ["14:00"]

// Test 3: Passage de minuit - 22h à 6h
const schedule3 = generateSchedule(22, 6, 2);
console.log(schedule3); // Attendu: ["22:00", "06:00"]

// Test 4: Prise en retard de 3h (180 min) - 3 doses de 7h à 23h
const schedule4 = generateSchedule(7, 23, 3, 180);
console.log(schedule4); // Attendu: ["10:00", "16:30", "23:00"] (ou similaire avec min 2h)

// Test 5: Retard important nécessitant extension
const schedule5 = generateSchedule(7, 15, 4, 300); // 5h de retard
console.log(schedule5); // Étendra au-delà de 15h pour respecter 2h minimum

// Test 6: Validation des erreurs
try {
  generateSchedule(25, 23, 3); // Erreur: heure invalide
} catch (e) {
  console.log(e.message); // "Les heures doivent être entre 0 et 23"
}

try {
  generateSchedule(7, 23, 0); // Erreur: nombre de doses invalide
} catch (e) {
  console.log(e.message); // "Le nombre de doses doit être positif"
}

// Test 7: Doses multiples avec intervalle serré
const schedule7 = generateSchedule(8, 12, 5);
console.log(schedule7); // Attendu: ["08:00", "09:00", "10:00", "11:00", "12:00"]

// Test 8: Retard avec recalcul intelligent
const schedule8 = generateSchedule(9, 21, 4, 60); // 1h de retard
console.log(schedule8); // Première dose à 10:00, puis répartition intelligente

=== FIN DES TESTS ===
*/ 