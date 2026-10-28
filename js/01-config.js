
/* قاعدة البيانات: شغّل ملف supabase_setup.sql في Supabase SQL Editor مرة واحدة (جداول + RLS + دوال آمنة + Realtime).
   دعوة الموظفين: انشر Edge Function باسم invite-staff (ملف invite-staff/index.ts). */

'use strict';

/* ═══════════════════════════════════════════════════
   SECTION 1 · CONFIG
   ═══════════════════════════════════════════════════ */
const CONFIG = {
  SUPABASE_URL: 'https://gwufhitzmupyumdjabnj.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_oTZFsXGeGb_PAhI7A-eTAw_MGwsBTGG',
  CURRENCY: '',
  ORDERS_LIMIT: 1000,
  PAGE_SIZE: 20,
  SETTINGS_ROW_ID: 1,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW_MIN: 15,
  MIN_PASSWORD_LEN: 8,
  HELP_TABLE: ['categories','addons','item_sizes','item_addons','delivery_zones',
               'loyalty_ledger','menu_promotions','refunds','customer_restrictions']
};

