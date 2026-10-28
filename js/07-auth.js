/* ═══════════════════════════════════════════════════
   SECTION 7 · AUTH
   ═══════════════════════════════════════════════════ */
// لا توجد حسابات تجريبية أو كلمات مرور ثابتة؛ تسجيل الدخول يتم عبر Supabase Auth فقط.
// عنصر demo اختياري؛ لا توقف تشغيل الصفحة إذا لم يكن موجودًا.
const demoContainer = $('demo');
if (demoContainer) demoContainer.replaceChildren();

// Rate limiting
function checkRateLimit() {
  const now = Date.now();
  const data = JSON.parse(localStorage.getItem('sb_login_attempts') || '[]')
    .filter(t => now - t < CONFIG.LOGIN_WINDOW_MIN * 60000);
  localStorage.setItem('sb_login_attempts', JSON.stringify(data));
  return data.length < CONFIG.MAX_LOGIN_ATTEMPTS;
}
function recordAttempt() {
  const data = JSON.parse(localStorage.getItem('sb_login_attempts') || '[]');
  data.push(Date.now());
  localStorage.setItem('sb_login_attempts', JSON.stringify(data));
}
function resetAttempts() { localStorage.removeItem('sb_login_attempts'); }

// 2FA state
let pending2FAUser = null, manualLogout = false;
async function needsMfa() {
  try {
    const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    return !!data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
  } catch (e) { console.warn('MFA check failed', e); return false; }
}
function show2fa(user) {
  pending2FAUser = user;
  $('login').classList.remove('hidden'); $('shell').classList.add('hidden');
  $('login-step-1').classList.add('hidden'); $('login-step-2fa').classList.remove('hidden');
  setTimeout(() => $('totp').focus(), 100);
}

$('lform').onsubmit = async e => {
  e.preventDefault();
  $('lerr').textContent = '';
  if (!configured || !sb) { $('lerr').textContent = 'اضبط SUPABASE_URL/KEY في CONFIG'; return; }
  if (!checkRateLimit()) {
    $('lerr').textContent = 'محاولات كثيرة. حاول بعد ' + CONFIG.LOGIN_WINDOW_MIN + ' دقيقة.';
    shake($('lform')); return;
  }
  const pw = $('pw').value;
  if (pw.length < CONFIG.MIN_PASSWORD_LEN) {
    $('lerr').textContent = `كلمة المرور يجب أن تكون ${CONFIG.MIN_PASSWORD_LEN} أحرف على الأقل`;
    shake($('lform')); return;
  }
  $('lbtn').disabled = true; $('lbtn').textContent = 'جاري الدخول...';
  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email: $('em').value.trim(), password: pw
    });
    if (error) {
      recordAttempt();
      $('lerr').textContent = 'البريد أو كلمة المرور غلط'; shake($('lform')); return;
    }
    if (await needsMfa()) { show2fa(data.user); return; }
    resetAttempts();
    await enter(data.user);
  } catch (err) {
    $('lerr').textContent = 'تعذر الاتصال';
    console.error(err);
  } finally {
    $('lbtn').disabled = false; $('lbtn').textContent = 'دخول';
  }
};

$('verify2fa').onclick = async () => {
  const code = $('totp').value.trim();
  if (!/^\d{6}$/.test(code)) { $('lerr2').textContent = 'رمز غير صحيح'; return; }
  try {
    const { data: factors } = await sb.auth.mfa.listFactors();
    const factor = factors?.totp?.find(f => f.status === 'verified');
    if (!factor) { $('lerr2').textContent = 'عامل 2FA غير موجود'; return; }
    const { data: chal, error: ce } = await sb.auth.mfa.challenge({ factorId: factor.id });
    if (ce || !chal) { $('lerr2').textContent = 'تعذر بدء التحقق'; return; }
    if (!checkRateLimit()) { $('lerr2').textContent = 'محاولات كثيرة. حاول لاحقًا.'; return; }
    const { error } = await sb.auth.mfa.verify({
      factorId: factor.id, challengeId: chal.id, code
    });
    if (error) { recordAttempt(); $('lerr2').textContent = 'الرمز غلط'; return; }
    resetAttempts();
    $('login-step-1').classList.remove('hidden');
    $('login-step-2fa').classList.add('hidden');
    $('totp').value = '';
    await enter(pending2FAUser);
  } catch (e) { $('lerr2').textContent = 'تعذر التحقق'; console.error(e); }
};
$('back-login').onclick = async () => {
  pending2FAUser = null;
  $('login-step-1').classList.remove('hidden');
  $('login-step-2fa').classList.add('hidden');
  $('totp').value = '';
  await sb.auth.signOut();
};

$('forgot').onclick = () => {
  openModal(`
    <h2>استعادة كلمة المرور <button class="close" onclick="closeModal()">✕</button></h2>
    <p style="color:var(--ink2);margin-bottom:12px">أدخل بريدك الإلكتروني وسنرسل رابط إعادة التعيين.</p>
    <label>البريد الإلكتروني</label><input id="femail" type="email" dir="ltr" autofocus>
    <div class="lerr" id="ferr" style="text-align:right"></div>
    <div class="row"><button class="btn pri big" id="fsend">إرسال</button>
    <button class="btn out big" onclick="closeModal()">إلغاء</button></div>
  `);
  $('fsend').onclick = async () => {
    const email = $('femail').value.trim();
    if (!email) return shake($('mod'));
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) throw error;
      $('ferr').style.color = 'var(--ok)';
      $('ferr').textContent = '✅ تم الإرسال — راجع بريدك';
      setTimeout(closeModal, 2500);
    } catch (e) { $('ferr').textContent = 'تعذر الإرسال'; fail(e); }
  };
};

