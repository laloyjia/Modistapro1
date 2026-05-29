/* ================================================================
   AUTH.JS — Autenticación con Firebase Auth (email + contraseña)
   ================================================================ */
'use strict';

let _firebaseApp  = null;
let _firebaseAuth = null;
let _firestore    = null;

const Auth = {

  /* Inicializa Firebase con la config del usuario */
  initFirebase() {
    try {
      if (typeof FIREBASE_CONFIG === 'undefined') {
        console.warn('[Auth] firebase-config.js no cargado o sin configurar.');
        return false;
      }
      if (FIREBASE_CONFIG.apiKey.includes('PEGA_AQUI')) {
        console.warn('[Auth] Firebase aún sin configurar. Usando modo offline.');
        return false;
      }
      // Inicializar solo una vez
      if (!firebase.apps.length) {
        _firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
      } else {
        _firebaseApp = firebase.apps[0];
      }
      _firebaseAuth = firebase.auth();
      _firestore    = firebase.firestore();
      // Habilitar persistencia offline de Firestore
      _firestore.enablePersistence({ synchronizeTabs: true })
        .catch(err => {
          if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
            console.warn('[Auth] Persistencia offline no disponible:', err.code);
          }
        });
      DB.setup(null, _firestore);
      console.log('[Auth] Firebase inicializado correctamente.');
      return true;
    } catch(e) {
      console.warn('[Auth] Error al inicializar Firebase:', e.message);
      return false;
    }
  },

  /* ── Estado del usuario ── */
  isLoggedIn() {
    // Firebase mantiene sesión — también usamos sessionStorage como señal rápida
    return !!sessionStorage.getItem('mp_user');
  },

  getCurrentUser() {
    return _firebaseAuth?.currentUser || null;
  },

  /* ── Login con email + contraseña ── */
  async login(email, password) {
    // Modo offline (Firebase no configurado)
    if (!_firebaseAuth) {
      return this._offlineLogin(password);
    }
    try {
      const cred = await _firebaseAuth.signInWithEmailAndPassword(email, password);
      const user = cred.user;
      sessionStorage.setItem('mp_user', JSON.stringify({ uid: user.uid, email: user.email }));
      DB.setup(user.uid, _firestore);
      await DB.loadAll();
      return { ok: true, user };
    } catch(e) {
      return { ok: false, error: this._translateError(e.code) };
    }
  },

  /* ── Registrar nuevo usuario (primera vez) ── */
  async register(email, password, nombreNegocio = '') {
    if (!_firebaseAuth) {
      toast('Firebase no configurado. Configura firebase-config.js', 'er');
      return { ok: false, error: 'Sin configuración Firebase' };
    }
    try {
      const cred = await _firebaseAuth.createUserWithEmailAndPassword(email, password);
      const user = cred.user;
      // Actualizar displayName
      await user.updateProfile({ displayName: nombreNegocio || email });
      // Crear config inicial en Firestore
      await _firestore.collection('users').doc(user.uid)
        .collection('collections').doc('config')
        .set({ _type: 'object', name: nombreNegocio, creado: new Date().toISOString() });
      sessionStorage.setItem('mp_user', JSON.stringify({ uid: user.uid, email: user.email }));
      DB.setup(user.uid, _firestore);
      return { ok: true, user };
    } catch(e) {
      return { ok: false, error: this._translateError(e.code) };
    }
  },

  /* ── Enviar email de recuperación de contraseña ── */
  async forgotPassword(email) {
    if (!_firebaseAuth) return { ok: false, error: 'Firebase no configurado' };
    try {
      await _firebaseAuth.sendPasswordResetEmail(email);
      return { ok: true };
    } catch(e) {
      return { ok: false, error: this._translateError(e.code) };
    }
  },

  /* ── Cambiar contraseña ── */
  async changePassword(newPassword) {
    const user = this.getCurrentUser();
    if (!user) return { ok: false, error: 'No hay sesión activa' };
    try {
      await user.updatePassword(newPassword);
      return { ok: true };
    } catch(e) {
      return { ok: false, error: this._translateError(e.code) };
    }
  },

  /* ── Reautenticar (necesario para cambiar contraseña) ── */
  async reauthenticate(currentPassword) {
    const user = this.getCurrentUser();
    if (!user) return false;
    try {
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
      await user.reauthenticateWithCredential(cred);
      return true;
    } catch(e) { return false; }
  },

  /* ── Logout ── */
  async logout() {
    sessionStorage.removeItem('mp_user');
    if (_firebaseAuth) {
      try { await _firebaseAuth.signOut(); } catch(e) {}
    }
    window.location.href = 'login.html';
  },

  /* ── Redirigir si no hay sesión ── */
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
    }
    // Verificar con Firebase también
    if (_firebaseAuth) {
      _firebaseAuth.onAuthStateChanged(user => {
        if (!user) {
          sessionStorage.removeItem('mp_user');
          window.location.href = 'login.html';
        } else {
          DB.setup(user.uid, _firestore);
        }
      });
    }
  },

  /* ── Escuchar cambios de sesión ── */
  onAuthChanged(callback) {
    if (_firebaseAuth) {
      _firebaseAuth.onAuthStateChanged(callback);
    }
  },

  /* ── Modo offline (fallback sin Firebase) ── */
  _offlineLogin(password) {
    const stored = localStorage.getItem('mp_pass_hash');
    const hash   = this._hash(password);
    if (!stored) {
      // Primera vez: registrar contraseña
      localStorage.setItem('mp_pass_hash', hash);
      sessionStorage.setItem('mp_user', JSON.stringify({ uid: 'local', email: 'local' }));
      return { ok: true, offline: true };
    }
    if (stored === hash) {
      sessionStorage.setItem('mp_user', JSON.stringify({ uid: 'local', email: 'local' }));
      return { ok: true, offline: true };
    }
    return { ok: false, error: 'Contraseña incorrecta' };
  },

  _hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  },

  /* ── Traducir errores Firebase a español ── */
  _translateError(code) {
    const map = {
      'auth/user-not-found':       'No existe una cuenta con ese correo.',
      'auth/wrong-password':       'Contraseña incorrecta.',
      'auth/invalid-email':        'El correo electrónico no es válido.',
      'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
      'auth/weak-password':        'La contraseña debe tener al menos 6 caracteres.',
      'auth/too-many-requests':    'Demasiados intentos. Espera unos minutos.',
      'auth/network-request-failed': 'Sin conexión a internet.',
      'auth/requires-recent-login': 'Por seguridad, vuelve a iniciar sesión antes de cambiar la contraseña.',
    };
    return map[code] || 'Error: ' + code;
  },
};
