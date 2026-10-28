/* ═══════════════════════════════════════════════════
   SECTION 12 · VIEWS
   ═══════════════════════════════════════════════════ */
const VIEWS = {};

/* ─── DASHBOARD ─── */
VIEWS.dashboard = async v => {
  const all = [...ORD.values()];
  const today = all.filter(o => new Date(o.created_at) >= todayStart() && countable(o));
  const yest = all.filter(o => {
    const t = new Date(o.created_at);
    return t >= yesterdayStart() && t < todayStart() && countable(o);
  });
  const todayRev = today.reduce((s, o) => s + Number(o.total || 0), 0);
  const yestRev = yest.reduce((s, o) => s + Number(o.total || 0), 0);
  const revDelta = yestRev ? Math.round(((todayRev - yestRev) / yestRev) * 100) : 0;
  const active = all.filter(o => KCOLS.includes(o.status)).length;
  const pending = all.filter(o => o.status === 'pending').length;
  const cancelled = all.filter(o => o.status === 'cancelled' && new Date(o.created_at) >= todayStart()).length;
  const cancelRate = today.length ? Math.round(100 * cancelled / (today.length + cancelled)) : 0;
  const avgOrder = today.length ? Math.round(todayRev / today.length) : 0;

  const paySum = {};
  today.forEach(o => {
    const k = String(o.payment_method || 'cash').toLowerCase();
    paySum[k] = (paySum[k] || 0) + Number(o.total || 0);
  });

  // 24-hour chart
  const hours = Array(24).fill(0);
  today.forEach(o => { hours[new Date(o.created_at).getHours()] += Number(o.total || 0); });
  const hourLabels = hours.map((_, i) => i % 3 === 0 ? `${i}h` : '');

  // Top items today
  const todayItems = {};
  today.forEach(o => (o.order_items || []).forEach(i => {
    const n = i.item_name || i.name || '—';
    todayItems[n] = (todayItems[n] || 0) + (i.quantity || 1);
  }));
  const topItems = Object.entries(todayItems).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Week comparison
  const weekStart = todayStart() - 6 * 864e5;
  const lastWeekStart = weekStart - 7 * 864e5;
  const weekRev = all.filter(o => new Date(o.created_at) >= weekStart && countable(o))
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const lastWeekRev = all.filter(o => new Date(o.created_at) >= lastWeekStart && new Date(o.created_at) < weekStart && countable(o))
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const weekDelta = lastWeekRev ? Math.round(((weekRev - lastWeekRev) / lastWeekRev) * 100) : 0;

  // Active drivers
  const activeDrivers = DRV.filter(d => d.availability === 'available' || d.availability === 'busy').length;

  const recent = all.slice(0, 6);

  v.innerHTML = `
    <div class="stats">
      <div class="stat clickable" onclick="document.querySelector('[data-p=orders]').click()">
        <small>إيراد اليوم</small><b data-s="rev" data-m="1">0</b>
        ${yestRev ? `<span class="delta ${revDelta >= 0 ? 'up' : 'down'}">${revDelta >= 0 ? '↑' : '↓'} ${Math.abs(revDelta)}%</span>` : ''}
      </div>
      <div class="stat clickable" onclick="document.querySelector('[data-p=orders]').click()">
        <small>طلبات اليوم</small><b data-s="cnt">0</b>
      </div>
      <div class="stat clickable" onclick="document.querySelector('[data-p=orders]').click()">
        <small>نشطة</small><b data-s="act">0</b>
        ${pending > 0 ? `<span class="delta down">${pending} جديد</span>` : ''}
      </div>
      <div class="stat clickable" onclick="document.querySelector('[data-p=orders]').click()">
        <small>متوسط الطلب</small><b data-s="avg" data-m="1">0</b>
      </div>
      <div class="stat clickable" onclick="document.querySelector('[data-p=drivers]').click()">
        <small>سائقين نشطين</small><b data-s="drv">0</b>
      </div>
      <div class="stat">
        <small>إلغاء %</small><b data-s="cxl">0</b>
      </div>
      <div class="stat">
        <small>إيراد 7 أيام</small><b data-s="week" data-m="1">0</b>
        ${lastWeekRev ? `<span class="delta ${weekDelta >= 0 ? 'up' : 'down'}">${weekDelta >= 0 ? '↑' : '↓'} ${Math.abs(weekDelta)}%</span>` : ''}
      </div>
    </div>
    <div class="chart-grid">
      <div class="chart-card">
        <h3>📊 الإيراد على مدار اليوم</h3>
        <canvas id="ch-hour" aria-label="مخطط الإيراد على مدار 24 ساعة"></canvas>
      </div>
      <div class="chart-card">
        <h3>💳 طرق الدفع</h3>
        <canvas id="ch-pay" aria-label="مخطط طرق الدفع"></canvas>
        <div class="chart-legend" id="pay-legend"></div>
      </div>
    </div>
    ${topItems.length ? `
    <div class="chart-card">
      <h3>🔥 الأكثر مبيعًا اليوم</h3>
      ${topItems.map(([n, c], i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--line)">
          <span style="width:22px;height:22px;border-radius:6px;background:var(--pri);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:900">${i+1}</span>
          <span style="flex:1;font-weight:700;font-size:13px">${esc(n)}</span><b>${c}</b>
        </div>`).join('')}
    </div>` : ''}
    <div class="chart-card">
      <h3>آخر الطلبات <button class="btn out sm" onclick="document.querySelector('[data-p=orders]').click()">الكل</button></h3>
      ${recent.length ? recent.map(o => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);gap:8px;flex-wrap:wrap;font-size:13px">
          <b>#${esc(o.order_number ?? o.id)}</b>
          <span style="flex:1;min-width:100px">${esc(o.customer_name || '')}</span>
          ${payBadge(o.payment_method)}
          <b>${money(o.total)}</b>
        </div>`).join('') : '<div class="empty">لسه مفيش طلبات</div>'}
    </div>`;

  animateTo(document.querySelector('[data-s="rev"]'), todayRev);
  animateTo(document.querySelector('[data-s="cnt"]'), today.length);
  animateTo(document.querySelector('[data-s="act"]'), active);
  animateTo(document.querySelector('[data-s="avg"]'), avgOrder);
  animateTo(document.querySelector('[data-s="drv"]'), activeDrivers);
  animateTo(document.querySelector('[data-s="cxl"]'), cancelRate);
  animateTo(document.querySelector('[data-s="week"]'), weekRev);

  requestAnimationFrame(() => {
    onChart($('ch-hour'), cv => barChart(cv, hourLabels, hours, ['#D9401F']));
    onChart($('ch-pay'), cv => {
      const parts = Object.entries(paySum).map(([k, val]) => ({ v: val, c: payInfo(k).c, l: payInfo(k).l, i: payInfo(k).i }));
      if (parts.length) {
        donutChart(cv, parts);
        $('pay-legend').innerHTML = parts.map(p => `
          <div class="legend-item">
            <span class="legend-dot" style="background:${p.c}"></span>
            ${p.i} ${esc(p.l)}: <b>${moneyLTR(p.v)}</b>
          </div>`).join('');
      }
    });
  });
};

function stats() {
  if (page !== 'dashboard') return;
  const all = [...ORD.values()], t0 = todayStart(), wk = t0 - 6 * 864e5, sum = a => a.reduce((s, o) => s + Number(o.total || 0), 0);
  const today = all.filter(o => new Date(o.created_at) >= t0 && countable(o));
  const cancelled = all.filter(o => o.status === 'cancelled' && new Date(o.created_at) >= t0).length;
  const vals = {
    rev: sum(today), cnt: today.length,
    act: all.filter(o => KCOLS.includes(o.status)).length,
    avg: today.length ? Math.round(sum(today) / today.length) : 0,
    drv: DRV.filter(d => d.availability === 'available' || d.availability === 'busy').length,
    cxl: today.length + cancelled ? Math.round(100 * cancelled / (today.length + cancelled)) : 0,
    week: sum(all.filter(o => new Date(o.created_at) >= wk && countable(o)))
  };
  document.querySelectorAll('[data-s]').forEach(el => {
    const t = vals[el.dataset.s];
    if (t !== undefined && Number(el.dataset.v || 0) !== t) animateTo(el, t);
  });
}

/* ─── ORDERS ─── */
VIEWS.orders = async v => {
  v.innerHTML = `
    <div class="bar">
      <input id="oq" type="search" placeholder="🔍 بحث..." value="${esc(searchTerm)}" aria-label="بحث">
      <select id="pf" style="max-width:180px" aria-label="طريقة الدفع">
        <option value="">💳 كل الدفع</option>
        ${Object.entries(PAY).map(([k, p]) => `<option value="${k}" ${payFilter === k ? 'selected' : ''}>${p.i} ${p.l}</option>`).join('')}
      </select>
      <button class="btn out sm" id="refresh" title="تحديث (R)">🔄</button>
    </div>
    <div id="bulk-container"></div>
    <div class="board" id="board">
      ${KCOLS.map(s => `<section class="col" data-col="${s}">
        <h3 onclick="this.parentNode.classList.toggle('is-collapsed')">${ST[s].l}<b data-cnt>0</b></h3>
        <div class="list"></div>
      </section>`).join('')}
    </div>`;

  [...ORD.values()].reverse().forEach(paint);
  applyFilter();

  $('oq').oninput = debounce(e => { searchTerm = e.target.value.trim(); applyFilter(); }, 200);
  $('pf').onchange = e => { payFilter = e.target.value; applyFilter(); };
  $('refresh').onclick = () => { loadOrders().then(() => go('orders')); };
  $('board').onclick = boardClick;
  updateBulkBar();
};

function updateBulkBar() {
  const c = $('bulk-container');
  if (!c) return;
  if (selectionSet.size === 0) { c.innerHTML = ''; return; }
  c.innerHTML = `<div class="bulk-bar">
    <b>${selectionSet.size} محدد</b>
    <button class="btn out" onclick="bulkAction('advance')">▶️ تأكيد</button>
    <button class="btn out dng" onclick="bulkAction('cancel')">❌ إلغاء</button>
    <button class="btn out" onclick="selectionSet.clear();document.querySelectorAll('.ocard.selected').forEach(e=>e.classList.remove('selected'));updateBulkBar();counts()">إلغاء التحديد</button>
  </div>`;
}

async function bulkAction(action) {
  const orders = [...selectionSet].map(id => ORD.get(id)).filter(Boolean);
  const isCancel = action === 'cancel';
  const valid = orders.filter(o => isCancel
    ? !['delivered','cancelled'].includes(o.status) && can([...OM, 'cashier'])
    : ST[o.status]?.next && can(ST[o.status].by));
  if (!valid.length) return toast('لا يوجد طلبات قابلة', 'err');
  if (!await ask(isCancel ? 'إلغاء جماعي' : 'تأكيد جماعي', `سيتم ${isCancel ? 'إلغاء' : 'تقديم'} ${valid.length} طلب.`, 'تأكيد')) return;
  let done = 0;
  for (const o of valid) {
    const next = isCancel ? 'cancelled' : ST[o.status].next;
    const result = isCancel
      ? await sb.rpc('cancel_order_with_reason_secure', { p_order_id: o.id, p_reason: 'إلغاء جماعي' })
      : await sb.rpc('update_order_status_secure', { p_order_id: o.id, p_new_status: next });
    const { error } = result;
    if (error) { console.warn(error); continue; }
    o.status = next; if (isCancel) o.cancel_reason = 'إلغاء جماعي';
    ORD.set(o.id, o); paint(o); done++;
  }
  selectionSet.clear();
  document.querySelectorAll('.ocard.selected').forEach(e => e.classList.remove('selected'));
  updateBulkBar(); badge(); counts();
  toast(`تم ${done} من ${valid.length}`, done === valid.length ? 'ok' : 'wr');
}

/* ─── MENU ─── */
VIEWS.menu = async v => {
  const r = await safeQuery(() => sb.from('menu_items').select('*,item_sizes(price,label_ar,is_available)').order('sort_order').order('name_ar'), null);
  if (!r.data) { v.innerHTML = notInstalledMsg('menu_items'); return; }
  const data = r.data;
  const edit = can(OM);
  const canChange = can(OM);

  // Fetch categories for filter
  const [cats, subcategories] = await Promise.all([
    safeQuery(() => sb.from('categories').select('id,name_ar').eq('is_active', true).order('sort_order'), []),
    safeQuery(() => sb.from('subcategories').select('id,name_ar').eq('is_active', true).order('sort_order'), [])
  ]);
  const catMap = new Map((cats.data || []).map(c => [c.id, c.name_ar]));
  const subcategoryMap = new Map((subcategories.data || []).map(c => [c.id, c.name_ar]));
  const catOf = m => catMap.get(m.category_id) || m.category || '';
  const subcatOf = m => subcategoryMap.get(m.subcategory_id) || m.subcategory_ar || '';

  v.innerHTML = `
    <div class="tabs" role="tablist" aria-label="قائمة الطعام">
      <button class="on" type="button" data-food-tab="products" role="tab" aria-selected="true">🍔 المنتجات</button>
      <button type="button" data-food-tab="categories" role="tab" aria-selected="false">📂 التصنيفات</button>
      <button type="button" data-food-tab="subcategories" role="tab" aria-selected="false">📁 تصنيفات فرعية</button>
      <button type="button" data-food-tab="addons" role="tab" aria-selected="false">➕ الإضافات</button>
    </div>
    <div class="head">
      <span>${data.length} صنف</span>
      <div class="row">
        ${edit ? '<button class="btn out sm" id="bulk-edit">تعديل جماعي</button>' : ''}
        ${edit ? '<button class="btn pri" id="addm">+ صنف جديد</button>' : ''}
      </div>
    </div>
    <div class="filters">
      <input id="mq" type="search" placeholder="🔍 بحث بالاسم أو الفئة">
      <select id="mc" aria-label="الفئة">
        <option value="">📂 كل الفئات</option>
        ${(cats.data || []).map(c => `<option value="${esc(c.name_ar)}">${esc(c.name_ar)}</option>`).join('')}
      </select>
      <select id="mavail" aria-label="التوفر">
        <option value="">الكل</option>
        <option value="1">متوفر</option>
        <option value="0">غير متوفر</option>
      </select>
    </div>
    <div class="grid" id="mg">${data.map(m => {
      const badgeValues = [...(Array.isArray(m.badges) ? m.badges : []), ...(m.display_badge ? [m.display_badge] : [])];
      const badges = badgeValues.map(b => `<span class="badge-ico">${esc(typeof b === 'string' ? b : (b.name_ar || b.label || ''))}</span>`).join('') + (m.is_secret ? '<span class="badge-ico" title="مخصص للمنيو السري فقط">🔐 كود سري</span>' : '');
      const priceValues = (m.item_sizes || []).filter(z=>z.is_available!==false).map(z=>Number(z.price)).filter(Number.isFinite);
      const displayPrice = priceValues.length ? money(Math.min(...priceValues)) : '—';
      return `
      <div class="mi ${m.is_available === false ? 'off' : ''}" data-id="${m.id}" data-s="${esc((m.name_ar || '') + ' ' + (m.name_en || '') + ' ' + catOf(m))}" data-avail="${m.is_available === false ? 0 : 1}">
        ${badges ? `<div class="badges">${badges}</div>` : ''}
        ${m.image_url ? `<img loading="lazy" src="${esc(m.image_url)}" alt="" onerror="this.parentNode.querySelector('img').outerHTML='<div class=\\'no-img\\'>🍽️</div>'">` : '<div class="no-img">🍽️</div>'}
        <div>
          <b>${esc(m.name_ar || m.name_en || '')}</b>
          <span style="color:var(--ink2);font-size:12px">${displayPrice}</span>
          ${catOf(m) ? `<span style="font-size:11px;color:var(--ink2)">📂 ${esc(catOf(m))}</span>` : ''}
          ${subcatOf(m) ? `<span style="font-size:11px;color:var(--ink2)">↳ ${esc(subcatOf(m))}</span>` : ''}
          ${m.is_spicy ? `<span style="font-size:11px;color:#C62828">🌶️ حار</span>` : ''}
          ${m.is_vegetarian ? `<span style="font-size:11px;color:#388E3C">🌱 نباتي</span>` : ''}
          ${m.is_popular ? `<span style="font-size:11px;color:#EF6C00">🔥 الأكثر طلبًا</span>` : ''}
          ${m.free_delivery ? `<span style="font-size:11px;color:#0277BD">🛵 توصيل مجاني</span>` : ''}
          ${canChange ? `<div class="row">
            <button class="btn ${m.is_available === false ? 'pri' : 'out'} sm" data-a="tg">${m.is_available === false ? 'تشغيل' : 'إيقاف'}</button>
            <button class="btn out sm" data-a="ed">✏️</button>
            ${edit ? `<button class="btn out dng sm" data-a="del">🗑️</button>` : ''}
          </div>` : ''}
        </div>
      </div>`;
    }).join('')}</div>`;

  v.querySelectorAll('[data-food-tab]').forEach(tab => tab.onclick = async () => {
    if (tab.dataset.foodTab === 'addons') { await VIEWS.addons(v); return; }
    if (tab.dataset.foodTab === 'subcategories') { await renderSubcategoriesPanel(v); return; }
    if (tab.dataset.foodTab === 'categories') {
      await renderCategoriesPanel(v);
      const tabs = v.querySelectorAll('[data-food-tab]');
      tabs.forEach(t => { t.classList.toggle('on', t.dataset.foodTab === 'categories'); t.setAttribute('aria-selected', t.dataset.foodTab === 'categories' ? 'true' : 'false'); });
    }
  });

  const filterM = () => {
    const q = $('mq').value.trim().toLowerCase();
    const cat = $('mc').value;
    const av = $('mavail').value;
    document.querySelectorAll('#mg .mi').forEach(c => {
      const txt = c.dataset.s.toLowerCase();
      const match = (!q || txt.includes(q)) &&
                    (!cat || txt.includes(cat.toLowerCase())) &&
                    (!av || c.dataset.avail === av);
      c.classList.toggle('hide', !match);
    });
  };
  $('mq').oninput = debounce(filterM, 200);
  $('mc').onchange = filterM;
  $('mavail').onchange = filterM;

  $('mg').onclick = async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const card = b.closest('.mi'), id = card.dataset.id;
    if (b.dataset.a === 'tg') {
      const on = card.classList.contains('off');
      const { error } = await sb.from('menu_items').update({ is_available: on }).eq('id', id);
      if (error) { shake(card); return fail(error); }
      card.classList.toggle('off', !on);
      b.textContent = on ? 'إيقاف' : 'تشغيل';
      b.className = 'btn ' + (on ? 'out' : 'pri') + ' sm';
    } else if (b.dataset.a === 'ed') {
      const { data: m } = await sb.from('menu_items').select('*').eq('id', id).maybeSingle();
      if (m) openMenuForm(m);
    } else if (b.dataset.a === 'del') {
      if (!await ask('حذف', `حذف "${card.querySelector('b').textContent}"؟ لا يمكن التراجع.`, 'حذف')) return;
      const { error } = await sb.from('menu_items').update({is_available:false}).eq('id', id);
      if (error) return fail(error);
      toast('تم إيقاف الصنف بدل حذفه لحماية الطلبات القديمة', 'ok'); go('menu');
    }
  };
  if ($('addm')) $('addm').onclick = () => openMenuForm(null);
};

function openMenuForm(m) {
  const isEdit = !!m;
  // Show the modal immediately instead of waiting for all database lookups.
  // Previously a slow/failing categories or addons request left the button looking unresponsive.
  openModal(`<h2>${isEdit ? 'تعديل الصنف' : 'صنف جديد'}</h2><div style="padding:18px 4px;text-align:center"><div class="sk"></div><p>جاري تحميل بيانات الصنف والتصنيفات…</p><button type="button" class="btn out" id="menu-form-cancel" style="margin-top:12px">إلغاء</button></div>`, true);
  $('menu-form-cancel').onclick = closeModal;
  // Fetch related data
  Promise.all([
    safeQuery(() => sb.from('categories').select('*').eq('is_active', true).order('sort_order'), []),
    safeQuery(() => sb.from('addons').select('*').eq('is_available', true).order('sort_order'), []),
    safeQuery(() => sb.from('subcategories').select('id,category_id,name_ar,sort_order,is_active').eq('is_active', true).order('sort_order'), []),
    isEdit ? safeQuery(() => sb.from('item_sizes').select('*').eq('item_id', m.id).order('sort_order'), []) : { data: [] },
    isEdit ? safeQuery(() => sb.from('item_addons').select('addon_id').eq('item_id', m.id), []) : { data: [] }
  ]).then(([cats, addons, subcategories, sizes, itemAddons]) => {
    const selAllerg = new Set(m?.allergens || []);
    const selAddon = new Set((itemAddons.data || []).map(a => a.addon_id));
    const selBadge = new Set();
    const sizesList = (sizes.data || []).map(z => ({name_ar:z.label_ar, price:Number(z.price)}));
    if (!sizesList.length) sizesList.push({name_ar:'عادي',price:0});

    openModal(`
      <h2>${isEdit ? 'تعديل' : 'صنف جديد'} <button class="close" onclick="closeModal()">✕</button></h2>
      <div class="tabs">
        <button class="on" data-tab="basic">الأساسيات</button>
        <button data-tab="price">الأسعار والأحجام</button>
        <button data-tab="details">تفاصيل</button>
        <button data-tab="relations">الإضافات والحساسية</button>
      </div>
      <div data-panel="basic">
        <label>اسم المنتج الذي سيظهر للعميل *</label><input id="m_ar" value="${esc(m?.name_ar || '')}" maxlength="200">
                <label>وصف المنتج (اختياري)</label><textarea id="m_desc">${esc(m?.description_ar || '')}</textarea>
        <label>قسم قائمة الطعام *</label>
        <select id="m_cat_id">
          <option value="">— بدون —</option>
          ${(cats.data || []).map(c => `<option value="${c.id}" ${m?.category_id === c.id ? 'selected' : ''}>${esc(c.name_ar)}</option>`).join('')}
        </select>
        <label>التصنيف الفرعي (اختياري) <small>يظهر تحت القسم الرئيسي لتقسيم المنيو إلى مجموعات أدق</small></label>
        <select id="m_subcat_id"><option value="">بدون تصنيف فرعي</option>${(subcategories.data||[]).filter(sc=>sc.category_id===(m?.category_id||'')).map(sc=>`<option value="${sc.id}" ${m?.subcategory_id===sc.id?'selected':''}>${esc(sc.name_ar)}</option>`).join('')}</select>
        <label>رابط صورة المنتج (HTTPS، اختياري)</label><input id="m_img" dir="ltr" value="${esc(m?.image_url || '')}" placeholder="https://...">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <label style="margin:0;display:flex;align-items:center;gap:6px"><input type="checkbox" id="m_avail" ${m?.is_available !== false ? 'checked' : ''}> متوفر</label>
        </div>
      </div>
      <div data-panel="price" class="hidden">
        <section>
          <h3>أحجام المنتج وأسعارها</h3><p style="font-size:12px;color:var(--ink2);line-height:1.7">أضف كل حجم وسعره بشكل منفصل. مثال: عادي — 100 جنيه، كبير — 150 جنيه. يجب إضافة حجم واحد على الأقل وسعره أكبر من صفر.</p>
          <div id="sizes-list"></div>
          <button type="button" class="btn out sm" id="add-size" style="margin-top:8px">+ حجم</button>
        </section>
      </div>
      <div data-panel="details" class="hidden">
        <label>مكونات المنتج (افصل بينها بفواصل)</label><textarea id="m_ingr">${esc(Array.isArray(m?.ingredients_ar) ? m.ingredients_ar.join(', ') : (m?.ingredients_ar || ''))}</textarea>
        <label>رمز داخلي للمنتج (اختياري — اتركه كما هو)</label><input id="m_slug" dir="ltr" value="${esc(m?.slug || '')}">
        <label>عبارة صغيرة على المنتج (اختياري)</label><input id="m_badge" maxlength="30" value="${esc(m?.display_badge || '')}">
        <label>مسببات الحساسية المحتملة (افصل بينها بفواصل)</label><input id="m_allergens" value="${esc((m?.allergens || []).join(', '))}">
        <div class="toggle"><span>🌶️ حار</span><input type="checkbox" id="m_spicy" ${m?.is_spicy ? 'checked' : ''}></div>
        <div class="toggle"><span>🌱 نباتي</span><input type="checkbox" id="m_veg" ${m?.is_vegetarian ? 'checked' : ''}></div>
        <div class="toggle"><span>🔥 الأكثر طلبًا</span><input type="checkbox" id="m_popular" ${m?.is_popular ? 'checked' : ''}></div>
        <div class="toggle"><span>🛵 توصيل مجاني لهذا الصنف</span><input type="checkbox" id="m_free_delivery" ${m?.free_delivery ? 'checked' : ''}></div>
        <div class="toggle"><span>🤫 إظهار الصنف في المنيو السري فقط</span><input type="checkbox" id="m_secret" ${m?.is_secret ? 'checked' : ''}></div>
        <p style="font-size:12px;color:var(--ink2);line-height:1.8;margin-top:6px">🔐 عند تفعيل الاختيار يظهر على بطاقة المنتج شارة «كود سري» ويختفي من المنيو العادي. لا يمكن تخصيص منتج مرتبط بعرض نشط للمنيو السري، ولا تفعيل عرض على منتج سري. بعد الحفظ اربطه بكود من قسم المنيو السري.</p>
      </div>
      <div data-panel="relations" class="hidden">
        <section>
          <h3>الإضافات المتاحة</h3>
          <div class="chips" id="addon-chips">
            ${(addons.data || []).map(a => `<label class="chip ${selAddon.has(a.id) ? 'on' : ''}" data-addon="${a.id}">${esc(a.name_ar)} +${money(a.price || 0)}</label>`).join('') || '<span style="color:var(--ink2);font-size:12px">لا توجد إضافات — أضفها من قسم الإضافات</span>'}
          </div>
        </section>
      </div>
      <div class="row" style="margin-top:16px;position:sticky;bottom:-22px;background:var(--sf);padding:12px 0;border-top:1px solid var(--line)">
        <button class="btn pri big" id="m_save">💾 حفظ</button>
        <button class="btn out big" onclick="closeModal()">إلغاء</button>
      </div>
    `, true);

    // Tabs
    $('mod').querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
      $('mod').querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
      $('mod').querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== b.dataset.tab));
    });
    $('m_cat_id').onchange = () => {
      const selectedCategory = $('m_cat_id').value;
      const options = (subcategories.data||[]).filter(sc=>sc.category_id===selectedCategory);
      $('m_subcat_id').innerHTML = '<option value="">بدون تصنيف فرعي</option>' + options.map(sc=>`<option value="${sc.id}">${esc(sc.name_ar)}</option>`).join('');
    };
    // Chips
    $('mod').querySelectorAll('[data-badge],[data-allerg],[data-addon]').forEach(c => {
      c.onclick = e => {
        e.preventDefault();
        c.classList.toggle('on');
      };
    });
    // Sizes
    const sizesList_el = $('sizes-list');
    const renderSizes = () => {
      sizesList_el.innerHTML = $('mod')._sizes.map((s, i) => `
        <div style="display:grid;grid-template-columns:minmax(0,1fr) 100px 40px;gap:6px;margin-top:6px">
          <input data-size-name="${i}" placeholder="اسم الحجم (مثال: عادي أو كبير)" title="اكتب اسم الحجم الذي سيختاره العميل" value="${esc(s.name_ar || '')}" maxlength="40">
          <input data-size-price="${i}" type="number" inputmode="decimal" min="0" step="0.01" placeholder="السعر بالجنيه" title="سعر هذا الحجم بالجنيه المصري" value="${Number.isFinite(Number(s.price)) && Number(s.price) > 0 ? Number(s.price) : ''}">
          <button type="button" class="btn out sm dng" data-size-remove="${i}" aria-label="حذف الحجم">✕</button>
        </div>
      `).join('') || '<span style="color:var(--ink2);font-size:12px">لا توجد أحجام بعد — اضغط «+ حجم» لإضافة حجم</span>';

      sizesList_el.querySelectorAll('[data-size-name]').forEach(input => {
        input.addEventListener('input', e => {
          const i = Number(e.currentTarget.dataset.sizeName);
          if ($('mod')._sizes[i]) $('mod')._sizes[i].name_ar = e.currentTarget.value;
        });
      });
      sizesList_el.querySelectorAll('[data-size-price]').forEach(input => {
        input.addEventListener('input', e => {
          const i = Number(e.currentTarget.dataset.sizePrice);
          if ($('mod')._sizes[i]) $('mod')._sizes[i].price = parseNumber(e.currentTarget.value);
        });
      });
      sizesList_el.querySelectorAll('[data-size-remove]').forEach(button => {
        button.addEventListener('click', e => {
          const i = Number(e.currentTarget.dataset.sizeRemove);
          $('mod')._sizes.splice(i, 1);
          renderSizes();
        });
      });
    };
    $('mod')._sizes = sizesList.map(s => ({...s}));
    $('mod')._renderSizes = renderSizes;
    renderSizes();
    $('add-size').onclick = () => { $('mod')._sizes.push({ name_ar:'', price:0 }); renderSizes(); };

    $('m_save').onclick = async () => {
      const ar = $('m_ar').value.trim();
      if (!ar) { toast('الاسم مطلوب', 'err'); return; }
      if (!$('m_cat_id').value) { toast('اختر القسم', 'err'); return; }

      const validSizes = ($('mod')._sizes || []).filter(x => x.name_ar && Number(x.price) > 0).map(x => ({ name_ar: x.name_ar, price: Number(x.price) }));
      if (!validSizes.length) { toast('أضف حجمًا واحدًا على الأقل بسعر أكبر من صفر', 'err'); return; }
      const payload = {
        name_ar: ar,
        description_ar: $('m_desc').value.trim() || null,
        category_id: $('m_cat_id').value || null,
        subcategory_id: $('m_subcat_id').value || null,
        subcategory_ar: $('m_subcat_id').value ? ((subcategories.data||[]).find(sc=>sc.id===$('m_subcat_id').value)?.name_ar || null) : null,
        image_url: $('m_img').value.trim() || null,
        is_available: $('m_avail').checked,
        ingredients_ar: $('m_ingr').value.split(',').map(x=>x.trim()).filter(Boolean),
        allergens: $('m_allergens').value.split(',').map(x=>x.trim()).filter(Boolean),
        display_badge: $('m_badge').value.trim() || null,
        slug: ($('m_slug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') || `item-${Date.now()}`),
        is_spicy: $('m_spicy').checked,
        is_vegetarian: $('m_veg').checked,
        is_popular: $('m_popular').checked,
        free_delivery: $('m_free_delivery').checked,
        is_secret: $('m_secret').checked
      };

      try {
        let itemId = m?.id;
        if (isEdit) {
          const { error } = await sb.from('menu_items').update(payload).eq('id', itemId);
          if (error) throw error;
        } else {
          const { data, error } = await sb.from('menu_items').insert(payload).select('id').single();
          if (error) throw error;
          itemId = data.id;
        }
        const pick = k => [...$('mod').querySelectorAll(`[data-${k}].on`)].map(c => c.dataset[k]);
        const rel = await sb.rpc('set_menu_item_relations', {
          p_item: itemId, p_allergens: null, p_addons: pick('addon'), p_badges: null, p_sizes: validSizes
        });
        if (rel.error) throw rel.error;
        closeModal(); toast('تم الحفظ', 'ok'); go('menu');
      } catch (e) { const msg=String(e?.message||e||''); if (/SECRET_ITEM_PROMOTION_CONFLICT|PROMOTION_SECRET_ITEM_CONFLICT|SECRET_CODE_ITEM_NOT_ELIGIBLE|23514/i.test(msg)) { toast('لا يمكن تخصيص المنتج للكود السري لأنه مرتبط بعرض نشط. أوقف العرض أولًا أو اختر منتجًا آخر.', 'err'); } else { shake($('mod')); fail(e); } }
    };
  }).catch(err => {
    console.error('openMenuForm failed', err);
    openModal(`<h2>تعذر فتح نموذج الصنف</h2><p style="margin:12px 0">${esc(err?.message || 'حصل خطأ أثناء تحميل بيانات النموذج')}</p><div class="row"><button type="button" class="btn out big" onclick="closeModal()">إغلاق</button><button type="button" class="btn pri big" id="retry-menu-form">إعادة المحاولة</button></div>`, true);
    $('retry-menu-form').onclick = () => openMenuForm(m);
  });
}

