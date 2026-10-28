/* ═══════════════════════════════════════════════════
   SECTION 11 · ORDER ACTIONS
   ═══════════════════════════════════════════════════ */
async function boardClick(e) {
  const btn = e.target.closest('[data-a]');
  const card = e.target.closest('.ocard');
  if (!card) return;
  const o = ORD.get(card.dataset.id) || ORD.get(Number(card.dataset.id));
  if (!o) return;

  if (!btn && (e.shiftKey || e.ctrlKey || e.metaKey)) {
    if (selectionSet.has(o.id)) selectionSet.delete(o.id); else selectionSet.add(o.id);
    card.classList.toggle('selected', selectionSet.has(o.id));
    updateBulkBar(); return;
  }
  if (!btn) { openOrderDetail(o); return; }

  if (btn.dataset.a === 'adv') return setStatus(o, ST[o.status].next, card, btn);
  if (btn.dataset.a === 'cx') return askCancel(o, card);
  if (btn.dataset.a === 'call') {
    const d = DRV.find(x => x.id === o.assigned_driver_id);
    if (d?.phone) window.location.href = 'tel:' + d.phone;
    else toast('لا يوجد رقم', 'err');
    return;
  }
  if (btn.dataset.a === 'drv') {
    const free = DRV.filter(d => d.is_active !== false && d.availability === 'available');
    openModal(`
      <h2>اختر السائق <button class="close" onclick="closeModal()">✕</button></h2>
      ${free.length
        ? free.map(d => `<button class="btn out" style="width:100%;margin-top:8px;justify-content:flex-start" data-d="${d.id}">🛵 ${esc(d.full_name)} — متاح</button>`).join('')
        : '<div class="empty">مفيش مندوبين متاحين حاليًا. تأكد إن حالة المندوب «متاح» وإنه نشط.</div>'}`);
    $('mod').onclick = async ev => {
      const x = ev.target.closest('[data-d]');
      if (!x) return;
      $('mod').onclick = null;
      closeModal();
      try {
        const { error } = await sb.rpc('assign_order_driver_secure', { p_order_id:o.id, p_driver_id:x.dataset.d });
        if (error) throw error;
        o.assigned_driver_id = x.dataset.d;
        ORD.set(o.id, o);
        paint(o);
        toast('تم تعيين السائق', 'ok');
      } catch (err) {
        shake(card);
        const raw = String(err?.message || err?.details || err || '');
        const friendly = raw.includes('DRIVER_NOT_AVAILABLE') ? 'المندوب ده مش متاح حاليًا. حدّث القائمة واختار مندوب حالته متاح.'
          : raw.includes('ORDER_NOT_ASSIGNABLE') ? 'تعيين المندوب متاح فقط لما الطلب يكون «جاهز» أو «في الطريق».'
          : raw.includes('DASHBOARD_ACCESS_DENIED') ? 'صلاحيات حسابك لا تسمح بتعيين المندوب.'
          : `مقدرناش نعيّن المندوب. التفاصيل: ${raw || 'خطأ غير معروف'}`;
        fail(err, friendly);
      }
    };
  }
}

async function askCancel(o, card) {
  openModal(`
    <h2>إلغاء #${esc(o.order_number ?? o.id)} <button class="close" onclick="closeModal()">✕</button></h2>
    <p style="color:var(--ink2);margin-bottom:12px">يرجى تحديد السبب.</p>
    <label>السبب</label>
    <select id="cxr">
      ${CANCEL_REASONS.map(r => `<option value="${esc(r.label)}">${esc(r.label)}</option>`).join('')}
    </select>
    <label>ملاحظة إضافية (اختياري)</label>
    <textarea id="cxn" rows="2"></textarea>
    <div class="row">
      <button class="btn out big dng" id="cxy">تأكيد الإلغاء</button>
      <button class="btn out big" id="cxnbtn">رجوع</button>
    </div>
  `);
  $('cxnbtn').onclick = closeModal;
  $('cxy').onclick = () => {
    const reason = $('cxr').value + ($('cxn').value.trim() ? ' — ' + $('cxn').value.trim() : '');
    closeModal();
    setStatus(o, 'cancelled', card, null, false, reason);
  };
}