$('logout').onclick = async () => {
  if (await ask('تسجيل الخروج', 'هل تريد الخروج من هذا الجهاز؟', 'خروج')) {
    manualLogout = true;
    await sb.auth.signOut();
    leave();
  }
};

sb?.auth.onAuthStateChange(async (ev, session) => {
  if (ev === 'TOKEN_REFRESHED') return;
  if (ev === 'SIGNED_OUT' && ME) {
    leave();
    if (!manualLogout) toast('انتهت الجلسة — يرجى الدخول مجدداً', 'err', 5000);
  }
  if (ev === 'SIGNED_OUT') manualLogout = false;
  if (ev === 'PASSWORD_RECOVERY') {
    openModal(`
      <h2>كلمة مرور جديدة <button class="close" onclick="closeModal()">✕</button></h2>
      <label>كلمة المرور الجديدة</label><input id="np1" type="password" minlength="${CONFIG.MIN_PASSWORD_LEN}">
      <label>تأكيد</label><input id="np2" type="password">
      <div class="lerr" id="nperr" style="text-align:right"></div>
      <div class="row"><button class="btn pri big" id="npsave">حفظ</button></div>
    `);
    $('npsave').onclick = async () => {
      const p1 = $('np1').value, p2 = $('np2').value;
      if (p1.length < CONFIG.MIN_PASSWORD_LEN) return $('nperr').textContent = 'قصيرة جداً';
      if (p1 !== p2) return $('nperr').textContent = 'غير متطابقتين';
      try {
        const { error } = await sb.auth.updateUser({ password: p1 });
        if (error) throw error;
        closeModal(); toast('تم تحديث كلمة المرور', 'ok');
      } catch (e) { $('nperr').textContent = e.message; }
    };
  }
});

async function enter(user) {
  try {
    if (await needsMfa()) { show2fa(user); return; }
    const { data: roleRow, error } = await sb.from('user_roles')
      .select('user_id,role,is_active').eq('user_id', user.id).eq('is_active', true)
      .in('role', ['admin', ...ALL])
      .limit(1).maybeSingle();
    if (error || !roleRow) {
      await sb.auth.signOut();
      $('lerr').textContent = 'الحساب غير مفعّل';
      $('login').classList.remove('hidden');
      return;
    }
    const { data: prof } = await sb.from('profiles').select('full_name,phone').eq('id', user.id).maybeSingle();
    ME = {
      id: user.id,
      role: roleRow.role === 'admin' ? 'owner' : roleRow.role,
      name: prof?.full_name || user.email || 'موظف',
      email: user.email
    };
    $('login').classList.add('hidden');
    $('shell').classList.remove('hidden');
    $('who').textContent = `${ME.name} — ${ROLES[ME.role]}`;
    $('nav').innerHTML = NAV.filter(n => can(n[3]))
      .map(n => `<button data-p="${n[0]}">${n[1]} ${n[2]}<b class="hide" data-badge></b></button>`).join('');

    await Promise.all([loadDrivers(), loadSettings(), loadOrders(), loadCancelReasons(), loadLoyalty()]);
    startRealtime();

    // Restore the last page for this signed-in admin after a refresh.
    let savedPage = null;
    try { savedPage = localStorage.getItem(`sb_current_page_${ME.id}`); } catch (_) {}
    const targetPage = savedPage && NAV.some(n => n[0] === savedPage && can(n[3]))
      ? savedPage
      : 'dashboard';
    go(targetPage);
  } catch (e) { fail(e, 'خطأ في الدخول'); }
}

function leave() {
  ME = null;
  if (channel && sb) { sb.removeChannel(channel); channel = null; }
  ORD.clear(); DRV = []; CANCEL_REASONS = [];
  $('shell').classList.add('hidden');
  $('login').classList.remove('hidden');
  $('login-step-1').classList.remove('hidden');
  $('login-step-2fa').classList.add('hidden');
  $('pw').value = ''; $('totp').value = '';
}

async function loadDrivers() {
  const r = await safeQuery(() => sb.from('drivers').select('*').order('full_name'), []);
  DRV = r.data || [];
}
async function loadSettings() {
  const r = await safeQuery(() => sb.from('store_settings').select('*').eq('id', CONFIG.SETTINGS_ROW_ID).maybeSingle(), null);
  SETTINGS = r.data;
  setOpen(r.data?.is_open ?? true);
}
async function loadLoyalty() {
  const r = await safeQuery(() => sb.from('store_settings').select('loyalty_enabled,loyalty_points_per_currency,loyalty_redeem_points,loyalty_redeem_value,loyalty_stamps_for_reward,loyalty_stamp_reward_item_id').eq('id', CONFIG.SETTINGS_ROW_ID).maybeSingle(), null);
  const x = r.data || {};
  LOYALTY = { is_active: x.loyalty_enabled, points_per_egp: x.loyalty_points_per_currency, stamps_for_reward: x.loyalty_stamps_for_reward, reward_value: x.loyalty_redeem_value, redeem_points: x.loyalty_redeem_points, stamp_reward_item_id: x.loyalty_stamp_reward_item_id };
}
async function loadCancelReasons() {
  // The live schema has no cancel_reasons table; keep safe local choices.
  CANCEL_REASONS = [
    { label:'طلب العميل الإلغاء' }, { label:'تأخير غير مقبول' },
    { label:'صنف غير متوفر' }, { label:'عنوان غير صحيح' },
    { label:'مشكلة دفع' }, { label:'أخرى' }
  ];
}
async function loadOrders() {
  const r = await safeQuery(() => sb.from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(CONFIG.ORDERS_LIMIT), null);
  if (!r.data) { toast('تعذر تحميل الطلبات', 'err'); return; }
  ORD.clear();
  r.data.forEach(o => ORD.set(o.id, o));
  badge();
}

