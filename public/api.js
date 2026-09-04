/* =========================================================================
   WM Móveis & Utilidades — cliente da API do backend
   Usado por index.html, product.html e painel.html.

   Como configurar: depois de publicar o backend no Render, defina a URL
   dele UMA VEZ pelo Painel Admin (Configurações > Conexão com o Backend),
   ou rode no console do navegador:
     setApiBaseUrl('https://seu-backend.onrender.com')
   Se nenhuma URL estiver configurada, o site/painel continuam funcionando
   normalmente em "modo local" (dados no localStorage/demonstração), então
   nada quebra enquanto você não conectar o backend.
   ========================================================================= */

const API_URL_KEY = 'wm_api_url';

function getApiBaseUrl() {
  const stored = (localStorage.getItem(API_URL_KEY) || '').replace(/\/+$/, '');
  if (stored) return stored;
  // Nenhuma URL configurada manualmente: assume o mesmo domínio que serviu
  // esta página. Como o site/painel e a API rodam no mesmo serviço no
  // Render, isso já basta na grande maioria dos casos — sem precisar
  // clicar em "Usar este mesmo domínio" em cada navegador/dispositivo,
  // e sem depender de um valor salvo no localStorage (que some se os
  // dados do site forem apagados).
  if (location.protocol === 'http:' || location.protocol === 'https:') return location.origin;
  return '';
}
function setApiBaseUrl(url) {
  localStorage.setItem(API_URL_KEY, (url || '').trim().replace(/\/+$/, ''));
}
function clearApiBaseUrl() {
  localStorage.removeItem(API_URL_KEY);
}
/** Verdadeiro quando esta página foi aberta a partir do próprio backend
 *  (ex: https://sua-api.onrender.com/painel.html), já que nesse caso o
 *  back-end e o front-end são o mesmo serviço/domínio. */
function isServedBySameOrigin() {
  return location.protocol === 'http:' || location.protocol === 'https:';
}

let _csrfToken = null;

/** Wrapper central de fetch: sempre envia cookies, injeta o token CSRF em
 *  requisições de escrita e transforma erros HTTP em exceções com mensagem
 *  amigável (a mesma mensagem que a API retornou). */
async function apiFetch(path, { method = 'GET', body, isForm = false } = {}) {
  const base = getApiBaseUrl();
  if (!base) throw new Error('Backend não configurado.');

  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && _csrfToken) headers['X-CSRF-Token'] = _csrfToken;

  let res;
  try {
    res = await fetch(base + path, {
      method,
      credentials: 'include',
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined
    });
  } catch (networkErr) {
    throw new Error('Não foi possível conectar ao servidor. Verifique sua internet ou a URL do backend.');
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* resposta sem corpo JSON */ }

  if (!res.ok) {
    const msg = (data && data.error) || `Erro na API (HTTP ${res.status}).`;
    const err = new Error(msg);
    err.status = res.status;
    err.details = data && data.details;
    throw err;
  }
  return data;
}

/* ---------------- Auth ---------------- */
async function apiLogin(email, password) {
  const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
  _csrfToken = data.csrfToken;
  return data.admin;
}
async function apiLogout() {
  try { await apiFetch('/api/auth/logout', { method: 'POST' }); } finally { _csrfToken = null; }
}
async function apiMe() {
  const data = await apiFetch('/api/auth/me');
  _csrfToken = data.csrfToken;
  return data.admin;
}
async function apiChangePassword(currentPassword, newPassword) {
  return apiFetch('/api/auth/password', { method: 'PUT', body: { currentPassword, newPassword } });
}

/* ---------------- Catálogo público ---------------- */
async function apiGetProducts() { return apiFetch('/api/products'); }
async function apiGetProduct(id) { return apiFetch('/api/products/' + encodeURIComponent(id)); }
async function apiGetRelated(id) { return apiFetch('/api/products/' + encodeURIComponent(id) + '/related'); }
async function apiGetBanner() { return apiFetch('/api/hero-banner'); }

/* ---------------- Admin: produtos ---------------- */
async function apiAdminGetProducts() { return apiFetch('/api/admin/products'); }
async function apiAdminCreateProduct(payload) { return apiFetch('/api/admin/products', { method: 'POST', body: payload }); }
async function apiAdminUpdateProduct(id, payload) { return apiFetch('/api/admin/products/' + encodeURIComponent(id), { method: 'PUT', body: payload }); }
async function apiAdminDeleteProduct(id) { return apiFetch('/api/admin/products/' + encodeURIComponent(id), { method: 'DELETE' }); }

/* ---------------- Admin: banner ---------------- */
async function apiAdminUpdateBanner(payload) { return apiFetch('/api/admin/hero-banner', { method: 'PUT', body: payload }); }

/* ---------------- Admin: upload de imagens ---------------- */
async function apiAdminUpload(files) {
  const form = new FormData();
  files.forEach(f => form.append('images', f));
  const data = await apiFetch('/api/admin/upload', { method: 'POST', body: form, isForm: true });
  return data.urls;
}

/** Converte uma data URL (base64) em File — usado para enviar ao backend
 *  fotos que foram lidas no navegador via FileReader. */
function dataUrlToFile(dataUrl, filename) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename || ('imagem-' + Date.now() + '.jpg'), { type: mime });
}

/** Testa se a URL configurada responde (usado na tela de Configurações). */
async function apiHealthCheck(url) {
  const res = await fetch(url.replace(/\/+$/, '') + '/health', { credentials: 'omit' });
  if (!res.ok) throw new Error('O servidor respondeu com erro.');
  return res.json();
}
