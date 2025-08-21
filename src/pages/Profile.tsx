import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import TabBar from '../components/layout/TabBar';

export default function Profile() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 px-2 sm:px-3 pb-20 pt-6 mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profil utilisateur</h1>
        <p className="text-gray-600">Gérez vos informations personnelles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Informations personnelles</h3>
            <form className="space-y-6">
              <Input
                label="Nom complet"
                value={currentUser?.displayName || ''}
                placeholder="Votre nom complet"
                readOnly
              />
              <Input
                label="Email"
                type="email"
                value={currentUser?.email || ''}
                placeholder="votre@email.com"
                readOnly
              />
              <Input
                label="Téléphone"
                type="tel"
                placeholder="+33 1 23 45 67 89"
              />
              <Input
                label="Entreprise"
                placeholder="Nom de votre entreprise"
              />
              <div className="flex space-x-4">
                <Button>Sauvegarder</Button>
                <Button variant="outline">Annuler</Button>
              </div>
            </form>
          </Card>
        </div>

        <div>
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du compte</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Statut du compte</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Actif
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Membre depuis</p>
                <p className="text-sm text-gray-900">
                  {currentUser?.metadata?.creationTime ?
                    new Date(currentUser.metadata.creationTime).toLocaleDateString('fr-FR') :
                    'Non disponible'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Dernière connexion</p>
                <p className="text-sm text-gray-900">
                  {currentUser?.metadata?.lastSignInTime ?
                    new Date(currentUser.metadata.lastSignInTime).toLocaleDateString('fr-FR') :
                    'Non disponible'
                  }
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={async () => { await logout(); navigate('/login'); }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-md transition-colors"
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <TabBar active="account" />
    </div>
  );
} 