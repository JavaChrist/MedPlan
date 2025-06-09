# 🔥 Configuration Firebase pour MedPlan

## 📋 Prérequis

1. **Compte Google** (gratuit)
2. **Accès à la [Console Firebase](https://console.firebase.google.com/)**

## 🚀 Étape 1 : Créer un projet Firebase

### 1.1 Nouveau projet

1. Aller sur [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Cliquer **"Ajouter un projet"**
3. Nom du projet : **`medplan-[votre-nom]`** (ex: `medplan-john`)
4. **Désactiver Google Analytics** (pas nécessaire pour cette app)
5. Cliquer **"Créer le projet"**

### 1.2 Configuration Web App

1. Dans le projet, cliquer **"Ajouter une application"** → **Web (</>) **
2. Nom de l'app : **`MedPlan Web`**
3. **Cocher "Firebase Hosting"** (pour déploiement futur)
4. Cliquer **"Enregistrer l'application"**

### 1.3 Récupérer les clés de configuration

Firebase va afficher quelque chose comme :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdef...",
  authDomain: "medplan-john.firebaseapp.com",
  projectId: "medplan-john",
  storageBucket: "medplan-john.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456...",
  measurementId: "G-AB12CD34EF",
};
```

**📋 Copier ces valeurs, on en aura besoin !**

## ⚙️ Étape 2 : Configurer les services Firebase

### 2.1 Authentication

1. Dans la console Firebase, aller dans **"Authentication"**
2. Onglet **"Sign-in method"**
3. Activer :
   - ✅ **Anonymous** (connexion anonyme)
   - ✅ **Email/Password** (connexion classique)

### 2.2 Firestore Database

1. Aller dans **"Firestore Database"**
2. Cliquer **"Créer une base de données"**
3. Choisir **"Commencer en mode test"** (règles publiques pour 30 jours)
4. Région : **europe-west1** (Amsterdam - proche de la France)
5. Cliquer **"Terminé"**

### 2.3 Règles de sécurité Firestore

Dans l'onglet **"Règles"**, remplacer par :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Les utilisateurs ne peuvent lire/écrire que leurs propres données
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /treatments/{treatmentId} {
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.userId;
    }

    match /dailyDoses/{doseId} {
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.userId;
    }
  }
}
```

**Publier** les règles.

## 🔧 Étape 3 : Configuration de l'application

### 3.1 Créer le fichier `.env.local`

À la racine du projet MedPlan, créer le fichier `.env.local` :

```bash
# Configuration Firebase - MedPlan
NEXT_PUBLIC_FIREBASE_API_KEY="votre_api_key_ici"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="votre-projet.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="votre-projet"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="votre-projet.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789012"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789012:web:abcdef..."
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-AB12CD34EF"
```

### 3.2 Remplacer les valeurs

Remplacer chaque valeur par celles copiées à l'étape 1.3.

**⚠️ Important :**

- Garder les guillemets `""`
- Le fichier `.env.local` est dans `.gitignore` (sécurisé)

### 3.3 Redémarrer l'application

```bash
npm run dev
```

## ✅ Étape 4 : Vérification

### 4.1 Dans la console navigateur

Vous devriez voir :

```
✅ Firebase : Variables d'environnement détectées
✅ Firebase initialisé avec succès
```

### 4.2 Test de la connexion

1. Aller sur l'application
2. La connexion se fait **automatiquement en mode anonyme**
3. Créer un traitement → Il sera sauvegardé sur Firebase
4. Dans la console Firebase → **"Firestore Database"** → Voir les données

## 🎯 Avantages activés

### ✅ **Synchronisation multi-appareils**

Les traitements sont accessibles sur tous vos appareils

### ✅ **Sauvegarde cloud**

Vos données sont sécurisées même si vous perdez votre appareil

### ✅ **Authentification robuste**

Mode anonyme + possibilité de créer un compte email

### ✅ **Mode de fallback**

L'app continue de fonctionner même sans connexion internet

## 🔮 Prochaines étapes (optionnelles)

### Notifications Push

- Firebase Cloud Messaging (FCM)
- Notifications même quand l'app est fermée

### Hébergement Firebase

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Analytics (optionnel)

- Suivi d'usage anonyme
- Amélioration de l'app basée sur les statistiques

## 🆘 Dépannage

### Erreur "Firebase project not found"

- Vérifier le `PROJECT_ID` dans `.env.local`
- Vérifier que le projet existe sur console.firebase.google.com

### Erreur "API key invalid"

- Vérifier l'`API_KEY` dans `.env.local`
- Régénérer la clé dans Firebase Console → Paramètres → Général

### Mode local persiste

- Vérifier que `.env.local` est à la racine
- Redémarrer `npm run dev`
- Vérifier la console navigateur pour les messages Firebase

## 📞 Support

En cas de problème, l'application **continue de fonctionner en mode local** ! Firebase est un bonus, pas une obligation.