async function setStatus(o, status, card, btn, fromDrag = false, reason = null) {
  if (btn) btn.disabled = true;
  const prev = o.status;
  try {
    const result = status === 'cancelled'
      ? await sb.rpc('cancel_order_with_reason_secure', {
          p_order_id: o.id, p_reason: reason || 'إلغاء من لوحة الإدارة'
        })
      : await sb.rpc('update_order_status_secure', {
          p_order_id: o.id, p_new_status: status
        });
    const { error } = result;
    if (error) throw error;
    o.status = status;
    if (reason) o.cancel_reason = reason;
    ORD.set(o.id, o);
    paint(o); badge();
    if (prev !== status) toast('تم التحديث', 'ok', 1500);
    // انتقالات الحالة في قاعدة البيانات أحادية الاتجاه؛ لا نعرض تراجعًا غير مدعوم.
  } catch (e) {
    if (btn) btn.disabled = false;
    if (card) shake(card);
    const raw = String(e?.message || e?.details || e || '');
    const friendly = raw.includes('ROLE_CANNOT_PERFORM_STATUS_TRANSITION') ? 'حسابك مش مسموح له ينفّذ الخطوة دي. جرّب بحساب المدير أو الشيف حسب الحالة.'
      : raw.includes('INVALID_STATUS_TRANSITION') ? 'مينفعش ننقل الطلب من حالته الحالية للحالة المطلوبة.'
      : raw.includes('DASHBOARD_ACCESS_DENIED') ? 'صلاحيات الحساب غير كافية. سجّل الدخول بالحساب الصحيح.'
      : raw.includes('ORDER_NOT_FOUND') ? 'الطلب مش موجود أو اتحدّث من جهاز آخر. حدّث الصفحة.'
      : raw.includes('ORDER_STATUS_MUST_USE_SECURE_RPC') ? 'حصل تعارض في تحديث الحالة. حدّث الصفحة وحاول تاني.'
      : `مقدرناش نحدّث حالة الطلب. التفاصيل: ${raw || 'خطأ غير معروف'}`;
    fail(e, friendly);
  }
}

function pushUndo(o, prevStatus, label) {
  const undo = {
    order: o, prevStatus, label,
    fn: async () => {
      try {
        const { error } = await sb.rpc('update_order_status_secure', {
          p_order_id: o.id, p_new_status: prevStatus
        });
        if (error) throw error;
        o.status = prevStatus; o.cancel_reason = null;
        ORD.set(o.id, o);
        paint(o); badge();
        toast('تم التراجع', 'ok');
      } catch (e) { fail(e); }
    }
  };
  undoStack.push(undo);
  const bar = document.createElement('div');
  bar.className = 'undo-bar';
  bar.innerHTML = `<span>${esc(label)} — تم</span><button id="undobtn">تراجع</button>`;
  document.body.appendChild(bar);
  const t = setTimeout(() => bar.remove(), 5000);
  bar.querySelector('#undobtn').onclick = () => {
    clearTimeout(t); undo.fn(); bar.remove();
  };
  bar.onclick = e => { if (e.target === bar) bar.remove(); };
}

async function openOrderDetail(o) {
  const items = o.order_items || [];
  const pay = payInfo(o.payment_method);
  const canAdvance = ST[o.status]?.next && can(ST[o.status].by);
  openModal(`
    <h2>#${esc(o.order_number ?? o.id)} <button class="close" onclick="closeModal()">✕</button></h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <span class="pay-badge" style="background:${pay.c}1a;border-color:${pay.c}55;color:${pay.c}">${pay.i} ${pay.l}</span>
      ${payStatusBadge(o.payment_status)}
      <span class="pay-badge">${ST[o.status]?.l || o.status}</span>
      <span class="pay-badge">${dt(o.created_at)}</span>
    </div>
    <div class="mod-grid">
      <div><small style="color:var(--ink2)">العميل</small><br><b>${esc(o.customer_name || '—')}</b></div>
      <div><small style="color:var(--ink2)">الموبايل</small><br><b dir="ltr">${esc(o.customer_phone || '—')}</b></div>
      <div style="grid-column:1/-1"><small style="color:var(--ink2)">العنوان</small><br>${esc(o.delivery_address || '—')}</div>
      ${o.notes ? `<div style="grid-column:1/-1;background:#EF6C0022;border-right:3px solid #EF6C00;padding:8px 12px;border-radius:8px">
        <small style="color:#EF6C00;font-weight:900">⚠️ تعليمات العميل</small><br><b>${esc(o.notes)}</b></div>` : ''}
      ${o.cancel_reason ? `<div style="grid-column:1/-1;background:#C6282822;border-right:3px solid #C62828;padding:8px 12px;border-radius:8px">
        <small style="color:#C62828;font-weight:900">سبب الإلغاء</small><br><b>${esc(o.cancel_reason)}</b></div>` : ''}
    </div>
    <section>
      <h3>🍔 الأصناف</h3>
      <table class="tbl"><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr></thead><tbody>
        ${items.map(i => `<tr>
          <td data-label="الصنف">${esc(i.item_name || i.name || '—')}
            ${i.addons ? `<div style="font-size:11px;color:var(--ink2);margin-top:2px">➕ ${esc(Array.isArray(i.addons) ? i.addons.map(a => a.name || a).join('، ') : i.addons)}</div>` : ''}
            ${i.notes ? `<div style="font-size:11px;color:#EF6C00;margin-top:2px">📝 ${esc(i.notes)}</div>` : ''}
          </td>
          <td data-label="الكمية">${i.quantity || 1}</td>
          <td data-label="السعر">${money(i.unit_price ?? i.price ?? 0)}</td>
        </tr>`).join('')}
      </tbody></table>
    </section>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg2);border-radius:12px;margin-top:12px">
      <span style="font-weight:700">الإجمالي</span><b style="font-size:18px">${money(o.total)}</b>
    </div>
    <section>
      <h3>⏱️ المراحل</h3>
      <ul class="timeline" id="tl"><li>جاري التحميل...</li></ul>
    </section>
    <div class="row">
      ${canAdvance ? `<button class="btn pri big" id="advm">${ST[o.status].n}</button>` : ''}
      <button class="btn out" id="printm">🖨️ طباعة</button>
      ${can(OM) && o.payment_status === 'paid' ? '<button class="btn out dng" id="refm">💸 استرداد</button>' : ''}
    </div>
  `, true);

  try {
    const { data: hist } = await sb.from('order_status_history')
      .select('*').eq('order_id', o.id).order('created_at', { ascending: true });
    const tl = $('tl');
    if (tl) tl.innerHTML = hist?.length
      ? hist.map(h => `<li class="done"><div class="t-lbl">${esc(ST[h.status]?.l || h.status)}</div><div class="t-time">${dt(h.created_at)}</div></li>`).join('')
      : `<li class="done"><div class="t-lbl">${ST[o.status]?.l || o.status}</div><div class="t-time">${dt(o.created_at)}</div></li>`;
  } catch {
    const tl = $('tl'); if (tl) tl.innerHTML = `<li><div class="t-lbl">${ST[o.status]?.l || o.status}</div></li>`;
  }

  if (canAdvance) $('advm').onclick = () => {
    closeModal();
    if (o.status === 'cancelled') setStatus(o, 'pending', null, null);
    else setStatus(o, ST[o.status].next, null, null);
  };
  if ($('printm')) $('printm').onclick = () => printInvoice(o);
  if ($('refm')) $('refm').onclick = () => openRefundForm(o);
}

