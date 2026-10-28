/* ═══════════════════════════════════════════════════
   SECTION 2 · PAYMENTS + ROLES + STATUS + NAV
   ═══════════════════════════════════════════════════ */
const PAY = {
  cash:          { l:'كاش',              i:'💵', c:'#2F7D32' },
  visa:          { l:'فيزا/كارت',         i:'💳', c:'#1565C0' },
  card:          { l:'فيزا/كارت',         i:'💳', c:'#1565C0' },
  credit_card:   { l:'فيزا/كارت',         i:'💳', c:'#1565C0' },
  wallet:        { l:'محفظة إلكترونية',   i:'📱', c:'#6A1B9A' },
  ewallet:       { l:'محفظة إلكترونية',   i:'📱', c:'#6A1B9A' },
  e_wallet:      { l:'محفظة إلكترونية',   i:'📱', c:'#6A1B9A' },
  vodafone_cash: { l:'فودافون كاش',       i:'📞', c:'#C62828' },
  instapay:      { l:'إنستاباي',          i:'⚡', c:'#EF6C00' },
  fawry:         { l:'فوري',              i:'🏪', c:'#00897B' },
  online:        { l:'أونلاين',           i:'🌐', c:'#455A64' }
};
const payInfo = m => PAY[String(m||'').toLowerCase().trim()] || { l:m||'غير محدد', i:'❓', c:'#6E6154' };
const payBadge = m => {
  const p = payInfo(m);
  return `<span class="pay-badge" style="color:${p.c};border-color:${p.c}55;background:${p.c}12">${p.i} ${p.l}</span>`;
};
const payStatusBadge = s => {
  const map = { paid:{l:'✅ مدفوع',c:'#2F7D32'}, pending:{l:'⏳ غير محصّل',c:'#EF6C00'}, refunded:{l:'↩️ مسترد',c:'#C62828'} };
  const x = map[s] || { l:s||'—', c:'#6E6154' };
  return `<span class="pay-badge" style="color:${x.c};border-color:${x.c}55;background:${x.c}12">${x.l}</span>`;
};

const ALL = ['owner','manager','cashier','chef','dispatcher'];
const OM = ['owner','manager'];
const ROLES = { owner:'المالك', manager:'المدير', cashier:'الكاشير', chef:'الشيف', dispatcher:'منسق التوصيل' };
const NAV = [
  ['dashboard','🏠','الرئيسية',ALL],
  ['orders','📋','الطلبات',ALL],
  ['menu','🍽️','قائمة الطعام',[...OM,'chef']],
  ['offers','🎁','العروض والخصومات',OM],
  ['home-controls','🎯','الواجهة الرئيسية والمنيو السري',OM],
  ['coupons','🏷️','الكوبونات',OM],
  ['customers','👥','العملاء',[...OM,'cashier']],
  ['drivers','🛵','السائقين',[...OM,'dispatcher']],
  ['reports','📈','التقارير',OM],
  ['reviews','⭐','التقييمات',[...OM,'chef']],
  ['notifications','🔔','الإشعارات',OM],
  ['staff','🧑‍💼','الموظفين',['owner']],
  ['audit','📝','سجل النشاط',OM],
  ['sessions','🔐','الجلسات',['owner']],
  ['refunds','💸','المستردات',OM],
  ['health','💚','حالة النظام',OM],
  ['settings','⚙️','الإعدادات',OM]
];
const ST = {
  pending:{l:'جديد',n:'تأكيد',next:'confirmed',by:[...OM,'cashier']},
  confirmed:{l:'مؤكد',n:'تحضير',next:'preparing',by:[...OM,'cashier']},
  preparing:{l:'تحضير',n:'جاهز',next:'ready',by:[...OM,'chef']},
  ready:{l:'جاهز',n:'توصيل',next:'out_for_delivery',by:[...OM,'dispatcher','cashier']},
  out_for_delivery:{l:'في الطريق',n:'تم التوصيل',next:'delivered',by:[...OM,'dispatcher']},
  delivered:{l:'تم التوصيل'},
  cancelled:{l:'ملغي'}
};
const KCOLS = ['pending','confirmed','preparing','ready','out_for_delivery'];
const countable = o => o.status !== 'cancelled' && o.payment_status !== 'refunded';
const URGENT = { pending:3, confirmed:3, preparing:15, ready:5, out_for_delivery:30 };

