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
  apiKey:            "PEGA_AQUI_TU_apiKey",
  authDomain:        "PEGA_AQUI_TU_authDomain",
  projectId:         "PEGA_AQUI_TU_projectId",
  storageBucket:     "PEGA_AQUI_TU_storageBucket",
  messagingSenderId: "PEGA_AQUI_TU_messagingSenderId",
  appId:             "PEGA_AQUI_TU_appId"
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
