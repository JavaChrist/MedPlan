import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { ArrowLeft, ArrowRight, Plus, Minus, Pill, Circle, Droplets, Syringe, Tablets, Beaker, Zap, Eye, Headphones, CheckCircle, Package, Star, Square, Wind, Calendar, RotateCw, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { useTreatments } from '../hooks/useTreatments';
import { addTreatment, updateTreatment } from '../services/treatmentService';
import { SubjectProfile, Treatment } from '../types';
import { listSubjects } from '../services/subjectsService';
import Toast from '../components/ui/Toast';

interface FormData {
  name: string;
  type: 'comprime' | 'gelule' | 'comprime_sublingual' | 'comprime_croquer' | 'poudre_orale' | 'sirop' | 'suspension_buvable' | 'solution_buvable' | 'granule' | 'creme' | 'pommade' | 'gel' | 'lotion' | 'collyre' | 'gouttes_auriculaires' | 'suppositoire' | 'spray_nasal' | 'inhalateur';
  visualForm: string;
  dosage: number;
  unit: string;
  frequency: 'daily' | 'specific_days' | 'every_x_days' | 'cycle' | 'as_needed';
  schedules: string[];
  startDate: string;
  endDate?: string;
  cycleConfig?: { onDays: number; offDays: number };
  selectedDays?: number[];
  intervalDays?: number;
}

export default function AddTreatment() {
  const navigate = useNavigate();
  const location = useLocation();
  const editId = (location.state as any)?.editId as string | undefined;
  const { treatments, setTreatments } = useTreatments();
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditing, setIsEditing] = useState<boolean>(!!editId);
  const [subjects, setSubjects] = useState<SubjectProfile[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(undefined);

  // États pour les toasts
  const [toast, setToast] = useState({
    isOpen: false,
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: ''
  });
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'comprime',
    visualForm: 'comprime-rond',
    dosage: 0,
    unit: 'mg',
    frequency: 'daily',
    schedules: ['08:00'],
    startDate: new Date().toISOString().split('T')[0],
    selectedDays: [1, 2, 3, 4, 5], // Lundi à Vendredi par défaut
    intervalDays: 2,
    cycleConfig: { onDays: 21, offDays: 7 }
  });

  // Préremplir en mode édition
  useEffect(() => {
    // Charger les profils pour associer un traitement
    (async () => {
      const user = getAuth().currentUser;
      if (!user) return;
      const list = await listSubjects(user.uid);
      setSubjects(list);
    })();

    const loadForEdit = async () => {
      if (!editId) return;
      setIsEditing(true);

      // Chercher d'abord dans le hook
      const found = treatments.find(t => t.id === editId);
      let treatmentToEdit = found as (Treatment | undefined);

      // Si non trouvé, récupérer depuis Firestore
      if (!treatmentToEdit) {
        try {
          const user = getAuth().currentUser;
          if (!user) return;
          const snap = await getDoc(doc(db, `users/${user.uid}/treatments/${editId}`));
          if (snap.exists()) {
            const data: any = snap.data();
            treatmentToEdit = {
              id: snap.id,
              name: data.name,
              type: data.type,
              dosage: data.dosage,
              unit: data.unit,
              color: data.color || '#1DA1F2',
              icon: data.icon,
              schedules: data.schedules || [],
              startDate: data.startDate?.toDate?.() || new Date(),
              endDate: data.endDate?.toDate?.(),
              isActive: data.isActive !== false,
              createdAt: data.createdAt?.toDate?.() || new Date(),
              taken: data.taken || {}
            } as Treatment;
          }
        } catch (e) {
          console.error('Erreur chargement traitement pour édition:', e);
        }
      }

      if (treatmentToEdit) {
        // Mapper Treatment -> FormData
        const firstSchedule = treatmentToEdit.schedules?.[0];
        const freq = (firstSchedule?.frequency as any) || 'daily';
        const times = (treatmentToEdit.schedules || []).map(s => s.time);
        const selectedDays = (firstSchedule?.days as any) || [];
        const intervalDays = firstSchedule?.intervalDays;
        const cycle = (firstSchedule as any)?.cycleConfig || {};

        setFormData({
          name: treatmentToEdit.name || '',
          type: (treatmentToEdit.type as any) || 'comprime',
          visualForm: (treatmentToEdit.icon as any) || 'comprime-rond',
          dosage: Number(treatmentToEdit.dosage) || 0,
          unit: treatmentToEdit.unit || 'mg',
          frequency: freq,
          schedules: times.length > 0 ? times : ['08:00'],
          startDate: new Date(treatmentToEdit.startDate).toISOString().split('T')[0],
          endDate: treatmentToEdit.endDate ? new Date(treatmentToEdit.endDate).toISOString().split('T')[0] : undefined,
          selectedDays: Array.isArray(selectedDays) ? selectedDays : [],
          intervalDays: intervalDays,
          cycleConfig: cycle?.onDays || cycle?.offDays ? { onDays: cycle.onDays, offDays: cycle.offDays } : { onDays: 21, offDays: 7 }
        });
        setSelectedSubjectId(treatmentToEdit.subjectId);
      }
    };

    loadForEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, treatments]);

  const oralTreatmentTypes = [
    { id: 'comprime', label: 'Comprimé', icon: Circle },
    { id: 'gelule', label: 'Gélule', icon: Pill },
    { id: 'comprime_sublingual', label: 'Comprimé sublingual', icon: Circle },
    { id: 'comprime_croquer', label: 'Comprimé à croquer', icon: Circle },
    { id: 'poudre_orale', label: 'Poudre orale', icon: Beaker },
    { id: 'sirop', label: 'Sirop', icon: Droplets },
    { id: 'suspension_buvable', label: 'Suspension buvable', icon: Droplets },
    { id: 'solution_buvable', label: 'Solution buvable', icon: Droplets },
    { id: 'granule', label: 'Granulé', icon: Circle }
  ];

  const otherTreatmentTypes = [
    { id: 'creme', label: 'Crème', icon: Circle },
    { id: 'pommade', label: 'Pommade', icon: Circle },
    { id: 'gel', label: 'Gel', icon: Droplets },
    { id: 'lotion', label: 'Lotion', icon: Droplets },
    { id: 'collyre', label: 'Collyre', icon: Eye },
    { id: 'gouttes_auriculaires', label: 'Gouttes auriculaires', icon: Headphones },
    { id: 'suppositoire', label: 'Suppositoire', icon: Pill },
    { id: 'spray_nasal', label: 'Spray nasal', icon: Zap },
    { id: 'inhalateur', label: 'Inhalateur', icon: Syringe }
  ];

  const oralVisualForms = [
    { id: 'comprime-rond', icon: Circle, label: 'Comprimé rond', description: 'Rond blanc avec trait au milieu' },
    { id: 'comprime-ovale', icon: Pill, label: 'Comprimé ovale', description: 'Ovale blanc avec bordure' },
    { id: 'comprime-effervescent', icon: Star, label: 'Comprimé effervescent', description: 'Rond avec bulles' },
    { id: 'gelule', icon: Pill, label: 'Gélule', description: 'Capsule bicolore' },
    { id: 'sirop', icon: Droplets, label: 'Sirop / Solution', description: 'Flacon avec bouchon' },
    { id: 'granule', icon: Package, label: 'Granulé', description: 'Sachet avec grains' }
  ];

  const injectableVisualForms = [
    { id: 'stylo-injecteur', icon: Beaker, label: 'Stylo injecteur', description: 'Forme cylindrique type EpiPen' },
    { id: 'seringue', icon: Syringe, label: 'Seringue', description: 'Classique avec aiguille' }
  ];

  const cutaneousVisualForms = [
    { id: 'tube-creme', icon: Tablets, label: 'Crème / Gel / Pommade', description: 'Tube souple avec bouchon' },
    { id: 'patch', icon: Square, label: 'Patch transdermique', description: 'Carré beige arrondi' },
    { id: 'gouttes', icon: Droplets, label: 'Collyre / Gouttes', description: 'Flacon avec pipette' },
    { id: 'spray-nasal', icon: Zap, label: 'Spray nasal', description: 'Petit spray vertical' },
    { id: 'suppositoire', icon: Pill, label: 'Suppositoire', description: 'Forme ovale fuselée' }
  ];

  const otherVisualForms = [
    { id: 'inhalateur', icon: Wind, label: 'Inhalateur', description: 'Boîtier courbé type Ventoline' },
    { id: 'pastille', icon: Circle, label: 'Pastille à sucer', description: 'Rond translucide' }
  ];

  const allVisualForms = [
    ...oralVisualForms,
    ...injectableVisualForms,
    ...cutaneousVisualForms,
    ...otherVisualForms
  ];

  const units = ['mg', 'mcg', 'g', 'ml', '%', 'UI', 'dose'];
  const frequencyOptions = [
    { id: 'daily', label: 'Tous les jours', subtitle: 'À la même heure chaque jour', icon: Calendar },
    { id: 'specific_days', label: 'Certains jours de la semaine', subtitle: 'Ex : Lundi, Mercredi, Vendredi', icon: Calendar },
    { id: 'every_x_days', label: 'Tous les X jours', subtitle: 'Ex : Tous les 2 jours', icon: Circle },
    { id: 'cycle', label: 'Programme cyclique', subtitle: 'Ex : 21 jours on, 7 jours off', icon: RotateCw },
    { id: 'as_needed', label: 'Au besoin', subtitle: 'Sans rappel programmé', icon: Clock }
  ];

  const weekDays = [
    { id: 0, label: 'D', fullName: 'Dimanche' },
    { id: 1, label: 'L', fullName: 'Lundi' },
    { id: 2, label: 'M', fullName: 'Mardi' },
    { id: 3, label: 'M', fullName: 'Mercredi' },
    { id: 4, label: 'J', fullName: 'Jeudi' },
    { id: 5, label: 'V', fullName: 'Vendredi' },
    { id: 6, label: 'S', fullName: 'Samedi' }
  ];

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Fonction helper pour afficher les toasts
  const showToast = (type: 'success' | 'error' | 'warning', title: string, message?: string) => {
    setToast({
      isOpen: true,
      type,
      title,
      message: message || ''
    });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, isOpen: false }));
  };

  const addSchedule = () => {
    const newTime = '08:00';
    updateFormData({ schedules: [...formData.schedules, newTime] });
  };

  const removeSchedule = (index: number) => {
    const newSchedules = formData.schedules.filter((_, i) => i !== index);
    updateFormData({ schedules: newSchedules });
  };

  const updateSchedule = (index: number, time: string) => {
    const newSchedules = [...formData.schedules];
    newSchedules[index] = time;
    updateFormData({ schedules: newSchedules });
  };

  const toggleDay = (dayId: number) => {
    const selectedDays = formData.selectedDays || [];
    const newSelectedDays = selectedDays.includes(dayId)
      ? selectedDays.filter(id => id !== dayId)
      : [...selectedDays, dayId];
    updateFormData({ selectedDays: newSelectedDays });
  };

  const incrementInterval = () => {
    updateFormData({ intervalDays: (formData.intervalDays || 2) + 1 });
  };

  const decrementInterval = () => {
    const current = formData.intervalDays || 2;
    if (current > 1) {
      updateFormData({ intervalDays: current - 1 });
    }
  };

  const updateCycleConfig = (field: 'onDays' | 'offDays', value: number) => {
    const cycleConfig = formData.cycleConfig || { onDays: 21, offDays: 7 };
    updateFormData({
      cycleConfig: { ...cycleConfig, [field]: Math.max(1, value) }
    });
  };

  const saveTreatment = async () => {
    try {
      // Vérifier que l'utilisateur est connecté
      const user = getAuth().currentUser;
      if (!user) {
        showToast('error', 'Erreur de connexion', 'Vous devez être connecté pour ajouter un traitement');
        return;
      }

      const schedules = formData.schedules.map((time, index) => ({
        id: `s${index}`,
        time,
        frequency: formData.frequency,
        days: formData.selectedDays,
        intervalDays: formData.intervalDays,
        cycleConfig: formData.cycleConfig
      }));

      if (isEditing && editId) {
        await updateTreatment(user.uid, editId, {
          name: formData.name,
          type: formData.type as any,
          dosage: formData.dosage,
          unit: formData.unit,
          icon: formData.visualForm,
          schedules,
          startDate: new Date(formData.startDate),
          endDate: formData.endDate ? new Date(formData.endDate) : undefined,
          subjectId: selectedSubjectId || undefined,
          subjectName: selectedSubjectId ? subjects.find(s=>s.id===selectedSubjectId)?.name : undefined
        });

        showToast('success', 'Modifications enregistrées', 'Le traitement a été mis à jour');
      } else {
        // Préparer les données du traitement (création)
        const newTreatment: Treatment = {
          id: '',
          name: formData.name,
          type: formData.type,
          dosage: formData.dosage,
          unit: formData.unit,
          color: '#1DA1F2',
          icon: formData.visualForm,
          schedules,
          startDate: new Date(formData.startDate),
          endDate: formData.endDate ? new Date(formData.endDate) : undefined,
          isActive: true,
          createdAt: new Date(),
          subjectId: selectedSubjectId || undefined,
          subjectName: selectedSubjectId ? subjects.find(s=>s.id===selectedSubjectId)?.name : undefined
        };

        await addTreatment(user.uid, newTreatment);
        showToast('success', 'Traitement enregistré !', 'Votre traitement a été ajouté avec succès');
      }

      // Délai pour laisser voir le toast avant la navigation
      setTimeout(() => {
        navigate(isEditing ? '/manage-treatments' : '/dashboard');
      }, 1200);

    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      const code = error?.code || 'unknown';
      const message = error?.message || '';
      const details = message?.toString().slice(0, 300);
      showToast('error', `Erreur Firebase: ${code}`, details || "Impossible d'enregistrer le traitement");
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            {/* Nom du traitement */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Nom du traitement</h2>
              <input
                type="text"
                placeholder="Ex : Paracétamol codéine"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                className="w-full p-4 rounded-lg text-white bg-gray-800 border border-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Profil associé (personne/animal) */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Associer à un profil</h2>
              {subjects.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun profil. Vous pourrez en créer un dans "Profils".</p>
              ) : (
                <select
                  value={selectedSubjectId || ''}
                  onChange={(e)=>setSelectedSubjectId(e.target.value || undefined)}
                  className="w-full p-4 rounded-lg text-white bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Moi</option>
                  {subjects.map(s=> (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Type de traitement */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Choisir le type de traitement</h2>

              {/* Formes orales */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Formes orales (les plus courantes)</h3>
                <div className="space-y-3">
                  {oralTreatmentTypes.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => updateFormData({ type: type.id as any })}
                        className={`w-full p-4 rounded-lg flex items-center space-x-3 transition-all ${formData.type === type.id
                          ? 'bg-blue-600 border-blue-500'
                          : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                          } border`}
                      >
                        <IconComponent className="w-6 h-6 text-white" />
                        <span className="text-white font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Autres formes */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Autres formes</h3>
                <div className="space-y-3">
                  {otherTreatmentTypes.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => updateFormData({ type: type.id as any })}
                        className={`w-full p-4 rounded-lg flex items-center space-x-3 transition-all ${formData.type === type.id
                          ? 'bg-blue-600 border-blue-500'
                          : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                          } border`}
                      >
                        <IconComponent className="w-6 h-6 text-white" />
                        <span className="text-white font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Choisir la forme</h2>
              <p className="text-gray-400 mb-6">Sélectionnez l'apparence qui ressemble le plus</p>

              {/* Formes orales */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Formes orales</h3>
                <div className="grid grid-cols-3 gap-4">
                  {oralVisualForms.map((form) => {
                    const IconComponent = form.icon;
                    const isSelected = formData.visualForm === form.id;
                    return (
                      <button
                        key={form.id}
                        onClick={() => updateFormData({ visualForm: form.id })}
                        className="relative flex flex-col items-center space-y-2"
                      >
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isSelected
                            ? 'ring-4 ring-blue-300 shadow-lg transform scale-110'
                            : 'hover:ring-2 hover:ring-blue-400'
                            }`}
                          style={{ backgroundColor: '#4AA8F0' }}
                        >
                          <IconComponent className="w-8 h-8 text-white" />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 text-center max-w-[80px]">{form.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Formes injectables */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Formes injectables</h3>
                <div className="grid grid-cols-3 gap-4">
                  {injectableVisualForms.map((form) => {
                    const IconComponent = form.icon;
                    const isSelected = formData.visualForm === form.id;
                    return (
                      <button
                        key={form.id}
                        onClick={() => updateFormData({ visualForm: form.id })}
                        className="relative flex flex-col items-center space-y-2"
                      >
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isSelected
                            ? 'ring-4 ring-blue-300 shadow-lg transform scale-110'
                            : 'hover:ring-2 hover:ring-blue-400'
                            }`}
                          style={{ backgroundColor: '#4AA8F0' }}
                        >
                          <IconComponent className="w-8 h-8 text-white" />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 text-center max-w-[80px]">{form.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Formes cutanées et locales */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Formes cutanées et locales</h3>
                <div className="grid grid-cols-3 gap-4">
                  {cutaneousVisualForms.map((form) => {
                    const IconComponent = form.icon;
                    const isSelected = formData.visualForm === form.id;
                    return (
                      <button
                        key={form.id}
                        onClick={() => updateFormData({ visualForm: form.id })}
                        className="relative flex flex-col items-center space-y-2"
                      >
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isSelected
                            ? 'ring-4 ring-blue-300 shadow-lg transform scale-110'
                            : 'hover:ring-2 hover:ring-blue-400'
                            }`}
                          style={{ backgroundColor: '#4AA8F0' }}
                        >
                          <IconComponent className="w-8 h-8 text-white" />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 text-center max-w-[80px]">{form.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Autres */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Autres</h3>
                <div className="grid grid-cols-3 gap-4">
                  {otherVisualForms.map((form) => {
                    const IconComponent = form.icon;
                    const isSelected = formData.visualForm === form.id;
                    return (
                      <button
                        key={form.id}
                        onClick={() => updateFormData({ visualForm: form.id })}
                        className="relative flex flex-col items-center space-y-2"
                      >
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isSelected
                            ? 'ring-4 ring-blue-300 shadow-lg transform scale-110'
                            : 'hover:ring-2 hover:ring-blue-400'
                            }`}
                          style={{ backgroundColor: '#4AA8F0' }}
                        >
                          <IconComponent className="w-8 h-8 text-white" />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 text-center max-w-[80px]">{form.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
            {/* Titre principal */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-3">Ajouter la puissance du traitement</h2>
              <p className="text-gray-400 text-base">Indiquez la dose et l'unité (ex : 500 mg)</p>
            </div>

            {/* Bloc dosage et unité */}
            <div className="w-full max-w-sm space-y-6">
              {/* Champ dosage centré avec grande police */}
              <div className="flex items-center justify-center">
                <input
                  type="number"
                  placeholder="0"
                  value={formData.dosage || ''}
                  onChange={(e) => updateFormData({ dosage: Number(e.target.value) })}
                  className="w-48 h-20 text-center text-4xl font-bold text-white bg-gray-800 border border-gray-700 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ fontSize: '40px', MozAppearance: 'textfield' }}
                />
              </div>

              {/* Sélecteur d'unité */}
              <div className="flex items-center justify-center">
                <select
                  value={formData.unit}
                  onChange={(e) => updateFormData({ unit: e.target.value })}
                  className="px-6 py-3 text-lg font-medium text-white bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-w-[120px] text-center"
                >
                  {units.map(unit => (
                    <option key={unit} value={unit} className="bg-gray-800 text-white">
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aperçu de la dose */}
              {formData.dosage > 0 && (
                <div className="text-center mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-sm mb-1">Dose par prise</p>
                  <p className="text-white text-lg font-semibold">
                    {formData.dosage} {formData.unit}
                  </p>
                </div>
              )}
            </div>

            {/* Note d'aide */}
            <div className="text-center max-w-xs">
              <p className="text-gray-500 text-sm">
                Cette information figure généralement sur l'emballage ou l'ordonnance
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            {/* Titre principal */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-3">Quand devez-vous prendre ce traitement ?</h2>
              <p className="text-gray-400 text-base">Choisissez la fréquence et ajoutez les horaires</p>
            </div>

            {/* Choix de la fréquence */}
            <div>
              <div className="space-y-3 mb-8">
                {frequencyOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => updateFormData({ frequency: option.id as any })}
                      className={`w-full p-4 rounded-xl text-left transition-all ${formData.frequency === option.id
                        ? 'bg-blue-600 border-blue-500 shadow-lg'
                        : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                        } border`}
                    >
                      <div className="flex items-center space-x-3">
                        <IconComponent className="w-5 h-5 text-white" />
                        <div>
                          <div className="text-white font-medium">{option.label}</div>
                          <div className="text-gray-400 text-sm">{option.subtitle}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bloc dynamique selon le choix */}
              {formData.frequency === 'specific_days' && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4">Jours de la semaine</h3>
                  <div className="flex justify-center space-x-2">
                    {weekDays.map((day) => (
                      <button
                        key={day.id}
                        onClick={() => toggleDay(day.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${(formData.selectedDays || []).includes(day.id)
                          ? 'bg-blue-500 text-white transform scale-110'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.frequency === 'every_x_days' && (
                <div className="mb-8">
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-white">Prendre ce traitement tous les</span>
                    <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
                      <button
                        onClick={decrementInterval}
                        className="p-1 hover:bg-gray-700 rounded"
                      >
                        <ChevronDown className="w-4 h-4 text-white" />
                      </button>
                      <span className="text-white font-bold text-lg min-w-[30px] text-center">
                        {formData.intervalDays || 2}
                      </span>
                      <button
                        onClick={incrementInterval}
                        className="p-1 hover:bg-gray-700 rounded"
                      >
                        <ChevronUp className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <span className="text-white">jours</span>
                  </div>
                </div>
              )}

              {formData.frequency === 'cycle' && (
                <div className="mb-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <label className="block text-white mb-2">Période active</label>
                      <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-3 justify-center">
                        <button
                          onClick={() => updateCycleConfig('onDays', (formData.cycleConfig?.onDays || 21) - 1)}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <ChevronDown className="w-4 h-4 text-white" />
                        </button>
                        <span className="text-white font-bold text-lg min-w-[40px] text-center">
                          {formData.cycleConfig?.onDays || 21}
                        </span>
                        <button
                          onClick={() => updateCycleConfig('onDays', (formData.cycleConfig?.onDays || 21) + 1)}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <ChevronUp className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <span className="text-gray-400 text-sm">jours</span>
                    </div>
                    <div className="text-center">
                      <label className="block text-white mb-2">Pause</label>
                      <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-3 justify-center">
                        <button
                          onClick={() => updateCycleConfig('offDays', (formData.cycleConfig?.offDays || 7) - 1)}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <ChevronDown className="w-4 h-4 text-white" />
                        </button>
                        <span className="text-white font-bold text-lg min-w-[40px] text-center">
                          {formData.cycleConfig?.offDays || 7}
                        </span>
                        <button
                          onClick={() => updateCycleConfig('offDays', (formData.cycleConfig?.offDays || 7) + 1)}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <ChevronUp className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <span className="text-gray-400 text-sm">jours</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Horaires (sauf pour "Au besoin") */}
              {formData.frequency !== 'as_needed' && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-4">Horaires</h3>
                  <div className="space-y-3">
                    {formData.schedules.map((time, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => updateSchedule(index, e.target.value)}
                          className="flex-1 p-3 rounded-lg text-white bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        {formData.schedules.length > 1 && (
                          <button
                            onClick={() => removeSchedule(index)}
                            className="w-10 h-10 rounded-lg bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addSchedule}
                      className="w-full p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span className="text-white">Ajouter un horaire</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Message pour "Au besoin" */}
              {formData.frequency === 'as_needed' && (
                <div className="mb-8 text-center p-6 bg-gray-800/50 rounded-lg">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400">
                    Vous pourrez l'enregistrer manuellement quand vous le prendrez
                  </p>
                </div>
              )}
            </div>

            {/* Durée du traitement */}
            <div className="bg-gray-800/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Durée du traitement</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-white mb-2">Date de début</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateFormData({ startDate: e.target.value })}
                    className="w-full p-3 rounded-lg text-white bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <input
                      type="checkbox"
                      id="hasEndDate"
                      checked={!!formData.endDate}
                      onChange={(e) => updateFormData({ endDate: e.target.checked ? new Date().toISOString().split('T')[0] : undefined })}
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="hasEndDate" className="text-white">Date de fin</label>
                  </div>
                  {formData.endDate && (
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => updateFormData({ endDate: e.target.value })}
                      className="w-full p-3 rounded-lg text-white bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-8">
            {/* Titre */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-3">Récapitulatif</h2>
              <p className="text-gray-400 text-base">Vérifiez les informations avant d'enregistrer</p>
            </div>

            {/* Carte récapitulative */}
            <div className="bg-gray-800 rounded-xl p-6 space-y-6" style={{ backgroundColor: '#1E1E1E' }}>
              {/* En-tête avec icône et nom */}
              <div className="flex items-center space-x-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#4AA8F0' }}
                >
                  {(() => {
                    const selectedForm = allVisualForms.find(f => f.id === formData.visualForm);
                    if (selectedForm) {
                      const IconComponent = selectedForm.icon;
                      return <IconComponent className="w-8 h-8 text-white" />;
                    }
                    return <Circle className="w-8 h-8 text-white" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{formData.name}</h3>
                  <p className="text-gray-400">
                    {(() => {
                      const type = [...oralTreatmentTypes, ...otherTreatmentTypes].find(t => t.id === formData.type);
                      return type?.label || formData.type;
                    })()}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-600"></div>

              {/* Détails organisés */}
              <div className="grid grid-cols-1 gap-4">

                {/* Forme visuelle */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Forme :</span>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#4AA8F0' }}
                    >
                      {(() => {
                        const selectedForm = allVisualForms.find(f => f.id === formData.visualForm);
                        if (selectedForm) {
                          const IconComponent = selectedForm.icon;
                          return <IconComponent className="w-3 h-3 text-white" />;
                        }
                        return <Circle className="w-3 h-3 text-white" />;
                      })()}
                    </div>
                    <span className="text-white">
                      {allVisualForms.find(f => f.id === formData.visualForm)?.label || 'Non spécifié'}
                    </span>
                  </div>
                </div>

                {/* Dosage */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Dosage :</span>
                  <span className="text-white font-semibold">{formData.dosage} {formData.unit}</span>
                </div>

                {/* Fréquence */}
                <div className="flex justify-between items-start">
                  <span className="text-gray-400">Fréquence :</span>
                  <div className="text-right">
                    <p className="text-white font-semibold">
                      {frequencyOptions.find(f => f.id === formData.frequency)?.label}
                    </p>
                    {/* Détails de fréquence */}
                    {formData.frequency === 'specific_days' && formData.selectedDays && formData.selectedDays.length > 0 && (
                      <p className="text-gray-400 text-sm mt-1">
                        {formData.selectedDays.map(dayId => weekDays.find(d => d.id === dayId)?.fullName).join(', ')}
                      </p>
                    )}
                    {formData.frequency === 'every_x_days' && (
                      <p className="text-gray-400 text-sm mt-1">
                        Tous les {formData.intervalDays} jours
                      </p>
                    )}
                    {formData.frequency === 'cycle' && formData.cycleConfig && (
                      <p className="text-gray-400 text-sm mt-1">
                        {formData.cycleConfig.onDays} jours on, {formData.cycleConfig.offDays} jours off
                      </p>
                    )}
                  </div>
                </div>

                {/* Horaires */}
                {formData.frequency !== 'as_needed' && formData.schedules.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-400">Horaires :</span>
                    <div className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {formData.schedules.map((time, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: '#4AA8F0', color: 'white' }}
                          >
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-600"></div>

                {/* Durée */}
                <div className="flex justify-between items-start">
                  <span className="text-gray-400">Durée :</span>
                  <div className="text-right">
                    <p className="text-white">
                      Début : {new Date(formData.startDate).toLocaleDateString('fr-FR')}
                    </p>
                    {formData.endDate && (
                      <p className="text-white">
                        Fin : {new Date(formData.endDate).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {!formData.endDate && (
                      <p className="text-gray-400 text-sm">Pas de date de fin</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Note de confirmation */}
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mt-6">
                <p className="text-blue-200 text-sm text-center">
                  ✓ Le traitement sera ajouté à votre liste et les rappels seront programmés
                </p>
              </div>
            </div>

            {/* Bouton d'enregistrement */}
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-4">
                Vous pourrez modifier ces informations plus tard
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ backgroundColor: '#000' }} className="min-h-screen w-full">
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 pt-8 pb-4" style={{ backgroundColor: '#000' }}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => currentStep === 1 ? navigate('/dashboard') : prevStep()}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">
            Étape {currentStep} sur 5
          </h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 pb-6">
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-32">
        {renderStep()}
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6" style={{ backgroundColor: '#000' }}>
        <div className="flex space-x-3">
          {currentStep === 2 && (
            <button
              onClick={nextStep}
              className="px-6 py-3 rounded-lg text-blue-500 font-medium"
            >
              Ignorer
            </button>
          )}

          <button
            onClick={currentStep === 5 ? saveTreatment : nextStep}
            disabled={
              (currentStep === 1 && !formData.name.trim()) ||
              (currentStep === 3 && (!formData.dosage || formData.dosage <= 0))
            }
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium py-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>{currentStep === 5 ? 'Enregistrer le traitement' : 'Suivant'}</span>
            {currentStep < 5 && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Toast pour les notifications */}
      <Toast
        isOpen={toast.isOpen}
        onClose={closeToast}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        autoClose={true}
        duration={3000}
      />
    </div>
  );
} 