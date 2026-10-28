// Keep the login screen visible if a startup JavaScript error prevents the dashboard boot sequence.
window.addEventListener('error', function (event) {
  var login = document.getElementById('login');
  var shell = document.getElementById('shell');
  if (login && shell && shell.classList.contains('hidden')) {
    login.classList.remove('hidden');
    var message = document.getElementById('lerr');
    if (message && !message.textContent) message.textContent = 'حدث خطأ أثناء تشغيل اللوحة. افتح أدوات المطور لمعرفة التفاصيل.';
  }
});
window.addEventListener('unhandledrejection', function () {
  var login = document.getElementById('login');
  var shell = document.getElementById('shell');
  if (login && shell && shell.classList.contains('hidden')) {
    login.classList.remove('hidden');
    var message = document.getElementById('lerr');
    if (message && !message.textContent) message.textContent = 'تعذر إكمال التهيئة. تحقق من الاتصال وحاول إعادة تحميل الصفحة.';
  }
});
