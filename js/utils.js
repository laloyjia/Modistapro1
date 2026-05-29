// ============================================================
// utils.js — Funciones utilitarias compartidas
// ============================================================

const fmt$ = (n) => '$' + (parseInt(n) || 0).toLocaleString('es-CL');

const fmtD = (d) => {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};

const today = () => new Date().toISOString().split('T')[0];

const daysLeft = (d) => {
  if (!d) return null;
  const dd = new Date(d + 'T00:00:00'), now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((dd - now) / 86400000);
};

const estadoBadge = (e) => {
  const m = {
    pendiente: ['b-pen', 'Pendiente'],
    en_proceso: ['b-pro', 'En proceso'],
    listo: ['b-rdy', 'Listo ✓'],
    entregado: ['b-del', 'Entregado'],
    cancelado: ['b-can', 'Cancelado']
  };
  const [cls, label] = m[e] || ['b-pen', e];
  return `<span class="badge ${cls}">${label}</span>`;
};

const toast = (msg, type = 'ok') => {
  const d = document.createElement('div');
  const bg = type === 'ok' ? '#059669' : type === 'er' ? '#dc2626' : '#0284c7';
  d.style.cssText = `position:fixed;bottom:22px;right:22px;z-index:9999;padding:12px 18px;border-radius:9px;background:${bg};color:#fff;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.2);font-size:13px;max-width:320px;transition:opacity .3s`;
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 300); }, 3000);
};

const openMo = (id) => document.getElementById(id)?.classList.add('open');
const closeMo = (id) => document.getElementById(id)?.classList.remove('open');

const clearForm = (ids) => ids.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.value = '';
});

// Cerrar modales al hacer clic en el overlay
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mo').forEach(el =>
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); })
  );
});
