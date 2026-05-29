/* ===== PEDIDOS MODULE ===== */
'use strict';

const Pedidos = {
  ESTADOS: ['Pendiente','En Proceso','Listo','Entregado','Cancelado'],

  all() { return DB.get('pedidos'); },
  save(list) { DB.set('pedidos', list); },

  init() {
    this.render();
    document.getElementById('searchPedidos')?.addEventListener('input', e => this.render(e.target.value));
    document.getElementById('filterEstado')?.addEventListener('change', () => this.render());
    this.poblarSelectClientes();
  },

  poblarSelectClientes() {
    const sel = document.getElementById('pedidoCliente');
    if (!sel) return;
    const clientes = DB.get('clientes');
    sel.innerHTML = '<option value="">— Seleccionar cliente —</option>' +
      clientes.map(c => `<option value="${c.id}">${c.nombre}${c.empresa ? ' ('+c.empresa+')' : ''}</option>`).join('');
  },

  render(q = '') {
    const filtroEstado = document.getElementById('filterEstado')?.value || '';
    let list = this.all();
    if (q) list = list.filter(p =>
      [p.titulo, p.clienteNombre, p.estado, p.notas].some(v => v?.toLowerCase().includes(q.toLowerCase()))
    );
    if (filtroEstado) list = list.filter(p => p.estado === filtroEstado);
    // Sort by fecha_entrega asc
    list.sort((a,b) => (a.fecha_entrega || '').localeCompare(b.fecha_entrega || ''));

    const tbody = document.getElementById('pedidosTbody');
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📦</div><h3>Sin pedidos</h3><p>Crea tu primer pedido.</p></div></td></tr>`;
    } else {
      tbody.innerHTML = list.map(p => {
        const dl = daysLeft(p.fecha_entrega);
        const dlBadge = p.fecha_entrega && p.estado !== 'Entregado' && p.estado !== 'Cancelado'
          ? (dl < 0 ? `<span class="badge b-can">⚠ Vencido</span>`
             : dl === 0 ? `<span class="badge b-wa">¡Hoy!</span>`
             : dl <= 3 ? `<span class="badge b-wa">${dl}d</span>` : `<small class="text-muted">${dl}d</small>`)
          : '';
        return `<tr>
          <td><strong>#${p.id}</strong></td>
          <td>${p.clienteNombre || '—'}</td>
          <td>${p.titulo || '—'}</td>
          <td>${estadoBadge(p.estado)}</td>
          <td>${p.fecha_entrega ? fmtD(p.fecha_entrega) : '—'} ${dlBadge}</td>
          <td>${p.cantidad || 1}</td>
          <td>${fmt$(p.total || 0)}</td>
          <td class="td-actions">
            <button class="btn bs bsm" onclick="Pedidos.verNomina(${p.id})" title="Nómina">📋</button>
            <button class="btn bs bsm" onclick="Pedidos.editar(${p.id})" title="Editar">✏️</button>
            <button class="btn bd bsm" onclick="Pedidos.eliminar(${p.id})" title="Eliminar">🗑️</button>
          </td>
        </tr>`;
      }).join('');
    }

    // Stats
    const allP = this.all();
    const byEstado = name => allP.filter(p => p.estado === name).length;
    document.getElementById('statPedidosTotal')  && (document.getElementById('statPedidosTotal').textContent  = allP.length);
    document.getElementById('statPedidosPend')   && (document.getElementById('statPedidosPend').textContent   = byEstado('Pendiente'));
    document.getElementById('statPedidosProc')   && (document.getElementById('statPedidosProc').textContent   = byEstado('En Proceso'));
    document.getElementById('statPedidosListos') && (document.getElementById('statPedidosListos').textContent = byEstado('Listo'));
  },

  abrirModal(id = null) {
    this.poblarSelectClientes();
    const p = id ? this.all().find(x => x.id === id) : null;
    document.getElementById('pedidoModalTitle').textContent = p ? 'Editar Pedido' : 'Nuevo Pedido';
    document.getElementById('pedidoId').value = p?.id || '';
    document.getElementById('pedidoTitulo').value = p?.titulo || '';
    document.getElementById('pedidoCliente').value = p?.clienteId || '';
    document.getElementById('pedidoEstado').value = p?.estado || 'Pendiente';
    document.getElementById('pedidoFechaEntrega').value = p?.fecha_entrega || '';
    document.getElementById('pedidoCantidad').value = p?.cantidad || 1;
    document.getElementById('pedidoTotal').value = p?.total || '';
    document.getElementById('pedidoAnticipo').value = p?.anticipo || '';
    document.getElementById('pedidoNotas').value = p?.notas || '';
    openMo('pedidoModal');
  },

  editar(id) { this.abrirModal(id); },

  guardar() {
    const id = parseInt(document.getElementById('pedidoId').value) || null;
    const titulo = document.getElementById('pedidoTitulo').value.trim();
    if (!titulo) { toast('El título es obligatorio', 'er'); return; }

    const clienteSel = document.getElementById('pedidoCliente');
    const clienteId = parseInt(clienteSel.value) || null;
    const clienteNombre = clienteId ? clienteSel.options[clienteSel.selectedIndex].text : '';

    const obj = {
      id: id || DB.nextId('pedidos'),
      titulo,
      clienteId,
      clienteNombre,
      estado: document.getElementById('pedidoEstado').value,
      fecha_entrega: document.getElementById('pedidoFechaEntrega').value,
      cantidad: parseInt(document.getElementById('pedidoCantidad').value) || 1,
      total: parseFloat(document.getElementById('pedidoTotal').value) || 0,
      anticipo: parseFloat(document.getElementById('pedidoAnticipo').value) || 0,
      notas: document.getElementById('pedidoNotas').value.trim(),
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
    closeMo('pedidoModal');
    this.render();
    toast(id ? 'Pedido actualizado' : 'Pedido creado', 'ok');
  },

  eliminar(id) {
    if (!confirm('¿Eliminar este pedido? También se borrará su nómina.')) return;
    this.save(this.all().filter(p => p.id !== id));
    // Remove nómina
    DB.set('nomina_' + id, []);
    this.render();
    toast('Pedido eliminado', 'ok');
  },

  cambiarEstado(id, estado) {
    const list = this.all();
    const idx = list.findIndex(x => x.id === id);
    if (idx < 0) return;
    list[idx].estado = estado;
    this.save(list);
    this.render();
    toast('Estado actualizado: ' + estado, 'ok');
  },

  verNomina(id) {
    // Switch to nómina view
    if (typeof Nomina !== 'undefined') {
      Nomina.pedidoId = id;
      Nomina.init();
      nav('nomina');
    }
  },
};
