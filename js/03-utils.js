/* ═══════════════════════════════════════════════════
   SECTION 3 · UTILS
   ═══════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => Number(n||0).toLocaleString('ar-EG') + (SETTINGS?.currency ? ' ' + SETTINGS.currency : '');
const moneyLTR = n => Number(n||0).toLocaleString('en-US') + (SETTINGS?.currency ? ' ' + SETTINGS.currency : '');
const dt = t => t ? new Date(t).toLocaleString('ar-EG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
const dtShort = t => t ? new Date(t).toLocaleDateString('ar-EG',{day:'numeric',month:'short'}) : '—';
const dtFull = t => t ? new Date(t).toLocaleString('ar-EG',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
const shake = el => { if(!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
const debounce = (fn, ms=300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const todayStart = () => new Date().setHours(0,0,0,0);
const yesterdayStart = () => todayStart() - 864e5;
async function sha256Hex(value) { const bytes = new TextEncoder().encode(String(value)); const digest = await crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join(''); }
const parseNumber = v => {
  if (v === null || v === undefined || v === '') return NaN;
  const s = String(v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
                     .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
                     .replace(/,/g, '').replace(/\s/g, '').trim();
  return Number(s);
};
const isValidPhone = p => /^(\+?20)?0?1[0-9]{9}$/.test(String(p||'').replace(/[^\d+]/g, ''));
const toLatinDigits = s => String(s ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
                                          .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

function toast(msg, type='', ms=3000, onClick) {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  t.setAttribute('role', 'alert');
  if (onClick) t.onclick = () => { onClick(); t.remove(); };
  $('toasts').append(t);
  setTimeout(() => t.remove(), ms);
}
const fail = (e, msg) => { console.error(e); toast(msg || (e && e.message) || 'حصل خطأ', 'err', 4000); };

function notInstalledMsg(table) {
  return `<div class="empty">
    <div style="font-size:32px">🗃️</div>
    <div style="max-width:500px">
      <p style="font-weight:900;color:var(--ink);margin-bottom:8px">القسم غير مُفعّل بعد</p>
      <p>الجدول <code>${esc(table)}</code> غير موجود في قاعدة البيانات.</p>
      <p style="margin-top:10px;font-size:12px">شغّل ملف supabase_setup.sql في Supabase SQL Editor لإنشاء الجداول المطلوبة، ثم أعد تحميل الصفحة.</p>
    </div>
  </div>`;
}

async function safeQuery(fn, fallback = null) {
  try { const r = await fn(); if (r && r.error) { console.warn('Query error:', r.error); return { data: fallback, error: r.error }; } return r || { data: fallback, error: null }; }
  catch (e) { console.warn('Query exception:', e); return { data: fallback, error: e }; }
}
async function safeTable(table, orderBy='created_at', ascending=false, limit=300) {
  const r = await safeQuery(() => sb.from(table).select('*').order(orderBy, { ascending }).limit(limit), null);
  return r.data || null;
}

let _lastFocus = null;
function openModal(html, wide=false) {
  _lastFocus = document.activeElement;
  $('mod').onclick = null;
  $('mod').className = 'mod' + (wide ? ' wide' : '');
  $('mod').innerHTML = html;
  // Plain-language help for staff: explain what each field changes without exposing database jargon.
  const fieldHelp = {
    m_ar:'اكتب اسم المنتج كما تريد أن يراه العميل في قائمة الطعام. مثال: برجر كلاسيك.',
    m_desc:'وصف قصير يشرح مكونات المنتج أو ما يميّزه. سيظهر للعميل تحت الاسم.',
    m_cat_id:'اختر القسم الذي سيظهر المنتج بداخله، مثل البرجر أو المشروبات.',
    m_img:'ضع رابط صورة المنتج المباشر إن كانت الصورة مرفوعة على الإنترنت. اتركه فارغًا لو مش معاك رابط.',
    m_ingr:'اكتب المكونات وافصل بينها بفاصلة. مثال: لحم، جبنة، خس، صوص.',
    m_slug:'رمز داخلي للرابط لا يحتاج الموظف لتعديله. اتركه فارغًا عند إضافة منتج جديد.',
    m_badge:'كلمة قصيرة تظهر على صورة المنتج مثل: جديد أو الأكثر طلبًا. اختياري.',
    m_allergens:'اكتب المكونات التي قد تسبب حساسية مثل اللبن أو القمح أو البيض، وافصل بينها بفاصلة.',
    c_ar:'اسم القسم الذي سيظهر للعميل. مثال: برجر، وجبات، مشروبات، إضافات جانبية.',
    c_slug:'رمز داخلي للقسم؛ لا تحتاج لتعديله. اتركه فارغًا ليتم إنشاؤه تلقائيًا.',
    c_sort:'رقم ترتيب ظهور القسم في القائمة. الرقم الأصغر يظهر قبل الرقم الأكبر.',
    a_ar:'اسم الإضافة التي يستطيع العميل طلبها مع المنتج. مثال: جبنة إضافية أو صوص.',
    a_price:'المبلغ الذي سيدفعه العميل مقابل هذه الإضافة الواحدة.',
    co_code:'الكلمة التي سيكتبها العميل للاستفادة من الخصم. مثال: SAVE10. استخدم حروفًا إنجليزية وأرقامًا.',
    co_type:'اختر هل الخصم نسبة مئوية أم مبلغًا ثابتًا من السعر.',
    co_val:'قيمة الخصم: اكتب 10 لخصم 10%، أو اكتب مبلغ الخصم لو اخترت مبلغًا ثابتًا.',
    co_min:'لا يعمل الكوبون إلا إذا وصل إجمالي الطلب إلى هذا المبلغ. اكتب 0 إذا لم يوجد حد أدنى.',
    co_maxdiscount:'أقصى مبلغ يمكن خصمه عند استخدام كوبون النسبة. اتركه فارغًا إذا لم ترد وضع حد.',
    co_limit:'إجمالي عدد المرات التي يمكن استخدام الكوبون فيها من جميع العملاء. اتركه فارغًا بلا حد.',
    co_peruser:'أقصى عدد مرات يستطيع العميل الواحد استخدام الكوبون فيها. اتركه فارغًا بلا حد.',
    co_start:'أول يوم يصبح فيه الكوبون صالحًا. اتركه فارغًا ليبدأ فورًا.',
    co_exp:'آخر يوم يصبح فيه الكوبون صالحًا. اتركه فارغًا إذا لم تحدد موعد انتهاء.',
    of_name:'اسم واضح للعرض سيظهر في لوحة الإدارة.',
    of_desc:'اشرح باختصار شروط العرض أو فائدته. هذا الحقل اختياري.',
    of_type:'حدد نوع الميزة التي سيحصل عليها العميل: نسبة خصم، مبلغ خصم، توصيل مجاني، أو منتج/إضافة مجانية.',
    of_value:'في خصم النسبة اكتب رقمًا من 1 إلى 100. في خصم المبلغ اكتب قيمة الخصم. اتركه 0 للعروض المجانية.',
    of_max_discount:'أقصى مبلغ للخصم عند اختيار خصم بالنسبة المئوية. اختياري.',
    of_max_uses:'إجمالي عدد مرات استخدام العرض. اتركه فارغًا إذا لم ترد وضع حد.',
    of_start:'تاريخ بدء العرض. اتركه فارغًا ليكون متاحًا من الآن.',
    of_end:'آخر يوم للعرض. اتركه فارغًا إذا لم ترد تحديد نهاية.',
    of_min:'أقل إجمالي للطلب حتى يستفيد العميل من العرض. اكتب 0 إذا لا يوجد حد.',
    of_target:'حقل ربط داخلي متقدم. لا تكتب فيه شيئًا إلا إذا طلب منك مسؤول النظام ذلك.',
    of_reward_item:'حقل ربط داخلي لتحديد المنتج المجاني؛ يحتاج إعدادًا من مسؤول النظام.',
    of_reward_addon:'حقل ربط داخلي لتحديد الإضافة المجانية؛ يحتاج إعدادًا من مسؤول النظام.',
    of_priority:'عند وجود أكثر من عرض، الرقم الأكبر يعني أولوية أعلى. اتركه 0 إذا لم تكن متأكدًا.',
    'ach-key':'رمز داخلي للإنجاز يستخدمه النظام. لا تغيّره بعد إنشاء الإنجاز.',
    'ach-name':'اسم الإنجاز الذي سيظهر للعميل. مثال: عاشق البرجر.',
    'ach-description':'اشرح للعميل ما الذي يحتاج إلى فعله للحصول على هذا الإنجاز.',
    z_name:'اسم المنطقة أو الحي الذي تغطيه خدمة التوصيل.',
    z_fee:'رسوم التوصيل التي يدفعها العميل لهذه المنطقة.',
    z_min:'أقل قيمة للطلب لقبول التوصيل إلى هذه المنطقة. اكتب 0 إذا لا يوجد حد.'
  };
  Object.entries(fieldHelp).forEach(([id, message]) => {
    const field = $(id);
    if (!field || field.dataset.helpAdded) return;
    field.dataset.helpAdded = '1';
    const help = document.createElement('small');
    help.className = 'field-help';
    help.textContent = message;
    help.style.cssText = 'display:block;color:var(--ink2);font-size:12px;line-height:1.65;margin:3px 0 10px;';
    field.insertAdjacentElement('afterend', help);
  });
  $('ov').classList.add('show');
  $('ov').setAttribute('aria-hidden', 'false');
  setTimeout(() => trapFocus($('mod')), 50);
  const f = $('mod').querySelector('input:not([type=checkbox]):not([type=radio]),select,textarea');
  if (f) setTimeout(() => f.focus(), 60);
}
function closeModal() {
  $('ov').classList.remove('show');
  $('ov').setAttribute('aria-hidden', 'true');
  if (_lastFocus && _lastFocus.focus) try { _lastFocus.focus(); } catch {}
  _lastFocus = null;
}
function trapFocus(container) {
  const f = container.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  container._trapHandler && container.removeEventListener('keydown', container._trapHandler);
  container._trapHandler = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  };
  container.addEventListener('keydown', container._trapHandler);
}
$('ov').addEventListener('click', e => { if (e.target.id === 'ov') closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('ov').classList.contains('show')) closeModal();
});

const ask = (title, msg, ok='تأكيد') => new Promise(res => {
  openModal(`<h2>${esc(title)} <button class="close" onclick="closeModal()">✕</button></h2>
    <p style="margin:8px 0 16px;color:var(--ink2)">${esc(msg)}</p>
    <div class="row"><button class="btn pri big" id="y">${esc(ok)}</button><button class="btn out big" id="n">رجوع</button></div>`);
  $('y').onclick = () => { closeModal(); res(true); };
  $('n').onclick = () => { closeModal(); res(false); };
});

const confirmTyped = (title, msg, word) => new Promise(res => {
  openModal(`<h2 style="color:var(--err)">${esc(title)} <button class="close" onclick="closeModal()">✕</button></h2>
    <p style="margin:8px 0 12px;color:var(--ink2)">${esc(msg)}</p>
    <p style="font-weight:700;margin-bottom:6px">اكتب <code style="font-size:16px;padding:2px 10px">${esc(word)}</code> للتأكيد:</p>
    <input id="cfword" dir="ltr" autocomplete="off" autofocus>
    <div class="lerr" id="cferr" style="text-align:right;color:var(--err);min-height:20px"></div>
    <div class="row"><button class="btn out big dng" id="y" disabled>${esc(title)}</button>
    <button class="btn out big" id="n">إلغاء</button></div>`);
  const inp = $('cfword'), btn = $('y');
  inp.oninput = () => {
    const match = inp.value.trim() === word;
    btn.disabled = !match;
    $('cferr').textContent = inp.value.length > 0 && !match ? 'النص غير مطابق' : '';
  };
  btn.onclick = () => { closeModal(); res(true); };
  $('n').onclick = () => { closeModal(); res(false); };
});

function animateTo(el, to) {
  if (!el) return;
  to = Number(to) || 0;
  const from = Number(el.dataset.v || 0), isMoney = el.dataset.m === '1';
  const t0 = performance.now(); el.dataset.v = to;
  (function tick(now) {
    const p = Math.min((now - t0) / 600, 1), v = from + (to - from) * (1 - Math.pow(1 - p, 3));
    el.textContent = isMoney ? money(Math.round(v)) : Math.round(v).toLocaleString('ar-EG');
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

