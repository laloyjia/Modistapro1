/* ================================================================
   FIREBASE CONFIGURATION - ModistaPro
   ================================================================
   INSTRUCCIONES:
   1. Ve a https://console.firebase.google.com
   2. Crea un proyecto nuevo (ej: "modistapro-tunegocio")
   3. Haz clic en el ícono </> (Web) para agregar tu app web
   4. Copia los valores de firebaseConfig y pégalos abajo
   5. En el panel de Firebase:
      - Authentication → Sign-in method → Email/Password → Activar
      - Firestore Database → Crear base de datos → Modo producción
   ================================================================ */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDh-oJrECMzGOS_NrKRQwRVHS8ZpfShpIU",
  authDomain:        "modista-1.firebaseapp.com",
  projectId:         "modista-1",
  storageBucket:     "modista-1.firebasestorage.app",
  messagingSenderId: "188600467040",
  appId:             "1:188600467040:web:316b7fb2e407ead8da0d05",
  measurementId:     "G-6P8BZZCZ8V"
};

/* ================================================================
   REGLAS DE FIRESTORE (copia esto en Firebase Console → Firestore → Reglas)
   ================================================================
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ================================================================ */
