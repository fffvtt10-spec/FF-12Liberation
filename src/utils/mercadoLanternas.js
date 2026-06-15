export function isItemSlotValido(item) {
  return item && item.name && String(item.name).trim() !== '' && Number(item.quantity) > 0;
}

export function getItensInventarioDisponiveis(items = []) {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => isItemSlotValido(item))
    .map(({ item, index }) => ({
      index,
      name: String(item.name).trim(),
      quantity: Number(item.quantity) || 0,
      description: item.description || ''
    }));
}

export function calcularReservasPendentes(trocasPendentes, remetenteUid) {
  const reservasPorSlot = {};
  let gilReservado = 0;

  for (const troca of trocasPendentes) {
    if (troca.remetenteUid !== remetenteUid || troca.status !== 'pendente_mestre') continue;

    gilReservado += Number(troca.gil) || 0;

    for (const item of troca.itens || []) {
      const qty = Number(item.quantidade) || 0;
      if (qty <= 0) continue;

      if (typeof item.index === 'number' && item.index >= 0) {
        reservasPorSlot[item.index] = (reservasPorSlot[item.index] || 0) + qty;
      }
    }
  }

  return { reservasPorSlot, gilReservado };
}

export function getGilDisponivelParaTroca(inventory, trocasPendentes, remetenteUid) {
  const gilTotal = Number(inventory?.gil) || 0;
  const { gilReservado } = calcularReservasPendentes(trocasPendentes, remetenteUid);
  return Math.max(0, gilTotal - gilReservado);
}

export function getQuantidadeDisponivelSlot(items, slotIndex, trocasPendentes, remetenteUid) {
  const slot = items?.[slotIndex];
  if (!isItemSlotValido(slot)) return 0;

  const { reservasPorSlot } = calcularReservasPendentes(trocasPendentes, remetenteUid);
  const reservado = reservasPorSlot[slotIndex] || 0;
  return Math.max(0, (Number(slot.quantity) || 0) - reservado);
}

export function validarPropostaTroca({
  inventory,
  itensSelecionados,
  gil,
  trocasPendentes = [],
  remetenteUid,
  excluirTrocaId = null
}) {
  const items = inventory?.items || [];
  const gilEnviado = Number(gil) || 0;
  const gilDisponivel = getGilDisponivelParaTroca(inventory, trocasPendentes, remetenteUid);

  if (gilEnviado < 0 || !Number.isFinite(gilEnviado)) {
    return { valid: false, error: 'Valor de Gil inválido.' };
  }

  if (!Number.isInteger(gilEnviado)) {
    return { valid: false, error: 'O valor de Gil deve ser um número inteiro.' };
  }

  if (gilEnviado > gilDisponivel) {
    return {
      valid: false,
      error: `Gil insuficiente. Disponível para troca: ${gilDisponivel}.`
    };
  }

  const itens = itensSelecionados || [];

  if (itens.length === 0 && gilEnviado <= 0) {
    return { valid: false, error: 'Selecione pelo menos um item ou informe Gil para enviar.' };
  }

  const indicesUsados = new Set();
  const itensNormalizados = [];

  for (const sel of itens) {
    const idx = sel.index;

    if (typeof idx !== 'number' || idx < 0 || idx >= items.length) {
      return { valid: false, error: `Slot de inventário inválido para "${sel.name || 'item'}".` };
    }

    if (indicesUsados.has(idx)) {
      return { valid: false, error: `O item "${sel.name}" foi selecionado mais de uma vez.` };
    }
    indicesUsados.add(idx);

    const slot = items[idx];
    if (!isItemSlotValido(slot)) {
      return { valid: false, error: 'Um dos itens selecionados não existe mais no seu inventário.' };
    }

    if (slot.name.trim() !== String(sel.name).trim()) {
      return {
        valid: false,
        error: `Inconsistência no inventário: o slot não contém "${sel.name}".`
      };
    }

    const quantidade = Number(sel.quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      return {
        valid: false,
        error: `Quantidade inválida para "${slot.name}". Use um número inteiro maior que zero.`
      };
    }

    const pendentesFiltradas = trocasPendentes.filter(
      t => t.remetenteUid === remetenteUid && t.status === 'pendente_mestre' && t.id !== excluirTrocaId
    );
    const disponivel = getQuantidadeDisponivelSlot(items, idx, pendentesFiltradas, remetenteUid);

    if (quantidade > disponivel) {
      const reservado = (Number(slot.quantity) || 0) - disponivel;
      const detalheReserva = reservado > 0 ? ` (${reservado} reservado(s) em propostas pendentes)` : '';
      return {
        valid: false,
        error: `Quantidade insuficiente de "${slot.name}". Disponível: ${disponivel}${detalheReserva}.`
      };
    }

    itensNormalizados.push({
      index: idx,
      name: slot.name.trim(),
      quantidade
    });
  }

  return { valid: true, itensNormalizados };
}

