/* تسجيل Service Worker لتثبيت اللوحة كتطبيق على الهاتف */
(function registerAdminPwa() {
  if (!('serviceWorker' in navigator)) return;
  // تسجيل بعد اكتمال التحميل حتى لا يؤثر على أول عرض للصفحة
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((err) => {
      console.warn('[PWA] تعذر تسجيل Service Worker:', err && err.message);
    });
  });
})();
