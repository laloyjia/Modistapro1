/* ===== CLIENTES MODULE ===== */
'use strict';

const Clientes = {
  all() { return DB.get('clientes'); },
  save(list) { DB.set('clientes', list); },

  init() {
    this.render();
    document.getElementById('searchClientes')?.addEventListener('input', e => this.render(e.target.value));
  },

  render(q = '') {
    const list = this.all().filter(c =>
      !q || [c.nombre, c.empresa, c.rut, c.telefono, c.email].some(v => v?.toLowerCase().includes(q.toLowerCase()))
    );
    const tbody = document.getElementById('clientesTbody');
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👤</div><h3>Sin clientes</h3><p>Agrega tu primer cliente usando el botón de arriba.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(c => `
      <tr>
        <td><strong>${c.nombre}</strong></td>
        <td>${c.empresa || '—'}</td>
        <td>${c.rut || '—'}</td>
        <td>${c.telefono || '—'}</td>
        <td>${c.email || '—'}</td>
        <td>${c.ciudad || '—'}</td>
        <td class="td-actions">
          <button class="btn bs bsm" onclick="Clientes.editar(${c.id})">✏️</button>
          <button class="btn bd bsm" onclick="Clientes.eliminar(${c.id})">🗑️</button>
        </td>
      </tr>`).join('');
    // Update stat
    const stat = document.getElementById('statClientes');
    if (stat) stat.textContent = this.all().length;
  },

  abrirModal(id = null) {
    const c = id ? this.all().find(x => x.id === id) : null;
    document.getElementById('clienteModalTitle').textContent = c ? 'Editar Cliente' : 'Nuevo Cliente';
    document.getElementById('clienteId').value = c?.id || '';
    document.getElementById('clienteNombre').value = c?.nombre || '';
    document.getElementById('clienteEmpresa').value = c?.empresa || '';
    document.getElementById('clienteRut').value = c?.rut || '';
    document.getElementById('clienteTelefono').value = c?.telefono || '';
    document.getElementById('clienteEmail').value = c?.email || '';
    document.getElementById('clienteCiudad').value = c?.ciudad || '';
    document.getElementById('clienteNotas').value = c?.notas || '';
    openMo('clienteModal');
  },

  editar(id) { this.abrirModal(id); },

  guardar() {
    const id = parseInt(document.getElementById('clienteId').value) || null;
    const nombre = document.getElementById('clienteNombre').value.trim();
    if (!nombre) { toast('El nombre es obligatorio', 'er'); return; }

    const obj = {
      id: id || DB.nextId('clientes'),
      nombre,
      empresa: document.getElementById('clienteEmpresa').value.trim(),
      rut: document.getElementById('clienteRut').value.trim(),
      telefono: document.getElementById('clienteTelefono').value.trim(),
      email: document.getElementById('clienteEmail').value.trim(),
      ciudad: document.getElementById('clienteCiudad').value.trim(),
      notas: document.getElementById('clienteNotas').value.trim(),
      creado: new Date().toISOString(),
    };

    const list = this.all();
    if (id) {
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) list[idx] = { ...list[idx], ...obj };
    } else {
      list.push(obj);
    }
    this.save(list);
    closeMo('clienteModal');
    this.render();
    toast(id ? 'Cliente actualizado' : 'Cliente guardado', 'ok');
  },

  eliminar(id) {
    if (!confirm('¿Eliminar este cliente?')) return;
    this.save(this.all().filter(c => c.id !== id));
    this.render();
    toast('Cliente eliminado', 'ok');
  },

  /* ---- Excel Import ---- */
  importarExcel(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const norm = s => (s || '').toString().toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g,'')
          .replace(/[^a-z0-9]/g,'_');

        const map = { nombre:'nombre', name:'nombre', empresa:'empresa', company:'empresa',
          rut:'rut', telefono:'telefono', phone:'telefono', tel:'telefono',
          email:'email', correo:'email', ciudad:'ciudad', city:'ciudad', notas:'notas' };

        const list = this.all();
        let added = 0;
        rows.forEach(row => {
          const obj = { id: DB.nextId('clientes'), creado: new Date().toISOString() };
          Object.keys(row).forEach(k => {
            const nk = norm(k);
            const target = map[nk] || map[nk.split('_')[0]];
            if (target) obj[target] = String(row[k]).trim();
          });
          if (!obj.nombre) return;
          list.push(obj);
          added++;
        });
        this.save(list);
        this.render();
        toast(`${added} clientes importados`, 'ok');
        closeMo('importModal');
      } catch(err) {
        toast('Error al leer el archivo: ' + err.message, 'er');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  exportarExcel() {
    const list = this.all();
    if (!list.length) { toast('No hay clientes para exportar', 'wa'); return; }
    const ws = XLSX.utils.json_to_sheet(list.map(c => ({
      Nombre: c.nombre, Empresa: c.empresa, RUT: c.rut,
      Teléfono: c.telefono, Email: c.email, Ciudad: c.ciudad, Notas: c.notas
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'Clientes_ModistaPro.xlsx');
  },
};
