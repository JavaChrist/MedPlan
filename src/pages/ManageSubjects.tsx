import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { SubjectProfile } from '../types';
import { listSubjects, addSubject, updateSubject, deleteSubject } from '../services/subjectsService';
import { Plus, Trash2, Edit2, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TabBar from '../components/layout/TabBar';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState<SubjectProfile[]>([]);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState<'self' | 'child' | 'partner' | 'pet' | 'other'>('child');
  const [color, setColor] = useState('#60a5fa');
  const navigate = useNavigate();
  const [plan, setPlan] = useState<{ id: 'free' | 'family' | 'premium', maxSubjects: number, label: string } | null>(null);

  const load = async () => {
    const user = getAuth().currentUser;
    if (!user) return;
    const list = await listSubjects(user.uid);
    setSubjects(list);
    try { console.log('[ManageSubjects] uid=', user.uid, 'subjects=', list.length); } catch { }

    // Charger le plan utilisateur (sinon défaut FREE)
    try {
      const uref = doc(db, 'users', user.uid);
      const usnap = await getDoc(uref);
      const data: any = usnap.exists() ? usnap.data() : {};
      const pid: 'free' | 'family' | 'premium' = (data?.plan?.id || 'free');
      const max = pid === 'premium' ? Number.POSITIVE_INFINITY : pid === 'family' ? 5 : 2;
      const label = pid === 'premium' ? 'MedPlan Premium' : pid === 'family' ? 'MedPlan Family' : 'MedPlan Basic';
      setPlan({ id: pid, maxSubjects: max, label });
    } catch (e) {
      setPlan({ id: 'free', maxSubjects: 2, label: 'MedPlan Basic' });
    }
  };

  useEffect(() => { load(); }, []);

  // Si redirection avec paymentId, valider côté client et mettre à jour le plan
  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const paymentId = params.get('paymentId');
      if (!paymentId) return;
      try {
        const res = await fetch(`/api/billing/mollie/status?id=${encodeURIComponent(paymentId)}`);
        const data = await res.json();
        if (data?.paid && data?.uid && data?.plan) {
          const pid: 'family' | 'premium' = data.plan;
          const planDoc = pid === 'premium'
            ? { id: 'premium', maxSubjects: Number.POSITIVE_INFINITY, name: 'MedPlan Premium' }
            : { id: 'family', maxSubjects: 5, name: 'MedPlan Family' };
          await setDoc(doc(db, 'users', data.uid), { plan: planDoc, lastPaymentId: data.id, updatedAt: new Date() }, { merge: true });
          await load();
        }
      } catch { }
    })();
  }, []);

  const create = async () => {
    const user = getAuth().currentUser;
    if (!user || !name.trim()) return;
    if (plan && subjects.length >= plan.maxSubjects && isFinite(plan.maxSubjects)) {
      alert('Limite de profils atteinte pour votre offre. Passez au plan Famille ou Premium.');
      return;
    }
    await addSubject(user.uid, { name: name.trim(), relation, color });
    setName('');
    await load();
  };

  const remove = async (id: string) => {
    const user = getAuth().currentUser;
    if (!user) return;
    await deleteSubject(user.uid, id);
    await load();
  };

  return (
    <div className="min-h-screen bg-black text-white px-2 sm:px-3 pb-20 pt-6 mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <h1 className="text-xl font-bold flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Profils</span>
        </h1>
      </div>

      {/* Summary / Paywall */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Offre</p>
            <p className="text-white font-medium">{plan?.label || 'MedPlan Basic'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Profils</p>
            <p className="text-white font-medium">{subjects.length}{plan && isFinite(plan.maxSubjects) ? ` / ${plan.maxSubjects}` : ' / ∞'}</p>
          </div>
        </div>
        {plan && isFinite(plan.maxSubjects) && subjects.length >= plan.maxSubjects && (
          <div className="mt-3 p-3 rounded-md border border-blue-500/30 bg-blue-500/10">
            <p className="text-sm text-blue-200">Limite atteinte. Passez à une offre supérieure:</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => {
                const uid = getAuth().currentUser?.uid;
                window.location.href = `/api/billing/mollie/checkout?plan=family&method=ideal&issuer=ideal_TESTNL99&uid=${encodeURIComponent(uid || '')}`;
              }}
                className="w-full px-3 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm">Famille • 2,99 €/mois</button>
              <button onClick={() => {
                const uid = getAuth().currentUser?.uid;
                window.location.href = `/api/billing/mollie/checkout?plan=premium&method=ideal&issuer=ideal_TESTNL99&uid=${encodeURIComponent(uid || '')}`;
              }}
                className="w-full px-3 py-2 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-sm">Premium • 4,99 €/mois</button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-3">Ajouter un profil</h2>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom / Nom de l’animal" className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700" />
          <div className="flex items-center space-x-2">
            <select value={relation} onChange={(e) => setRelation(e.target.value as any)} className="flex-1 px-3 py-2 rounded-md bg-gray-800 border border-gray-700">
              <option value="self">Moi</option>
              <option value="child">Enfant</option>
              <option value="partner">Conjoint</option>
              <option value="pet">Animal</option>
              <option value="other">Autre</option>
            </select>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-10 p-0 border-0 bg-transparent" />
          </div>
          <button onClick={create} disabled={Boolean(plan && isFinite(plan.maxSubjects) && subjects.length >= plan.maxSubjects)} className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-400 text-white py-2 rounded-md flex items-center justify-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {subjects.map(s => (
          <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: s.color || '#60a5fa' }}></div>
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-gray-400">{s.relation || 'profil'}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => remove(s.id)} className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <TabBar active="subjects" />
    </div>
  );
}