function printInvoice(o) {
  const items = o.order_items || [];
  const pay = payInfo(o.payment_method);
  // Escape everything
  const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const w = window.open('', '_blank', 'width=400,height=600');
  if (!w) return toast('منع النوافذ المنبثقة', 'err');
  w.opener = null;
  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>فاتورة #${e(o.order_number ?? o.id)}</title>
    <style>body{font-family:Cairo,sans-serif;padding:20px;max-width:380px;margin:0 auto}
    h1{text-align:center;font-size:20px;margin:0 0 4px}small{color:#666;display:block;text-align:center;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;margin:8px 0}
    th,td{padding:6px;text-align:right;border-bottom:1px dashed #ccc;font-size:13px}
    th{background:#f5f5f5}.tot{font-size:18px;font-weight:900;display:flex;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:2px solid #000}
    .info{margin-bottom:8px;font-size:13px;line-height:1.8;word-break:break-word}
    @media print{button{display:none}}</style></head><body>
    <h1>🐑 Sheep & Burger</h1><small>${e(dt(o.created_at))}</small>
    <div class="info"><b>#${e(o.order_number ?? o.id)}</b><br>${e(o.customer_name || '')}<br><span dir="ltr">${e(o.customer_phone || '')}</span><br>${e(o.delivery_address || '')}<br><b>الدفع: ${e(pay.l)}</b></div>
    ${o.notes ? `<div style="background:#fff3e0;padding:6px;border-right:3px solid #ef6c00;margin:8px 0;font-size:12px"><b>ملاحظات:</b> ${e(o.notes)}</div>` : ''}
    <table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th></tr></thead>
    <tbody>${items.map(i => `<tr><td>${e(i.item_name || i.name || '')}</td><td>${e(i.quantity || 1)}</td><td>${e(money(i.unit_price ?? i.price ?? 0))}</td></tr>`).join('')}</tbody></table>
    <div class="tot"><span>الإجمالي</span><span>${e(money(o.total))}</span></div>
    <p style="text-align:center;margin-top:20px;font-size:12px">شكرًا لطلبك 🍔</p>
    <button onclick="window.print()" style="display:block;margin:20px auto;padding:10px 20px;cursor:pointer;background:#D9401F;color:#fff;border:0;border-radius:8px;font-family:inherit;font-weight:700">طباعة</button>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>
    <noscript><div style="padding:24px;text-align:center;font-family:sans-serif">يجب تفعيل JavaScript لاستخدام لوحة تحكم Sheep &amp; Burger.</div></noscript>
</body></html>`;
  w.document.write(html);
  w.document.close();
}

function applyFilter() {
  const board = $('board'); if (!board) return;
  const q = searchTerm.toLowerCase();
  board.querySelectorAll('.ocard').forEach(c => {
    const txt = (c.dataset.s || '').toLowerCase();
    const pay = c.dataset.pay || '';
    const matchQ = !q || txt.includes(q);
    const matchPay = !payFilter || pay === payFilter;
    c.classList.toggle('hide', !(matchQ && matchPay));
  });
  counts();
}

