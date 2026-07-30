// EchoVeille — helpers front-end partagés

async function api(path, options = {}) {
  const res = await fetch(`/.netlify/functions/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
  });
  if (res.status === 401) {
    window.location.href = '/login.html';
    return Promise.reject(new Error('Session expirée'));
  }
  const text = await res.text();
  let raw;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch (parseErr) {
    raw = text;
  }
  if (!res.ok) {
    const message = (raw && typeof raw === 'object' && raw.error)
      ? raw.error
      : `Erreur serveur (${res.status})${typeof raw === 'string' && raw ? ' : ' + raw.slice(0, 200) : ''}`;
    throw new Error(message);
  }
  return raw;
}

function showToast(message, type = 'ok') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = 'toast show' + (type === 'error' ? ' error' : '');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3200);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso.slice(0, 10) + 'T00:00:00');
  return Math.round((target - today) / 86400000);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ nom: file.name, type: file.type, data: reader.result.split(',')[1] });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function logout() {
  try { await api('logout', { method: 'POST' }); } catch (e) {}
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.querySelector('[data-logout]');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-list a').forEach((a) => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });

  const whoami = document.querySelector('[data-whoami]');
  if (whoami) {
    api('me').then((user) => {
      whoami.textContent = user && user.nom_complet ? `Connecté : ${user.nom_complet}` : '';
    }).catch(() => {});
  }
});
