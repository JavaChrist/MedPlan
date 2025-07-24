export interface Treatment {
  id: string;
  name: string;
  type: 'comprime' | 'gelule' | 'comprime_sublingual' | 'comprime_croquer' | 'poudre_orale' | 'sirop' | 'suspension_buvable' | 'solution_buvable' | 'granule' | 'creme' | 'pommade' | 'gel' | 'lotion' | 'collyre' | 'gouttes_auriculaires' | 'suppositoire' | 'spray_nasal' | 'inhalateur';
  dosage: number;
  unit: string; // mg, ml, %, etc.
  color: string; // couleur pour l'icône
  icon: string; // nom de l'icône
  schedules: Schedule[];
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
  taken?: { [date: string]: boolean }; // dates où le traitement a été pris (format YYYY-MM-DD)
}

export interface Schedule {
  id: string;
  time: string; // format HH:MM
  frequency: 'daily' | 'specific_days' | 'every_x_days' | 'cycle' | 'as_needed';
  days?: number[]; // 0=dimanche, 1=lundi, etc. pour specific_days
  intervalDays?: number; // pour every_x_days
  cycleConfig?: {
    onDays: number;
    offDays: number;
  };
}

export interface TreatmentTake {
  id: string;
  treatmentId: string;
  scheduleId: string;
  plannedTime: Date;
  takenTime?: Date;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  note?: string;
  createdAt: Date;
}

export interface DayPlan {
  date: Date;
  takes: TreatmentTake[];
} 