/* ─── CATEGORIES ─── */
async function renderCategoriesPanel(v) {
  const r = await safeQuery(() => sb.from('categories').select('*').order('sort_order').order('name_ar'), null);
  if (!r.data) { v.innerHTML = notInstalledMsg('categories'); return; }
  const data = r.data;
  const edit = can(OM);

  v.innerHTML = `
    <div class="tabs" role="tablist" aria-label="قائمة الطعام">
      <button type="button" data-food-tab="products" role="tab" aria-selected="false">🍔 المنتجات</button>
      <button class="on" type="button" data-food-tab="categories" role="tab" aria-selected="true">📂 التصنيفات</button>
      <button type="button" data-food-tab="subcategories" role="tab" aria-selected="false">📁 تصنيفات فرعية</button>
      <button type="button" data-food-tab="addons" role="tab" aria-selected="false">➕ الإضافات</button>
    </div>
    <div class="head"><span>${data.length} تصنيف</span>${edit ? '<button class="btn pri" id="addc">+ تصنيف</button>' : ''}</div>
    <table class="tbl"><thead><tr><th>الاسم</th><th>Slug</th><th>الترتيب</th><th>الحالة</th>${edit ? '<th></th>' : ''}</tr></thead>
    <tbody>${data.map(c => `<tr data-id="${c.id}">
      <td data-label="الاسم"><b>${esc(c.name_ar)}</b>${c.name_en ? `<br><small style="color:var(--ink2)">${esc(c.name_en)}</small>` : ''}</td>
      <td data-label="Slug" dir="ltr">${esc(c.slug || '—')}</td>
      <td data-label="الترتيب">${c.sort_order || 0}</td>
      <td data-label="الحالة">${c.is_active !== false ? '✅' : '⛔'}</td>
      ${edit ? `<td data-label=""><div class="row"><button class="btn out sm" data-a="ed">✏️</button><button class="btn out dng sm" data-a="del">🗑️</button></div></td>` : ''}
    </tr>`).join('') || '<tr><td colspan="5" class="empty">لا تصنيفات</td></tr>'}</tbody></table>`;

  v.querySelectorAll('[data-food-tab="products"]').forEach(b => b.onclick = () => VIEWS.menu(v));
  v.querySelectorAll('[data-food-tab="addons"]').forEach(b => b.onclick = () => VIEWS.addons(v));
  v.querySelectorAll('[data-food-tab="subcategories"]').forEach(b => b.onclick = () => renderSubcategoriesPanel(v));
  if (edit) {
    $('addc').onclick = () => openCategoryForm(null);
    v.querySelectorAll('[data-a="ed"]').forEach(b => b.onclick = () => {
      const id = b.closest('tr').dataset.id;
      openCategoryForm(data.find(c => c.id === id));
    });
    v.querySelectorAll('[data-a="del"]').forEach(b => b.onclick = async () => {
      const id = b.closest('tr').dataset.id;
      if (!await ask('تعطيل', 'تعطيل التصنيف؟ سيبقى محفوظًا لحماية الأصناف والطلبات القديمة.', 'تعطيل')) return;
      const { error } = await sb.from('categories').update({is_active:false}).eq('id', id);
      if (error) return fail(error);
      toast('تم تعطيل التصنيف بدل حذفه', 'ok'); go('menu');
    });
  }
}

async function renderSubcategoriesPanel(v) {
  const [catsR, subR] = await Promise.all([
    safeQuery(()=>sb.from('categories').select('id,name_ar,is_active').order('sort_order'), []),
    safeQuery(()=>sb.from('subcategories').select('id,category_id,slug,name_ar,sort_order,is_active').order('sort_order').order('name_ar'), null)
  ]);
  if (!subR.data) { v.innerHTML = `<div class="empty">تعذر تحميل التصنيفات الفرعية. تأكد من تطبيق تحديث قاعدة البيانات.</div>`; return; }
  const cats=catsR.data||[], data=subR.data||[], canEdit=can(OM), cm=new Map(cats.map(x=>[x.id,x.name_ar]));
  v.innerHTML=`<div class="tabs" role="tablist" aria-label="قائمة الطعام"><button type="button" data-food-tab="products">🍔 المنتجات</button><button type="button" data-food-tab="categories">📂 التصنيفات</button><button class="on" type="button" data-food-tab="subcategories">📁 تصنيفات فرعية</button><button type="button" data-food-tab="addons">➕ الإضافات</button></div><div class="set-card" style="margin-bottom:12px"><h3>📁 تصنيف داخل تصنيف</h3><p style="font-size:13px;line-height:1.9;color:var(--ink2)">أنشئ قسمًا رئيسيًا أولًا من «التصنيفات»، ثم أضف تحته تصنيفًا فرعيًا. عند تعديل المنتج اختر القسم الرئيسي ثم التصنيف الفرعي من القوائم؛ تغيير القسم يعرض فقط التصنيفات الفرعية التابعة له.</p></div><div class="head"><span>${data.length} تصنيف فرعي</span>${canEdit?'<button class="btn pri" id="add-subcategory">+ تصنيف فرعي</button>':''}</div>${data.length?`<table class="tbl"><thead><tr><th>الاسم</th><th>القسم الرئيسي</th><th>الترتيب</th><th>الحالة</th>${canEdit?'<th>إجراء</th>':''}</tr></thead><tbody>${data.map(x=>`<tr data-subcategory-id="${x.id}"><td data-label="الاسم"><b>${esc(x.name_ar)}</b></td><td data-label="القسم الرئيسي">${esc(cm.get(x.category_id)||'قسم غير موجود')}</td><td>${x.sort_order||0}</td><td>${x.is_active?'نشط':'متوقف'}</td>${canEdit?`<td><div class="row"><button class="btn out sm" data-sub-edit>تعديل</button><button class="btn out sm" data-sub-toggle>${x.is_active?'إيقاف':'تفعيل'}</button></div></td>`:''}</tr>`).join('')}</tbody></table>`:'<div class="empty">لم تضف تصنيفات فرعية بعد.</div>'}`;
  v.querySelectorAll('[data-food-tab="products"]').forEach(b=>b.onclick=()=>VIEWS.menu(v));
  v.querySelectorAll('[data-food-tab="categories"]').forEach(b=>b.onclick=()=>renderCategoriesPanel(v));
  v.querySelectorAll('[data-food-tab="addons"]').forEach(b=>b.onclick=()=>VIEWS.addons(v));
  const form=(x=null)=>{openModal(`<h2>${x?'تعديل':'إضافة'} تصنيف فرعي <button class="close" onclick="closeModal()">✕</button></h2><label>القسم الرئيسي * <small>التصنيف الأب الذي سيحتوي هذا التصنيف الفرعي</small></label><select id="sc_parent">${cats.filter(c=>c.is_active).map(c=>`<option value="${c.id}" ${x?.category_id===c.id?'selected':''}>${esc(c.name_ar)}</option>`).join('')}</select><label>اسم التصنيف الفرعي * <small>مثال: برجر لحم، برجر دجاج، صوصات</small></label><input id="sc_name" maxlength="60" value="${esc(x?.name_ar||'')}"><label>الترتيب <small>الرقم الأقل يظهر أولًا</small></label><input id="sc_sort" type="number" value="${x?.sort_order??0}"><label>الحالة <small>إيقاف التصنيف يخفيه من الاختيارات الجديدة دون حذف بياناته</small></label><label class="toggle"><span>نشط</span><input type="checkbox" id="sc_active" ${x?.is_active!==false?'checked':''}></label><div class="row"><button class="btn pri big" id="sc_save">حفظ</button><button class="btn out big" onclick="closeModal()">إلغاء</button></div>`);$('sc_save').onclick=async()=>{const name_ar=$('sc_name').value.trim(),category_id=$('sc_parent').value;if(!name_ar||!category_id)return toast('اختر القسم واكتب اسم التصنيف الفرعي','err');const slug=x?.slug||('sub-'+crypto.randomUUID().replace(/-/g,'').slice(0,16));const payload={category_id,name_ar,slug,sort_order:parseNumber($('sc_sort').value)||0,is_active:$('sc_active').checked,updated_at:new Date().toISOString()};const q=x?await sb.from('subcategories').update(payload).eq('id',x.id):await sb.from('subcategories').insert(payload);if(q.error)return fail(q.error,'تعذر حفظ التصنيف الفرعي');closeModal();toast('تم حفظ التصنيف الفرعي','ok');renderSubcategoriesPanel(v);};};
  if($('add-subcategory'))$('add-subcategory').onclick=()=>form();
  v.querySelectorAll('[data-sub-edit]').forEach(b=>b.onclick=()=>form(data.find(x=>x.id===b.closest('tr').dataset.subcategoryId)));
  v.querySelectorAll('[data-sub-toggle]').forEach(b=>b.onclick=async()=>{const x=data.find(y=>y.id===b.closest('tr').dataset.subcategoryId);const q=await sb.from('subcategories').update({is_active:!x.is_active,updated_at:new Date().toISOString()}).eq('id',x.id);if(q.error)return fail(q.error);toast('تم تحديث الحالة','ok');renderSubcategoriesPanel(v);});
}

VIEWS.categories = async v => renderCategoriesPanel(v);

function openCategoryForm(c) {
  const isEdit = !!c;
  openModal(`
    <h2>${isEdit ? 'تعديل' : 'جديد'} تصنيف <button class="close" onclick="closeModal()">✕</button></h2>
    <label>اسم القسم الظاهر للعميل *</label><input id="c_ar" value="${esc(c?.name_ar || '')}">
    <label>رمز داخلي للقسم (اختياري — اتركه فارغًا)</label><input id="c_slug" dir="ltr" value="${esc(c?.slug || '')}" placeholder="burgers">
    <label>ترتيب ظهور القسم</label><input id="c_sort" type="number" value="${c?.sort_order ?? 0}">
    <label style="display:flex;align-items:center;gap:6px;margin-top:10px"><input type="checkbox" id="c_active" ${c?.is_active !== false ? 'checked' : ''}> نشط</label>
    <div class="row"><button class="btn pri big" id="c_save">حفظ</button>
    <button class="btn out big" onclick="closeModal()">إلغاء</button></div>
  `);
  $('c_save').onclick = async () => {
    const ar = $('c_ar').value.trim();
    if (!ar) return shake($('mod'));
    const payload = {
      name_ar: ar,
      slug: ($('c_slug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') || (c?.slug || `category-${Date.now()}`)),
      sort_order: parseNumber($('c_sort').value) || 0,
      is_active: $('c_active').checked
    };
    try {
      const { error } = isEdit
        ? await sb.from('categories').update(payload).eq('id', c.id)
        : await sb.from('categories').insert(payload);
      if (error) throw error;
      closeModal(); toast('تم', 'ok'); go('menu');
    } catch (e) { fail(e); }
  };
}

/* ─── ADDONS ─── */
VIEWS.addons = async v => {
  const r = await safeQuery(() => sb.from('addons').select('*').order('sort_order').order('name_ar'), null);
  if (!r.data) { v.innerHTML = notInstalledMsg('addons'); return; }
  const data = r.data;
  const edit = can(OM);
  v.innerHTML = `
    <div class="tabs" role="tablist" aria-label="قائمة الطعام"><button type="button" data-food-tab="products">🍔 المنتجات</button><button type="button" data-food-tab="categories">📂 التصنيفات</button><button type="button" data-food-tab="subcategories">📁 تصنيفات فرعية</button><button class="on" type="button" data-food-tab="addons">➕ الإضافات</button></div>
    <div class="set-card" style="margin-bottom:12px"><h3>➕ إضافات المنتجات</h3><p style="font-size:12px;color:var(--ink2)">الإضافة اختيار يقدر العميل يضيفه للمنتج مثل الجبن أو الصوص؛ لا تُنشئها هنا كمنتج مستقل. اربطها بالمنتجات من تبويب «المنتجات».</p></div>
    <div class="head"><span>${data.length} إضافة</span>${edit ? '<button class="btn pri" id="adda">+ إضافة</button>' : ''}</div>
    <table class="tbl"><thead><tr><th>الاسم</th><th>السعر</th><th>الحالة</th>${edit ? '<th></th>' : ''}</tr></thead>
    <tbody>${data.map(a => `<tr data-id="${a.id}">
      <td data-label="الاسم"><b>${esc(a.name_ar)}</b></td>
      <td data-label="السعر">${money(a.price)}</td>
      <td data-label="الحالة">${a.is_available !== false ? '✅' : '⛔'}</td>
      ${edit ? `<td><div class="row"><button class="btn out sm" data-a="ed">✏️</button><button class="btn out dng sm" data-a="del">🗑️</button></div></td>` : ''}
    </tr>`).join('') || '<tr><td colspan="4" class="empty">لا إضافات</td></tr>'}</tbody></table>`;

  v.querySelectorAll('[data-food-tab="products"]').forEach(b=>b.onclick=()=>VIEWS.menu(v));
  v.querySelectorAll('[data-food-tab="categories"]').forEach(b=>b.onclick=()=>renderCategoriesPanel(v));
  v.querySelectorAll('[data-food-tab="subcategories"]').forEach(b=>b.onclick=()=>renderSubcategoriesPanel(v));
  if (edit) {
    $('adda').onclick = () => openAddonForm(null);
    v.querySelectorAll('[data-a="ed"]').forEach(b => b.onclick = () => openAddonForm(data.find(x => x.id === b.closest('tr').dataset.id)));
    v.querySelectorAll('[data-a="del"]').forEach(b => b.onclick = async () => {
      const id = b.closest('tr').dataset.id;
      if (!await ask('تعطيل', 'تعطيل الإضافة؟ ستبقى محفوظة للطلبات القديمة.', 'تعطيل')) return;
      const { error } = await sb.from('addons').update({is_available:false}).eq('id', id);
      if (error) return fail(error);
      toast('تم تعطيل الإضافة بدل حذفها', 'ok'); go('menu');
    });
  }
};

function openAddonForm(a) {
  const isEdit = !!a;
  openModal(`
    <h2>${isEdit ? 'تعديل' : 'جديد'} إضافة <button class="close" onclick="closeModal()">✕</button></h2>
    <label>اسم الإضافة الظاهر للعميل *</label><input id="a_ar" value="${esc(a?.name_ar || '')}">
    <label>سعر الإضافة (بالجنيه)</label><input id="a_price" type="number" step="0.5" min="0" value="${a?.price ?? 0}">
    <label style="display:flex;align-items:center;gap:6px;margin-top:10px"><input type="checkbox" id="a_active" ${a?.is_available !== false ? 'checked' : ''}> نشط</label>
    <div class="row"><button class="btn pri big" id="a_save">حفظ</button>
    <button class="btn out big" onclick="closeModal()">إلغاء</button></div>
  `);
  $('a_save').onclick = async () => {
    if (!$('a_ar').value.trim()) return shake($('mod'));
    const payload = {
      name_ar: $('a_ar').value.trim(),
      slug: (a?.slug || `addon-${Date.now()}`),
      price: parseNumber($('a_price').value) || 0,
      is_available: $('a_active').checked
    };
    try {
      const { error } = isEdit
        ? await sb.from('addons').update(payload).eq('id', a.id)
        : await sb.from('addons').insert(payload);
      if (error) throw error;
      closeModal(); toast('تم', 'ok'); go('menu');
    } catch (e) { fail(e); }
  };
}

