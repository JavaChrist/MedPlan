# 🔥 Configuration Firebase pour MedPlan

## ⚠️ Résolution de l'erreur "client is offline"

Cette erreur survient quand Firebase n'est pas correctement configuré ou ne peut pas se connecter.

## 📋 Étapes de configuration

### 1. Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Créer un projet"
3. Nommez votre projet (ex: `medplan-app`)
4. Activez Google Analytics (optionnel)
5. Créez le projet

### 2. Configurer l'application Web

1. Dans votre projet Firebase, cliquez sur "Ajouter une app"
2. Sélectionnez l'icône Web (</>)
3. Nommez votre app (ex: `MedPlan Web`)
4. Cochez "Configurer Firebase Hosting" (optionnel)
5. Cliquez sur "Enregistrer l'app"

### 3. Récupérer les clés de configuration

Firebase va vous donner un code ressemblant à :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbc123...",
  authDomain: "medplan-app.firebaseapp.com",
  projectId: "medplan-app",
  storageBucket: "medplan-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456",
  measurementId: "G-ABCDEF1234",
};
```

### 4. Créer le fichier .env.local

Créez un fichier `.env.local` dans la racine de votre projet :

```bash
# Configuration Firebase pour MedPlan
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAbc123...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=medplan-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=medplan-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=medplan-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABCDEF1234
```

### 5. Activer les services Firebase

#### Authentication

1. Dans Firebase Console, allez dans "Authentication"
2. Cliquez sur "Commencer"
3. Onglet "Sign-in method"
4. Activez "E-mail/Mot de passe"
5. Activez "Connexion anonyme"

#### Firestore Database

1. Allez dans "Firestore Database"
2. Cliquez sur "Créer une base de données"
3. Sélectionnez "Commencer en mode test" (pour débuter)
4. Choisissez un emplacement proche de vos utilisateurs

### 6. Configurer les règles de sécurité

Dans Firestore > Règles, remplacez par :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour les utilisateurs connectés
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Règles pour les traitements
    match /treatments/{treatmentId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Règles pour les doses quotidiennes
    match /dailyDoses/{doseId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## 🔄 Redémarrer l'application

Après avoir créé le fichier `.env.local` :

```bash
npm run dev
# ou
yarn dev
```

## 🌐 Mode hors ligne

L'application fonctionne maintenant en mode dégradé si Firebase n'est pas disponible :

- ✅ **Sauvegarde locale** des préférences
- ✅ **Fonctionnement offline** partiel
- ✅ **Synchronisation** à la reconnexion
- ✅ **Messages d'erreur** clairs

## 🔧 Dépannage

### Erreur "client is offline"

- Vérifiez votre connexion Internet
- Vérifiez que le fichier `.env.local` existe et contient les bonnes clés
- Redémarrez le serveur de développement

### Erreur "permission denied"

- Vérifiez les règles de sécurité Firestore
- Vérifiez que l'utilisateur est bien connecté

### Variables d'environnement non trouvées

- Vérifiez que toutes les variables commencent par `NEXT_PUBLIC_`
- Redémarrez le serveur après avoir modifié `.env.local`

## 📱 Déploiement

Pour Vercel, ajoutez les variables d'environnement dans :

1. Vercel Dashboard > Votre projet > Settings > Environment Variables
2. Ajoutez chaque variable une par une
3. Redéployez le projet

## 🆘 Support

Si le problème persiste :

1. Vérifiez la console du navigateur pour plus de détails
2. Vérifiez les logs Firebase Console
3. Testez avec les données de démonstration en mode local
