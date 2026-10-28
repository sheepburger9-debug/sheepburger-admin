/* ═══════════════════════════════════════════════════
   SECTION 6 · SUPABASE + STATE
   ═══════════════════════════════════════════════════ */
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CONFIG.SUPABASE_URL);
const sb = window.supabase?.createClient
  ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
    })
  : null;

let ME = null, page = 'dashboard', channel = null, isOpen = true;
const ORD = new Map();
let DRV = [], SETTINGS = null, LOYALTY = null, CANCEL_REASONS = [];
let searchTerm = '', payFilter = '', statusFilter = '';
const pageIdx = {};
const selectionSet = new Set();
let undoStack = [];

const can = roles => ME && roles.includes(ME.role);
const driverName = id => (DRV.find(d => d.id === id) || {}).full_name || '—';