/* ─── COUPONS ─── */
VIEWS.coupons = async v => {
  const r = await safeQuery(() => sb.from('coupons').select('*').order('created_at', { ascending: false }).limit(300), []);
  const data = r.data || [];
  const p = paginate(data, 'coupons');
  v.innerHTML = `
    <div class="head"><span>${data.length} كوبون</span>${can(OM) ? '<button class="btn pri" id="addc">+ كوبون</button>' : ''}</div>
    ${p.items.length ? `<table class="tbl"><thead><tr><th>الكود</th><th>الخصم</th><th>الحد الأدنى</th><th>الاستخدام</th><th>الحالة</th><th></th></tr></thead>
      <tbody>${p.items.map(c => {
        const isExpired = c.ends_at && new Date(c.ends_at) < new Date();
        const isStarted = !c.starts_at || new Date(c.starts_at) <= new Date();
        const status = !c.is_active ? '⛔ معطّل' : isExpired ? '⏰ منتهي' : !isStarted ? '🕐 قادم' : '✅ نشط';
        return `<tr data-id="${c.id}">
          <td data-label="الكود"><b dir="ltr">${esc(c.code)}</b></td>
          <td data-label="الخصم">${c.type === 'fixed' || c.type === 'amount' || (c.value > 100 && !c.type) ? money(c.value) : `${c.value}%`}</td>
          <td data-label="الحد الأدنى">${c.min_order ? money(c.min_order) : '—'}</td>
          <td data-label="الاستخدام">${c.used_count || 0}${c.max_uses ? ' / ' + c.max_uses : ''}</td>
          <td data-label="الحالة">${status}</td>
          <td data-label=""><div class="row">
            <button class="btn out sm" data-a="ed">✏️</button>
            <button class="btn out ${c.is_active ? 'dng' : 'ok'} sm" data-a="tg">${c.is_active ? '⏸' : '▶️'}</button>
          </div></td>
        </tr>`; }).join('')}</tbody></table>${renderPager(p, 'coupons')}`
      : '<div class="empty">مفيش كوبونات</div>'}`;

  v.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { pageIdx['coupons'] = Number(b.dataset.page); go('coupons'); });
  if ($('addc')) $('addc').onclick = () => openCouponForm(null);
  v.querySelectorAll('[data-a="ed"]').forEach(b => b.onclick = () => {
    openCouponForm(data.find(c => c.id === b.closest('tr').dataset.id));
  });
  v.querySelectorAll('[data-a="tg"]').forEach(b => b.onclick = async () => {
    const row = b.closest('tr'), id = row.dataset.id;
    const c = data.find(x => x.id === id);
    const { error } = await sb.from('coupons').update({ is_active: !c.is_active }).eq('id', id);
    if (error) return fail(error);
    toast('تم', 'ok', 1500); go('coupons');
  });
};

function openCouponForm(c) {
  const isEdit = !!c;
  openModal(`
    <h2>${isEdit ? 'تعديل' : 'جديد'} كوبون <button class="close" onclick="closeModal()">✕</button></h2>
    <label>الكود *</label><input id="co_code" dir="ltr" style="text-transform:uppercase" value="${esc(c?.code || '')}">
    <label>نوع الخصم</label>
    <select id="co_type">
      <option value="percent" ${c?.type === 'percent' ? 'selected' : ''}>نسبة %</option>
      <option value="fixed" ${c?.type === 'fixed' ? 'selected' : ''}>مبلغ ثابت</option>
    </select>
    <label>القيمة *</label><input id="co_val" type="number" min="0" step="0.5" value="${c?.value ?? ''}">
    <label>الحد الأدنى لقيمة الطلب بالجنيه <small>لن ينطبق العرض على طلب أقل من هذا المبلغ</small></label><input id="co_min" type="number" min="0" value="${c?.min_order ?? 0}">
    <label>أقصى خصم (اختياري)</label><input id="co_maxdiscount" type="number" min="0" value="${c?.max_discount ?? ''}">
    <label>حد الاستخدام الكلي</label><input id="co_limit" type="number" min="1" placeholder="بدون" value="${c?.max_uses ?? ''}">
    <label>حد الاستخدام لكل مستخدم</label><input id="co_peruser" type="number" min="1" placeholder="بدون" value="${c?.per_user_limit ?? ''}">
    <label>تاريخ البداية</label><input id="co_start" type="date" value="${c?.starts_at ? c.starts_at.slice(0,10) : ''}">
    <label>تاريخ الانتهاء</label><input id="co_exp" type="date" value="${c?.ends_at ? c.ends_at.slice(0,10) : ''}">
    <div class="row"><button class="btn pri big" id="co_save">حفظ</button>
    <button class="btn out big" onclick="closeModal()">إلغاء</button></div>
  `);
  $('co_save').onclick = async () => {
    const code = $('co_code').value.trim().toUpperCase();
    const value = parseNumber($('co_val').value);
    if (!code || !(value > 0)) return shake($('mod'));
    if ($('co_type').value === 'percent' && value > 100) { toast('النسبة لا تزيد عن 100%', 'err'); return; }
    const payload = {
      code, value,
      type: $('co_type').value,
      min_order: parseNumber($('co_min').value) || 0,
      max_discount: parseNumber($('co_maxdiscount').value)>0 ? parseNumber($('co_maxdiscount').value) : null,
      is_active: c?.is_active !== false,
    };
    const limit = parseNumber($('co_limit').value);
    payload.max_uses = limit > 0 ? limit : null;
    const perU = parseNumber($('co_peruser').value);
    payload.per_user_limit = perU > 0 ? perU : null;
    payload.starts_at = $('co_start').value ? new Date($('co_start').value + 'T00:00:00').toISOString() : null;
    payload.ends_at = $('co_exp').value ? new Date($('co_exp').value + 'T23:59:59').toISOString() : null;
    if (payload.ends_at && payload.starts_at && payload.ends_at < payload.starts_at) { toast('تاريخ الانتهاء قبل البداية', 'err'); return; }
    try {
      const { error } = isEdit
        ? await sb.from('coupons').update(payload).eq('id', c.id)
        : await sb.from('coupons').insert(payload);
      if (error) throw error;
      closeModal(); toast('تم', 'ok'); go('coupons');
    } catch (e) { fail(e); }
  };
}

