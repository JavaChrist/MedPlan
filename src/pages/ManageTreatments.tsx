import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Treatment } from '../types';
import { Edit, Trash2, ToggleLeft, ToggleRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ManageTreatments() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/treatments`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Treatment[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name,
          type: data.type,
          dosage: data.dosage,
          unit: data.unit,
          color: data.color || '#1DA1F2',
          icon: data.icon,
          schedules: data.schedules || [],
          startDate: data.startDate?.toDate() || new Date(),
          endDate: data.endDate?.toDate(),
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toDate() || new Date(),
          taken: data.taken || {}
        } as Treatment);
      });
      setTreatments(list);
    });

    return () => unsubscribe();
  }, []);

  const toggleActive = async (treatment: Treatment) => {
    const user = getAuth().currentUser;
    if (!user || !treatment.id) return;
    await updateDoc(doc(db, `users/${user.uid}/treatments/${treatment.id}`), {
      isActive: !treatment.isActive
    });
  };

  const removeTreatment = async (treatment: Treatment) => {
    const user = getAuth().currentUser;
    if (!user || !treatment.id) return;
    await deleteDoc(doc(db, `users/${user.uid}/treatments/${treatment.id}`));
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-gray-800 border border-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Gérer vos traitements</h1>
      </div>

      <div className="space-y-3">
        {treatments.map((t) => (
          <div key={t.id} className="rounded-lg p-4 bg-gray-900 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-sm text-gray-400">{t.dosage} {t.unit}</div>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => toggleActive(t)} className="px-3 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm">
                  {t.isActive ? 'Désactiver' : 'Activer'}
                </button>
                <button onClick={() => navigate('/add-treatment', { state: { editId: t.id } })} className="px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm">
                  Éditer
                </button>
                <button onClick={() => removeTreatment(t)} className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm">
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


