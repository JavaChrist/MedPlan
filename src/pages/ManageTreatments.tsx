import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Treatment } from '../types';
import { Edit, Trash2, X, AlertTriangle } from 'lucide-react';
import TabBar from '../components/layout/TabBar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function coerceDate(value: any, fallback: Date = new Date()): Date {
	try {
		if (value?.toDate) return value.toDate();
		if (value instanceof Date) return value;
		if (typeof value === 'string' || typeof value === 'number') {
			const d = new Date(value);
			if (!isNaN(d.getTime())) return d;
		}
	} catch { }
	return fallback;
}

const FREQ_LABELS: Record<string, string> = {
	daily: 'Tous les jours',
	specific_days: 'Certains jours',
	every_x_days: 'Tous les X jours',
	cycle: 'Cycle',
	as_needed: 'Au besoin',
};

export default function ManageTreatments() {
	const [treatments, setTreatments] = useState<Treatment[]>([]);
	const [confirmDelete, setConfirmDelete] = useState<Treatment | null>(null);
	const navigate = useNavigate();
	const { currentUser } = useAuth();

	useEffect(() => {
		let unsubscribe: (() => void) | undefined;

		const attach = (uid: string) => {
			if (unsubscribe) unsubscribe();
			const q = query(
				collection(db, `users/${uid}/treatments`),
				orderBy('createdAt', 'desc')
			);
			unsubscribe = onSnapshot(q, (snapshot) => {
				const list: Treatment[] = [];
				snapshot.forEach((d) => {
					const data = d.data();
					list.push({
						id: d.id,
						name: data.name,
						type: data.type,
						dosage: data.dosage,
						quantity: data.quantity ?? 1,
						unit: data.unit,
						color: data.color || '#1DA1F2',
						icon: data.icon,
						schedules: data.schedules || [],
						startDate: coerceDate(data.startDate),
						endDate: data.endDate ? coerceDate(data.endDate) : undefined,
						isActive: data.isActive !== false,
						createdAt: coerceDate(data.createdAt),
						taken: data.taken || {},
						skipped: data.skipped || {},
						subjectId: data.subjectId,
						subjectName: data.subjectName
					} as Treatment);
				});
				setTreatments(list);
			});
		};

		if (currentUser?.uid) {
			attach(currentUser.uid);
		}

		return () => { if (unsubscribe) unsubscribe(); };
	}, [currentUser?.uid]);

	const toggleActive = async (treatment: Treatment) => {
		const user = getAuth().currentUser;
		if (!user || !treatment.id) return;
		await updateDoc(doc(db, `users/${user.uid}/treatments/${treatment.id}`), {
			isActive: !treatment.isActive
		});
	};

	const confirmAndDelete = (treatment: Treatment) => {
		setConfirmDelete(treatment);
	};

	const executeDelete = async () => {
		if (!confirmDelete) return;
		const user = getAuth().currentUser;
		if (!user || !confirmDelete.id) return;
		await deleteDoc(doc(db, `users/${user.uid}/treatments/${confirmDelete.id}`));
		setConfirmDelete(null);
	};

	const formatFrequency = (t: Treatment): string => {
		const s = t.schedules?.[0];
		if (!s) return '';
		const base = FREQ_LABELS[s.frequency] || s.frequency;
		if (s.frequency === 'specific_days' && s.days?.length) {
			const names = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
			return s.days.map(d => names[d]).join(', ');
		}
		if (s.frequency === 'every_x_days' && s.intervalDays) {
			return `Tous les ${s.intervalDays} jours`;
		}
		if (s.frequency === 'cycle' && s.cycleConfig) {
			return `${s.cycleConfig.onDays}j on / ${s.cycleConfig.offDays}j off`;
		}
		return base;
	};

	const formatScheduleTimes = (t: Treatment): string => {
		if (!t.schedules?.length) return '';
		if (t.schedules[0]?.frequency === 'as_needed') return '';
		return t.schedules.map(s => s.time).join(' · ');
	};

	return (
		<div className="min-h-screen bg-black text-white px-3 pb-24 pt-6">
			{/* Modal de confirmation de suppression */}
			{confirmDelete && (
				<div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
					<div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
						<div className="flex items-center space-x-3 mb-4">
							<div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
								<AlertTriangle className="w-5 h-5 text-red-400" />
							</div>
							<div>
								<h2 className="text-white font-bold">Supprimer ce traitement ?</h2>
								<p className="text-gray-400 text-sm">Cette action est irréversible.</p>
							</div>
						</div>
						<div className="bg-gray-800 rounded-lg p-3 mb-5">
							<p className="text-white font-medium">{confirmDelete.name}</p>
							<p className="text-gray-400 text-sm">{confirmDelete.dosage} {confirmDelete.unit}</p>
						</div>
						<div className="flex space-x-3">
							<button
								onClick={() => setConfirmDelete(null)}
								className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
							>
								Annuler
							</button>
							<button
								onClick={executeDelete}
								className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
							>
								Supprimer
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="flex items-center space-x-3 mb-6">
				<h1 className="text-xl font-bold">Gérer vos traitements</h1>
			</div>

			{treatments.length === 0 && (
				<div className="text-center py-16 text-gray-500">
					<p>Aucun traitement enregistré.</p>
				</div>
			)}

			<div className="space-y-3">
				{treatments.map((t) => (
					<div
						key={t.id}
						className={`rounded-xl p-4 border transition-opacity ${
							t.isActive
								? 'bg-gray-900 border-gray-800'
								: 'bg-gray-900/50 border-gray-800/50 opacity-60'
						}`}
					>
						<div className="flex items-start justify-between gap-3">
							{/* Infos principales */}
							<div className="flex-1 min-w-0">
								<div className="flex items-center space-x-2 mb-1">
									<span className="font-medium text-white truncate">{t.name}</span>
									{!t.isActive && (
										<span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400 flex-shrink-0">
											Inactif
										</span>
									)}
								</div>
								<p className="text-sm text-gray-400">
									{t.dosage} {t.unit}
									{t.quantity && t.quantity !== 1 ? ` · ${t.quantity === 0.25 ? '¼' : t.quantity === 0.5 ? '½' : t.quantity === 0.75 ? '¾' : t.quantity} cp.` : ''}
								</p>
								{formatFrequency(t) && (
									<p className="text-xs text-gray-500 mt-0.5">{formatFrequency(t)}</p>
								)}
								{formatScheduleTimes(t) && (
									<p className="text-xs text-blue-400 mt-0.5">{formatScheduleTimes(t)}</p>
								)}
								{t.subjectName && (
									<p className="text-xs text-purple-400 mt-0.5">Pour : {t.subjectName}</p>
								)}
								{t.endDate && (
									<p className="text-xs text-gray-500 mt-0.5">
										Fin : {new Date(t.endDate).toLocaleDateString('fr-FR')}
									</p>
								)}
							</div>

						{/* Actions */}
						<div className="flex flex-col space-y-2 flex-shrink-0">
							<button
								onClick={() => navigate('/add-treatment', { state: { editId: t.id } })}
								className="px-3 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium flex items-center space-x-1 min-h-[44px] justify-center"
							>
								<Edit className="w-3.5 h-3.5" />
								<span>Éditer</span>
							</button>
							<button
								onClick={() => toggleActive(t)}
								className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${
									t.isActive
										? 'bg-gray-700 hover:bg-gray-600 text-white'
										: 'bg-blue-600 hover:bg-blue-700 text-white'
								}`}
							>
								{t.isActive ? 'Désactiver' : 'Activer'}
							</button>
							<button
								onClick={() => confirmAndDelete(t)}
								className="px-3 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-medium flex items-center space-x-1 transition-colors min-h-[44px] justify-center"
							>
								<Trash2 className="w-3.5 h-3.5" />
								<span>Suppr.</span>
							</button>
						</div>
						</div>
					</div>
				))}
			</div>
			<TabBar active="browse" />
		</div>
	);
}