/* ─── MENU PROMOTIONS (separate from coupon codes) ─── */
VIEWS.offers = async v => {
  const r = await safeQuery(() => sb.from('menu_promotions').select('id,name_ar,description_ar,image_url,promotion_type,target_item_id,reward_item_id,reward_addon_id,value,max_discount,min_order,starts_at,ends_at,max_uses,used_count,is_active,priority,stackable,created_at').order('priority',{ascending:false}).order('created_at',{ascending:false}).limit(300), []);
  const data = r.data || [];
  v.innerHTML = `<div class="set-card" style="margin-bottom:14px"><h3>🎁 إدارة العروض التي تظهر للعميل</h3><p style="font-size:13px;line-height:1.9;color:var(--ink2)">كل عرض هنا محفوظ في سوبا بيز ويظهر في سلايدر الصفحة الرئيسية عندما يكون نشطًا وداخل فترة الصلاحية. اكتب صورة HTTPS إن أردت صورة بانر مستقلة؛ وإلا سيستخدم التطبيق صورة المنتج المرتبط بالعرض. العروض لا تُكرر في شاشة الواجهة الرئيسية.</p><div class="head"><span>${data.length} عرض محفوظ</span><button class="btn pri" id="addoffer">+ إنشاء عرض</button></div></div>
    ${data.length ? `<div class="set-grid">${data.map(x=>`<article class="set-card" data-id="${x.id}" style="display:flex;flex-direction:column;gap:10px">${x.image_url?`<img src="${esc(x.image_url)}" alt="" loading="lazy" style="width:100%;height:140px;object-fit:cover;border-radius:12px">`:''}<div style="display:flex;align-items:start;justify-content:space-between;gap:8px"><h3>${esc(x.name_ar)}</h3><span class="badge">${!x.is_active?'متوقف':(x.starts_at&&new Date(x.starts_at)>new Date()?'قادم':(x.ends_at&&new Date(x.ends_at)<new Date()?'منتهي':(x.max_uses!=null&&Number(x.used_count||0)>=Number(x.max_uses)?'اكتمل الاستخدام':'نشط')))}</span></div><p style="color:var(--ink2);font-size:13px">${esc(x.description_ar||'لا يوجد وصف مضاف')}</p><div><b>${esc(({percent:'خصم نسبة',fixed:'خصم مبلغ',free_delivery:'توصيل مجاني',free_item:'صنف مجاني',free_addon:'إضافة مجانية'})[x.promotion_type]||x.promotion_type)}</b> · ${['percent','fixed'].includes(x.promotion_type)?(x.promotion_type==='percent'?`${x.value}%` : money(x.value)):'بدون قيمة نقدية'}</div><small>الاستخدام: ${x.used_count||0}${x.max_uses?' / '+x.max_uses:' / بلا حد'} · الأولوية: ${x.priority||0}</small><small>البداية: ${x.starts_at?dtShort(x.starts_at):'فور التفعيل'} · النهاية: ${x.ends_at?dtShort(x.ends_at):'بدون انتهاء'}</small><div class="row"><button class="btn pri sm" data-offer-edit>✏️ تعديل</button><button class="btn out sm" data-offer-toggle>${x.is_active?'إيقاف العرض':'تفعيل العرض'}</button></div></article>`).join('')}</div>` : '<div class="empty">لا توجد عروض بعد. اضغط «إنشاء عرض» لإضافة أول عرض ديناميكي.</div>'}`;
  $('addoffer').onclick = () => openPromotionForm(null);
  v.querySelectorAll('[data-offer-edit]').forEach(b=>b.onclick=()=>openPromotionForm(data.find(z=>z.id===b.closest('[data-id]').dataset.id)));
  v.querySelectorAll('[data-offer-toggle]').forEach(b=>b.onclick=async()=>{const x=data.find(z=>z.id===b.closest('[data-id]').dataset.id); const {error}=await sb.from('menu_promotions').update({is_active:!x.is_active,updated_at:new Date().toISOString()}).eq('id',x.id); if(error)return fail(error); toast('تم تحديث العرض','ok');go('offers');});
};
async function openPromotionForm(x) {
  const [itemsResult, addonsResult] = await Promise.all([
    sb.from('menu_items').select('id,name_ar,is_available,is_secret').eq('is_available', true).eq('is_secret', false).order('name_ar'),
    sb.from('addons').select('id,name_ar,is_available').eq('is_available', true).order('name_ar')
  ]);
  if (itemsResult.error) return fail(itemsResult.error, 'تعذر تحميل قائمة المنتجات');
  if (addonsResult.error) return fail(addonsResult.error, 'تعذر تحميل قائمة الإضافات');
  const offerItems = itemsResult.data || [];
  const offerAddons = addonsResult.data || [];
  const itemOptions = (selected, optionalLabel) => `<option value="">${optionalLabel}</option>` + offerItems.map(it=>`<option value="${it.id}" ${selected===it.id?'selected':''}>${esc(it.name_ar)}</option>`).join('');
  const addonOptions = (selected, optionalLabel) => `<option value="">${optionalLabel}</option>` + offerAddons.map(it=>`<option value="${it.id}" ${selected===it.id?'selected':''}>${esc(it.name_ar)}</option>`).join('');
  openModal(`<h2>${x?'تعديل':'إضافة'} عرض <button class="close" onclick="closeModal()">✕</button></h2>
    <label>اسم العرض * <small>العنوان الذي يراه العميل في البانر وبطاقة العرض</small></label><input title="اكتب اسمًا واضحًا وقصيرًا يشجع العميل على الطلب" id="of_name" maxlength="100" value="${esc(x?.name_ar||'')}">
    <label>الوصف الذي سيظهر للعميل</label><input id="of_desc" maxlength="500" title="شرح قصير لشروط العرض وفائدته" value="${esc(x?.description_ar||'')}">
    <label>رابط صورة البانر (HTTPS — اختياري)</label><input id="of_image" dir="ltr" type="url" placeholder="https://..." title="صورة مستقلة للسلايدر؛ إذا تركتها فارغة يستخدم التطبيق صورة المنتج المرتبط" value="${esc(x?.image_url||'')}">
    <label>نوع العرض * <small>حدد طريقة استفادة العميل من العرض</small></label><select title="نسبة مئوية أو مبلغ ثابت أو توصيل مجاني أو صنف/إضافة مجانية" id="of_type"><option value="percent">خصم نسبة</option><option value="fixed">خصم مبلغ</option><option value="free_delivery">توصيل مجاني</option><option value="free_item">صنف مجاني</option><option value="free_addon">إضافة مجانية</option></select>
    <label>قيمة الخصم <small>النسبة من 1 إلى 100، أو مبلغ بالجنيه؛ العروض المجانية قيمتها صفر</small></label><input id="of_value" type="number" min="0" step="0.5" value="${x?.value??0}">
    <label>أقصى خصم بالجنيه (اختياري) <small>سقف الخصم عند اختيار نسبة مئوية</small></label><input id="of_max_discount" type="number" min="0" value="${x?.max_discount??''}">
    <label>عدد مرات الاستخدام الكلي (اختياري) <small>اتركه فارغًا بلا حد؛ لا يقل عن مرات الاستخدام الحالية</small></label><input id="of_max_uses" type="number" min="1" value="${x?.max_uses??''}">
    <label>تاريخ بداية العرض <small>اتركه فارغًا ليبدأ فور التفعيل</small></label><input id="of_start" type="date" value="${x?.starts_at?x.starts_at.slice(0,10):''}">
    <label>تاريخ انتهاء العرض <small>بعده يختفي العرض تلقائيًا</small></label><input id="of_end" type="date" value="${x?.ends_at?x.ends_at.slice(0,10):''}">
    <label>الحد الأدنى لقيمة الطلب بالجنيه <small>لن ينطبق العرض على طلب أقل من هذا المبلغ</small></label><input id="of_min" type="number" min="0" value="${x?.min_order??0}">
    <label>المنتج المستهدف <small>اختياري؛ اتركه على «كل المنتجات» لو العرض عام</small></label><select id="of_target">${itemOptions(x?.target_item_id, 'كل المنتجات')}</select>
    <label>المنتج المجاني <small>مطلوب فقط عند اختيار نوع «صنف مجاني»</small></label><select id="of_reward_item">${itemOptions(x?.reward_item_id, 'اختر المنتج المجاني')}</select>
    <label>الإضافة المجانية <small>مطلوبة فقط عند اختيار نوع «إضافة مجانية»</small></label><select id="of_reward_addon">${addonOptions(x?.reward_addon_id, 'اختر الإضافة المجانية')}</select>
    <label>أولوية العرض <small>الأعلى يظهر أولًا في السلايدر</small></label><input id="of_priority" type="number" value="${x?.priority??0}">
    <label title="عند إيقاف العرض لن يظهر للعميل حتى لو كانت تواريخه سارية"><input id="of_active" type="checkbox" ${x?.is_active?'checked':''}> العرض نشط</label>
    <div class="row"><button class="btn pri big" id="of_save">حفظ العرض</button><button class="btn out big" onclick="closeModal()">إلغاء</button></div>`);
  if(x) $('of_type').value=x.promotion_type;
  $('of_save').onclick=async()=>{const name_ar=$('of_name').value.trim(),value=parseNumber($('of_value').value),min_order=parseNumber($('of_min').value)||0,imageUrl=$('of_image').value.trim();if(!name_ar||value<0)return toast('أدخل اسمًا وقيمة صحيحة','err');if(imageUrl&&!/^https:\/\//i.test(imageUrl))return toast('رابط صورة البانر يجب أن يبدأ بـ https://','err');const promotion_type=$('of_type').value; if((promotion_type==='percent' && !(value>0 && value<=100)) || (promotion_type==='fixed' && !(value>0)) || (['free_delivery','free_item','free_addon'].includes(promotion_type) && value!==0)) return toast('راجع قيمة العرض حسب نوعه','err'); if(promotion_type==='free_item'&&!$('of_reward_item').value)return toast('حدد المنتج المجاني من إعدادات العرض','err'); if(promotion_type==='free_addon'&&!$('of_reward_addon').value)return toast('حدد الإضافة المجانية من إعدادات العرض','err'); const maxUsesInput=parseNumber($('of_max_uses').value); if(maxUsesInput>0&&x&&maxUsesInput<x.used_count)return toast('حد الاستخدام أقل من مرات الاستخدام الحالية','err'); const payload={name_ar,description_ar:$('of_desc').value.trim()||null,image_url:$('of_image').value.trim()||null,promotion_type,value,min_order,priority:parseInt($('of_priority').value,10)||0,is_active:$('of_active').checked,max_discount:parseNumber($('of_max_discount').value)>0?parseNumber($('of_max_discount').value):null,target_item_id:$('of_target').value||null,reward_item_id:promotion_type==='free_item'?($('of_reward_item').value||null):null,reward_addon_id:promotion_type==='free_addon'?($('of_reward_addon').value||null):null,max_uses:parseNumber($('of_max_uses').value)>0?parseNumber($('of_max_uses').value):null,starts_at:$('of_start').value?new Date($('of_start').value+'T00:00:00').toISOString():null,ends_at:$('of_end').value?new Date($('of_end').value+'T23:59:59').toISOString():null,updated_at:new Date().toISOString()}; if(payload.starts_at&&payload.ends_at&&payload.ends_at<payload.starts_at)return toast('تاريخ الانتهاء قبل البداية','err'); const q=x?await sb.from('menu_promotions').update(payload).eq('id',x.id):await sb.from('menu_promotions').insert(payload);if(q.error)return fail(q.error);closeModal();toast('تم حفظ العرض','ok');go('offers');};
}

/* ─── CUSTOMERS ─── */
VIEWS.customers = async v => {
  const r = await safeQuery(() => sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(500), []);
  const raw = r.data || [];
  const blocked = await safeQuery(() => sb.from('customer_restrictions').select('user_id,customer_phone,reason').eq('is_blocked', true), []);
  const blockedIds = new Set((blocked.data || []).map(x=>x.user_id).filter(Boolean));
  const blockedPhones = new Set((blocked.data || []).map(x=>x.customer_phone).filter(Boolean));
  const data = raw.map(c=>({...c,is_blocked:blockedIds.has(c.id)||(c.phone&&blockedPhones.has(c.phone))}));
  const p = { items: data };

  v.innerHTML = `
    <div class="head"><span>${data.length} عميل</span><button class="btn out sm" id="expcust">📄 CSV</button></div>
    <div class="filters">
      <input id="custq" type="search" placeholder="🔍 بحث بالاسم أو الموبايل">
      <select id="custfilter">
        <option value="">الكل</option>
        <option value="blocked">محظور</option>
      </select>
    </div>
    ${p.items.length ? `<table class="tbl" id="cust-tbl"><thead><tr><th>الاسم</th><th>الموبايل</th><th>التسجيل</th><th></th></tr></thead>
      <tbody>${p.items.map(c => `<tr data-id="${c.id}" data-s="${esc((c.full_name || '') + ' ' + (c.phone || ''))}" data-blocked="${c.is_blocked ? 1 : 0}">
        <td data-label="الاسم">${esc(c.full_name || '—')} ${c.is_blocked ? '<span class="pay-badge" style="color:#C62828">محظور</span>' : ''}</td>
        <td data-label="الموبايل" dir="ltr">${esc(c.phone || '—')}</td>
        <td data-label="التسجيل">${dt(c.created_at)}</td>
        <td data-label=""><button class="btn out sm" data-a="det">تفاصيل</button></td>
      </tr>`).join('')}</tbody></table>${renderPager(p, 'customers')}`
      : '<div class="empty">مفيش عملاء</div>'}`;

  const filterC = () => {
    const q = $('custq').value.trim().toLowerCase();
    const f = $('custfilter').value;
    document.querySelectorAll('#cust-tbl tbody tr').forEach(tr => {
      const match = (!q || tr.dataset.s.toLowerCase().includes(q)) &&
                    (!f || (f === 'blocked' && tr.dataset.blocked === '1'));
      tr.classList.toggle('hide', !match);
    });
  };
  $('custq').oninput = debounce(filterC, 200);
  $('custfilter').onchange = filterC;

  v.querySelectorAll('[data-a="det"]').forEach(b => b.onclick = e => openCustomerDetail(e.target.closest('tr').dataset.id));
  v.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { pageIdx['customers'] = Number(b.dataset.page); go('customers'); });
  $('expcust').onclick = () => {
    const rows = [['الاسم','الموبايل','التسجيل','محظور']];
    data.forEach(c => rows.push([c.full_name || '', c.phone || '', dt(c.created_at), c.is_blocked ? 'نعم' : 'لا']));
    downloadCSV(rows, 'customers');
  };
};

async function openCustomerDetail(id) {
  const [p, o, points, restriction] = await Promise.all([
    sb.from('profiles').select('*').eq('id', id).maybeSingle(),
    sb.from('orders').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    sb.from('loyalty_ledger').select('points').eq('user_id', id),
    sb.from('customer_restrictions').select('id,reason,customer_phone').eq('user_id', id).eq('is_blocked', true).order('created_at',{ascending:false}).limit(1)
  ]);
  const c = {...(p.data||{}),is_blocked:!!restriction.data?.[0]?.id,blocked_reason:restriction.data?.[0]?.reason}, orders = o.data || [], ledger = points.data || [], pts = {points:ledger.reduce((n,x)=>n+Number(x.points||0),0),stamps:0};
  const totalSpent = orders.filter(x => x.status !== 'cancelled').reduce((s, x) => s + Number(x.total || 0), 0);
  const avgOrder = orders.length ? Math.round(totalSpent / orders.length) : 0;

  openModal(`
    <h2>${esc(c?.full_name || 'عميل')} <button class="close" onclick="closeModal()">✕</button></h2>
    ${c?.is_blocked ? `<div style="background:#C6282822;border-right:3px solid #C62828;padding:8px 12px;border-radius:8px;margin-bottom:12px"><b style="color:#C62828">🚫 محظور</b> ${c.blocked_reason ? `<br>${esc(c.blocked_reason)}` : ''}</div>` : ''}
    <div class="mod-grid">
      <div><small style="color:var(--ink2)">الموبايل</small><br><b dir="ltr">${esc(c?.phone || '—')}</b></div>
      <div><small style="color:var(--ink2)">التسجيل</small><br>${dt(c?.created_at)}</div>
      <div><small style="color:var(--ink2)">طلبات</small><br><b>${orders.length}</b></div>
      <div><small style="color:var(--ink2)">إجمالي</small><br><b>${money(totalSpent)}</b></div>
      <div><small style="color:var(--ink2)">متوسط الطلب</small><br><b>${money(avgOrder)}</b></div>
      <div><small style="color:var(--ink2)">نقاط الولاء</small><br><b>${pts?.points || 0} (${pts?.stamps || 0} أختام)</b></div>
    </div>
    ${can(OM) ? `<div class="row" style="margin-top:12px">
      <button class="btn out sm" id="adjPts">➕ تعديل النقاط</button>
      <button class="btn out sm" id="giveCoupon">🎁 منح كوبون</button>
      <button class="btn out ${c?.is_blocked ? 'ok' : 'dng'} sm" id="toggleBlock">${c?.is_blocked ? '🔓 فك الحظر' : '🚫 حظر'}</button>
    </div>` : ''}
    <section>
      <h3>آخر الطلبات</h3>
      ${orders.length ? orders.slice(0, 20).map(x => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);gap:8px;flex-wrap:wrap;font-size:13px">
          <b>#${esc(x.order_number ?? x.id)}</b>
          <span class="pay-badge">${ST[x.status]?.l || x.status}</span>
          ${payBadge(x.payment_method)}
          <span style="color:var(--ink2)">${dtShort(x.created_at)}</span><b>${money(x.total)}</b>
        </div>`).join('') : '<div class="empty">مفيش طلبات</div>'}
    </section>
  `, true);

  if ($('adjPts')) $('adjPts').onclick = () => {
    openModal(`
      <h2>تعديل النقاط <button class="close" onclick="closeModal()">✕</button></h2>
      <p style="color:var(--ink2);margin-bottom:12px">النقاط الحالية: <b>${pts?.points || 0}</b></p>
      <label>عدد النقاط (سالب للخصم)</label><input id="adjval" type="number" step="1">
      <label>السبب</label><input id="adjreason" placeholder="تعويض، تصحيح، إلخ">
      <div class="row"><button class="btn pri big" id="adjsave">تطبيق</button>
      <button class="btn out big" onclick="closeModal()">إلغاء</button></div>
    `);
    $('adjsave').onclick = async () => {
      const delta = parseNumber($('adjval').value);
      if (!delta) return shake($('mod'));
      try {
        const { data: newPts, error } = await sb.rpc('adjust_user_points', { p_user: id, p_delta: Math.trunc(delta), p_reason: $('adjreason').value.trim() || 'تعديل إداري' });
        if (error) throw error;
        toast(`تم: ${newPts} نقطة`, 'ok'); closeModal(); openCustomerDetail(id);
      } catch (e) { fail(e); }
    };
  };
  if ($('giveCoupon')) $('giveCoupon').onclick = async () => {
    const cr = await safeQuery(() => sb.from('coupons').select('id,code,value,type').eq('is_active', true).order('code'), []);
    const list = cr.data || [];
    if (!list.length) return toast('لا توجد كوبونات فعّالة', 'err');
    openModal(`
      <h2>منح كوبون <button class="close" onclick="closeModal()">✕</button></h2>
      <label>الكوبون</label>
      <select id="gc_id">${list.map(k => `<option value="${k.id}">${esc(k.code)} — ${k.type === 'fixed' ? money(k.value) : k.value + '%'}</option>`).join('')}</select>
      <label>ملاحظة (اختياري)</label><input id="gc_note">
      <div class="row"><button class="btn pri big" id="gc_save">منح</button>
      <button class="btn out big" onclick="closeModal()">إلغاء</button></div>
    `);
    $('gc_save').onclick = async () => {
      const { error } = await sb.rpc('grant_coupon', { p_user: id, p_coupon: $('gc_id').value, p_note: $('gc_note').value.trim() || null });
      if (error) return fail(error);
      toast('تم منح الكوبون', 'ok'); closeModal();
    };
  };
  if ($('toggleBlock')) $('toggleBlock').onclick = async () => {
    const block = !c?.is_blocked;
    let reason = null;
    if (block) reason = prompt('سبب الحظر:', '');
    try {
      const existing = await sb.from('customer_restrictions').select('id').eq('user_id', id).eq('is_blocked', true).order('created_at',{ascending:false}).limit(1);
      if (block) {
        if (existing.data?.[0]?.id) { const {error}=await sb.from('customer_restrictions').update({is_blocked:true,reason:reason||'حظر إداري',updated_at:new Date().toISOString(),lifted_at:null,lifted_by:null}).eq('id',existing.data[0].id); if(error) throw error; }
        else { const {error}=await sb.from('customer_restrictions').insert({user_id:id,customer_phone:c?.phone||'غير متاح',is_blocked:true,reason:reason||'حظر إداري',created_by:ME?.id||null}); if(error) throw error; }
      } else if (existing.data?.[0]?.id) { const {error}=await sb.from('customer_restrictions').update({is_blocked:false,lifted_at:new Date().toISOString(),lifted_by:ME?.id||null,updated_at:new Date().toISOString()}).eq('id',existing.data[0].id); if(error) throw error; }
      toast(block ? 'تم الحظر' : 'تم فك الحظر', 'ok'); closeModal(); openCustomerDetail(id);
    } catch (e) { fail(e); }
  };
}

/* ─── DRIVERS ─── */
VIEWS.drivers = async v => {
  await loadDrivers();
  const p = paginate(DRV, 'drivers');
  const edit = can(OM);
  v.innerHTML = `
    <div class="head"><span>${DRV.length} سائق</span>${edit ? '<button class="btn pri" id="addd">+ سائق</button>' : ''}</div>
    ${p.items.length ? `<table class="tbl"><thead><tr><th>الاسم</th><th>الموبايل</th><th>المركبة</th><th>الحالة</th><th>التقييم</th>${edit ? '<th></th>' : ''}</tr></thead>
      <tbody>${p.items.map(d => {
        const activeOrders = [...ORD.values()].filter(o => o.assigned_driver_id === d.id && !['delivered','cancelled'].includes(o.status)).length;
        return `<tr data-id="${d.id}">
          <td data-label="الاسم"><b>${esc(d.full_name || '—')}</b>${activeOrders ? `<br><small style="color:var(--warn)">${activeOrders} طلب نشط</small>` : ''}</td>
          <td data-label="الموبايل" dir="ltr">${esc(d.phone || '—')}</td>
          <td data-label="المركبة">—</td>
          <td data-label="الحالة">${edit ? `<select data-a="st" data-id="${d.id}" style="padding:6px;min-height:36px;max-width:140px">
            <option value="available" ${d.availability === 'available' ? 'selected' : ''}>🟢 متاح</option>
            <option value="busy" ${d.availability === 'busy' ? 'selected' : ''}>🟡 مشغول</option>
            <option value="off_duty" ${d.availability === 'off_duty' ? 'selected' : ''}>⚫ غير متاح</option>
          </select>` : esc(d.availability || '—')}</td>
          <td data-label="التقييم">${d.rating ? `⭐ ${d.rating}` : '—'}</td>
          ${edit ? `<td data-label=""><div class="row">
            <button class="btn out sm" data-a="ed">✏️</button>
          </div></td>` : ''}
        </tr>`; }).join('')}</tbody></table>${renderPager(p, 'drivers')}`
      : '<div class="empty">مفيش سائقين</div>'}`;

  v.querySelectorAll('[data-a="st"]').forEach(s => s.onchange = async () => {
    try {
      const { error } = await sb.from('drivers').update({ availability: s.value }).eq('id', s.dataset.id);
      if (error) throw error;
      toast('تم', 'ok', 1500); await loadDrivers();
    } catch (e) { fail(e); }
  });
  if ($('addd')) $('addd').onclick = () => openDriverForm(null);
  v.querySelectorAll('[data-a="ed"]').forEach(b => b.onclick = () => openDriverForm(DRV.find(x => x.id === b.closest('tr').dataset.id)));
  v.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { pageIdx['drivers'] = Number(b.dataset.page); go('drivers'); });
};

function openDriverForm(d) {
  const isEdit = !!d;
  openModal(`
    <h2>${isEdit ? 'تعديل' : 'جديد'} سائق <button class="close" onclick="closeModal()">✕</button></h2>
    <label>الاسم *</label><input id="d_name" value="${esc(d?.full_name || '')}">
    <label>الموبايل *</label><input id="d_phone" dir="ltr" type="tel" inputmode="numeric" maxlength="11" required value="${esc(d?.phone || '')}" placeholder="01012345678">
    <div class="row"><button class="btn pri big" id="d_save">حفظ</button>
    <button class="btn out big" onclick="closeModal()">إلغاء</button></div>
  `);
  $('d_save').onclick = async () => {
    const driverName = $('d_name').value.trim();
    const driverPhone = $('d_phone').value.trim();
    if (driverName.length < 2 || driverName.length > 100) { toast('اكتب اسم السائق من حرفين إلى 100 حرف', 'err'); shake($('mod')); return; }
    if (!/^01[0125][0-9]{8}$/.test(driverPhone)) { toast('رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015', 'err'); shake($('mod')); return; }
    const payload = {
      full_name: driverName,
      phone: driverPhone,
      is_active: d?.is_active !== false,
      availability: d?.availability || 'available'
    };
    try {
      const { error } = isEdit
        ? await sb.from('drivers').update(payload).eq('id', d.id)
        : await sb.from('drivers').insert(payload);
      if (error) throw error;
      closeModal(); toast('تم', 'ok'); await loadDrivers(); go('drivers');
    } catch (e) { fail(e); }
  };
}

/* ─── REPORTS ─── */
VIEWS.reports = async v => {
  const all = [...ORD.values()];
  const periods = {
    today: { label:'اليوم', start: todayStart(), end: Date.now() + 864e5 },
    yesterday: { label:'أمس', start: yesterdayStart(), end: todayStart() },
    week: { label:'آخر 7 أيام', start: todayStart() - 6*864e5, end: Date.now() + 864e5 },
    month: { label:'آخر 30 يوم', start: todayStart() - 29*864e5, end: Date.now() + 864e5 },
    all: { label:'الكل', start: 0, end: Date.now() + 864e5 }
  };
  const cur = localStorage.getItem('sb_report_period') || 'week';
  const period = periods[cur];

  const filtered = all.filter(o => {
    const t = new Date(o.created_at).getTime();
    return t >= period.start && t < period.end && countable(o);
  });

  const totalRev = filtered.reduce((s, o) => s + Number(o.total || 0), 0);
  const totalCnt = filtered.length;
  const avgOrder = totalCnt ? totalRev / totalCnt : 0;

  const items = {};
  filtered.forEach(o => (o.order_items || []).forEach(i => {
    const n = i.item_name || i.name || '—';
    const k = i.item_id || n;
    if (!items[k]) items[k] = { n, qty: 0, rev: 0 };
    items[k].qty += (i.quantity || 1);
    items[k].rev += Number(i.unit_price ?? i.price ?? 0) * (i.quantity || 1);
  }));
  const topByQty = Object.values(items).sort((a, b) => b.qty - a.qty).slice(0, 8);
  const topByRev = Object.values(items).sort((a, b) => b.rev - a.rev).slice(0, 8);

  const paySum = {};
  filtered.forEach(o => {
    const k = String(o.payment_method || 'cash').toLowerCase();
    paySum[k] = (paySum[k] || 0) + Number(o.total || 0);
  });

  const days = Array(7).fill(0), dayLabels = [];
  const dayStart = todayStart() - 6 * 864e5;
  for (let i = 0; i < 7; i++) {
    const d = new Date(dayStart + i * 864e5);
    dayLabels.push(d.toLocaleDateString('ar-EG', { weekday:'short' }));
  }
  all.filter(countable).forEach(o => {
    const d = new Date(o.created_at);
    const idx = Math.floor((d.setHours(0,0,0,0) - dayStart) / 864e5);
    if (idx >= 0 && idx < 7) days[idx] += Number(o.total || 0);
  });

  // Driver performance
  const driverStats = {};
  filtered.forEach(o => {
    if (!o.assigned_driver_id) return;
    if (!driverStats[o.assigned_driver_id]) driverStats[o.assigned_driver_id] = { count:0, rev:0 };
    driverStats[o.assigned_driver_id].count++;
    driverStats[o.assigned_driver_id].rev += Number(o.total || 0);
  });
  const topDrivers = Object.entries(driverStats)
    .map(([id, s]) => ({ id, name: driverName(id), ...s }))
    .sort((a, b) => b.count - a.count).slice(0, 5);

  // Retention
  const customerOrders = {};
  all.filter(o => countable(o)).forEach(o => {
    const cid = o.user_id || o.customer_phone;
    if (!cid) return;
    if (!customerOrders[cid]) customerOrders[cid] = 0;
    customerOrders[cid]++;
  });
  const totalCustomers = Object.keys(customerOrders).length;
  const repeatCustomers = Object.values(customerOrders).filter(n => n > 1).length;
  const retentionRate = totalCustomers ? Math.round(100 * repeatCustomers / totalCustomers) : 0;

  v.innerHTML = `
    <div class="filters">
      <select id="rp_period">
        ${Object.entries(periods).map(([k, p]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${p.label}</option>`).join('')}
      </select>
    </div>
    <div class="stats">
      <div class="stat"><small>إيراد</small><b data-s="rev" data-m="1">0</b></div>
      <div class="stat"><small>طلبات</small><b data-s="cnt">0</b></div>
      <div class="stat"><small>متوسط الطلب</small><b data-s="avg" data-m="1">0</b></div>
      <div class="stat"><small>عملاء متكررون</small><b data-s="ret">0</b>%</div>
    </div>
    <div class="chart-grid">
      <div class="chart-card"><h3>📈 7 أيام</h3><canvas id="ch-week"></canvas></div>
      <div class="chart-card"><h3>💳 طرق الدفع</h3><canvas id="ch-pay"></canvas>
        <div class="chart-legend" id="pay-legend2"></div>
      </div>
    </div>
    <div class="chart-grid">
      <div class="chart-card">
        <h3>🔥 الأكثر مبيعًا (كمية)</h3>
        ${topByQty.length ? topByQty.map((x, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--line)">
            <span style="width:22px;height:22px;border-radius:6px;background:var(--pri);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:900">${i+1}</span>
            <span style="flex:1;font-weight:700;font-size:13px">${esc(x.n)}</span>
            <b>${x.qty}</b>
          </div>`).join('') : '<div class="empty">لا بيانات</div>'}
      </div>
      <div class="chart-card">
        <h3>💰 الأكثر إيرادًا</h3>
        ${topByRev.length ? topByRev.map((x, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--line)">
            <span style="width:22px;height:22px;border-radius:6px;background:var(--ok);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:900">${i+1}</span>
            <span style="flex:1;font-weight:700;font-size:13px">${esc(x.n)}</span>
            <b>${money(x.rev)}</b>
          </div>`).join('') : '<div class="empty">لا بيانات</div>'}
      </div>
    </div>
    ${topDrivers.length ? `
    <div class="chart-card">
      <h3>🛵 أفضل السائقين</h3>
      ${topDrivers.map((x, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--line)">
          <span style="width:22px;height:22px;border-radius:6px;background:var(--warn);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:900">${i+1}</span>
          <span style="flex:1;font-weight:700;font-size:13px">${esc(x.name)}</span>
          <span style="color:var(--ink2);font-size:12px">${x.count} طلب</span>
          <b>${money(x.rev)}</b>
        </div>`).join('')}
    </div>` : ''}
    <div class="chart-card">
      <h3>📥 تصدير</h3>
      <div class="row">
        <button class="btn pri" id="exp-csv">📄 CSV (الفترة)</button>
        <button class="btn out" id="exp-print">🖨️ طباعة</button>
      </div>
    </div>`;

  animateTo(document.querySelector('[data-s="rev"]'), totalRev);
  animateTo(document.querySelector('[data-s="cnt"]'), totalCnt);
  animateTo(document.querySelector('[data-s="avg"]'), Math.round(avgOrder));
  animateTo(document.querySelector('[data-s="ret"]'), retentionRate);

  requestAnimationFrame(() => {
    onChart($('ch-week'), cv => lineChart(cv, dayLabels, days, '#D9401F'));
    onChart($('ch-pay'), cv => {
      const parts = Object.entries(paySum).map(([k, val]) => ({ v: val, c: payInfo(k).c, l: payInfo(k).l, i: payInfo(k).i }));
      if (parts.length) {
        donutChart(cv, parts);
        $('pay-legend2').innerHTML = parts.map(p => `
          <div class="legend-item">
            <span class="legend-dot" style="background:${p.c}"></span>
            ${p.i} ${esc(p.l)}: <b>${moneyLTR(p.v)}</b>
          </div>`).join('');
      }
    });
  });

  $('rp_period').onchange = e => {
    localStorage.setItem('sb_report_period', e.target.value);
    go('reports');
  };
  $('exp-csv').onclick = () => exportOrdersCSV(filtered);
  $('exp-print').onclick = () => window.print();
};

function downloadCSV(rows, name) {
  const safe = c => { let t = String(c ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
  const csv = '\uFEFF' + rows.map(r => r.map(safe).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sheep-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('تم التصدير', 'ok');
}
function exportOrdersCSV(orders) {
  const rows = [['رقم','التاريخ','العميل','الموبايل','الدفع','حالة الدفع','الإجمالي','الحالة','السائق','السبب']];
  orders.forEach(o => rows.push([
    o.order_number ?? o.id, dt(o.created_at), o.customer_name || '',
    o.customer_phone || '', payInfo(o.payment_method).l, o.payment_status || '',
    o.total || 0, ST[o.status]?.l || o.status, driverName(o.assigned_driver_id), o.cancel_reason || ''
  ]));
  downloadCSV(rows, 'orders');
}

/* ─── REVIEWS ─── */
VIEWS.reviews = async v => {
  const r = await safeQuery(() => sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(300), []);
  const data = r.data || [];
  const p = { items: data };
  const avgRating = data.length ? (data.reduce((s, x) => s + (x.rating || 0), 0) / data.length).toFixed(2) : '0';

  v.innerHTML = `
    <div class="head"><span>${data.length} تقييم — متوسط ${avgRating} ⭐</span></div>
    <div class="filters">
      <select id="rfilter">
        <option value="">كل التقييمات</option>
        <option value="5">⭐⭐⭐⭐⭐ (5)</option>
        <option value="4">⭐⭐⭐⭐ (4)</option>
        <option value="3">⭐⭐⭐ (3)</option>
        <option value="2">⭐⭐ (2)</option>
        <option value="1">⭐ (1)</option>
        <option value="unreplied">بدون رد</option>
      </select>
    </div>
    ${p.items.length ? `<table class="tbl" id="rev-tbl"><thead><tr><th>العميل</th><th>النجوم</th><th>التعليق</th><th></th></tr></thead>
      <tbody>${p.items.map(r => `<tr data-id="${r.id}" data-rating="${r.rating || 0}" data-replied="${r.admin_reply ? 1 : 0}">
        <td data-label="العميل">${esc(r.display_name || '—')}</td>
        <td data-label="النجوم" style="color:#F9A825">${'⭐'.repeat(r.rating || 0)}</td>
        <td data-label="التعليق">${esc(r.comment || '—')}${r.admin_reply ? `<br><small style="color:var(--ok)">↩️ ${esc(r.admin_reply)}</small>` : ''}</td>
        <td data-label=""><div class="row">
          ${can(OM) ? `<button class="btn out sm" data-a="reply">💬 رد</button><button class="btn out dng sm" data-a="del">🙈 إخفاء</button>` : ''}
        </div></td>
      </tr>`).join('')}</tbody></table>${renderPager(p, 'reviews')}`
      : '<div class="empty">مفيش تقييمات</div>'}`;

  $('rfilter').onchange = e => {
    const f = e.target.value;
    document.querySelectorAll('#rev-tbl tbody tr').forEach(tr => {
      let match = true;
      if (f === 'unreplied') match = tr.dataset.replied === '0';
      else if (f) match = tr.dataset.rating === f;
      tr.classList.toggle('hide', !match);
    });
  };
  v.querySelectorAll('[data-a="reply"]').forEach(b => b.onclick = () => {
    openModal(`<h2>رد <button class="close" onclick="closeModal()">✕</button></h2>
      <textarea id="rp" placeholder="شكرًا..." rows="3"></textarea>
      <div class="row"><button class="btn pri big" id="rps">حفظ</button>
      <button class="btn out big" onclick="closeModal()">إلغاء</button></div>`);
    $('rps').onclick = async () => {
      try {
        const { error } = await sb.from('reviews').update({ admin_reply: $('rp').value.trim() }).eq('id', b.closest('tr').dataset.id);
        if (error) throw error;
        closeModal(); toast('تم', 'ok'); go('reviews');
      } catch (e) { fail(e); }
    };
  });
  v.querySelectorAll('[data-a="del"]').forEach(b => b.onclick = async () => {
    if (!await ask('إخفاء', 'إخفاء التقييم من الموقع؟', 'إخفاء')) return;
    const { error } = await sb.from('reviews').update({is_hidden:true}).eq('id', b.closest('tr').dataset.id);
    if (error) return fail(error);
    toast('تم إخفاء التقييم', 'ok'); go('reviews');
  });
  v.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { pageIdx['reviews'] = Number(b.dataset.page); go('reviews'); });
};

/* ─── NOTIFICATIONS ─── */
VIEWS.notifications = async v => {
  const r = await safeQuery(() => sb.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(300), []);
  const data = r.data || [];
  const p = paginate(data, 'notifications');
  v.innerHTML = `
    <div class="head"><span>${data.length} إشعار</span>${can(OM) ? '<button class="btn pri" id="addn">+ إرسال</button>' : ''}</div>
    ${p.items.length ? `<table class="tbl"><thead><tr><th>العنوان</th><th>النص</th><th>الجمهور</th><th>التاريخ</th></tr></thead>
      <tbody>${p.items.map(n => `<tr>
        <td data-label="العنوان"><b>${esc(n.title || '—')}</b></td>
        <td data-label="النص">${esc((n.body || '').slice(0, 100))}</td>
        <td data-label="الجمهور">${esc((n.target_roles || []).join(', ') || 'الكل')}</td>
        <td data-label="التاريخ">${dt(n.created_at)}</td>
      </tr>`).join('')}</tbody></table>${renderPager(p, 'notifications')}`
      : '<div class="empty">مفيش إشعارات</div>'}`;
  if ($('addn')) $('addn').onclick = () => {
    openModal(`<h2>إرسال <button class="close" onclick="closeModal()">✕</button></h2>
      <label>الجمهور</label>
      <select id="n_target">
        <option value="all">كل أدوار الإدارة</option>
        <option value="managers">المالك والمدير</option>
        <option value="kitchen">المطبخ</option>
        <option value="delivery">التوصيل</option>
      </select>
      <label>العنوان</label><input id="n_t" maxlength="160">
      <label>النص (حتى 1000 حرف)</label><textarea id="n_b" rows="3" maxlength="1000"></textarea>
      <div class="row"><button class="btn pri big" id="n_s">إرسال</button>
      <button class="btn out big" onclick="closeModal()">إلغاء</button></div>`);
    $('n_s').onclick = async () => {
      if (!$('n_t').value.trim() || !$('n_b').value.trim() || $('n_t').value.trim().length>160 || $('n_b').value.trim().length>1000) return toast('العنوان مطلوب والنص لا يتجاوز 1000 حرف','err');
      const payload = {
        title: $('n_t').value.trim(),
        body: $('n_b').value.trim(),
        kind: 'system',
        created_by: ME?.id || null,
        target_roles: $('n_target').value === 'managers' ? ['owner','manager'] : $('n_target').value === 'kitchen' ? ['owner','manager','chef'] : $('n_target').value === 'delivery' ? ['owner','manager','dispatcher'] : ['owner','manager','cashier','chef','dispatcher'],
        is_active: true
      };
      try {
        const { error } = await sb.from('admin_notifications').insert(payload);
        if (error) throw error;
        closeModal(); toast('تم', 'ok'); go('notifications');
      } catch (e) { fail(e); }
    };
  };
  v.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { pageIdx['notifications'] = Number(b.dataset.page); go('notifications'); });
};

/* ─── SECRET ─── */
VIEWS.secret = async v => {
  const callAdmin = async body => {
    const { data, error } = await sb.functions.invoke('admin-api', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data?.data;
  };
  let data = [];
  try { data = await callAdmin({ action: 'list_secret_menu_codes' }) || []; }
  catch (e) { v.innerHTML = `<div class="empty">تعذر تحميل الأكواد السرية: ${esc(e.message || 'خطأ صلاحيات')}<br>تأكد من تحديث دالة admin-api.</div>`; return; }
  const p = paginate(data, 'secret');
  v.innerHTML = `
    <div class="head"><span>${data.length} كود</span>${can(OM) ? '<button class="btn pri" id="adds">+ كود</button>' : ''}</div>
    ${p.items.length ? `<table class="tbl"><thead><tr><th>الكود</th><th>الاستخدام</th><th>الحالة</th><th></th></tr></thead>
      <tbody>${p.items.map(s => `<tr data-id="${s.id}">
        <td data-label="الكود"><b dir="ltr">${esc(s.label || '—')}</b></td>
        <td data-label="الاستخدام">${s.uses_count || 0}${s.max_uses ? ' / '+s.max_uses : ''}</td>
        <td data-label="الحالة">${!s.is_active ? '⛔ متوقف' : (s.expires_at&&new Date(s.expires_at)<new Date() ? '⏰ منتهي' : (s.max_uses!=null&&Number(s.uses_count||0)>=Number(s.max_uses) ? '⚠️ اكتمل الاستخدام' : '✅ نشط'))}</td>
        <td data-label=""><button class="btn out ${s.is_active ? 'dng' : 'ok'} sm" data-a="tg">${s.is_active ? 'إيقاف' : 'تشغيل'}</button></td>
      </tr>`).join('')}</tbody></table>${renderPager(p, 'secret')}`
      : '<div class="empty">مفيش أكواد</div>'}`;
  if ($('adds')) $('adds').onclick = () => {
    openModal(`<h2>كود سري <button class="close" onclick="closeModal()">✕</button></h2>
      <label>الكود</label><input id="s_c" dir="ltr" minlength="8" maxlength="128">
      <label>حد الاستخدام</label><input id="s_lim" type="number" min="1" max="1000000" placeholder="بدون">
      <label>تاريخ الانتهاء</label><input id="s_exp" type="date">
      <div class="row"><button class="btn pri big" id="s_s">إنشاء</button>
      <button class="btn out big" onclick="closeModal()">إلغاء</button></div>`);
    $('s_s').onclick = async () => {
      const secretCode = $('s_c').value.trim();
      if (secretCode.length < 8 || secretCode.length > 128) return toast('الكود السري يجب أن يكون من 8 إلى 128 حرفًا', 'err');
      const payload = { action: 'set_secret_menu_code', code: secretCode, label: 'كود سري ' + new Date().toLocaleDateString('ar-EG') };
      const lim = parseNumber($('s_lim').value);
      if (lim > 0) payload.max_uses = lim;
      if ($('s_exp').value) payload.expires_at = new Date($('s_exp').value + 'T23:59:59').toISOString();
      try {
        await callAdmin(payload);
        closeModal(); openModal(`<h2>تم إنشاء الكود السري</h2><p>احفظ الكود الآن؛ لن يُخزَّن كنص صريح في قاعدة البيانات.</p><input readonly dir="ltr" value="${esc(secretCode)}" id="secret-created-code"><div class="row"><button class="btn pri big" id="copy-secret-code">نسخ الكود</button><button class="btn out big" onclick="closeModal()">إغلاق</button></div>`); $('copy-secret-code').onclick=async()=>{try{await navigator.clipboard.writeText(secretCode);toast('تم نسخ الكود','ok');}catch{ $('secret-created-code').select(); document.execCommand('copy'); toast('تم النسخ','ok');}}; go('secret');
      } catch (e) { fail(e); }
    };
  };
  v.querySelectorAll('[data-a="tg"]').forEach(b => b.onclick = async () => {
    const id = b.closest('tr').dataset.id;
    const cur = data.find(x => x.id === id);
    try { await callAdmin({ action: 'toggle_secret_menu_code', code_id: id, is_active: !cur.is_active }); }
    catch (e) { return fail(e); }
    toast('تم', 'ok', 1500); go('home-controls');
  });
  v.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { pageIdx['secret'] = Number(b.dataset.page); go('secret'); });
};

/* ─── STAFF ─── */
VIEWS.staff = async v => {
  const callStaff = async body => {
    const { data, error } = await sb.functions.invoke('staff-admin', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };
  let staff = [];
  try { staff = (await callStaff({ action: 'list_staff' })).staff || []; }
  catch (e) { v.innerHTML = `<div class="empty">تعذر تحميل الموظفين: ${esc(e.message || 'خطأ صلاحيات')}</div>`; return; }
  const p = paginate(staff, 'staff');
  const allowedRoles = ['manager','cashier','chef','dispatcher'];
  v.innerHTML = `
    <div class="head"><span>${staff.length} موظف</span><button class="btn pri" id="invite">+ إضافة موظف</button></div>
    ${p.items.length ? `<table class="tbl"><thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>الحالة</th><th></th></tr></thead><tbody>
      ${p.items.map(u => { const role = (u.roles||[]).find(x=>x.is_active)?.role || (u.roles||[])[0]?.role || 'staff'; const active = (u.roles||[]).some(x=>x.is_active); return `<tr data-id="${u.id}">
        <td data-label="الاسم">${esc(u.full_name || '—')}</td><td data-label="البريد" dir="ltr">${esc(u.email || '—')}</td>
        <td data-label="الدور"><select data-a="role" data-id="${u.id}">${allowedRoles.map(k=>`<option value="${k}" ${role===k?'selected':''}>${esc(ROLES[k]||k)}</option>`).join('')}</select></td>
        <td data-label="الحالة">${active?'✅ نشط':'⛔ معطّل'}</td>
        <td data-label=""><button class="btn out ${active?'dng':'ok'} sm" data-a="tg" data-active="${active}">${active?'تعطيل':'تفعيل'}</button></td>
      </tr>`; }).join('')}
    </tbody></table>${renderPager(p, 'staff')}` : '<div class="empty">لا يوجد موظفون بصلاحيات إدارية</div>'}`;
  $('invite').onclick = () => {
    openModal(`<h2>إضافة موظف <button class="close" onclick="closeModal()">✕</button></h2>
      <label>البريد الإلكتروني *</label><input id="inv_em" type="email" dir="ltr" required>
      <label>الاسم الكامل *</label><input id="inv_name" maxlength="80" required>
      <label>الدور</label><select id="inv_role">${allowedRoles.map(k=>`<option value="${k}">${esc(ROLES[k]||k)}</option>`).join('')}</select>
      <label>كلمة مرور مؤقتة (12 حرفًا على الأقل) *</label><input id="inv_pw" type="password" minlength="12" autocomplete="new-password">
      <div class="row"><button class="btn pri big" id="inv_send">إنشاء الحساب</button><button class="btn out big" onclick="closeModal()">إلغاء</button></div>`);
    $('inv_send').onclick = async () => {
      const email=$('inv_em').value.trim(), full_name=$('inv_name').value.trim(), password=$('inv_pw').value;
      if(!email || full_name.length<2 || password.length<12) return toast('أدخل البريد والاسم وكلمة مرور من 12 حرفًا على الأقل','err');
      try { await callStaff({action:'create_staff',email,full_name,password,role:$('inv_role').value}); closeModal(); toast('تم إنشاء حساب الموظف','ok'); go('staff'); }
      catch(e){ fail(e); }
    };
  };
  v.querySelectorAll('[data-a="role"]').forEach(sel => sel.onchange = async () => {
    const old=(staff.find(x=>x.id===sel.dataset.id)?.roles||[]).find(x=>x.is_active)?.role;
    if(!await ask('تغيير الدور', 'تأكيد تغيير دور الموظف؟','تغيير')) { go('staff'); return; }
    try { await callStaff({action:'set_staff_role',user_id:sel.dataset.id,role:sel.value}); toast('تم تغيير الدور','ok'); go('staff'); }
    catch(e){ fail(e); go('staff'); }
  });
  v.querySelectorAll('[data-a="tg"]').forEach(btn => btn.onclick = async () => {
    const id=btn.closest('tr').dataset.id, active=btn.dataset.active==='true';
    if(!await ask('تغيير الحالة',active?'تعطيل الموظف؟':'تفعيل الموظف؟','تأكيد')) return;
    try { await callStaff({action:'set_staff_active',user_id:id,is_active:!active}); toast('تم تحديث الحالة','ok'); go('staff'); }
    catch(e){ fail(e); }
  });
  v.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{pageIdx.staff=Number(b.dataset.page);go('staff');});
};

/* ─── AUDIT ─── */
VIEWS.audit = async v => {
  const r = await safeQuery(() => sb.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(300), []);
  const data = r.data || [];
  const p = paginate(data, 'audit');
  v.innerHTML = `
    <div class="head"><span>${data.length} حدث</span><button class="btn out sm" id="expaudit">📄 CSV</button></div>
    <div class="filters">
      <input id="auditq" type="search" placeholder="🔍 بحث">
    </div>
    ${p.items.length ? `<table class="tbl" id="audit-tbl"><thead><tr><th>الإجراء</th><th>الجدول</th><th>المنفذ</th><th>الوقت</th></tr></thead>
      <tbody>${p.items.map(a => `<tr data-s="${esc((a.action || '') + ' ' + (a.table_name || '') + ' ' + (a.actor_email || ''))}">
        <td data-label="الإجراء"><b>${esc(a.action || '—')}</b></td>
        <td data-label="الجدول">${esc(a.table_name || '—')}${a.record_id ? ` <small dir="ltr" style="opacity:.6">#${esc(a.record_id)}</small>` : ''}</td>
        <td data-label="المنفذ">${esc(a.actor_email || a.actor_id?.slice(0, 8) || '—')}</td>
        <td data-label="الوقت">${dt(a.created_at)}</td>
      </tr>`).join('')}</tbody></table>${renderPager(p, 'audit')}`
      : '<div class="empty">مفيش نشاط — تأكد من وجود Triggers للكتابة في admin_audit_log</div>'}`;
  $('auditq').oninput = debounce(e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#audit-tbl tbody tr').forEach(tr => {
      tr.classList.toggle('hide', q && !tr.dataset.s.toLowerCase().includes(q));
    });
  }, 200);
  $('expaudit').onclick = () => {
    const rows = [['الإجراء','الجدول','السجل','المنفذ','الوقت']];
    data.forEach(a => rows.push([a.action || '', a.table_name || '', a.record_id || '', a.actor_email || '', dt(a.created_at)]));
    downloadCSV(rows, 'audit');
  };
  v.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { pageIdx['audit'] = Number(b.dataset.page); go('audit'); });
};

/* ─── SESSIONS ─── */
VIEWS.sessions = async v => {
  v.innerHTML = `<div class="head"><span>الجلسات النشطة</span></div>
    <div class="empty">
      <p style="font-weight:700">لا يمكن عرض الجلسات النشطة عبر anon key</p>
      <p style="font-size:12px;margin-top:10px">Supabase Auth لا يكشف عن قائمة الجلسات بدون admin API. لعرض الجلسات، أنشئ Edge Function تستدعي <code>auth.admin.listUserSessions</code> بصلاحية service_role.</p>
      <p style="font-size:12px;margin-top:8px">للخروج من كل الأجهزة: يمكنك استخدام <code>sb.auth.signOut({ scope: 'global' })</code>.</p>
    </div>
    <div style="text-align:center;margin-top:20px">
      <button class="btn out dng" id="globalSignout">🚪 تسجيل الخروج من كل الأجهزة</button>
    </div>`;
  $('globalSignout').onclick = async () => {
    if (!await ask('خروج شامل', 'سيتم إخراجك من كل الأجهزة.', 'خروج شامل')) return;
    manualLogout = true;
    await sb.auth.signOut({ scope: 'global' });
    leave();
  };
};

/* ─── REFUNDS ─── */
const RF_ST = { pending:'⏳ قيد المراجعة', approved:'✅ معتمد', paid:'💸 تم الصرف', rejected:'⛔ مرفوض' };
const refundActions = x => x.status === 'pending'
  ? '<div class="row"><button class="btn out ok sm" data-rs="approved">اعتماد</button><button class="btn out dng sm" data-rs="rejected">رفض</button></div>'
  : x.status === 'approved' ? '<button class="btn pri sm" data-rs="paid">تم الصرف</button>' : '';

function openRefundForm(o) {
  openModal(`
    <h2>استرداد #${esc(o.order_number ?? o.id)} <button class="close" onclick="closeModal()">✕</button></h2>
    <p style="color:var(--ink2);margin-bottom:8px">إجمالي الطلب: <b>${money(o.total)}</b></p>
    <label>المبلغ</label><input id="rf_amt" type="number" min="0" step="0.5" value="${Number(o.total || 0)}">
    <label>السبب *</label><input id="rf_reason">
    <div class="row"><button class="btn pri big" id="rf_save">إنشاء الطلب</button>
    <button class="btn out big" onclick="closeModal()">إلغاء</button></div>`);
  $('rf_save').onclick = async () => {
    const amount = parseNumber($('rf_amt').value), reason = $('rf_reason').value.trim();
    if (!(amount > 0) || !reason) return shake($('mod'));
    const { error } = await sb.rpc('create_refund', { p_order: o.id, p_amount: amount, p_reason: reason });
    if (error) return fail(error);
    closeModal(); toast('تم إنشاء طلب الاسترداد', 'ok');
    if (page === 'refunds') go('refunds');
  };
}

VIEWS.refunds = async v => {
  const r = await safeQuery(() => sb.from('refunds').select('*').order('created_at', { ascending: false }).limit(300), null);
  if (!r.data) { v.innerHTML = notInstalledMsg('refunds'); return; }
  const data = r.data, p = paginate(data, 'refunds'), edit = can(OM);
  v.innerHTML = `
    <div class="head"><span>${data.length} استرداد</span></div>
    ${p.items.length ? `<table class="tbl"><thead><tr><th>الطلب</th><th>المبلغ</th><th>السبب</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead>
      <tbody>${p.items.map(x => `<tr data-id="${x.id}">
        <td data-label="الطلب">#${esc(ORD.get(x.order_id)?.order_number ?? String(x.order_id || '').slice(0, 8))}</td>
        <td data-label="المبلغ">${money(x.amount)}</td>
        <td data-label="السبب">${esc(x.reason || '—')}</td>
        <td data-label="الحالة">${RF_ST[x.status] || esc(x.status || '—')}</td>
        <td data-label="التاريخ">${dt(x.created_at)}</td>
        <td data-label="">${edit ? refundActions(x) : ''}</td>
      </tr>`).join('')}</tbody></table>${renderPager(p, 'refunds')}`
      : '<div class="empty">لا مستردات — ابدأ من تفاصيل طلب مدفوع</div>'}`;
  v.querySelectorAll('[data-rs]').forEach(b => b.onclick = async () => {
    const st = b.dataset.rs, id = b.closest('tr').dataset.id;
    const msg = st === 'rejected' ? 'رفض الاسترداد؟' : st === 'approved' ? 'اعتماد الاسترداد؟' : 'تأكيد صرف المبلغ للعميل؟';
    if (!await ask('تأكيد', msg, 'تأكيد')) return;
    const { error } = await sb.rpc('set_refund_status', { p_id: id, p_status: st });
    if (error) return fail(error);
    toast('تم', 'ok'); await loadOrders(); go('refunds');
  });
  v.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { pageIdx['refunds'] = Number(b.dataset.page); go('refunds'); });
};

/* ─── HEALTH / حالة النظام ─── */
VIEWS.health = async v => {
  v.innerHTML = `
    <div class="head"><span>🩺 حالة النظام ومركز التشخيص</span><div class="row" style="gap:8px"><span id="health-last" style="font-size:12px;color:var(--ink2)">لم يبدأ الفحص بعد</span><button class="btn out sm" id="recheck">🔄 إعادة الفحص</button></div></div>
    <p style="color:var(--ink2);margin:0 0 14px;line-height:1.9">لوحة متابعة بالعربي: كل نتيجة توضح الحالة ومعناها وتأثيرها والخطوة التالية. رسائل الخطأ الأصلية تظهر كما وردت من الخدمة، ويتبعها شرح مبسط. الفحوصات التي تحتاج صلاحية خادمية أو تكاملًا خارجيًا ستظهر بوضوح على أنها غير مفحوصة، ولن تُعرض كأنها سليمة.</p>
    <div id="health-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:12px 0"></div>
    <div class="set-card" style="padding:12px;margin:12px 0"><div class="row" style="gap:8px;flex-wrap:wrap"><input id="health-search" placeholder="🔎 ابحث عن فحص أو خطأ..." style="flex:1;min-width:180px"><select id="health-filter" style="min-width:145px"><option value="all">كل الحالات</option><option value="error">خطر / فشل</option><option value="warn">تحذير</option><option value="ok">سليم</option><option value="info">غير مفحوص / معلومة</option></select></div><p style="font-size:12px;color:var(--ink2);margin:8px 0 0">افتح أي نتيجة لعرض شرحها، والسبب المحتمل، والتأثير، والإجراء المقترح.</p></div>
    <div id="health-body">⏳ جاري فحص النظام...</div>
    <div id="health-advisories" style="margin-top:18px"></div>`;

  const explainError = err => {
    if (!err) return {summary:'لم يرد خطأ من الخدمة.', original:'', next:'لا يلزم إجراء.'};
    const code = String(err.code || err.status || '');
    const msg = String(err.message || err.details || err.hint || 'خطأ غير معروف');
    if (/Failed to fetch|NetworkError|fetch failed|Load failed|ERR_NETWORK/i.test(msg)) return {summary:'تعذر الاتصال بالخدمة. قد يكون السبب الإنترنت أو انقطاع الخدمة أو إعدادات الشبكة.',original:msg,next:'تأكد من اتصال الإنترنت ثم أعد الفحص. إذا استمر الخطأ، راجع سجل الخدمة ووقت حدوثه.'};
    if (code === 'PGRST205' || /Could not find the table|relation .* does not exist/i.test(msg)) return {summary:'الجدول غير موجود أو غير منشور عبر واجهة البيانات، أو أن اسمه غير صحيح.',original:msg,next:'راجع اسم الجدول ومخططه وإعدادات إتاحة Data API في Supabase.'};
    if (code === '42501' || /permission denied|row-level security|RLS/i.test(msg)) return {summary:'قاعدة البيانات رفضت العملية بسبب الصلاحيات أو سياسة حماية الصفوف.',original:msg,next:'راجع صلاحيات الدور وسياسات RLS للعملية المطلوبة. لا توسّع الصلاحيات قبل التأكد من المستخدم والصفوف المسموح بها.'};
    if (code === 'PGRST116') return {summary:'الاستعلام لم يُرجع صفًا بالشكل المتوقع؛ قد تكون البيانات غير موجودة أو غير فريدة.',original:msg,next:'تحقق من وجود السجل ومن أن الاستعلام يتوقع صفًا واحدًا فقط.'};
    if (code === '401' || /JWT|not authenticated|invalid.*token/i.test(msg)) return {summary:'جلسة الدخول غير صالحة أو انتهت صلاحيتها.',original:msg,next:'سجّل الخروج ثم ادخل مرة أخرى. إذا تكرر الأمر، راجع إعدادات المصادقة وصلاحية الجلسة.'};
    if (code === '429' || /rate limit|too many requests/i.test(msg)) return {summary:'تم تجاوز حد الطلبات المسموح به خلال فترة قصيرة.',original:msg,next:'خفّض تكرار الطلبات، واستخدم إعادة المحاولة بتدرّج، وراجع حدود الخدمة.'};
    if (/timeout|timed out|statement timeout/i.test(msg)) return {summary:'انتهت مهلة انتظار العملية قبل اكتمالها.',original:msg,next:'راجع بطء الاستعلامات وسجلات قاعدة البيانات والضغط على الخدمة.'};
    return {summary:'حدث خطأ لم يطابق قاعدة ترجمة معروفة. النص الأصلي متاح للمراجعة.',original:msg,next:'انسخ رسالة الخطأ الأصلية وراجع سجل الخدمة أو دعم Supabase لتحديد السبب بدقة.'};
  };
  const escText = x => esc(String(x == null ? '' : x));
  const runCheck = async () => {
    const body = $('health-body'), summary = $('health-summary'), advisoryBox = $('health-advisories');
    if (!body || !summary || !advisoryBox) return;
    body.innerHTML = '<div class="set-card" style="padding:14px">⏳ بنفحص الاتصال والجلسة والجداول والطلبات والتوصيل...</div>';
    summary.innerHTML = ''; advisoryBox.innerHTML = '';
    const items = [];
    const add = (category,name,status,message='',ms=null,extra={}) => items.push({category,name,status,message:message||'',ms,impact:extra.impact||'',cause:extra.cause||'',next:extra.next||'',original:extra.original||'',technical:extra.technical||''});
    const probe = async (category,name,fn,explain,impact='قد يؤثر على تشغيل لوحة الإدارة أو الخدمة المرتبطة بها.') => {
      const t0=performance.now();
      try { const r=await fn(); const ms=Math.round(performance.now()-t0); if(r && r.error){const e=explainError(r.error);add(category,name,'error',e.summary,ms,{impact,cause:'أعادت الخدمة خطأ أثناء تنفيذ الفحص.',next:e.next,original:e.original,technical:r.error.code||r.error.status||''});return null;} const value=explain?explain(r):r; if(value && value.status){add(category,name,value.status,value.message,ms,{impact,cause:value.cause,next:value.next,original:value.original,technical:value.technical});return value.data;} add(category,name,'ok',typeof value==='string'?value:'اكتمل الفحص بنجاح.',ms,{impact:'لا توجد مشكلة في هذا الفحص وقت القياس.',next:'لا يلزم إجراء حاليًا.'});return value; }
      catch(e){const x=explainError(e);add(category,name,'error',x.summary,Math.round(performance.now()-t0),{impact,cause:'تعذر إكمال الفحص بسبب استثناء أثناء التنفيذ.',next:x.next,original:x.original,technical:e?.code||e?.name||''});return null;}
    };

    add('الاتصال والإعداد','اتصال الجهاز بالإنترنت',navigator.onLine?'ok':'error',navigator.onLine?'المتصفح يبلغ أن الاتصال بالشبكة متاح.':'المتصفح يبلغ أن الجهاز غير متصل بالشبكة.',null,{impact:'انقطاع الإنترنت يمنع لوحة الإدارة من الوصول إلى الخدمات الخارجية.',next:'تحقق من شبكة الجهاز ثم أعد الفحص.'});
    add('الاتصال والإعداد','تهيئة الاتصال بقاعدة البيانات',sb&&CONFIG&&CONFIG.SETTINGS_ROW_ID?'ok':'error',sb&&CONFIG&&CONFIG.SETTINGS_ROW_ID?'تم إعداد عميل قاعدة البيانات ومعرّف إعدادات المطعم.':'هناك إعداد أساسي مفقود في تهيئة عميل قاعدة البيانات.',null,{impact:'قد تتعطل معظم وظائف لوحة الإدارة إذا لم يكتمل الإعداد.',next:'راجع إعدادات التطبيق ومتغيرات الاتصال دون مشاركة المفاتيح السرية.'});

    await probe('الحساب والجلسة','جلسة تسجيل الدخول',()=>sb.auth.getUser(),r=>({status:r.data?.user?'ok':'error',message:r.data?.user?'تم التحقق من جلسة الحساب الحالي.':'لم يتم العثور على مستخدم موثّق.',cause:r.data?.user?'':'قد تكون الجلسة منتهية أو أن المستخدم غير مسجل الدخول.',next:r.data?.user?'لا يلزم إجراء.':'سجّل الدخول مرة أخرى، ثم راجع صلاحيات الحساب إذا استمر الأمر.'}), 'قد يمنع انتهاء الجلسة تنفيذ عمليات الإدارة.');
    await probe('قاعدة البيانات','إعدادات المطعم الأساسية',()=>sb.from('store_settings').select('id').eq('id',CONFIG.SETTINGS_ROW_ID).maybeSingle(),r=>({status:!r.error&&!!r.data?'ok':'error',message:r.error?'تعذر قراءة إعدادات المطعم.':r.data?'تم الوصول إلى سجل إعدادات المطعم.':'الاتصال يعمل لكن سجل الإعدادات المحدد غير موجود.',cause:r.data?'':'قد يكون سجل الإعدادات غير موجود أو غير متاح للحساب الحالي.',next:r.data?'لا يلزم إجراء.':'راجع وجود سجل إعدادات المطعم ومعرّفه وسياسة القراءة.'}));
    const rtEl=$('rt'),rtOk=!!rtEl&&rtEl.classList.contains('live');
    add('التحديثات المباشرة','تحديثات الطلبات لحظيًا',rtOk?'ok':'warn',rtOk?'قناة التحديثات المباشرة متصلة حسب مؤشر التطبيق.':'التطبيق لا يعرض القناة المباشرة كمتصلة؛ قد تتأخر تحديثات الطلبات.',null,{impact:'قد لا تظهر الطلبات وتغييراتها فورًا على لوحة الإدارة.',cause:'قد تكون القناة ما زالت تتصل أو أن الاتصال انقطع.',next:'انتظر قليلًا ثم أعد الفحص. إذا استمر التحذير، راجع إعدادات Realtime وسجلات الشبكة.'});

    const tables=[['categories','أقسام المنيو'],['menu_items','أصناف المنيو'],['item_sizes','أحجام الأصناف'],['addons','الإضافات'],['item_addons','ربط الأصناف بالإضافات'],['orders','الطلبات'],['order_items','تفاصيل الطلبات'],['order_status_history','سجل حالات الطلبات'],['drivers','السائقون'],['delivery_zones','مناطق التوصيل'],['coupons','الكوبونات'],['coupon_redemptions','استخدام الكوبونات'],['reviews','التقييمات'],['user_roles','أدوار المستخدمين'],['store_settings','إعدادات المطعم'],['loyalty_ledger','سجل نقاط الولاء'],['loyalty_stamp_ledger','سجل أختام الولاء'],['menu_promotions','عروض المنيو'],['refunds','طلبات الاسترداد'],['admin_audit_log','سجل نشاط الإدارة'],['secret_menu_codes','أكواد المنيو السري'],['secret_menu_code_items','أصناف المنيو السري'],['customer_notifications','إشعارات العملاء']];
    await Promise.all(tables.map(async ([table,label])=>{const t0=performance.now();try{const r=await sb.from(table).select('*').limit(1);if(r.error){const e=explainError(r.error);add('إتاحة الجداول',label,'error',e.summary,Math.round(performance.now()-t0),{impact:'قد تتعطل الشاشة أو الوظيفة التي تعتمد على هذا الجدول.',cause:'فشل استعلام تجريبي محدود للقراءة.',next:e.next,original:e.original,technical:r.error.code||''});}else add('إتاحة الجداول',label,'ok','الجدول قابل للاستعلام بحساب الإدارة الحالي.',Math.round(performance.now()-t0),{next:'لا يلزم إجراء حاليًا.'});}catch(e){const x=explainError(e);add('إتاحة الجداول',label,'error',x.summary,Math.round(performance.now()-t0),{impact:'قد تتعطل الوظيفة المرتبطة بالجدول.',cause:'تعذر تنفيذ الاستعلام التجريبي.',next:x.next,original:x.original});}}));

    // Operational checks use only operational fields and never display customer contact details.
    let orders=null,drivers=null;
    await Promise.all([
      (async()=>{orders=await probe('الطلبات والتشغيل','فحص الطلبات الحديثة',()=>sb.from('orders').select('id,order_number,status,payment_method,payment_status,created_at,updated_at,assigned_driver_id,idempotency_key').order('created_at',{ascending:false}).limit(500),r=>({status:'ok',message:`تمت قراءة ${r.data?.length||0} طلبًا حديثًا كحد أقصى 500 طلب للتحقق التشغيلي.`,data:r.data||[],next:'هذا فحص لعينة حديثة وليس تقريرًا تاريخيًا شاملًا.'}),'قد تُظهر هذه الفحوصات تأخرًا في تجهيز الطلبات أو مشاكل في الدفع.');})(),
      (async()=>{drivers=await probe('التوصيل والسائقون','قراءة حالة السائقين',()=>sb.from('drivers').select('id,is_active,availability').limit(300),r=>({status:'ok',message:`تمت قراءة بيانات حالة ${r.data?.length||0} سائقًا كحد أقصى 300.`,data:r.data||[],next:'لا تُعرض أسماء السائقين أو أرقامهم في تقرير التشخيص.'}),'قد يؤدي نقص السائقين المتاحين إلى تأخر تسليم الطلبات.');})()
    ]);
    if(Array.isArray(orders)){
      const now=Date.now(),active=orders.filter(o=>['confirmed','preparing'].includes(o.status));
      const stuck=active.filter(o=>now-new Date(o.updated_at||o.created_at).getTime()>45*60*1000);
      add('الطلبات والتشغيل','طلبات مؤكدة أو قيد التحضير لأكثر من 45 دقيقة',stuck.length?'warn':'ok',stuck.length?`يوجد ${stuck.length} طلبًا لم يتغير تحديثه منذ أكثر من 45 دقيقة.`:'لا توجد طلبات مؤكدة أو قيد التحضير تجاوزت 45 دقيقة ضمن العينة الحديثة.',null,{impact:'قد يكون الطلب منسيًا أو متوقفًا في المطبخ.',cause:'المدة محسوبة من آخر تحديث مسجل، وقد لا تعكس التأخير إذا كان حقل التحديث لا يتغير مع كل انتقال.',next:'افتح الطلبات المتأخرة وتأكد من حالتها مع فريق المطبخ. عتبة 45 دقيقة معيار تنبيه قابل للتعديل.'});
      const ready=orders.filter(o=>o.status==='ready'),readyUnassigned=ready.filter(o=>!o.assigned_driver_id);
      add('التوصيل والسائقون','طلبات جاهزة دون سائق معيّن',readyUnassigned.length?'warn':'ok',readyUnassigned.length?`هناك ${readyUnassigned.length} طلبًا جاهزًا دون سائق معيّن من أصل ${ready.length} طلبًا جاهزًا.`:`لا توجد طلبات جاهزة غير مسندة ضمن العينة (${ready.length} جاهز).`,null,{impact:'قد تنتظر الطلبات الجاهزة وقتًا أطول قبل خروجها للتوصيل.',cause:'لم يتم تعيين سائق لبعض الطلبات الجاهزة.',next:'راجع شاشة الطلبات والسائقين وعيّن سائقًا متاحًا عند الحاجة.'});
      const failedPay=orders.filter(o=>o.payment_status==='failed');
      add('الدفع والمعاملات','طلبات عليها حالة دفع فاشلة',failedPay.length?'warn':'ok',failedPay.length?`تم العثور على ${failedPay.length} طلبًا بحالة دفع فاشلة ضمن العينة.`:'لا توجد طلبات بحالة دفع فاشلة ضمن العينة الحديثة.',null,{impact:'قد يحتاج العميل إلى إعادة المحاولة أو مراجعة حالة المعاملة.',cause:'هذا يعكس حالة الطلب المسجلة فقط ولا يثبت ما حدث داخل بوابة الدفع.',next:'طابق كل حالة مع لوحة بوابة الدفع قبل أي استرداد أو تعديل يدوي.'});
      const oldVisa=orders.filter(o=>o.payment_method==='visa'&&o.payment_status==='pending'&&now-new Date(o.created_at).getTime()>15*60*1000);
      add('الدفع والمعاملات','طلبات بطاقة معلّقة لأكثر من 15 دقيقة',oldVisa.length?'warn':'ok',oldVisa.length?`هناك ${oldVisa.length} طلبًا للدفع بالبطاقة ما زال معلّقًا لأكثر من 15 دقيقة.`:'لا توجد طلبات بطاقة معلّقة تجاوزت 15 دقيقة ضمن العينة.',null,{impact:'قد يكون إشعار الدفع تأخر أو أن العميل لم يكمل الدفع.',cause:'الحالة في جدول الطلبات لا تكشف وحدها نتيجة مزود الدفع.',next:'راجع سجل بوابة الدفع وإشعارات الخادم قبل اعتبار العملية مدفوعة أو فاشلة.'});
      const keys=orders.filter(o=>o.idempotency_key).map(o=>o.idempotency_key),counts={};keys.forEach(k=>counts[k]=(counts[k]||0)+1);const dup=Object.values(counts).filter(n=>n>1).reduce((a,n)=>a+n-1,0);
      add('سلامة الطلبات','مفاتيح منع تكرار الطلبات',dup?'warn':'ok',dup?`ظهر ${dup} تكرارًا لمفتاح منع التكرار ضمن آخر ${orders.length} طلبًا.`:'لم تظهر مفاتيح منع تكرار مكررة ضمن العينة التي تمت قراءتها.',null,{impact:'التكرار قد يشير إلى مشكلة في منع إعادة إرسال الطلب، لكنه لا يثبت وحده أن العميل دفع أو استلم مرتين.',cause:'قد يكون هناك إرسال مكرر أو نقص في قيد التفرد أو سلوك إعادة محاولة.',next:'راجع قيد التفرد وآلية إنشاء الطلب قبل إجراء أي حذف أو تعديل.'});
      if(Array.isArray(drivers)){
        const activeDrivers=drivers.filter(d=>d.is_active===true),available=activeDrivers.filter(d=>String(d.availability||'').toLowerCase()==='available').length;
        add('التوصيل والسائقون','مؤشر توفر السائقين',ready.length>0&&available===0?'warn':'info',ready.length>0&&available===0?`هناك ${ready.length} طلبًا جاهزًا ولا يوجد سائق نشط حالته النصية available ضمن العينة.`:`عدد السائقين النشطين: ${activeDrivers.length}، وعدد من حالتهم available حرفيًا: ${available}.`,null,{impact:'قد يساعد المؤشر في اكتشاف ضغط التوصيل.',cause:'تعتمد النتيجة على القيمة النصية الفعلية لحالة السائق؛ القيم الأخرى لا تُفسّر على أنها متاح.',next:'راجع صفحة السائقين للتأكد من حالات التوفر الفعلية. هذا مؤشر مساعد وليس حكمًا نهائيًا على القدرة التشغيلية.'});
      }
    }

    // Explicitly mark checks that require trusted server-side APIs or external provider access.
    const notAvailable=[
      ['البنية التحتية','صلاحية النطاق وشهادة الأمان','لا يمكن تأكيد تاريخ انتهاء النطاق أو الشهادة من داخل لوحة الإدارة وحدها.','اربط مراقبة خادمية لفحص DNS وشهادة TLS والتنبيه قبل الانتهاء.'],
      ['البنية التحتية','استهلاك قاعدة البيانات والتخزين','لم يتم جلب الحصص الفعلية أو حدود الباقة في هذا الفحص.','استخدم بيانات الاستخدام من Supabase أو واجهة مراقبة خادمية، ونبّه عند 80% من الحد.'],
      ['البنية التحتية','ضغط اتصالات PostgreSQL','لا تتوفر قراءة موثوقة لعدد الاتصالات والحد الأقصى من متصفح الإدارة.','راقب الاتصالات من سجلات/مقاييس قاعدة البيانات، ولا تعتمد على استعلامات المتصفح لتقدير الحد.'],
      ['بوابات الدفع','مطابقة المدفوعات مع بوابة الدفع','تم فحص حالة الدفع المسجلة في الطلبات فقط؛ لم تتم مطابقتها مع سجل مزود الدفع.','يحتاج هذا إلى تكامل خادمي موثوق مع Paymob أو مزود الدفع المستخدم.'],
      ['بوابات الدفع','وصول إشعارات الدفع (Webhooks)','لم يتم اختبار سجل استقبال إشعارات بوابة الدفع؛ لا توجد نتيجة مؤكدة هنا.','سجّل نجاح وفشل كل إشعار على الخادم مع التوقيت ومعرّف المعاملة دون تخزين أسرار.'],
      ['الخدمات الخارجية','اتصال واتساب Evolution API','لا يمكن تأكيد حالة جلسة واتساب من المتصفح دون نقطة فحص خادمية آمنة.','أضف فحصًا خادميًا يعيد حالة الاتصال فقط، ولا يكشف مفاتيح API أو بيانات الجلسة.'],
      ['الخدمات الخارجية','صلاحية رمز Meta / ماسنجر','لم يتم فحص تاريخ صلاحية الرمز أو اختباره عبر Graph API.','أضف مراقبة خادمية آمنة لصلاحية الرمز وتنبيهًا قبل الانتهاء، ولا تعرض الرمز نفسه.'],
      ['الأمان المتقدم','محاولات الدخول والحظر المؤقت','لا تتوفر في هذا الفحص إحصاءات موثوقة لمحاولات الدخول حسب الحساب أو عنوان الشبكة.','اجمع مؤشرات المصادقة من سجلات موثوقة مع إخفاء البيانات الحساسة وتحديد معدل المحاولات.'],
      ['الأمان المتقدم','نسبة تفعيل التحقق بخطوتين','لم يتم التحقق من حالة التحقق متعدد العوامل لكل حساب إداري.','افحص عوامل المصادقة من واجهة الإدارة الخادمية، واعرض النسبة دون كشف أسرار المستخدمين.'],
      ['أمان البيانات','تغطية سياسات RLS لجميع الجداول','نجاح قراءة الجداول لا يثبت أن سياسات الأمان تمنع الوصول غير المصرح به.','راجع نتائج مستشاري Supabase واختبارات الصلاحيات لكل دور، بما فيها مستخدم غير إداري.']
    ];
    notAvailable.forEach(([cat,name,message,next])=>add(cat,name,'info',message,null,{impact:'هذه نقطة مراقبة مهمة لم تُثبت حالتها بعد.',cause:'الفحص الحالي لا يملك مصدرًا آمنًا وموثوقًا لهذه المعلومة.',next}));

    const statusRank={error:0,warn:1,info:2,ok:3},bad=items.filter(i=>i.status==='error').length,warns=items.filter(i=>i.status==='warn').length,passed=items.filter(i=>i.status==='ok').length,unknown=items.filter(i=>i.status==='info').length;
    summary.innerHTML=[
      {n:'حالة النظام',v:bad?'يحتاج تدخلًا':warns?'يحتاج مراجعة':'الفحوصات المباشرة مستقرة',c:bad?'var(--err)':warns?'var(--warn,var(--ink2))':'var(--ok)',small:'الحكم مبني على الفحوصات التي نُفذت الآن'},
      {n:'أعطال / فشل',v:bad,c:bad?'var(--err)':'var(--ok)',small:'فحوصات لم تنجح'},
      {n:'تحذيرات تشغيلية',v:warns,c:warns?'var(--warn,var(--ink2))':'var(--ok)',small:'تحتاج مراجعة بشرية'},
      {n:'فحوصات سليمة',v:passed,c:'var(--ok)',small:'نجحت وقت الفحص'},
      {n:'تحتاج ربطًا أو صلاحية',v:unknown,c:'var(--ink2)',small:'لم تُعرض كسليمة دون دليل'}
    ].map(x=>`<div class="set-card" style="padding:12px"><small style="color:var(--ink2)">${escText(x.n)}</small><div style="font-size:21px;font-weight:800;color:${x.c};margin-top:6px;line-height:1.5">${x.v}</div><small style="color:var(--ink2)">${escText(x.small)}</small></div>`).join('');

    const statusLabel={ok:'سليم',warn:'تحذير',error:'خطر / فشل',info:'غير مفحوص'};
    const statusIcon={ok:'✅',warn:'⚠️',error:'🛑',info:'ℹ️'};
    const renderItems=arr=>arr.map(i=>`<details data-health-item data-status="${i.status}" data-search="${escText((i.category+' '+i.name+' '+i.message+' '+i.original).toLowerCase())}" style="padding:11px 14px;border-bottom:1px solid var(--line)"><summary style="cursor:pointer;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;list-style-position:inside"><span style="line-height:1.8">${statusIcon[i.status]} ${escText(i.name)}</span><span style="font-size:11px;white-space:nowrap;border:1px solid var(--line);border-radius:20px;padding:3px 8px;color:${i.status==='error'?'var(--err)':i.status==='ok'?'var(--ok)':i.status==='warn'?'var(--warn,var(--ink2))':'var(--ink2)'}">${statusLabel[i.status]}${i.ms!=null?' · '+i.ms+' مللي ثانية':''}</span></summary><div style="padding:10px 24px 3px;line-height:1.9;overflow-wrap:anywhere"><p style="margin:0 0 8px"><b>الشرح:</b> ${escText(i.message)}</p>${i.impact?`<p style="margin:0 0 8px"><b>التأثير المحتمل:</b> ${escText(i.impact)}</p>`:''}${i.cause?`<p style="margin:0 0 8px"><b>السبب أو حدود الفحص:</b> ${escText(i.cause)}</p>`:''}${i.original?`<div style="margin:10px 0;padding:10px;border-radius:8px;background:var(--bg2,var(--line));"><b>رسالة الخطأ الأصلية:</b><pre dir="ltr" style="white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0;font-size:12px">${escText(i.original)}</pre></div>`:''}${i.technical?`<p style="margin:0 0 8px"><b>رمز تقني:</b> <code dir="ltr">${escText(i.technical)}</code></p>`:''}${i.next?`<p style="margin:0"><b>الإجراء المقترح:</b> ${escText(i.next)}</p>`:''}</div></details>`).join('');
    const groups=[...new Set(items.map(i=>i.category))];
    body.innerHTML=groups.map(g=>{const arr=items.filter(i=>i.category===g);const ec=arr.filter(i=>i.status==='error').length,wc=arr.filter(i=>i.status==='warn').length,okc=arr.filter(i=>i.status==='ok').length;return `<section class="set-card" data-health-group style="margin:10px 0;padding:0;overflow:hidden"><h3 style="margin:0;padding:12px 14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span>${escText(g)}</span><small style="font-weight:400;color:var(--ink2)">${okc} سليم · ${wc} تحذير · ${ec} خطر · ${arr.filter(i=>i.status==='info').length} غير مفحوص</small></h3>${renderItems(arr)}</section>`;}).join('');

    advisoryBox.innerHTML=`<section class="set-card" style="margin:14px 0;padding:14px;border-inline-start:4px solid var(--warn,var(--ink2))"><h3 style="margin-top:0">🔐 تنبيهات الأمان من آخر مراجعة</h3><p style="line-height:1.9">التنبيهات التالية ملخص نتائج مراجعة قاعدة البيانات المتاحة وقت إعداد هذه النسخة، وليست فحصًا مباشرًا جديدًا عند كل ضغطة. راجع النتائج الحالية من لوحة Supabase قبل اتخاذ أي قرار.</p><div style="line-height:1.9"><p><b>1. دوال ذات صلاحيات مرتفعة:</b> ظهر تنبيه بشأن دوال <code>SECURITY DEFINER</code> التي يمكن للحسابات المسجلة استدعاؤها. قد يكون ذلك مقصودًا، لكنه يتطلب مراجعة تحقق الهوية والصلاحية داخل كل دالة. لا تسحب الصلاحيات عشوائيًا.</p><p><b>2. جدول داخلي بلا سياسات وصول:</b> ظهر تنبيه بأن <code>private.secret_menu_sessions</code> لديه حماية الصفوف مفعّلة لكن لا توجد سياسات. يجب مراجعة طريقة وصول الدوال الخادمية إليه قبل تعديل الحماية.</p><p><b>3. كلمات المرور المسرّبة:</b> راجع إعدادات حماية كلمات المرور في المصادقة للتأكد من تفعيلها إذا كانت متاحة في باقتك.</p></div><p><a href="https://supabase.com/dashboard/project/gwufhitzmupyumdjabnj/editor" target="_blank" rel="noopener">فتح محرر قاعدة البيانات</a> · <a href="https://supabase.com/dashboard/project/gwufhitzmupyumdjabnj/auth/providers" target="_blank" rel="noopener">إعدادات تسجيل الدخول</a> · <a href="https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable" target="_blank" rel="noopener">شرح تنبيه الدوال</a></p><p style="font-size:12px;color:var(--ink2);margin-bottom:0">تنبيه: لا يتم عرض أعداد ثابتة قديمة على أنها نتائج حية. يلزم تشغيل مستشاري الأمان مجددًا للحصول على الحالة الحالية.</p></section>`;

    const applyFilter=()=>{const q=($('health-search')?.value||'').trim().toLowerCase(),f=$('health-filter')?.value||'all';document.querySelectorAll('[data-health-item]').forEach(el=>{const show=(f==='all'||el.dataset.status===f)&&(!q||(el.dataset.search||'').includes(q));el.style.display=show?'':'none';});document.querySelectorAll('[data-health-group]').forEach(g=>{const visible=[...g.querySelectorAll('[data-health-item]')].some(el=>el.style.display!=='none');g.style.display=visible?'':'none';});};
    $('health-search').oninput=applyFilter;$('health-filter').onchange=applyFilter;
    const last=$('health-last');if(last)last.textContent='آخر فحص: '+new Date().toLocaleString('ar-EG');
  };
  $('recheck').onclick=async()=>{const b=$('recheck');if(b)b.disabled=true;try{await runCheck();}catch(e){const body=$('health-body');const x=explainError(e);if(body)body.innerHTML=`<div class="set-card" style="padding:14px;border-inline-start:4px solid var(--err)"><h3>تعذر إكمال الفحص</h3><p>${escText(x.summary)}</p><p><b>رسالة الخطأ الأصلية:</b></p><pre dir="ltr" style="white-space:pre-wrap;overflow-wrap:anywhere">${escText(x.original||String(e))}</pre><p><b>الحل المقترح:</b> ${escText(x.next)}</p></div>`;}finally{if(b)b.disabled=false;}};
  try{await runCheck();}catch(e){const body=$('health-body');const x=explainError(e);if(body)body.innerHTML=`<div class="set-card" style="padding:14px;border-inline-start:4px solid var(--err)"><h3>تعذر إكمال الفحص</h3><p>${escText(x.summary)}</p><p><b>رسالة الخطأ الأصلية:</b></p><pre dir="ltr" style="white-space:pre-wrap;overflow-wrap:anywhere">${escText(x.original||String(e))}</pre><p><b>الحل المقترح:</b> ${escText(x.next)}</p></div>`;}
};

/* ─── SETTINGS ─── */
VIEWS['home-controls'] = async v => {
  await loadSettings();
  const s = SETTINGS || {};
  const { data: items, error: itemsError } = await sb.from('menu_items')
    .select('id,name_ar,is_available,is_popular,free_delivery,is_secret,is_spicy,is_vegetarian')
    .order('name_ar');
  if (itemsError) { v.innerHTML = `<div class="empty">تعذر تحميل أصناف القائمة: ${esc(itemsError.message)}</div>`; return; }
  const products = items || [];
  const promoLookup = await sb.from('menu_promotions').select('target_item_id,reward_item_id,is_active,ends_at,max_uses,used_count').eq('is_active', true);
  const activePromoRows = promoLookup.error ? [] : (promoLookup.data || []).filter(p => (!p.ends_at || new Date(p.ends_at) > new Date()) && (p.max_uses == null || Number(p.used_count || 0) < Number(p.max_uses)));
  const secretConflictIds = new Set(activePromoRows.flatMap(p => [p.target_item_id, p.reward_item_id]).filter(Boolean));
  const hasSecretConflict = id => secretConflictIds.has(id);
  const chefItems = products.filter(x => x.is_available && !x.is_secret && !hasSecretConflict(x.id));
  v.innerHTML = `
    <div class="set-card" style="margin-bottom:16px">
      <h3>🎯 تحكم موحّد في الصفحة الرئيسية</h3>
      <p style="font-size:13px;line-height:1.9;color:var(--ink2);margin:0">من هنا تتحكم في اختيار الشيف، والفلاتر وعلامات الأصناف التي تظهر في الصفحة الرئيسية، والمنيو السري وأكواد فتحه. مكافأة الكود التلقائية: 4 طلبات مستلمة، كل طلب بقيمة 200 جنيه أو أكثر. المنتج السري لا يمكن استخدامه في عرض نشط والعكس. إدارة العروض في شاشة «العروض والخصومات» المستقلة، ورسوم التوصيل وحد التوصيل المجاني في «إعدادات المطعم».</p>
    </div>
    <div class="set-grid" style="margin-bottom:18px">
      <div class="set-card">
        <h3>👨‍🍳 اختيار الشيف</h3>
        <p style="font-size:12px;color:var(--ink2);line-height:1.8">اختار صنفًا واحدًا يظهر في الصفحة الرئيسية مع الخصم. اختر «إخفاء القسم» إذا مش عايز تعرضه.</p>
        <label>الصنف المختار</label>
        <select id="hc_chef_item"><option value="">— إخفاء قسم اختيار الشيف —</option>${chefItems.map(it=>`<option value="${it.id}">${esc(it.name_ar)}</option>`).join('')}</select>
        <label>نسبة الخصم (%)</label><input id="hc_chef_discount" type="number" min="1" max="99" step="1" value="${Math.round(Number(s.chef_special_discount ?? 0.25)*100)}">
        <button class="btn pri big" id="hc_save_chef" style="margin-top:12px">💾 حفظ اختيار الشيف</button>
      </div>
    </div>
    <div class="set-card" style="margin-bottom:18px">
      <h3>👁️ الفلاتر الظاهرة للعميل</h3>
      <p style="font-size:12px;color:var(--ink2);line-height:1.8">فعّل الفلاتر التي تريد أن تظهر في تطبيق العميل. هذه المفاتيح تتحكم في ظهور أزرار الفلترة فقط؛ أما وجود منتجات داخل كل فلتر فيعتمد على العلامات الموجودة في جدول الأصناف.</p>
      <div class="set-grid">
        <label class="toggle"><span>🔥 إظهار «الأكثر طلبًا»</span><input type="checkbox" id="hc_show_popular" ${s.show_popular_filter !== false ? 'checked' : ''}></label>
        <label class="toggle"><span>🌶 إظهار «حار»</span><input type="checkbox" id="hc_show_spicy" ${s.show_spicy_filter !== false ? 'checked' : ''}></label>
        <label class="toggle"><span>🥬 إظهار «نباتي»</span><input type="checkbox" id="hc_show_vegetarian" ${s.show_vegetarian_filter !== false ? 'checked' : ''}></label>
        <label class="toggle"><span>🛵 إظهار «توصيل مجاني»</span><input type="checkbox" id="hc_show_free_delivery" ${s.show_free_delivery_filter !== false ? 'checked' : ''}></label>
      </div>
      <button class="btn pri big" id="hc_save_filters" style="margin-top:12px">💾 حفظ فلاتر تطبيق العميل</button>
    </div>
    <div class="set-card" style="margin-bottom:18px">
      <h3>🍔 تحديد ظهور الأصناف في الصفحة الرئيسية</h3>
      <p style="font-size:12px;color:var(--ink2);line-height:1.8">«الأكثر طلبًا» اختيار يدوي حاليًا وليس محسوبًا تلقائيًا من الطلبات. «حار» و«نباتي» و«توصيل مجاني» علامات تظهر حسب الاختيار هنا. «توصيل مجاني للصنف» مختلف عن حد التوصيل المجاني لإجمالي الطلب. فعّل «سري» لإخفائه من المنيو العادي؛ سيظهر بجانبه 🔐 كود سري. لا يمكن اختياره إذا كان مرتبطًا بعرض نشط.</p>
      ${products.length ? `<div style="overflow:auto"><table class="tbl"><thead><tr><th>الصنف</th><th>الأكثر طلبًا</th><th>حار</th><th>نباتي</th><th>توصيل مجاني للصنف</th><th>صنف سري</th><th>حفظ</th></tr></thead><tbody>${products.map(it=>`<tr data-home-item="${it.id}"><td data-label="الصنف"><b>${esc(it.name_ar)}</b>${it.is_secret?' <span class="badge-ico" title="مخصص للمنيو السري">🔐 كود سري</span>':''}${hasSecretConflict(it.id)?' <small style="color:var(--err)">(مرتبط بعرض نشط)</small>':''}${it.is_available?'':' <small>(غير متاح)</small>'}</td><td data-label="الأكثر طلبًا"><input type="checkbox" data-flag="is_popular" ${it.is_popular?'checked':''}></td><td data-label="حار"><input type="checkbox" data-flag="is_spicy" ${it.is_spicy?'checked':''}></td><td data-label="نباتي"><input type="checkbox" data-flag="is_vegetarian" ${it.is_vegetarian?'checked':''}></td><td data-label="توصيل مجاني"><input type="checkbox" data-flag="free_delivery" ${it.free_delivery?'checked':''}></td><td data-label="صنف سري"><input type="checkbox" data-flag="is_secret" ${it.is_secret?'checked':''} ${hasSecretConflict(it.id)&&!it.is_secret?'disabled title="المنتج مرتبط بعرض نشط؛ لا يمكن تخصيصه للكود السري"':''}></td><td data-label="حفظ"><button class="btn pri sm" data-save-home-item>حفظ</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">لا توجد أصناف.</div>'}
    </div>
    <div class="set-card" style="margin-bottom:18px">
      <h3>🤫 المنيو السري — الأكواد والأصناف</h3>
      <p style="font-size:12px;color:var(--ink2);line-height:1.8">الخطوات: علّم الصنف «صنف سري» من الجدول السابق، ثم حدّد الأصناف المتاحة غير المرتبطة بعرض نشط. أي عميل لديه 4 طلبات مستلمة، قيمة كل طلب منها 200 جنيه أو أكثر، يحصل تلقائيًا على كود خاص به داخل إشعارات حسابه. الأكواد اليدوية تظل متاحة من هنا.</p>
      <div class="set-grid">
        <div>
          <label>الكود الذي سيدخله العميل (8 أحرف على الأقل)</label><input id="hc_secret_code" dir="ltr" minlength="8" maxlength="128" placeholder="مثال: SHEEPVIP2026">
          <label>اسم داخلي للكود (اختياري)</label><input id="hc_secret_label" maxlength="120" placeholder="مثال: عروض العملاء المميزين">
          <label>عدد مرات الاستخدام (اختياري)</label><input id="hc_secret_max" type="number" min="1" max="1000000" placeholder="اتركه فارغًا بلا حد">
          <label>تاريخ انتهاء الكود (اختياري)</label><input id="hc_secret_exp" type="date">
          <button class="btn pri big" id="hc_secret_create" style="margin-top:12px">🔐 إنشاء الكود وربطه بالأصناف</button>
        </div>
        <div>
          <b>حدد الأصناف التي يفتحها هذا الكود</b>
          <p style="font-size:12px;color:var(--ink2);line-height:1.8">تظهر هنا الأصناف التي علّمت عليها «صنف سري» فقط.</p>
          <div id="hc_secret_items" style="display:grid;gap:8px;max-height:280px;overflow:auto;padding:8px;border:1px solid var(--line);border-radius:10px">${products.filter(it=>it.is_secret && it.is_available && !hasSecretConflict(it.id)).map(it=>`<label class="toggle"><span>🔐 ${esc(it.name_ar)}</span><input type="checkbox" data-secret-item="${it.id}"></label>`).join('') || '<div class="empty">لا توجد أصناف سرية متاحة وغير مرتبطة بعرض نشط. راجع المنتجات والعروض ثم أعد تحميل الأصناف.</div>'}</div>
          <button class="btn out sm" id="hc_reload_secret_items" style="margin-top:8px">↻ إعادة تحميل الأصناف السرية</button>
        </div>
      </div>
      <div id="hc_secret_codes" style="margin-top:16px">جاري تحميل الأكواد الحالية...</div>
    </div>
`;

  $('hc_chef_item').value = s.chef_special_item_id || '';
  $('hc_save_chef').onclick = async () => {
    const pct = parseNumber($('hc_chef_discount').value);
    if ($('hc_chef_item').value && !(pct >= 1 && pct <= 99)) return toast('نسبة الخصم لازم تكون من 1 إلى 99', 'err');
    await saveSettings({ chef_special_item_id: $('hc_chef_item').value || null, chef_special_discount: (pct >= 1 && pct <= 99 ? pct : 25) / 100 }, 'hc_save_chef');
  };
  $('hc_save_filters').onclick = async () => {
    await saveSettings({
      show_popular_filter: $('hc_show_popular').checked,
      show_spicy_filter: $('hc_show_spicy').checked,
      show_vegetarian_filter: $('hc_show_vegetarian').checked,
      show_free_delivery_filter: $('hc_show_free_delivery').checked
    }, 'hc_save_filters');
  };
  v.querySelectorAll('[data-save-home-item]').forEach(btn => btn.onclick = async () => {
    const row = btn.closest('tr'), id = row.dataset.homeItem;
    const flags = {};
    row.querySelectorAll('[data-flag]').forEach(input => flags[input.dataset.flag] = input.checked);
    btn.disabled = true; btn.textContent = 'جارٍ الحفظ…';
    try {
      const { data, error } = await sb.functions.invoke('admin-api', { body: { action: 'update_menu_item_flags', item_id: id, is_popular: flags.is_popular, free_delivery: flags.free_delivery, is_secret: flags.is_secret } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.data) throw new Error('لم يؤكد الخادم حفظ الصنف');
      const extra = { is_spicy: flags.is_spicy, is_vegetarian: flags.is_vegetarian };
      const extraResult = await sb.from('menu_items').update(extra).eq('id', id);
      if (extraResult.error) throw extraResult.error;
      toast('تم حفظ إعدادات الصنف، والتحديث ينتقل لتطبيق العميل تلقائيًا', 'ok');
    } catch (e) { const msg=String(e?.message||e||''); if (/SECRET_ITEM_PROMOTION_CONFLICT|PROMOTION_SECRET_ITEM_CONFLICT|SECRET_CODE_ITEM_NOT_ELIGIBLE|23514/i.test(msg)) toast('لا يمكن تفعيل الصنف السري لأنه مرتبط بعرض نشط. أوقف العرض أولًا أو اختر منتجًا آخر.', 'err'); else fail(e, 'تعذر حفظ إعدادات الصنف'); }
    finally { btn.disabled = false; btn.textContent = 'حفظ'; }
  });
  const reloadSecretItems = async () => {
    const box = $('hc_secret_items');
    box.innerHTML = 'جاري تحميل الأصناف السرية...';
    const { data, error } = await sb.from('menu_items').select('id,name_ar,is_secret,is_available').eq('is_secret', true).order('name_ar');
    if (error) { box.innerHTML = `<div class="empty">تعذر تحميل الأصناف: ${esc(error.message)}</div>`; return; }
    const promos = await sb.from('menu_promotions').select('target_item_id,reward_item_id,is_active,ends_at,max_uses,used_count').eq('is_active',true);
    const blocked = new Set((promos.data||[]).filter(p=>(!p.ends_at||new Date(p.ends_at)>new Date())&&(p.max_uses==null||Number(p.used_count||0)<Number(p.max_uses))).flatMap(p=>[p.target_item_id,p.reward_item_id]).filter(Boolean));
    const eligible=(data||[]).filter(it=>it.is_available&&!blocked.has(it.id));
    box.innerHTML = eligible.map(it=>`<label class="toggle"><span>🔐 ${esc(it.name_ar)}</span><input type="checkbox" data-secret-item="${it.id}"></label>`).join('') || '<div class="empty">لا توجد أصناف سرية متاحة وغير مرتبطة بعرض نشط. راجع علامة «صنف سري» والعروض الحالية.</div>';
  };
  $('hc_reload_secret_items').onclick = reloadSecretItems;
  const callAdmin = async body => {
    const { data, error } = await sb.functions.invoke('admin-api', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data?.data;
  };
  const renderSecretCodes = async () => {
    const target = $('hc_secret_codes');
    target.innerHTML = 'جاري تحميل الأكواد الحالية...';
    try {
      const codes = await callAdmin({ action: 'list_secret_menu_codes' }) || [];
      target.innerHTML = `<h4>الأكواد الموجودة (${codes.length})</h4>` + (codes.length ? `<div style="overflow:auto"><table class="tbl"><thead><tr><th>الاسم</th><th>الاستخدام</th><th>الصلاحية</th><th>الحالة</th><th></th></tr></thead><tbody>${codes.map(c=>`<tr data-code-id="${c.id}"><td data-label="الاسم">${esc(c.label||'كود سري')}</td><td data-label="الاستخدام">${c.uses_count||0}${c.max_uses?' / '+c.max_uses:''}</td><td data-label="الانتهاء">${c.expires_at?dtShort(c.expires_at):'بدون تاريخ انتهاء'}</td><td data-label="الحالة">${!c.is_active?'متوقف':(c.expires_at&&new Date(c.expires_at)<new Date()?'منتهي':(c.max_uses!=null&&Number(c.uses_count||0)>=Number(c.max_uses)?'اكتمل الاستخدام':'نشط'))}</td><td><button class="btn out sm" data-toggle-secret-code>${c.is_active?'إيقاف':'تشغيل'}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">لا توجد أكواد بعد.</div>');
      target.querySelectorAll('[data-toggle-secret-code]').forEach(btn => btn.onclick = async () => {
        const row = btn.closest('tr'), code = codes.find(c=>c.id===row.dataset.codeId);
        try { await callAdmin({action:'toggle_secret_menu_code',code_id:code.id,is_active:!code.is_active}); toast('تم تحديث حالة الكود','ok'); await renderSecretCodes(); }
        catch(e) { fail(e); }
      });
    } catch(e) { target.innerHTML = `<div class="empty">تعذر تحميل الأكواد: ${esc(e.message||'خطأ غير معروف')}</div>`; }
  };
  $('hc_secret_create').onclick = async () => {
    const code = $('hc_secret_code').value.trim();
    const item_ids = [...v.querySelectorAll('[data-secret-item]:checked')].map(x=>x.dataset.secretItem);
    const max = parseNumber($('hc_secret_max').value);
    if (code.length < 8 || code.length > 128) return toast('الكود لازم يكون من 8 إلى 128 حرفًا', 'err');
    if (!item_ids.length) return toast('اختار صنفًا سريًا واحدًا على الأقل للكود', 'err');
    if ($('hc_secret_max').value.trim() && (!Number.isInteger(max) || max < 1)) return toast('راجع عدد مرات الاستخدام', 'err');
    const payload = { action:'set_secret_menu_code', code, item_ids, label:$('hc_secret_label').value.trim() || ('كود سري ' + new Date().toLocaleDateString('ar-EG')) };
    if (Number.isFinite(max) && max > 0) payload.max_uses = max;
    if ($('hc_secret_exp').value) payload.expires_at = new Date($('hc_secret_exp').value + 'T23:59:59').toISOString();
    const btn = $('hc_secret_create'); btn.disabled = true; btn.textContent = 'جارٍ إنشاء الكود…';
    try {
      await callAdmin(payload);
      openModal(`<h2>تم إنشاء الكود وربطه بالأصناف</h2><p style="line-height:1.9">انسخ الكود واحفظه الآن. لن نستطيع عرضه مرة أخرى لأن النظام يحفظ بصمته فقط.</p><input readonly dir="ltr" value="${esc(code)}" id="hc-secret-created-code"><div class="row"><button class="btn pri big" id="hc-copy-secret">نسخ الكود</button><button class="btn out big" onclick="closeModal()">إغلاق</button></div>`, true);
      $('hc-copy-secret').onclick = async () => { try { await navigator.clipboard.writeText(code); toast('تم نسخ الكود','ok'); } catch { $('hc-secret-created-code').select(); document.execCommand('copy'); toast('تم النسخ','ok'); } };
      $('hc_secret_code').value = ''; $('hc_secret_label').value = ''; $('hc_secret_max').value = ''; $('hc_secret_exp').value = '';
      v.querySelectorAll('[data-secret-item]').forEach(x=>x.checked=false);
      await renderSecretCodes();
    } catch(e) { fail(e, 'فشل إنشاء الكود أو ربط الأصناف'); }
    finally { btn.disabled = false; btn.textContent = '🔐 إنشاء الكود وربطه بالأصناف'; }
  };
  await renderSecretCodes();
};

VIEWS.settings = async v => {
  await Promise.all([loadSettings(), loadLoyalty()]);
  const s = SETTINGS || {};
  const l = LOYALTY || {};

  v.innerHTML = `
    <div class="tabs">
      <button class="on" data-tab="general">عام</button>
      <button data-tab="delivery">التوصيل</button>
      <button data-tab="menu-display">واجهة المنيو</button>
      <button data-tab="chef-special">اختيار الشيف</button>
      <button data-tab="payments">الدفع</button>
      <button data-tab="loyalty">النقاط والولاء والمكافآت</button>
    </div>
    <div data-panel="general">
      <div class="set-grid">
        <div class="set-card"><h3>🏪 الحالة</h3>
          <div class="toggle"><span>مفتوح</span><input type="checkbox" id="s_open" ${s.is_open !== false ? 'checked' : ''}></div>
          <div class="toggle"><span>يستقبل طلبات</span><input type="checkbox" id="s_accept" ${s.accepting_orders !== false ? 'checked' : ''}></div>
        </div>
        <div class="set-card"><h3>📞 بيانات المطعم</h3>
          <label>الاسم</label><input id="s_name" value="${esc(s.name_ar || 'شيب برجر')}">
          <label>الهاتف</label><input id="s_phone" dir="ltr" value="${esc(s.contact_phone || '')}">
          <label>العنوان</label><input id="s_addr" value="${esc(s.address_text || '')}">
        </div>
      </div>
      <div style="margin-top:18px"><button class="btn pri big" id="s_save_general" style="max-width:300px">💾 حفظ</button></div>
    </div>
    <div data-panel="delivery" class="hidden">
      <div class="set-grid">
        <div class="set-card"><h3>🛵 رسوم التوصيل</h3>
          <label>رسوم التوصيل</label><input id="s_delivery" type="number" min="0" value="${s.delivery_fee || 0}">
          <label>الحد الأدنى</label><input id="s_min" type="number" min="0" value="${s.min_order || 0}">
          <label>حد التوصيل المجاني</label><input id="s_freedel" type="number" min="0" value="${s.free_delivery_threshold ?? ''}">
        </div>
        <div class="set-card" style="grid-column:1/-1"><h3>🗺️ مناطق التوصيل</h3>
          <div id="zones-body">جاري التحميل...</div>
        </div>
      </div>
      <div style="margin-top:18px"><button class="btn pri big" id="s_save_delivery" style="max-width:300px">💾 حفظ</button></div>
    </div>
    <div data-panel="menu-display" class="hidden">
      <div class="set-card">
        <h3>🎛️ الفلاتر الظاهرة في تطبيق العميل</h3>
        <p style="font-size:13px;color:var(--ink2);margin:0 0 12px">اختار الفلاتر اللي تظهر للعميل. كل فلتر يعرض المنتجات اللي علّمت عليها من نموذج الصنف. «الأكثر طلبًا» يتم تحديده يدويًا حاليًا من لوحة التحكم.</p>
        <div class="toggle"><span>🔥 إظهار فلتر الأكثر طلبًا</span><input type="checkbox" id="s_show_popular" ${s.show_popular_filter !== false ? 'checked' : ''}></div>
        <div class="toggle"><span>🌶️ إظهار فلتر حار</span><input type="checkbox" id="s_show_spicy" ${s.show_spicy_filter !== false ? 'checked' : ''}></div>
        <div class="toggle"><span>🌱 إظهار فلتر نباتي</span><input type="checkbox" id="s_show_vegetarian" ${s.show_vegetarian_filter !== false ? 'checked' : ''}></div>
        <div class="toggle"><span>🛵 إظهار فلتر التوصيل المجاني</span><input type="checkbox" id="s_show_free_delivery" ${s.show_free_delivery_filter !== false ? 'checked' : ''}></div>
        <button class="btn pri big" id="s_save_menu_display" style="margin-top:14px;max-width:300px">💾 حفظ إعدادات واجهة المنيو</button>
      </div>
    </div>
    <div data-panel="chef-special" class="hidden">
      <div class="set-card">
        <h3>👨‍🍳 اختيار الشيف في الصفحة الرئيسية</h3>
        <p style="font-size:13px;color:var(--ink2);line-height:1.9">اختار المنتج الذي سيظهر في قسم «اختيار الشيف» بتطبيق العميل، وحدد نسبة الخصم. اترك المنتج على «بدون اختيار» لإخفاء القسم. الخصم يُطبّق عند إضافة المنتج من بطاقة اختيار الشيف.</p>
        <label>المنتج المختار للشيف</label>
        <select id="s_chef_item"><option value="">— بدون اختيار (إخفاء القسم) —</option></select>
        <label>نسبة الخصم (%)</label><input id="s_chef_discount" type="number" min="1" max="99" step="1" value="${Math.round(Number(s.chef_special_discount ?? 0.25)*100)}">
        <p style="font-size:12px;color:var(--ink2);line-height:1.8">اختار منتجًا عاديًا متاحًا، وليس صنفًا سريًا. مثال: 25 يعني خصم 25%.</p>
        <button class="btn pri big" id="s_save_chef" style="margin-top:12px;max-width:300px">💾 حفظ اختيار الشيف</button>
      </div>
    </div>
    <div data-panel="payments" class="hidden">
      <div class="set-card"><h3>💳 طرق الدفع</h3>
        <div class="chips" style="margin-top:8px">
          ${['cash','visa','wallet'].map(k => `
            <label class="pay-chip ${s[k + '_enabled'] !== false ? 'on' : ''}">
              <input type="checkbox" id="s_p_${k}" ${s[k + '_enabled'] !== false ? 'checked' : ''}>
              ${PAY[k].i} ${PAY[k].l}${k === 'cash' ? '' : ' <small style="color:var(--ink2)">(غير متاح لعملاء التطبيق حاليًا)</small>'}
            </label>`).join('')}
        </div>
        <p style="font-size:12.5px;color:var(--ink2);margin-top:10px">تطبيق العميل يقبل الدفع عند الاستلام فقط حاليًا. تعطيل الكاش يوقف استقبال الطلبات من التطبيق.</p>
      </div>
      <div style="margin-top:18px"><button class="btn pri big" id="s_save_payments" style="max-width:300px">💾 حفظ</button></div>
    </div>
    <div data-panel="loyalty" class="hidden">
      <div class="set-grid">
        <div class="set-card"><h3>⭐ نقاط المكافآت</h3>
          <div class="toggle"><span>نظام النقاط مفعّل</span><input type="checkbox" id="l_active" ${l.is_active !== false ? 'checked' : ''}></div>
          <label>النقاط لكل جنيه مصري</label><input id="l_pts" type="number" step="0.1" min="0.1" max="100" value="${l.points_per_egp ?? 1}">
          <label>عدد النقاط المطلوبة للاستبدال</label><input id="l_redeem_points" type="number" min="1" value="${l.redeem_points ?? 100}">
          <label>قيمة المكافأة بالجنيه</label><input id="l_reward" type="number" min="0.01" step="0.01" value="${l.reward_value ?? 5}">
          <button class="btn pri big" id="s_save_loyalty" style="margin-top:12px;max-width:300px">💾 حفظ إعدادات النقاط</button>
        </div>
        <div class="set-card"><h3>🍔 كارت الولاء</h3>
          <p style="color:var(--ink2);font-size:13px;margin:0 0 10px">يتحكم في عدد الأختام اللازمة للحصول على مكافأة كارت الولاء.</p>
          <label>عدد الأختام المطلوبة للمكافأة</label><input id="l_stamps" type="number" min="2" max="100" value="${l.stamps_for_reward ?? 10}">
          <label>الصنف المجاني عند اكتمال الكارت</label><select id="l_stamp_item"><option value="">— اختر صنفًا من المنيو —</option></select>
          <p style="font-size:12px;color:var(--ink2);margin:6px 0">يُمنح العميل قسيمة للصنف المختار بعد تسليم الطلب الذي يكمل عدد الأختام. يجب أن يكون الصنف متاحًا وغير مخفي.</p>
          <div style="margin-top:12px"><button class="btn out big" id="s_save_stamp" style="max-width:300px">💾 حفظ إعدادات كارت الولاء</button></div>
        </div>
        <div class="set-card" style="grid-column:1/-1"><h3>🏆 إدارة الإنجازات وشارات العملاء</h3>
          <p style="color:var(--ink2);font-size:13px;margin:0 0 12px">أضف إنجازات أو عدّل شروطها. التحقق يتم تلقائيًا عند تسليم الطلب، ولا يُمنح الإنجاز نفسه للعميل مرتين. مفتاح الإنجاز تقني بالإنجليزية ويظل ثابتًا بعد الإنشاء.</p>
          <div class="row" style="justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
            <span id="ach-status" style="color:var(--ink2);font-size:12px">جاري تحميل الإنجازات...</span>
            <button class="btn pri" id="ach-add">➕ إضافة إنجاز</button>
          </div>
          <div id="ach-editor" class="set-card hidden" style="margin-bottom:14px;background:var(--surface2)">
            <h3 id="ach-editor-title">إضافة إنجاز</h3>
            <input id="ach-id" type="hidden">
            <div class="set-grid">
              <div><label>المفتاح التقني (إنجليزي)</label><input id="ach-key" placeholder="مثال: burger_fan" maxlength="60" pattern="[a-z][a-z0-9_]{2,59}"><small style="color:var(--ink2)">حروف إنجليزية صغيرة وأرقام وشرطة سفلية فقط، ويبدأ بحرف.</small></div>
              <div><label>اسم الإنجاز بالعربي</label><input id="ach-name" maxlength="80" placeholder="مثال: عاشق البرجر"></div>
              <div><label>الأيقونة أو الإيموجي</label><input id="ach-icon" maxlength="12" value="🏆"></div>
              <div><label>شرط الحصول على الإنجاز</label><select id="ach-condition"><option value="first_order">أول طلب مكتمل</option><option value="delivered_orders">عدد الطلبات المكتملة</option><option value="total_spend">إجمالي المشتريات بالجنيه</option><option value="burger_quantity">عدد قطع البرجر</option><option value="vegetarian_orders">عدد الطلبات التي تحتوي صنفًا نباتيًا</option><option value="night_order">طلب ليلي (10 مساءً إلى 5 صباحًا)</option><option value="secret_item">طلب صنف من القائمة السرية</option><option value="all_spicy_items">تجربة كل الأصناف الحارة المتاحة</option></select></div>
              <div><label>الحد المطلوب للشرط الرقمي</label><input id="ach-threshold" type="number" min="1" step="1" value="10"><small style="color:var(--ink2)">يُتجاهل في شروط الطلب الليلي والقائمة السرية وتجربة كل الحار.</small></div>
              <div><label>نقاط إضافية عند فتح الإنجاز</label><input id="ach-points" type="number" min="0" step="1" value="0"><small style="color:var(--ink2)">تُضاف مرة واحدة لسجل الولاء إذا كان نظام النقاط مفعّلًا.</small></div>
              <div><label>ترتيب العرض</label><input id="ach-sort" type="number" step="1" value="10"></div>
              <div><label>الوصف الظاهر للعميل</label><input id="ach-description" maxlength="300" placeholder="اشرح للعميل كيف يفتح الإنجاز"></div>
            </div>
            <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn pri" id="ach-save">💾 حفظ الإنجاز</button><button class="btn out" id="ach-cancel">إلغاء</button></div>
          </div>
          <div id="ach-list"><div class="empty">جاري التحميل...</div></div>
          <div style="margin-top:22px"><h3>👥 سجل الإنجازات التي حصل عليها العملاء</h3><p style="font-size:12px;color:var(--ink2)">يعرض اسم العميل وتاريخ حصوله على الإنجاز. السجل السابق لا يُحذف عند إيقاف الإنجاز.</p><div id="ach-earned-list"><div class="empty">جاري تحميل السجل...</div></div></div>
        </div>
        <div class="set-card" style="grid-column:1/-1"><h3>🎁 مكافآتي — إدارة الجوائز</h3>
          <p style="color:var(--ink2);font-size:13px;margin:0 0 12px">إدارة الجوائز المتاحة في عجلة الحظ وكشط البطاقة. التعديلات هنا تُحفظ في جدول الجوائز في Supabase.</p>
          <div class="row" style="margin-bottom:12px;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
            <span id="reward-prizes-status" style="color:var(--ink2);font-size:12px">جاري تحميل الجوائز...</span>
            <button class="btn pri" id="reward-prize-add">➕ إضافة جائزة</button>
          </div>
          <div id="reward-prizes-list"><div class="empty">جاري التحميل...</div></div>
        </div>
      </div>
    </div>
  `;

  // Tabs
  v.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
    v.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    v.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== b.dataset.tab));
    if (b.dataset.tab === 'delivery') loadZones();
  });

  // Payment chips
  v.querySelectorAll('.pay-chip').forEach(chip => {
    const cb = chip.querySelector('input');
    chip.onclick = e => { if (e.target !== cb) cb.checked = !cb.checked; chip.classList.toggle('on', cb.checked); };
  });

  // Save general
  $('s_save_general').onclick = async () => {
    const payload = {
      is_open: $('s_open').checked,
      accepting_orders: $('s_accept').checked,
      name_ar: $('s_name').value.trim() || 'شيب برجر',
      contact_phone: $('s_phone').value.trim() || null,
      address_text: $('s_addr').value.trim() || null
    };
    await saveSettings(payload, 's_save_general');
  };
  $('s_save_delivery').onclick = async () => {
    const payload = {
      delivery_fee: parseNumber($('s_delivery').value) || 0,
      min_order: parseNumber($('s_min').value) || 0,
      free_delivery_threshold: Number.isFinite(parseNumber($('s_freedel').value)) && parseNumber($('s_freedel').value) > 0 ? parseNumber($('s_freedel').value) : null
    };
    await saveSettings(payload, 's_save_delivery');
  };
  $('s_save_menu_display').onclick = async () => {
    const payload = {
      show_popular_filter: $('s_show_popular').checked,
      show_spicy_filter: $('s_show_spicy').checked,
      show_vegetarian_filter: $('s_show_vegetarian').checked,
      show_free_delivery_filter: $('s_show_free_delivery').checked
    };
    await saveSettings(payload, 's_save_menu_display');
  };
  // تحميل الأصناف المتاحة لاختيار الشيف
  const chefSelect = $('s_chef_item');
  if (chefSelect) {
    const { data: chefItems, error: chefItemsError } = await sb.from('menu_items').select('id,name_ar,is_secret,is_available').eq('is_available', true).eq('is_secret', false).order('name_ar');
    if (chefItemsError) toast('تعذر تحميل المنتجات لاختيار الشيف', 'err');
    (chefItems || []).forEach(it => chefSelect.add(new Option(it.name_ar, it.id)));
    chefSelect.value = s.chef_special_item_id || '';
  }
  $('s_save_chef').onclick = async () => {
    const discountPct = parseNumber($('s_chef_discount').value);
    if (chefSelect.value && !(discountPct >= 1 && discountPct <= 99)) return toast('اكتب خصمًا من 1 إلى 99 بالمئة', 'err');
    await saveSettings({
      chef_special_item_id: chefSelect.value || null,
      chef_special_discount: (discountPct >= 1 && discountPct <= 99 ? discountPct : 25) / 100
    }, 's_save_chef');
  };
  $('s_save_payments').onclick = async () => {
    const payload = {};
    ['cash','visa','wallet'].forEach(k => {
      payload[k + '_enabled'] = $('s_p_' + k).checked;
    });
    if (payload.cash_enabled === false && !confirm('تعطيل الدفع النقدي سيوقف كل الطلبات من تطبيق العميل لأنه الطريقة الوحيدة المتاحة له. هل تريد المتابعة؟')) return;
    await saveSettings(payload, 's_save_payments');
  };
  $('s_save_loyalty').onclick = async () => {
    const pts = parseNumber($('l_pts').value), redeemPts = parseNumber($('l_redeem_points').value), rewardValue = parseNumber($('l_reward').value);
    if (!(pts > 0 && pts <= 100 && redeemPts >= 1 && rewardValue > 0)) return toast('راجع قيم النقاط والمكافأة', 'err');
    await saveLoyalty({ loyalty_enabled: $('l_active').checked, loyalty_points_per_currency: pts, loyalty_redeem_points: Math.trunc(redeemPts), loyalty_redeem_value: rewardValue }, 's_save_loyalty');
  };
  const loadStampRewardItems = async () => {
    const select = $('l_stamp_item'); if (!select) return;
    const { data, error } = await sb.from('menu_items').select('id,name_ar,is_available,is_secret').eq('is_available', true).eq('is_secret', false).order('name_ar');
    if (error) { select.innerHTML = '<option value="">تعذر تحميل أصناف المنيو</option>'; return; }
    select.innerHTML = '<option value="">— بدون مكافأة صنف مجانية —</option>' + (data || []).map(x => `<option value="${x.id}" ${x.id === l.stamp_reward_item_id ? 'selected' : ''}>${esc(x.name_ar)}</option>`).join('');
  };
  loadStampRewardItems();
  $('s_save_stamp').onclick = async () => {
    const stamps = Math.trunc(parseNumber($('l_stamps').value));
    if (!(stamps >= 2 && stamps <= 100)) return toast('عدد الأختام يجب أن يكون من 2 إلى 100', 'err');
    const itemId = $('l_stamp_item').value || null;
    await saveLoyalty({ loyalty_stamps_for_reward: stamps, loyalty_stamp_reward_item_id: itemId }, 's_save_stamp');
  };

  // Achievement management: backed by public.achievements and customer delivery trigger.
  const achConditions = {first_order:'أول طلب مكتمل',delivered_orders:'عدد الطلبات المكتملة',total_spend:'إجمالي المشتريات',burger_quantity:'عدد قطع البرجر',vegetarian_orders:'طلبات الأصناف النباتية',night_order:'طلب ليلي',secret_item:'صنف من القائمة السرية',all_spicy_items:'كل الأصناف الحارة'};
  let achRows = [];
  const achEscape = x => String(x ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const resetAchForm = () => { ['ach-id','ach-key','ach-name','ach-description'].forEach(id=>$(id).value=''); $('ach-key').disabled=false; $('ach-icon').value='🏆'; $('ach-condition').value='delivered_orders'; $('ach-threshold').value='10'; $('ach-points').value='0'; $('ach-sort').value=String((achRows.length+1)*10); $('ach-editor-title').textContent='إضافة إنجاز'; $('ach-editor').classList.remove('hidden'); };
  const loadAchievements = async () => {
    const host=$('ach-list'), status=$('ach-status'); if(!host) return;
    host.innerHTML='<div class="empty">جاري تحميل الإنجازات...</div>';
    const {data,error}=await sb.from('achievements').select('*').order('sort_order').order('created_at');
    if(error){host.innerHTML=`<div class="empty">تعذر تحميل الإنجازات: ${achEscape(error.message)}</div>`; if(status)status.textContent='خطأ في التحميل'; return;}
    achRows=data||[]; if(status)status.textContent=`إجمالي ${achRows.length} إنجاز — ${achRows.filter(x=>x.is_active).length} مفعّل`;
    host.innerHTML=achRows.length?`<div style="overflow:auto"><table class="data-table" style="width:100%"><thead><tr><th>الإنجاز</th><th>الشرط</th><th>المطلوب</th><th>نقاط إضافية</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${achRows.map(a=>`<tr><td><b>${achEscape(a.icon)} ${achEscape(a.name_ar)}</b><div style="font-size:11px;color:var(--ink2)">${achEscape(a.achievement_key)}</div><div style="font-size:11px;color:var(--ink2)">${achEscape(a.description_ar)}</div></td><td>${achEscape(achConditions[a.condition_type]||a.condition_type)}</td><td>${['night_order','secret_item','all_spicy_items','first_order'].includes(a.condition_type)?'تحقق الشرط':achEscape(a.threshold)+(a.condition_type==='total_spend'?' ج.م':'')}</td><td>${achEscape(a.reward_points)}</td><td>${a.is_active?'مفعّل':'متوقف'}</td><td><div class="row" style="gap:5px;flex-wrap:wrap"><button class="btn out sm" data-ach-edit="${a.id}">تعديل</button><button class="btn out sm" data-ach-toggle="${a.id}">${a.is_active?'إيقاف':'تفعيل'}</button><button class="btn out sm" data-ach-delete="${a.id}" style="color:var(--err)">حذف</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">لا توجد إنجازات. اضغط إضافة إنجاز للبدء.</div>';
    host.querySelectorAll('[data-ach-edit]').forEach(b=>b.onclick=()=>{const a=achRows.find(x=>x.id===b.dataset.achEdit); if(!a)return; $('ach-id').value=a.id; $('ach-key').value=a.achievement_key; $('ach-key').disabled=true; $('ach-name').value=a.name_ar; $('ach-description').value=a.description_ar||''; $('ach-icon').value=a.icon||'🏆'; $('ach-condition').value=a.condition_type; $('ach-threshold').value=a.threshold; $('ach-points').value=a.reward_points||0; $('ach-sort').value=a.sort_order||0; $('ach-editor-title').textContent='تعديل الإنجاز'; $('ach-editor').classList.remove('hidden'); $('ach-editor').scrollIntoView({behavior:'smooth',block:'center'});});
    host.querySelectorAll('[data-ach-toggle]').forEach(b=>b.onclick=async()=>{const a=achRows.find(x=>x.id===b.dataset.achToggle);if(!a)return;const {error}=await sb.from('achievements').update({is_active:!a.is_active,updated_at:new Date().toISOString()}).eq('id',a.id);if(error)return fail(error,'تعذر تغيير حالة الإنجاز');toast(a.is_active?'تم إيقاف الإنجاز':'تم تفعيل الإنجاز','ok');if(!a.is_active){const rr=await sb.rpc('recalculate_customer_achievements');if(rr.error)console.warn('[Achievements] recalc failed',rr.error);}await loadAchievements();await loadEarnedAchievements();});
    host.querySelectorAll('[data-ach-delete]').forEach(b=>b.onclick=async()=>{const a=achRows.find(x=>x.id===b.dataset.achDelete);if(!a||!confirm(`حذف إعداد الإنجاز «${a.name_ar}»؟ سجل العملاء السابق سيظل محفوظًا.`))return;const {error}=await sb.from('achievements').delete().eq('id',a.id);if(error)return fail(error,'تعذر حذف الإنجاز');toast('تم حذف إعداد الإنجاز','ok');await loadAchievements();await loadEarnedAchievements();});
  };
  const loadEarnedAchievements = async () => {
    const host=$('ach-earned-list');if(!host)return;
    const [earnedRes,profilesRes]=await Promise.all([sb.from('user_achievements').select('id,user_id,achievement_key,metadata,unlocked_at').order('unlocked_at',{ascending:false}).limit(300),sb.from('profiles').select('id,full_name,phone')]);
    if(earnedRes.error){host.innerHTML=`<div class="empty">تعذر تحميل السجل: ${achEscape(earnedRes.error.message)}</div>`;return;}
    const names=new Map((profilesRes.data||[]).map(p=>[p.id,p]));
    host.innerHTML=(earnedRes.data||[]).length?`<div style="overflow:auto;max-height:440px"><table class="data-table" style="width:100%"><thead><tr><th>العميل</th><th>الإنجاز</th><th>تاريخ الحصول</th></tr></thead><tbody>${earnedRes.data.map(e=>{const p=names.get(e.user_id)||{};const a=achRows.find(x=>x.achievement_key===e.achievement_key);return `<tr><td>${achEscape(p.full_name||'عميل بدون اسم')}<div style="font-size:11px;color:var(--ink2)">${achEscape(p.phone||'')}</div></td><td>${achEscape(a?.icon||'🏆')} ${achEscape(a?.name_ar||e.achievement_key)}</td><td>${achEscape(dtFull(e.unlocked_at))}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">لم يحصل أي عميل على إنجاز بعد.</div>';
  };
  $('ach-add').onclick=resetAchForm; $('ach-cancel').onclick=()=>{$('ach-editor').classList.add('hidden');resetAchForm();$('ach-editor').classList.add('hidden');};
  $('ach-save').onclick=async()=>{
    const id=$('ach-id').value, key=$('ach-key').value.trim(), name=$('ach-name').value.trim(), desc=$('ach-description').value.trim(), icon=$('ach-icon').value.trim()||'🏆', condition=$('ach-condition').value, threshold=parseNumber($('ach-threshold').value), points=parseNumber($('ach-points').value), sort=parseNumber($('ach-sort').value);
    if(!id&&!/^[a-z][a-z0-9_]{2,59}$/.test(key))return toast('اكتب مفتاحًا إنجليزيًا صحيحًا من 3 إلى 60 حرفًا','err');
    if(!name)return toast('اكتب اسم الإنجاز بالعربي','err');
    if(!(['night_order','secret_item','all_spicy_items','first_order'].includes(condition))&&!(threshold>0))return toast('قيمة الشرط يجب أن تكون أكبر من صفر','err');
    if(!(points>=0&&Number.isInteger(points)))return toast('النقاط الإضافية يجب أن تكون صفرًا أو عددًا صحيحًا','err');
    const payload={achievement_key:key,name_ar:name,description_ar:desc,icon,condition_type:condition,threshold:threshold>0?threshold:1,reward_points:points,is_active:true,sort_order:Number.isFinite(sort)?sort:0,updated_at:new Date().toISOString()};
    const {achievement_key:unusedKey,is_active:unusedActive,...updatePayload}=payload; const {error}=id?await sb.from('achievements').update(updatePayload).eq('id',id):await sb.from('achievements').insert(payload);
    if(error)return fail(error,'تعذر حفظ الإنجاز');
    toast('تم حفظ الإنجاز','ok');$('ach-editor').classList.add('hidden');const rr=await sb.rpc('recalculate_customer_achievements');if(rr.error)toast('تم حفظ الإنجاز، لكن تعذرت إعادة فحص العملاء الحاليين. سيُحتسب عند تسليم طلب جديد.','err',5000);await loadAchievements();await loadEarnedAchievements();
  };
  await loadAchievements(); await loadEarnedAchievements();

  // Reward-prize management is backed by the existing reward_prizes table.
  const rewardTypes = { none:'بدون جائزة', percent:'خصم نسبة مئوية', fixed:'خصم مبلغ ثابت', free_delivery:'توصيل مجاني', free_item:'صنف مجاني', free_addon:'إضافة مجانية' };
  const escapeReward = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const callRewardAdmin = async body => {
    const { data, error } = await sb.functions.invoke('admin-api', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data?.data;
  };
  const loadRewardPrizes = async () => {
    const host = $('reward-prizes-list'), status = $('reward-prizes-status');
    if (!host) return;
    host.innerHTML = '<div class="empty">جاري تحميل الجوائز...</div>';
    let rows = [];
    try { rows = await callRewardAdmin({ action: 'list_reward_prizes' }) || []; }
    catch (error) { host.innerHTML = `<div class="empty">تعذر تحميل الجوائز: ${escapeReward(error.message || error)}</div>`; if(status) status.textContent='خطأ في التحميل'; return; }
    if (status) status.textContent = `عدد الجوائز: ${rows.length} — ${rows.filter(x=>x.is_active).length} مفعّلة`;
    host.innerHTML = rows.length ? `<div style="overflow:auto"><table class="data-table" style="width:100%"><thead><tr><th>الجائزة</th><th>اللعبة</th><th>النوع</th><th>القيمة</th><th>الوزن</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${escapeReward(x.label_ar)}</b><div style="font-size:11px;color:var(--ink2)">${escapeReward(x.prize_key)}</div></td><td>${x.game_type==='wheel'?'عجلة الحظ':'كشط البطاقة'}</td><td>${rewardTypes[x.reward_type]||escapeReward(x.reward_type)}</td><td>${escapeReward(x.value)}</td><td>${escapeReward(x.weight)}</td><td>${x.is_active?'مفعّلة':'متوقفة'}</td><td><div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn out sm" data-reward-edit="${x.id}">تعديل</button><button class="btn out sm" data-reward-toggle="${x.id}" data-active="${x.is_active}">${x.is_active?'إيقاف':'تفعيل'}</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">لا توجد جوائز مضافة حتى الآن.</div>';
    host.querySelectorAll('[data-reward-edit]').forEach(btn=>btn.onclick=()=>openRewardEditor(rows.find(x=>x.id===btn.dataset.rewardEdit)));
    host.querySelectorAll('[data-reward-toggle]').forEach(btn=>btn.onclick=async()=>{const row=rows.find(x=>x.id===btn.dataset.rewardToggle);if(!row)return;try{await callRewardAdmin({action:'save_reward_prize',...row,is_active:btn.dataset.active!=='true'});toast('تم تحديث حالة الجائزة','ok');loadRewardPrizes();}catch(error){fail(error);}});
  };
  const openRewardEditor = async row => {
    openModal(`<h2>${row?'تعديل جائزة':'إضافة جائزة'} <button class="close" onclick="closeModal()">✕</button></h2>
      <label>اسم الجائزة بالعربية</label><input id="rp_label" maxlength="80" value="${escapeReward(row?.label_ar||'')}">
      <label>المعرّف التقني (إنجليزي)</label><input id="rp_key" maxlength="50" value="${escapeReward(row?.prize_key||'')}">
      <label>مكان الجائزة</label><select id="rp_game"><option value="wheel" ${row?.game_type==='wheel'?'selected':''}>عجلة الحظ</option><option value="scratch" ${row?.game_type==='scratch'?'selected':''}>كشط البطاقة</option></select>
      <label>نوع الجائزة</label><select id="rp_type">${Object.entries(rewardTypes).map(([k,v])=>`<option value="${k}" ${row?.reward_type===k?'selected':''}>${v}</option>`).join('')}</select>
      <label>القيمة (نسبة الخصم أو مبلغ الخصم حسب النوع)</label><input id="rp_value" type="number" min="0" step="0.01" value="${row?.value??0}">
      <label>الصنف المجاني (للجوائز من نوع صنف مجاني)</label><select id="rp_item"><option value="">— لا يوجد —</option></select>
      <label>الإضافة المجانية (للجوائز من نوع إضافة مجانية)</label><select id="rp_addon"><option value="">— لا يوجد —</option></select>
      <p style="font-size:12px;color:var(--ink2);margin:5px 0">في جائزة الصنف المجاني، قيمة الصنف تُحدد من سعره الحالي في المنيو؛ أما قيمة الخصم فتُحدد في خانة القيمة.</p>
      <label>وزن/احتمالية الظهور (رقم أكبر = احتمال أعلى)</label><input id="rp_weight" type="number" min="0.01" step="0.01" value="${row?.weight??1}">
      <label>صلاحية القسيمة بالأيام</label><input id="rp_days" type="number" min="1" max="365" value="${row?.voucher_valid_days??30}">
      <div class="toggle"><span>الجائزة مفعّلة</span><input type="checkbox" id="rp_active" ${row?.is_active?'checked':''}></div>
      <div class="row" style="margin-top:14px"><button class="btn pri big" id="rp_save">💾 حفظ</button><button class="btn out big" onclick="closeModal()">إلغاء</button></div>`);
    const [itemsResult, addonsResult] = await Promise.all([
      sb.from('menu_items').select('id,name_ar,is_available,is_secret').eq('is_available', true).eq('is_secret', false).order('name_ar'),
      sb.from('addons').select('id,name_ar,is_available').eq('is_available', true).order('name_ar')
    ]);
    if (!itemsResult.error) $('rp_item').innerHTML = '<option value="">— لا يوجد —</option>' + (itemsResult.data || []).map(x => `<option value="${x.id}" ${x.id === row?.reward_item_id ? 'selected' : ''}>${escapeReward(x.name_ar)}</option>`).join('');
    if (!addonsResult.error) $('rp_addon').innerHTML = '<option value="">— لا يوجد —</option>' + (addonsResult.data || []).map(x => `<option value="${x.id}" ${x.id === row?.reward_addon_id ? 'selected' : ''}>${escapeReward(x.name_ar)}</option>`).join('');
    $('rp_save').onclick=async()=>{
      const label=$('rp_label').value.trim(), key=$('rp_key').value.trim().toLowerCase(), value=parseNumber($('rp_value').value), weight=parseNumber($('rp_weight').value), days=Math.trunc(parseNumber($('rp_days').value));
      if(label.length<1||!/^[a-z0-9_-]{2,50}$/.test(key)||!(value>=0)||!(weight>0)||!(days>=1&&days<=365))return toast('راجع الاسم والمعرّف والقيم المدخلة','err');
      const rewardType = $('rp_type').value, itemId = $('rp_item').value || null, addonId = $('rp_addon').value || null;
      if (rewardType === 'free_item' && !itemId) return toast('اختر الصنف الذي ستمنحه الجائزة مجانًا', 'err');
      if (rewardType === 'free_addon' && !addonId) return toast('اختر الإضافة التي ستمنحها الجائزة مجانًا', 'err');
      const payload={label_ar:label,prize_key:key,game_type:$('rp_game').value,reward_type:rewardType,value,weight,voucher_valid_days:days,is_active:$('rp_active').checked,reward_item_id:rewardType==='free_item'?itemId:null,reward_addon_id:rewardType==='free_addon'?addonId:null};
      try { await callRewardAdmin({action:'save_reward_prize',...(row?{id:row.id}:{}),...payload});closeModal();toast('تم حفظ الجائزة','ok');loadRewardPrizes(); }
      catch(error){fail(error);}
    };
  };
  $('reward-prize-add').onclick=()=>openRewardEditor(null);
  loadRewardPrizes();
};

async function saveSettings(payload, btnId) {
  const btn = $(btnId);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ حفظ...'; }
  try {
    const { data, error } = await sb.functions.invoke('admin-api', { body: { action: 'update_store_settings', ...payload } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (!data?.data) throw new Error('لم يؤكد الخادم حفظ الإعدادات');
    toast('تم الحفظ في قاعدة البيانات، وسيظهر التحديث للعميل تلقائيًا', 'ok');
    await loadSettings();
  } catch (e) { fail(e, 'تعذر حفظ الإعدادات في قاعدة البيانات'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '💾 حفظ'; } }
}
async function saveLoyalty(payload, btnId) {
  const btn = $(btnId);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ حفظ...'; }
  try {
    const { error } = await sb.from('store_settings').update(payload).eq('id', CONFIG.SETTINGS_ROW_ID);
    if (error) throw error;
    toast('تم الحفظ', 'ok');
    await loadLoyalty();
  } catch (e) { fail(e); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '💾 حفظ'; } }
}

async function loadZones() {
  const body = $('zones-body');
  if (!body) return;
  const r = await safeQuery(() => sb.from('delivery_zones').select('*').order('name_ar'), null);
  if (!r.data) { body.innerHTML = notInstalledMsg('delivery_zones'); return; }
  body.innerHTML = `
    ${r.data.map(z => `<div style="display:grid;grid-template-columns:1fr 90px 90px 70px;gap:6px;padding:6px 0;border-bottom:1px solid var(--line);opacity:${z.is_active?1:.6}">
      <b>${esc(z.name_ar)}${z.is_active?'':' (معطلة)'}</b>
      <small>${money(z.fee)}</small>
      <small>${money(z.min_order)}</small>
      <button class="btn out sm ${z.is_active?'dng':'ok'}" onclick="toggleZone('${z.id}',${!z.is_active})">${z.is_active?'تعطيل':'تفعيل'}</button>
    </div>`).join('') || '<div class="empty">لا مناطق</div>'}
    <button class="btn out sm" id="add-zone" style="margin-top:10px">+ منطقة</button>`;
  $('add-zone').onclick = () => {
    openModal(`<h2>منطقة جديدة <button class="close" onclick="closeModal()">✕</button></h2>
      <label>الاسم</label><input id="z_name">
      <label>الرسوم</label><input id="z_fee" type="number" min="0" value="0">
      <label>الحد الأدنى</label><input id="z_min" type="number" min="0" value="0">
      <div class="row"><button class="btn pri big" id="z_save">حفظ</button>
      <button class="btn out big" onclick="closeModal()">إلغاء</button></div>`);
    $('z_save').onclick = async () => {
      if (!$('z_name').value.trim()) return shake($('mod'));
      try {
        const { error } = await sb.from('delivery_zones').insert({
          name_ar: $('z_name').value.trim(),
          fee: parseNumber($('z_fee').value) || 0,
          min_order: parseNumber($('z_min').value) || 0
        });
        if (error) throw error;
        closeModal(); toast('تم', 'ok'); loadZones();
      } catch (e) { fail(e); }
    };
  };
}
window.toggleZone = async (id, active) => {
  if (!await ask(active?'تفعيل':'تعطيل', active?'إعادة تفعيل منطقة التوصيل؟':'تعطيل منطقة التوصيل؟', 'تأكيد')) return;
  const { error } = await sb.from('delivery_zones').update({is_active:active}).eq('id', id);
  if (error) return fail(error);
  loadZones();
};
window.deleteZone = id => window.toggleZone(id, false);

