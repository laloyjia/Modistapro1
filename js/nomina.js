/* ===== NÓMINA MODULE ===== */
'use strict';

const Nomina = {
  pedidoId: null,
  COLS: [
    { key:'nombre',   label:'Nombre',      type:'text',   w:'160px' },
    { key:'producto', label:'Producto',     type:'text',   w:'130px' },
    { key:'color',    label:'Color',        type:'text',   w:'100px' },
    { key:'bordado',  label:'Bordado',      type:'text',   w:'130px' },
    { key:'talla',    label:'Talla',        type:'text',   w:'70px'  },
    { key:'pecho',    label:'Pecho (cm)',   type:'number', w:'90px'  },
    { key:'cintura',  label:'Cintura (cm)', type:'number', w:'90px'  },
    { key:'cadera',   label:'Cadera (cm)',  type:'number', w:'90px'  },
    { key:'largo',    label:'Largo (cm)',   type:'number', w:'90px'  },
    { key:'manga',    label:'Manga (cm)',   type:'number', w:'85px'  },
    { key:'obs',      label:'Observaciones',type:'text',   w:'160px' },
  ],

  all() { return this.pedidoId ? DB.get('nomina_' + this.pedidoId) : []; },
  save(rows) { if (this.pedidoId) DB.set('nomina_' + this.pedidoId, rows); },

  init() {
    this.renderPedidoSelector();
    this.renderTable();
  },

  renderPedidoSelector() {
    const wrap = document.getElementById('nominaPedidoWrap');
    if (!wrap) return;
    const pedidos = DB.get('pedidos');
    const selId = this.pedidoId;
    wrap.innerHTML = `
      <div class="form-group" style="max-width:400px;margin-bottom:1.25rem;">
        <label>Pedido</label>
        <select id="nominaPedidoSel" onchange="Nomina.seleccionarPedido(this.value)">
          <option value="">— Seleccionar pedido —</option>
          ${pedidos.map(p => `<option value="${p.id}" ${p.id == selId ? 'selected' : ''}>#${p.id} · ${p.titulo} (${p.clienteNombre || ''})</option>`).join('')}
        </select>
      </div>`;
  },

  seleccionarPedido(id) {
    this.pedidoId = parseInt(id) || null;
    this.renderTable();
    // Update pedido info card
    const infoWrap = document.getElementById('nominaPedidoInfo');
    if (!infoWrap) return;
    if (!this.pedidoId) { infoWrap.innerHTML = ''; return; }
    const p = DB.get('pedidos').find(x => x.id == this.pedidoId);
    if (!p) { infoWrap.innerHTML = ''; return; }
    infoWrap.innerHTML = `
      <div class="alert alert-in" style="margin-bottom:1rem;">
        <span>📦</span>
        <div>Pedido <strong>#${p.id} · ${p.titulo}</strong> — Cliente: ${p.clienteNombre || '—'} — 
        Estado: ${estadoBadge(p.estado)} — Entrega: ${p.fecha_entrega ? fmtD(p.fecha_entrega) : '—'} — 
        Cantidad: ${p.cantidad}</div>
      </div>`;
  },

  renderTable() {
    const wrap = document.getElementById('nominaTableWrap');
    if (!wrap) return;
    if (!this.pedidoId) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>Selecciona un pedido</h3><p>Elige el pedido para ver o editar su nómina de personas.</p></div>`;
      return;
    }
    const rows = this.all();
    const colHeaders = this.COLS.map(c => `<th style="min-width:${c.w}">${c.label}</th>`).join('');
    const rowsHtml = rows.length
      ? rows.map((r, i) => this.renderRow(r, i)).join('')
      : `<tr id="nomina-empty"><td colspan="${this.COLS.length + 2}" style="text-align:center;color:var(--g5);padding:1.5rem;">Sin personas. Agrega una fila.</td></tr>`;

    wrap.innerHTML = `
      <div class="nom-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:36px">#</th>
              ${colHeaders}
              <th style="width:36px"></th>
            </tr>
          </thead>
          <tbody id="nominaTbody">${rowsHtml}</tbody>
        </table>
      </div>
      <button class="nom-add-row-btn" onclick="Nomina.agregarFila()">+ Agregar persona</button>
      <div id="nom-summary" class="nom-summary"></div>`;
    this.renderSummary();
  },

  renderRow(r, i) {
    const inputs = this.COLS.map(c => `
      <td><input type="${c.type}" value="${r[c.key] || ''}" placeholder="${c.label}"
        oninput="Nomina.onInput(${i},'${c.key}',this.value)"
        style="width:100%;min-width:${c.w}"></td>`).join('');
    return `<tr id="nom-row-${i}">
      <td class="nom-row-num">${i+1}</td>
      ${inputs}
      <td><button class="nom-del-btn" onclick="Nomina.eliminarFila(${i})" title="Eliminar fila">✕</button></td>
    </tr>`;
  },

  onInput(i, key, val) {
    const rows = this.all();
    if (!rows[i]) return;
    rows[i][key] = val;
    this.save(rows);
    this.renderSummary();
  },

  agregarFila() {
    const rows = this.all();
    const empty = {};
    this.COLS.forEach(c => empty[c.key] = '');
    rows.push(empty);
    this.save(rows);
    this.renderTable();
    // Focus first input of new row
    const lastRow = document.querySelector(`#nom-row-${rows.length - 1} input`);
    lastRow?.focus();
  },

  eliminarFila(i) {
    const rows = this.all();
    rows.splice(i, 1);
    this.save(rows);
    this.renderTable();
  },

  renderSummary() {
    const sumDiv = document.getElementById('nom-summary');
    if (!sumDiv) return;
    const rows = this.all();
    const total = rows.length;
    const conNombre = rows.filter(r => r.nombre).length;
    const conMedidas = rows.filter(r => r.pecho || r.cintura || r.cadera).length;
    sumDiv.innerHTML = `
      <div class="nom-stat">Total: <strong>${total}</strong></div>
      <div class="nom-stat">Con nombre: <strong>${conNombre}</strong></div>
      <div class="nom-stat">Con medidas: <strong>${conMedidas}</strong></div>`;
  },

  /* ---- Excel Import ---- */
  importarExcel(file) {
    if (!file || !this.pedidoId) { toast('Selecciona un pedido primero', 'wa'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const norm = s => (s || '').toString().toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g,'')
          .replace(/[^a-z0-9]/g,'_');

        // Map column names to internal keys
        const aliases = {
          nombre:'nombre', name:'nombre',
          producto:'producto', product:'producto', prenda:'producto',
          color:'color',
          bordado:'bordado', embroidery:'bordado',
          talla:'talla', size:'talla',
          pecho:'pecho', chest:'pecho', busto:'pecho',
          cintura:'cintura', waist:'cintura',
          cadera:'cadera', hip:'cadera',
          largo:'largo', length:'largo',
          manga:'manga', sleeve:'manga',
          obs:'obs', observaciones:'obs', observacion:'obs', notes:'obs',
        };

        const rows = this.all();
        let added = 0;
        rawRows.forEach(row => {
          const obj = {};
          this.COLS.forEach(c => obj[c.key] = '');
          Object.keys(row).forEach(k => {
            const nk = norm(k);
            // Try exact match, then first word match
            const target = aliases[nk] || aliases[nk.split('_')[0]] || aliases[nk.replace(/_cm$/,'').replace(/_en_cm$/,'')];
            if (target) obj[target] = String(row[k]).trim();
          });
          if (!obj.nombre && !obj.producto) return;
          rows.push(obj);
          added++;
        });
        this.save(rows);
        this.renderTable();
        toast(`${added} personas importadas`, 'ok');
      } catch(err) {
        toast('Error al leer el archivo: ' + err.message, 'er');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  exportarExcel() {
    if (!this.pedidoId) { toast('Selecciona un pedido primero', 'wa'); return; }
    const rows = this.all();
    if (!rows.length) { toast('La nómina está vacía', 'wa'); return; }

    const pedido = DB.get('pedidos').find(p => p.id == this.pedidoId);
    const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
      Nombre: r.nombre, Producto: r.producto, Color: r.color,
      Bordado: r.bordado, Talla: r.talla,
      'Pecho (cm)': r.pecho, 'Cintura (cm)': r.cintura,
      'Cadera (cm)': r.cadera, 'Largo (cm)': r.largo,
      'Manga (cm)': r.manga, Observaciones: r.obs,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nómina');
    XLSX.writeFile(wb, `Nomina_Pedido${this.pedidoId}_${pedido?.titulo || ''}.xlsx`);
  },

  /* ---- Plantilla descargable ---- */
  descargarPlantilla() {
    const ws = XLSX.utils.aoa_to_sheet([
      this.COLS.map(c => c.label),
      this.COLS.map(() => ''),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nómina');
    XLSX.writeFile(wb, 'Plantilla_Nomina.xlsx');
  },
};
