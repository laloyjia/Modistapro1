/* ===== COTIZACIONES MODULE ===== */
'use strict';

const Cotizaciones = {
  all() { return DB.get('cotizaciones'); },
  save(list) { DB.set('cotizaciones', list); },
  IVA: 0.19,

  init() {
    this.render();
    document.getElementById('searchCotizaciones')?.addEventListener('input', e => this.render(e.target.value));
    this.poblarSelectClientes();
  },

  poblarSelectClientes() {
    const sel = document.getElementById('cotCliente');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Sin cliente —</option>' +
      DB.get('clientes').map(c => `<option value="${c.id}">${c.nombre}${c.empresa ? ' ('+c.empresa+')' : ''}</option>`).join('');
  },

  render(q = '') {
    const list = this.all()
      .filter(c => !q || [c.titulo, c.clienteNombre, c.estado].some(v => v?.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    const tbody = document.getElementById('cotTbody');
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📄</div><h3>Sin cotizaciones</h3><p>Crea tu primera cotización.</p></div></td></tr>`;
    } else {
      tbody.innerHTML = list.map(c => {
        const estadoBadges = { Borrador:'b-pen', Enviada:'b-pro', Aceptada:'b-ok', Rechazada:'b-can', Vencida:'b-can' };
        return `<tr>
          <td><strong>${c.numero || ('#'+c.id)}</strong></td>
          <td>${c.fecha ? fmtD(c.fecha) : '—'}</td>
          <td>${c.clienteNombre || '—'}</td>
          <td>${c.titulo || '—'}</td>
          <td><span class="badge ${estadoBadges[c.estado] || 'b-pen'}">${c.estado || 'Borrador'}</span></td>
          <td>${fmt$(c.total || 0)}</td>
          <td class="td-actions">
            <button class="btn bs bsm" onclick="Cotizaciones.verPDF(${c.id})" title="Ver PDF">👁️</button>
            <button class="btn bs bsm" onclick="Cotizaciones.editar(${c.id})" title="Editar">✏️</button>
            <button class="btn bd bsm" onclick="Cotizaciones.eliminar(${c.id})" title="Eliminar">🗑️</button>
          </td>
        </tr>`;
      }).join('');
    }

    // Stats
    const all = this.all();
    document.getElementById('statCotTotal')    && (document.getElementById('statCotTotal').textContent    = all.length);
    document.getElementById('statCotAcept')    && (document.getElementById('statCotAcept').textContent    = all.filter(c=>c.estado==='Aceptada').length);
    const totalAcept = all.filter(c=>c.estado==='Aceptada').reduce((s,c) => s+(c.total||0), 0);
    document.getElementById('statCotValor')    && (document.getElementById('statCotValor').textContent    = fmt$(totalAcept));
  },

  abrirModal(id = null) {
    this.poblarSelectClientes();
    const cot = id ? this.all().find(x => x.id === id) : null;
    document.getElementById('cotModalTitle').textContent = cot ? 'Editar Cotización' : 'Nueva Cotización';
    document.getElementById('cotId').value = cot?.id || '';
    document.getElementById('cotTitulo').value = cot?.titulo || '';
    document.getElementById('cotCliente').value = cot?.clienteId || '';
    document.getElementById('cotFecha').value = cot?.fecha || today();
    document.getElementById('cotValidez').value = cot?.validez || 30;
    document.getElementById('cotEstado').value = cot?.estado || 'Borrador';
    document.getElementById('cotNotas').value = cot?.notas || '';
    document.getElementById('cotConIva').checked = cot?.conIva ?? true;

    // Render items
    this._tmpItems = cot?.items ? JSON.parse(JSON.stringify(cot.items)) : [];
    this.renderItems();
    this.calcTotals();
    openMo('cotModal');
  },

  editar(id) { this.abrirModal(id); },

  /* ---- Items ---- */
  renderItems() {
    const tbody = document.getElementById('cotItemsTbody');
    if (!tbody) return;
    if (!this._tmpItems.length) {
      tbody.innerHTML = `<tr id="cot-no-items"><td colspan="5" style="text-align:center;color:var(--g5);padding:1rem;">Sin ítems. Agrega uno.</td></tr>`;
    } else {
      tbody.innerHTML = this._tmpItems.map((it, i) => `<tr>
        <td><input type="text"  value="${it.desc || ''}"   placeholder="Descripción"  oninput="Cotizaciones.setItem(${i},'desc',this.value)"></td>
        <td><input type="number" value="${it.qty  || 1}"   placeholder="Cant."        oninput="Cotizaciones.setItem(${i},'qty', this.value)" style="max-width:70px"></td>
        <td><input type="number" value="${it.price|| ''}"  placeholder="Precio unit." oninput="Cotizaciones.setItem(${i},'price',this.value)" style="max-width:120px"></td>
        <td style="text-align:right;font-weight:600">${fmt$((it.qty||0)*(it.price||0))}</td>
        <td><button class="nom-del-btn" onclick="Cotizaciones.removeItem(${i})">✕</button></td>
      </tr>`).join('');
    }
    this.calcTotals();
  },

  setItem(i, key, val) {
    if (!this._tmpItems[i]) return;
    this._tmpItems[i][key] = key === 'desc' ? val : parseFloat(val) || 0;
    this.calcTotals();
    // Update subtotal cell
    const rows = document.querySelectorAll('#cotItemsTbody tr');
    if (rows[i]) {
      const subtCell = rows[i].querySelectorAll('td')[3];
      if (subtCell) subtCell.textContent = fmt$((this._tmpItems[i].qty||0)*(this._tmpItems[i].price||0));
    }
  },

  addItem() {
    const noItems = document.getElementById('cot-no-items');
    if (noItems) noItems.remove();
    this._tmpItems.push({ desc:'', qty:1, price:0 });
    this.renderItems();
  },

  removeItem(i) {
    this._tmpItems.splice(i, 1);
    this.renderItems();
  },

  calcTotals() {
    const subtotal = this._tmpItems.reduce((s, it) => s + (it.qty||0)*(it.price||0), 0);
    const conIva   = document.getElementById('cotConIva')?.checked ?? true;
    const iva      = conIva ? subtotal * this.IVA : 0;
    const total    = subtotal + iva;

    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    setTxt('cotSubtotalDisp', fmt$(subtotal));
    setTxt('cotIvaDisp',      conIva ? fmt$(iva) : 'No incluye');
    setTxt('cotTotalDisp',    fmt$(total));
    this._calcResult = { subtotal, iva, total, conIva };
  },

  guardar() {
    const id      = parseInt(document.getElementById('cotId').value) || null;
    const titulo  = document.getElementById('cotTitulo').value.trim();
    if (!titulo) { toast('El título es obligatorio', 'er'); return; }

    const clienteSel = document.getElementById('cotCliente');
    const clienteId  = parseInt(clienteSel.value) || null;
    const clienteNombre = clienteId ? clienteSel.options[clienteSel.selectedIndex].text : '';
    const { subtotal, iva, total } = this._calcResult || { subtotal:0, iva:0, total:0 };

    const list = this.all();
    const newId = id || DB.nextId('cotizaciones');
    const obj = {
      id: newId,
      numero: 'COT-' + String(newId).padStart(4,'0'),
      titulo,
      clienteId, clienteNombre,
      fecha:   document.getElementById('cotFecha').value,
      validez: parseInt(document.getElementById('cotValidez').value) || 30,
      estado:  document.getElementById('cotEstado').value,
      notas:   document.getElementById('cotNotas').value.trim(),
      conIva:  document.getElementById('cotConIva').checked,
      items:   this._tmpItems,
      subtotal, iva, total,
    };

    if (id) {
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) list[idx] = { ...list[idx], ...obj };
    } else {
      list.push(obj);
    }
    this.save(list);
    closeMo('cotModal');
    this.render();
    toast(id ? 'Cotización actualizada' : 'Cotización creada', 'ok');
  },

  eliminar(id) {
    if (!confirm('¿Eliminar esta cotización?')) return;
    this.save(this.all().filter(c => c.id !== id));
    this.render();
    toast('Cotización eliminada', 'ok');
  },

  /* ---- PDF / Print view ---- */
  verPDF(id) {
    const cot = this.all().find(c => c.id === id);
    if (!cot) return;
    const cfg = DB.getObj('config', {});
    const printArea = document.getElementById('cotPrintArea');
    if (!printArea) return;

    const logoHtml = cfg.logoImg
      ? `<img src="${cfg.logoImg}" alt="${cfg.name}">`
      : `<span style="font-size:2.5rem">✂️</span>`;

    const itemsHtml = (cot.items || []).map(it => `
      <tr>
        <td>${it.desc}</td>
        <td style="text-align:center">${it.qty}</td>
        <td style="text-align:right">${fmt$(it.price)}</td>
        <td style="text-align:right;font-weight:600">${fmt$(it.qty*it.price)}</td>
      </tr>`).join('');

    const validHasta = cot.fecha
      ? (() => { const d = new Date(cot.fecha); d.setDate(d.getDate()+(cot.validez||30)); return fmtD(d.toISOString().slice(0,10)); })()
      : '—';

    printArea.innerHTML = `
      <div class="cot-toolbar no-print" style="display:flex;gap:.75rem;justify-content:flex-end;flex-wrap:wrap;margin-bottom:1rem;">
        <button class="btn bs" onclick="document.getElementById('cotPrintArea').innerHTML='';closeMo('cotPrintModal')">← Volver</button>
        <button class="btn bs" style="background:#25D366;color:#fff;border:none" onclick="Cotizaciones.enviarWhatsApp(${cot.id})">💬 WhatsApp</button>
        <button class="btn bs" style="background:#4285F4;color:#fff;border:none" onclick="Cotizaciones.enviarEmail(${cot.id})">✉️ Email</button>
        <button class="btn bp" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
      </div>
      <div class="cot-doc">
        <div class="cot-header">
          <div class="cot-logo-area">
            ${logoHtml}
            <div>
              <div class="cot-biz-name">${cfg.name || 'Mi Negocio'}</div>
              <div class="cot-biz-sub">${cfg.tagline || ''}</div>
              ${cfg.phone ? `<div style="font-size:.78rem;color:var(--g6)">📞 ${cfg.phone}</div>` : ''}
              ${cfg.email ? `<div style="font-size:.78rem;color:var(--g6)">✉️ ${cfg.email}</div>` : ''}
            </div>
          </div>
          <div class="cot-meta">
            <strong>COTIZACIÓN</strong>
            <span class="cot-badge-num">${cot.numero || ('#'+cot.id)}</span>
            <br><span>Fecha: ${cot.fecha ? fmtD(cot.fecha) : '—'}</span><br>
            <span>Estado: ${cot.estado}</span>
          </div>
        </div>
        <div class="cot-validity">⏱ Válida por ${cot.validez || 30} días · Hasta ${validHasta}</div>
        <div class="cot-parties">
          <div>
            <div class="cot-party-label">Proveedor</div>
            <div class="cot-party-name">${cfg.name || 'Mi Negocio'}</div>
            <div class="cot-party-info">${cfg.address || ''}</div>
          </div>
          <div>
            <div class="cot-party-label">Cliente</div>
            <div class="cot-party-name">${cot.clienteNombre || 'Sin cliente'}</div>
          </div>
        </div>
        <div style="font-weight:700;font-size:1.05rem;margin-bottom:.75rem;color:var(--g9)">${cot.titulo}</div>
        <table class="cot-table">
          <thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">P. Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="cot-totals">
          <div class="cot-totals-grid">
            <div class="cot-totals-row"><span>Subtotal</span><span>${fmt$(cot.subtotal||0)}</span></div>
            <div class="cot-totals-row"><span>IVA (19%)</span><span>${cot.conIva ? fmt$(cot.iva||0) : 'No incluye'}</span></div>
            <div class="cot-totals-row"><span>TOTAL</span><span>${fmt$(cot.total||0)}</span></div>
          </div>
        </div>
        ${cot.notas ? `<div class="cot-notes"><strong>Notas y condiciones</strong>${cot.notas}</div>` : ''}
        <div class="cot-footer">
          Documento generado el ${fmtD(today())} · ${cfg.name || 'Mi Negocio'} · ${cfg.email || ''} · ${cfg.phone || ''}
        </div>
      </div>`;
    openMo('cotPrintModal');
  },

  /* ---- Enviar por WhatsApp ---- */
  enviarWhatsApp(id) {
    const cot = this.all().find(c => c.id === id);
    if (!cot) return;
    const cfg = DB.getObj('config', {});
    const cliente = DB.get('clientes').find(c => c.id === cot.clienteId);
    const phone   = cliente?.telefono?.replace(/[^0-9]/g, '') || '';
    const items   = (cot.items || []).map(it => `  • ${it.desc} x${it.qty} → $${(it.qty*it.price).toLocaleString('es-CL')}`).join('\n');
    const msg = `Hola${cot.clienteNombre ? ' ' + cot.clienteNombre.split(' ')[0] : ''} 👋,\n\n` +
      `Te enviamos la cotización *${cot.numero || '#'+cot.id}*:\n` +
      `*${cot.titulo}*\n\n${items}\n\n` +
      `${cot.conIva ? `Subtotal: $${(cot.subtotal||0).toLocaleString('es-CL')}\nIVA (19%): $${(cot.iva||0).toLocaleString('es-CL')}\n` : ''}` +
      `*Total: $${(cot.total||0).toLocaleString('es-CL')}*\n\n` +
      `Válida por ${cot.validez || 30} días.\n\n` +
      `${cfg.name || ''} · ${cfg.phone || ''}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  },

  /* ---- Enviar por Email ---- */
  enviarEmail(id) {
    const cot = this.all().find(c => c.id === id);
    if (!cot) return;
    const cfg = DB.getObj('config', {});
    const cliente = DB.get('clientes').find(c => c.id === cot.clienteId);
    const to      = cliente?.email || '';
    const asunto  = `Cotización ${cot.numero || '#'+cot.id} — ${cot.titulo}`;
    const items   = (cot.items || []).map(it => `  • ${it.desc} x${it.qty} = $${(it.qty*it.price).toLocaleString('es-CL')}`).join('\n');
    const cuerpo  =
      `Estimado/a ${cot.clienteNombre || 'cliente'},\n\n` +
      `Adjunto encontrará la cotización solicitada:\n\n` +
      `Número: ${cot.numero || '#'+cot.id}\n` +
      `Descripción: ${cot.titulo}\n` +
      `Fecha: ${cot.fecha || ''}\n\n` +
      `DETALLE:\n${items}\n\n` +
      (cot.conIva ? `Subtotal: $${(cot.subtotal||0).toLocaleString('es-CL')}\nIVA (19%): $${(cot.iva||0).toLocaleString('es-CL')}\n` : '') +
      `TOTAL: $${(cot.total||0).toLocaleString('es-CL')}\n\n` +
      `Válida por ${cot.validez || 30} días.\n\n` +
      (cot.notas ? `Notas: ${cot.notas}\n\n` : '') +
      `Saludos,\n${cfg.name || 'Mi Negocio'}\n${cfg.phone || ''} · ${cfg.email || ''}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  },

  /* ---- Excel Import / Export ---- */
  descargarPlantilla() {
    const ws = XLSX.utils.json_to_sheet([{
      Titulo: 'Delantales personalizados',
      Cliente: 'Empresa XYZ',
      Fecha: new Date().toISOString().slice(0,10),
      Estado: 'Borrador',
      Total: 0,
      Notas: ''
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cotizaciones');
    XLSX.writeFile(wb, 'Plantilla_Cotizaciones.xlsx');
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
        const map = { titulo:'titulo', descripcion:'titulo', cliente:'clienteNombre',
          fecha:'fecha', estado:'estado', total:'total', notas:'notas' };
        const list = this.all();
        let added = 0;
        rows.forEach(row => {
          const newId = DB.nextId('cotizaciones');
          const obj = { id: newId, numero: 'COT-'+String(newId).padStart(4,'0'),
            estado:'Borrador', items:[], subtotal:0, iva:0, total:0, conIva:true,
            fecha: new Date().toISOString().slice(0,10), validez:30 };
          Object.keys(row).forEach(k => { const t = map[norm(k)]; if(t) obj[t] = String(row[k]).trim(); });
          if (!obj.titulo) return;
          if (obj.total) obj.total = parseFloat(obj.total) || 0;
          list.push(obj); added++;
        });
        this.save(list);
        this.render();
        toast(`${added} cotizaciones importadas`, 'ok');
      } catch(err) { toast('Error al leer el archivo: ' + err.message, 'er'); }
    };
    reader.readAsArrayBuffer(file);
  },

  exportarExcel() {
    const list = this.all();
    if (!list.length) { toast('No hay cotizaciones para exportar', 'wa'); return; }
    const ws = XLSX.utils.json_to_sheet(list.map(c => ({
      Numero: c.numero, Titulo: c.titulo, Cliente: c.clienteNombre,
      Fecha: c.fecha, Estado: c.estado, Subtotal: c.subtotal,
      IVA: c.iva, Total: c.total, Notas: c.notas
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cotizaciones');
    XLSX.writeFile(wb, 'Cotizaciones_ModistaPro.xlsx');
  },
};
