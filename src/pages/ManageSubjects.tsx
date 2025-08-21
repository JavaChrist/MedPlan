import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { SubjectProfile } from '../types';
import { listSubjects, addSubject, updateSubject, deleteSubject } from '../services/subjectsService';
import { Plus, Trash2, Edit2, UserPlus, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState<SubjectProfile[]>([]);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState<'self' | 'child' | 'partner' | 'pet' | 'other'>('child');
  const [color, setColor] = useState('#60a5fa');
  const navigate = useNavigate();

  const load = async () => {
    const user = getAuth().currentUser;
    if (!user) return;
    const list = await listSubjects(user.uid);
    setSubjects(list);
    try { console.log('[ManageSubjects] uid=', user.uid, 'subjects=', list.length); } catch { }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const user = getAuth().currentUser;
    if (!user || !name.trim()) return;
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
    <div className="min-h-screen bg-black text-white px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-gray-800 border border-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Profils</span>
        </h1>
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
          <button onClick={create} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md flex items-center justify-center space-x-2">
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
    </div>
  );
}


