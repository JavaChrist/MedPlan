import { useNavigate } from 'react-router-dom';
import { Heart, Users, Grid3X3, User } from 'lucide-react';

type ActiveTab = 'dashboard' | 'subjects' | 'browse' | 'account';

export default function TabBar({ active }: { active: ActiveTab }) {
  const navigate = useNavigate();

  const isActive = (key: ActiveTab) => active === key;

  const activeColor = '#1DA1F2';
  const inactiveColor = '#B3B3B3';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-3 backdrop-blur-lg border-t"
      style={{ backgroundColor: 'rgba(30, 30, 30, 0.9)', borderColor: '#333' }}
    >
      <button onClick={() => navigate('/dashboard')} className="flex flex-col items-center space-y-1">
        <Heart className="w-5 h-5" style={{ color: isActive('dashboard') ? activeColor : inactiveColor }} />
        <span className="text-xs" style={{ color: isActive('dashboard') ? activeColor : inactiveColor }}>Accueil</span>
      </button>
      <button onClick={() => navigate('/subjects')} className="flex flex-col items-center space-y-1">
        <Users className="w-5 h-5" style={{ color: isActive('subjects') ? activeColor : inactiveColor }} />
        <span className="text-xs" style={{ color: isActive('subjects') ? activeColor : inactiveColor }}>Profil</span>
      </button>
      <button onClick={() => navigate('/manage-treatments')} className="flex flex-col items-center space-y-1">
        <Grid3X3 className="w-5 h-5" style={{ color: isActive('browse') ? activeColor : inactiveColor }} />
        <span className="text-xs" style={{ color: isActive('browse') ? activeColor : inactiveColor }}>Traitements</span>
      </button>
      <button onClick={() => navigate('/profile')} className="flex flex-col items-center space-y-1">
        <User className="w-5 h-5" style={{ color: isActive('account') ? activeColor : inactiveColor }} />
        <span className="text-xs" style={{ color: isActive('account') ? activeColor : inactiveColor }}>Compte</span>
      </button>
    </div>
  );
}


