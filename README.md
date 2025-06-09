# 💊 MedPlan - Gestion Intelligente des Traitements

## 📖 Description

**MedPlan** est une Progressive Web App (PWA) innovante conçue pour faciliter la gestion quotidienne des traitements médicamenteux. L'application utilise un algorithme intelligent pour planifier automatiquement les prises de médicaments dans la journée, tout en s'adaptant aux imprévus et retards.

### 🎯 Problème résolu

- **Oublis de médicaments** : Rappels intelligents et timeline visuelle
- **Mauvaise répartition des prises** : Calcul automatique des horaires optimaux
- **Gestion des retards** : Recalcul intelligent des prises restantes
- **Suivi d'adhérence** : Statistiques et historique détaillé

## ✨ Fonctionnalités principales

### 🧠 Intelligence Artificielle Intégrée

- **Planification automatique** : Répartition optimale des prises dans une plage horaire
- **Recalcul adaptatif** : Ajustement intelligent en cas de prise en retard
- **Optimisation personnalisée** : Adaptation aux habitudes de l'utilisateur

### 📱 Interface Utilisateur

- **Design moderne** : Interface intuitive et responsive
- **Timeline interactive** : Visualisation claire des prises de la journée
- **Notifications push** : Rappels discrets et personnalisables
- **Mode sombre/clair** : Confort visuel adaptatif

### 📊 Suivi et Statistiques

- **Taux d'adhérence** : Calcul précis du respect du traitement
- **Historique détaillé** : Consultation des prises passées
- **Graphiques évolutifs** : Visualisation des tendances
- **Export de données** : Partage avec les professionnels de santé

## 🛠 Technologies utilisées

### Frontend

- **Next.js 14** : Framework React avec App Router
- **TypeScript** : Typage statique pour plus de fiabilité
- **TailwindCSS** : Framework CSS moderne et responsive
- **PWA** : Installation native sur tous les appareils

### Backend & Cloud

- **Firebase Auth** : Authentification sécurisée
- **Firestore** : Base de données NoSQL en temps réel
- **Firebase Cloud Functions** : Logique serverless
- **Firebase Hosting** : Déploiement et CDN global

### Fonctionnalités PWA

- **Service Worker** : Fonctionnement hors-ligne
- **Cache intelligent** : Synchronisation automatique
- **Notifications push** : Rappels même application fermée
- **Installation native** : Comme une app mobile/desktop

## 🏗 Architecture

### Structure des dossiers

```
MedPlan/
├── src/
│   ├── app/                    # App Router Next.js
│   │   ├── dashboard/          # Tableau de bord principal
│   │   ├── add-treatment/      # Formulaire d'ajout
│   │   ├── edit-treatment/     # Modification de traitement
│   │   ├── history/            # Historique et statistiques
│   │   ├── settings/           # Paramètres utilisateur
│   │   └── profile/            # Profil et préférences
│   ├── components/             # Composants réutilisables
│   │   ├── TreatmentCard.tsx   # Carte de médicament
│   │   ├── Timeline.tsx        # Timeline des prises
│   │   ├── NotificationBar.tsx # Barre de notifications
│   │   └── StatsChart.tsx      # Graphiques statistiques
│   └── lib/                    # Utilitaires et logique
│       ├── firebase.ts         # Configuration Firebase
│       ├── planner.ts          # Algorithme de planification
│       ├── notifications.ts    # Gestion notifications
│       └── analytics.ts        # Calculs statistiques
├── public/
│   ├── manifest.json           # Manifest PWA
│   ├── sw.js                   # Service Worker
│   └── icons/                  # Icônes de l'application
└── docs/                       # Documentation
```

### Algorithme de Planification

L'IA de MedPlan calcule automatiquement :

1. **Répartition optimale** : Distribution uniforme dans la plage horaire
2. **Évitement des conflits** : Espacement minimum entre médicaments
3. **Adaptation aux habitudes** : Apprentissage des préférences utilisateur
4. **Recalcul dynamique** : Ajustement en temps réel des prises restantes

## 🚀 Installation et Démarrage

### Prérequis

- Node.js 18+ et npm
- Compte Firebase (gratuit)
- Navigateur moderne supportant PWA

### Installation

```bash
# Cloner le projet
git clone https://github.com/votre-username/medplan.git
cd medplan

# Installer les dépendances
npm install

# Configuration Firebase
cp .env.example .env.local
# Modifier .env.local avec vos clés Firebase

# Lancer en développement
npm run dev
```

### Configuration Firebase

1. Créer un projet sur [Firebase Console](https://console.firebase.google.com)
2. Activer Authentication (Email/Password)
3. Activer Firestore Database
4. Copier les clés dans `.env.local`

### Déploiement

```bash
# Build de production
npm run build

# Déploiement sur Vercel (recommandé)
npx vercel --prod

# Ou déploiement sur Firebase Hosting
npm run deploy
```

## 📱 Utilisation

### Premier lancement

1. **Inscription/Connexion** : Créer un compte sécurisé
2. **Profil médical** : Renseigner informations de base
3. **Premier traitement** : Ajouter un médicament avec posologie

### Ajout d'un traitement

1. **Informations médicament** : Nom, dosage, forme
2. **Posologie** : Fréquence et durée du traitement
3. **Plage horaire** : Heures de début et fin souhaitées
4. **Planification automatique** : L'IA calcule les horaires optimaux

### Suivi quotidien

- **Dashboard** : Vue d'ensemble des prises du jour
- **Notifications** : Rappels aux heures programmées
- **Validation** : Confirmer la prise ou reporter
- **Ajustement** : Recalcul automatique si retard

## 🔒 Sécurité et Confidentialité

- **Chiffrement** : Toutes les données sont chiffrées
- **RGPD** : Conformité complète aux réglementations
- **Anonymisation** : Pas de données personnelles de santé
- **Contrôle utilisateur** : Export et suppression des données

## 🤝 Contribution

Les contributions sont les bienvenues !

### Comment contribuer

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Développement local

```bash
# Tests
npm run test

# Linting
npm run lint

# Type checking
npm run type-check
```

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## ⚠️ Avertissement Médical

**MedPlan est un outil d'aide à la gestion des médicaments et ne remplace en aucun cas l'avis d'un professionnel de santé.**

- Toujours consulter un médecin ou pharmacien
- Ne pas modifier les posologies sans avis médical
- En cas de doute, contacter un professionnel de santé

## 📞 Support et Contact

- **Issues GitHub** : Pour les bugs et suggestions
- **Email** : medplan.support@example.com
- **Documentation** : [docs.medplan.app](https://docs.medplan.app)

---

Développé avec ❤️ pour améliorer l'observance thérapeutique
