/* ===== COMPRAS MODULE ===== */
'use strict';

const Compras = {
  all() { return DB.get('compras'); },
  save(list) { DB.set('compras', list); },

  init() {
    this.render();
    document.getElementById('searchCompras')?.addEventListener('input', e => this.render(e.target.value));
  },

  render(q = '') {
    const list = this.all()
      .filter(c => !q || [c.proveedor, c.descripcion, c.categoria].some(v => v?.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    const tbody = document.getElementById('comprasTbody');
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🛒</div><h3>Sin compras</h3><p>Registra tus compras de materiales e insumos.</p></div></td></tr>`;
    } else {
      tbody.innerHTML = list.map(c => `<tr>
        <td>${c.fecha ? fmtD(c.fecha) : '—'}</td>
        <td><strong>${c.proveedor || '—'}</strong></td>
        <td>${c.descripcion || '—'}</td>
        <td>${c.categoria || '—'}</td>
        <td>${c.cantidad || '—'} ${c.unidad || ''}</td>
        <td>${fmt$(c.total || 0)}</td>
        <td class="td-actions">
          <button class="btn bs bsm" onclick="Compras.editar(${c.id})">✏️</button>
          <button class="btn bd bsm" onclick="Compras.eliminar(${c.id})">🗑️</button>
        </td>
      </tr>`).join('');
    }

    // Stats
    const all = this.all();
    const mesActual = new Date().toISOString().slice(0, 7);
    const totalMes = all.filter(c => c.fecha?.startsWith(mesActual)).reduce((s, c) => s + (c.total || 0), 0);
    const totalAnio = all.reduce((s, c) => s + (c.total || 0), 0);
    document.getElementById('statComprasMes')  && (document.getElementById('statComprasMes').textContent  = fmt$(totalMes));
    document.getElementById('statComprasTotal') && (document.getElementById('statComprasTotal').textContent = fmt$(totalAnio));
    document.getElementById('statComprasN')    && (document.getElementById('statComprasN').textContent    = all.length);
  },

  abrirModal(id = null) {
    const c = id ? this.all().find(x => x.id === id) : null;
    document.getElementById('compraModalTitle').textContent = c ? 'Editar Compra' : 'Nueva Compra';
    document.getElementById('compraId').value = c?.id || '';
    document.getElementById('compraFecha').value = c?.fecha || today();
    document.getElementById('compraProveedor').value = c?.proveedor || '';
    document.getElementById('compraDescripcion').value = c?.descripcion || '';
    document.getElementById('compraCategoria').value = c?.categoria || '';
    document.getElementById('compraCantidad').value = c?.cantidad || '';
    document.getElementById('compraUnidad').value = c?.unidad || '';
    document.getElementById('compraTotal').value = c?.total || '';
    document.getElementById('compraNotas').value = c?.notas || '';
    openMo('compraModal');
  },

  editar(id) { this.abrirModal(id); },

  guardar() {
    const id = parseInt(document.getElementById('compraId').value) || null;
    const proveedor = document.getElementById('compraProveedor').value.trim();
    if (!proveedor) { toast('El proveedor es obligatorio', 'er'); return; }

    const obj = {
      id: id || DB.nextId('compras'),
      fecha: document.getElementById('compraFecha').value,
      proveedor,
      descripcion: document.getElementById('compraDescripcion').value.trim(),
      categoria: document.getElementById('compraCategoria').value.trim(),
      cantidad: parseFloat(document.getElementById('compraCantidad').value) || null,
      unidad: document.getElementById('compraUnidad').value.trim(),
      total: parseFloat(document.getElementById('compraTotal').value) || 0,
      notas: document.getElementById('compraNotas').value.trim(),
    };

    const list = this.all();
    if (id) {
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) list[idx] = { ...list[idx], ...obj };
    } else {
      list.push(obj);
    }
    this.save(list);
    closeMo('compraModal');
    this.render();
    toast(id ? 'Compra actualizada' : 'Compra registrada', 'ok');
  },

  eliminar(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    this.save(this.all().filter(c => c.id !== id));
    this.render();
    toast('Registro eliminado', 'ok');
  },

  /* ---- Excel Import / Export ---- */
  descargarPlantilla() {
    const ws = XLSX.utils.json_to_sheet([{
      Fecha: new Date().toISOString().slice(0,10),
      Proveedor: 'Textiles Norte',
      Descripcion: 'Tela algodón blanca',
      Categoria: 'Telas',
      Cantidad: 10,
      Unidad: 'metros',
      Total: 15000,
      Notas: ''
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compras');
    XLSX.writeFile(wb, 'Plantilla_Compras.xlsx');
  },

  importarExcel(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const norm = s => (s||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'_');
        const map = { fecha:'fecha', date:'fecha', proveedor:'proveedor', provider:'proveedor',
          descripcion:'descripcion', description:'descripcion', categoria:'categoria',
          cantidad:'cantidad', qty:'cantidad', unidad:'unidad', unit:'unidad',
          total:'total', monto:'total', notas:'notas', notes:'notas' };
        const list = this.all();
        let added = 0;
        rows.forEach(row => {
          const obj = { id: DB.nextId('compras') };
          Object.keys(row).forEach(k => { const t = map[norm(k)]; if (t) obj[t] = String(row[k]).trim(); });
          if (!obj.proveedor) return;
          if (obj.total) obj.total = parseFloat(obj.total) || 0;
          if (obj.cantidad) obj.cantidad = parseFloat(obj.cantidad) || null;
          if (!obj.fecha) obj.fecha = new Date().toISOString().slice(0,10);
          list.push(obj); added++;
        });
        this.save(list);
        this.render();
        toast(`${added} compras importadas`, 'ok');
      } catch(err) { toast('Error al leer el archivo: ' + err.message, 'er'); }
    };
    reader.readAsArrayBuffer(file);
  },

  exportarExcel() {
    const list = this.all();
    if (!list.length) { toast('No hay compras para exportar', 'wa'); return; }
    const ws = XLSX.utils.json_to_sheet(list.map(c => ({
      Fecha: c.fecha, Proveedor: c.proveedor, Descripcion: c.descripcion,
      Categoria: c.categoria, Cantidad: c.cantidad, Unidad: c.unidad,
      Total: c.total, Notas: c.notas
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compras');
    XLSX.writeFile(wb, 'Compras_ModistaPro.xlsx');
  },
};
