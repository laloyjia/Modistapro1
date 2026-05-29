/* ===== INVENTARIO MODULE ===== */
'use strict';

const Inventario = {
  all() { return DB.get('inventario'); },
  save(list) { DB.set('inventario', list); },

  init() {
    this.render();
    document.getElementById('searchInventario')?.addEventListener('input', e => this.render(e.target.value));
  },

  render(q = '') {
    const list = this.all().filter(it =>
      !q || [it.nombre, it.categoria, it.descripcion].some(v => v?.toLowerCase().includes(q.toLowerCase()))
    );
    const tbody = document.getElementById('inventarioTbody');
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🏷️</div><h3>Inventario vacío</h3><p>Agrega materiales e insumos.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(it => {
      const stockBadge = it.stock <= (it.stock_min || 0)
        ? `<span class="badge b-can">⚠ ${it.stock}</span>`
        : `<span class="badge b-ok">${it.stock}</span>`;
      return `<tr>
        <td><strong>${it.nombre}</strong></td>
        <td>${it.categoria || '—'}</td>
        <td>${it.descripcion || '—'}</td>
        <td>${stockBadge} ${it.unidad || ''}</td>
        <td>${it.stock_min || 0} ${it.unidad || ''}</td>
        <td>${fmt$(it.precio_unit || 0)}</td>
        <td class="td-actions">
          <button class="btn bs bsm" onclick="Inventario.ajustarStock(${it.id})" title="Ajustar stock">📦</button>
          <button class="btn bs bsm" onclick="Inventario.editar(${it.id})" title="Editar">✏️</button>
          <button class="btn bd bsm" onclick="Inventario.eliminar(${it.id})" title="Eliminar">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    // Stats
    const all = this.all();
    const sinStock = all.filter(it => it.stock <= (it.stock_min || 0)).length;
    document.getElementById('statInvTotal')  && (document.getElementById('statInvTotal').textContent  = all.length);
    document.getElementById('statInvBajo')   && (document.getElementById('statInvBajo').textContent   = sinStock);
    const valorTotal = all.reduce((s, it) => s + (it.stock || 0) * (it.precio_unit || 0), 0);
    document.getElementById('statInvValor')  && (document.getElementById('statInvValor').textContent  = fmt$(valorTotal));
  },

  abrirModal(id = null) {
    const it = id ? this.all().find(x => x.id === id) : null;
    document.getElementById('invModalTitle').textContent = it ? 'Editar ítem' : 'Nuevo ítem';
    document.getElementById('invId').value = it?.id || '';
    document.getElementById('invNombre').value = it?.nombre || '';
    document.getElementById('invCategoria').value = it?.categoria || '';
    document.getElementById('invDescripcion').value = it?.descripcion || '';
    document.getElementById('invStock').value = it?.stock ?? '';
    document.getElementById('invUnidad').value = it?.unidad || '';
    document.getElementById('invStockMin').value = it?.stock_min ?? '';
    document.getElementById('invPrecioUnit').value = it?.precio_unit ?? '';
    openMo('invModal');
  },

  editar(id) { this.abrirModal(id); },

  guardar() {
    const id = parseInt(document.getElementById('invId').value) || null;
    const nombre = document.getElementById('invNombre').value.trim();
    if (!nombre) { toast('El nombre es obligatorio', 'er'); return; }

    const obj = {
      id: id || DB.nextId('inventario'),
      nombre,
      categoria: document.getElementById('invCategoria').value.trim(),
      descripcion: document.getElementById('invDescripcion').value.trim(),
      stock: parseFloat(document.getElementById('invStock').value) || 0,
      unidad: document.getElementById('invUnidad').value.trim(),
      stock_min: parseFloat(document.getElementById('invStockMin').value) || 0,
      precio_unit: parseFloat(document.getElementById('invPrecioUnit').value) || 0,
      actualizado: new Date().toISOString(),
    };

    const list = this.all();
    if (id) {
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) list[idx] = { ...list[idx], ...obj };
    } else {
      list.push(obj);
    }
    this.save(list);
    closeMo('invModal');
    this.render();
    toast(id ? 'Ítem actualizado' : 'Ítem guardado', 'ok');
  },

  ajustarStock(id) {
    const it = this.all().find(x => x.id === id);
    if (!it) return;
    const nuevo = prompt(`Stock actual de "${it.nombre}": ${it.stock} ${it.unidad || ''}\n\nIngresa el nuevo stock:`, it.stock);
    if (nuevo === null) return;
    const val = parseFloat(nuevo);
    if (isNaN(val)) { toast('Valor inválido', 'er'); return; }
    const list = this.all();
    const idx = list.findIndex(x => x.id === id);
    list[idx].stock = val;
    list[idx].actualizado = new Date().toISOString();
    this.save(list);
    this.render();
    toast('Stock actualizado', 'ok');
  },

  eliminar(id) {
    if (!confirm('¿Eliminar este ítem?')) return;
    this.save(this.all().filter(x => x.id !== id));
    this.render();
    toast('Ítem eliminado', 'ok');
  },

  /* ---- Excel Import / Export ---- */
  descargarPlantilla() {
    const ws = XLSX.utils.json_to_sheet([{
      Nombre: 'Tela algodón blanca',
      Categoria: 'Telas',
      Descripcion: 'Algodón 100% ancho 1.5m',
      Stock: 50,
      Unidad: 'metros',
      StockMinimo: 10,
      PrecioUnitario: 1200
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, 'Plantilla_Inventario.xlsx');
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
        const map = { nombre:'nombre', name:'nombre', categoria:'categoria', category:'categoria',
          descripcion:'descripcion', stock:'stock', unidad:'unidad', unit:'unidad',
          stockminimo:'stock_min', stock_min:'stock_min', preciounitario:'precio_unit',
          precio_unit:'precio_unit', precio:'precio_unit' };
        const list = this.all();
        let added = 0;
        rows.forEach(row => {
          const obj = { id: DB.nextId('inventario'), actualizado: new Date().toISOString() };
          Object.keys(row).forEach(k => { const t = map[norm(k)]; if (t) obj[t] = String(row[k]).trim(); });
          if (!obj.nombre) return;
          if (obj.stock) obj.stock = parseFloat(obj.stock) || 0;
          if (obj.stock_min) obj.stock_min = parseFloat(obj.stock_min) || 0;
          if (obj.precio_unit) obj.precio_unit = parseFloat(obj.precio_unit) || 0;
          list.push(obj); added++;
        });
        this.save(list);
        this.render();
        toast(`${added} ítems importados`, 'ok');
      } catch(err) { toast('Error al leer el archivo: ' + err.message, 'er'); }
    };
    reader.readAsArrayBuffer(file);
  },

  exportarExcel() {
    const list = this.all();
    if (!list.length) { toast('No hay ítems para exportar', 'wa'); return; }
    const ws = XLSX.utils.json_to_sheet(list.map(it => ({
      Nombre: it.nombre, Categoria: it.categoria, Descripcion: it.descripcion,
      Stock: it.stock, Unidad: it.unidad, StockMinimo: it.stock_min, PrecioUnitario: it.precio_unit
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, 'Inventario_ModistaPro.xlsx');
  },
};