export function executarTransferenciaTroca(remetenteInv, destInv, troca) {
  const remInv = JSON.parse(JSON.stringify(remetenteInv));
  const dInv = JSON.parse(JSON.stringify(destInv));

  if (!Array.isArray(remInv.items)) remInv.items = [];
  if (!Array.isArray(dInv.items)) dInv.items = [];

  const gil = Number(troca.gil) || 0;

  if (gil < 0 || !Number.isFinite(gil)) {
    return { success: false, error: 'Valor de Gil inválido na proposta.' };
  }

  if (gil > 0) {
    const gilRemetente = Number(remInv.gil) || 0;
    if (gilRemetente < gil) {
      return { success: false, error: 'O remetente não possui Gil suficiente na ficha.' };
    }
    remInv.gil = gilRemetente - gil;
    dInv.gil = (Number(dInv.gil) || 0) + gil;
  }

  for (const itemTroca of troca.itens || []) {
    const quantidade = Number(itemTroca.quantidade);

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      return {
        success: false,
        error: `Quantidade inválida para "${itemTroca.name || 'item desconhecido'}".`
      };
    }

    if (!itemTroca.name || String(itemTroca.name).trim() === '') {
      return { success: false, error: 'Proposta contém item sem nome.' };
    }

    const nomeItem = String(itemTroca.name).trim();
    let itemIndexRem = typeof itemTroca.index === 'number' ? itemTroca.index : -1;

    if (itemIndexRem >= 0 && itemIndexRem < remInv.items.length) {
      const slot = remInv.items[itemIndexRem];
      if (!isItemSlotValido(slot) || slot.name.trim() !== nomeItem) {
        itemIndexRem = -1;
      }
    } else {
      itemIndexRem = -1;
    }

    if (itemIndexRem === -1) {
      itemIndexRem = remInv.items.findIndex(
        i => isItemSlotValido(i) && i.name.trim() === nomeItem
      );
    }

    if (itemIndexRem === -1) {
      return { success: false, error: `O remetente não possui o item "${nomeItem}".` };
    }

    const qtdSlot = Number(remInv.items[itemIndexRem].quantity) || 0;
    if (qtdSlot < quantidade) {
      return {
        success: false,
        error: `O remetente não possui quantidade suficiente de "${nomeItem}" (${qtdSlot} na ficha, ${quantidade} solicitado).`
      };
    }

    remInv.items[itemIndexRem].quantity = qtdSlot - quantidade;
    if (remInv.items[itemIndexRem].quantity <= 0) {
      remInv.items[itemIndexRem] = { name: '', quantity: 0, description: '' };
    }

    const itemIndexDest = dInv.items.findIndex(
      i => isItemSlotValido(i) && i.name.trim() === nomeItem
    );

    if (itemIndexDest !== -1) {
      dInv.items[itemIndexDest].quantity = (Number(dInv.items[itemIndexDest].quantity) || 0) + quantidade;
    } else {
      const emptySlot = dInv.items.findIndex(i => !i.name || String(i.name).trim() === '');
      if (emptySlot !== -1) {
        dInv.items[emptySlot] = {
          name: nomeItem,
          quantity: quantidade,
          description: 'Recebido via Mercado'
        };
      } else {
        dInv.items.push({
          name: nomeItem,
          quantity: quantidade,
          description: 'Recebido via Mercado'
        });
      }
    }
  }

  return { success: true, remetenteInv: remInv, destInv: dInv };
}
