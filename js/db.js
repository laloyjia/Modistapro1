/* ================================================================
   DB.JS — Capa de datos con caché local + sincronización Firestore
   ================================================================
   Estrategia:
   • Todos los datos se cargan en memoria (MP_CACHE) al hacer login.
   • Los módulos (clientes.js, pedidos.js, etc.) usan la misma API
     síncrona DB.get / DB.set que antes — sin cambios en ellos.
   • Cada DB.set() dispara un guardado asíncrono a Firestore en background.
   • Si Firestore no está configurado, funciona 100% offline con localStorage.
   ================================================================ */
'use strict';

const MP_CACHE = {};     // caché en memoria
let  _uid      = null;   // Firebase UID del usuario logueado
let  _db       = null;   // instancia Firestore
let  _syncQueue = {};    // llaves pendientes de sincronizar

/* ──── API pública (síncrona, compatible con versión anterior) ──── */
const DB = {

  /* Inicializa con UID y referencia Firestore */
  setup(uid, firestoreInstance) {
    _uid = uid;
    _db  = firestoreInstance;
  },

  /* Carga todos los datos del usuario desde Firestore al caché */
  async loadAll() {
    if (!_db || !_uid) return;
    try {
      const colRef = _db.collection('users').doc(_uid).collection('collections');
      const snap   = await colRef.get();
      snap.forEach(doc => {
        const data = doc.data();
        if (data._type === 'array') {
          MP_CACHE[doc.id] = data.items || [];
        } else {
          const { _type, ...rest } = data;
          MP_CACHE[doc.id] = rest;
        }
      });
      console.log('[DB] Datos cargados desde Firestore:', Object.keys(MP_CACHE));
    } catch(e) {
      console.warn('[DB] No se pudo cargar desde Firestore, usando caché local:', e.message);
      // Fallback: cargar desde localStorage
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('mp_')) {
          try { MP_CACHE[key.slice(3)] = JSON.parse(localStorage.getItem(key)); }
          catch(e2) {}
        }
      }
    }
  },

  /* ── Obtener array ── */
  get(k) {
    if (k in MP_CACHE) return Array.isArray(MP_CACHE[k]) ? [...MP_CACHE[k]] : MP_CACHE[k];
    // Fallback localStorage
    try { return JSON.parse(localStorage.getItem('mp_' + k) || '[]'); }
    catch(e) { return []; }
  },

  /* ── Guardar array ── */
  set(k, v) {
    MP_CACHE[k] = v;
    localStorage.setItem('mp_' + k, JSON.stringify(v)); // backup local
    this._scheduleSync(k, { _type: 'array', items: v });
  },

  /* ── Obtener objeto ── */
  getObj(k, def = {}) {
    if (k in MP_CACHE) return { ...def, ...(MP_CACHE[k] || {}) };
    try { return { ...def, ...JSON.parse(localStorage.getItem('mp_' + k) || '{}') }; }
    catch(e) { return def; }
  },

  /* ── Guardar objeto ── */
  setObj(k, v) {
    MP_CACHE[k] = v;
    localStorage.setItem('mp_' + k, JSON.stringify(v));
    this._scheduleSync(k, { _type: 'object', ...v });
  },

  /* ── Generar ID incremental ── */
  nextId(k) {
    const counterKey = 'nid_' + k;
    const current    = parseInt(localStorage.getItem('mp_' + counterKey) || '0');
    const next       = current + 1;
    localStorage.setItem('mp_' + counterKey, next);
    // Sincronizar contador también
    if (_db && _uid) {
      _db.collection('users').doc(_uid)
         .collection('counters').doc(k)
         .set({ value: next })
         .catch(() => {});
    }
    return next;
  },

  /* ── Sincronización diferida (debounce 1.5s por clave) ── */
  _scheduleSync(k, data) {
    if (!_db || !_uid) return;
    if (_syncQueue[k]) clearTimeout(_syncQueue[k]);
    _syncQueue[k] = setTimeout(() => {
      _db.collection('users').doc(_uid)
         .collection('collections').doc(k)
         .set(data)
         .then(() => {
           delete _syncQueue[k];
           console.log('[DB] Sincronizado:', k);
         })
         .catch(err => console.warn('[DB] Error sincronizando', k, err.message));
    }, 1500);
  },

  /* ── Fuerza guardado inmediato de todo el caché ── */
  async flushAll() {
    if (!_db || !_uid) return;
    const batch = _db.batch();
    const colRef = _db.collection('users').doc(_uid).collection('collections');
    Object.keys(_syncQueue).forEach(k => clearTimeout(_syncQueue[k]));
    _syncQueue = {};
    for (const [k, v] of Object.entries(MP_CACHE)) {
      const data = Array.isArray(v)
        ? { _type: 'array', items: v }
        : { _type: 'object', ...v };
      batch.set(colRef.doc(k), data);
    }
    await batch.commit();
    console.log('[DB] Flush completo');
  },

  /* ── Exportar todo como JSON (backup) ── */
  exportBackup() {
    const data = {};
    for (const [k, v] of Object.entries(MP_CACHE)) {
      data[k] = v;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `ModistaPro_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /* ── Importar backup JSON ── */
  async importBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          for (const [k, v] of Object.entries(data)) {
            MP_CACHE[k] = v;
            localStorage.setItem('mp_' + k, JSON.stringify(v));
          }
          await this.flushAll();
          resolve(Object.keys(data).length);
        } catch(err) { reject(err); }
      };
      reader.readAsText(file);
    });
  },
};
