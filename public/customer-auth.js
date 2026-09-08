/* =========================================================================
   WM Móveis & Utilidades — login/cadastro do cliente (site público)
   Depende de api.js já carregado antes deste arquivo.
   ========================================================================= */

let currentCustomer = null; // { id, email, name } — null quando não logado

function ensureAccountModal(){
  if(document.getElementById('accountModal')) return;
  const style = document.createElement('style');
  style.textContent = `
    .acc-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:1000; display:none; align-items:center; justify-content:center; }
    .acc-overlay.open { display:flex; }
    .acc-modal { background:#151515; border:1px solid #2a2a2a; border-radius:10px; width:100%; max-width:380px;
      padding:28px 26px; color:#f2f0ea; font-family:'Inter',sans-serif; position:relative; }
    .acc-modal h3 { font-family:'Playfair Display',serif; color:#f2d675; font-size:20px; margin-bottom:6px; }
    .acc-modal .acc-sub { font-size:12.5px; color:#b8b3a8; margin-bottom:20px; }
    .acc-close { position:absolute; top:16px; right:18px; font-size:20px; color:#b8b3a8; cursor:pointer; }
    .acc-field { margin-bottom:14px; }
    .acc-field label { display:block; font-size:12.5px; margin-bottom:6px; color:#b8b3a8; }
    .acc-field input { width:100%; background:#0e0e0e; border:1px solid #2a2a2a; border-radius:6px; padding:11px 12px; color:#f2f0ea; font-size:14px; }
    .acc-field input:focus { outline:none; border-color:#a8842a; }
    .acc-btn { width:100%; background:#d4af37; color:#111; font-weight:700; font-size:13.5px; padding:12px; border-radius:6px; margin-top:4px; }
    .acc-btn:hover { background:#f2d675; }
    .acc-error { color:#d64545; font-size:12.5px; margin:-6px 0 12px; display:none; }
    .acc-switch { text-align:center; font-size:12.5px; color:#b8b3a8; margin-top:16px; }
    .acc-switch a { color:#f2d675; cursor:pointer; }
    .acc-divider { display:flex; align-items:center; gap:10px; margin:18px 0; font-size:11.5px; color:#b8b3a8; }
    .acc-divider::before, .acc-divider::after { content:''; flex:1; height:1px; background:#2a2a2a; }
    .acc-google-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:10px; background:#fff; color:#111;
      font-weight:600; font-size:13.5px; padding:11px; border-radius:6px; }
    .acc-logged { text-align:center; }
    .acc-logged .acc-avatar { width:56px; height:56px; border-radius:50%; background:rgba(212,175,55,.15); color:#d4af37;
      display:flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-size:22px; font-weight:700; margin:0 auto 14px; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'acc-overlay';
  overlay.id = 'accountModal';
  overlay.onclick = (e) => { if(e.target === overlay) closeAccountModal(); };
  overlay.innerHTML = `<div class="acc-modal" id="accModalBody"></div>`;
  document.body.appendChild(overlay);
}

function accountModalLoginView(){
  return `
    <span class="acc-close" onclick="closeAccountModal()">&times;</span>
    <h3>Entrar na sua conta</h3>
    <div class="acc-sub">Acompanhe pedidos e favoritos com mais facilidade.</div>
    <div class="acc-error" id="accError"></div>
    <div class="acc-field"><label>E-mail</label><input type="email" id="accEmail"></div>
    <div class="acc-field"><label>Senha</label><input type="password" id="accPassword"></div>
    <button class="acc-btn" onclick="doShopLogin()">ENTRAR</button>
    <div class="acc-divider">ou</div>
    <a class="acc-google-btn" href="#" onclick="event.preventDefault(); doGoogleLogin();">
      <svg width="17" height="17" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l6-6C33.9 6.9 29.2 5 24 5 13 5 4 14 4 25s9 20 20 20 20-9 20-20c0-1.3-.1-2.5-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.7l6-6C33.9 6.9 29.2 5 24 5c-7.6 0-14.1 4.3-17.7 9.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-1.9 13.4-5.1l-6.2-5.2C29.2 36.4 26.7 37 24 37c-5.3 0-9.6-3.6-11.2-8.4l-6.5 5C9.8 40.6 16.3 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.7l6.2 5.2C40.9 36 44 30.9 44 25c0-1.3-.1-2.5-.4-3.5z"/></svg>
      Entrar com Google
    </a>
    <div class="acc-switch">Não tem conta? <a onclick="accountModalShow('signup')">Cadastre-se</a></div>
  `;
}

function accountModalSignupView(){
  return `
    <span class="acc-close" onclick="closeAccountModal()">&times;</span>
    <h3>Criar minha conta</h3>
    <div class="acc-sub">Leva menos de um minuto.</div>
    <div class="acc-error" id="accError"></div>
    <div class="acc-field"><label>Nome</label><input type="text" id="accName"></div>
    <div class="acc-field"><label>E-mail</label><input type="email" id="accEmail"></div>
    <div class="acc-field"><label>Senha</label><input type="password" id="accPassword" placeholder="mínimo 6 caracteres"></div>
    <button class="acc-btn" onclick="doShopSignup()">CRIAR CONTA</button>
    <div class="acc-divider">ou</div>
    <a class="acc-google-btn" href="#" onclick="event.preventDefault(); doGoogleLogin();">
      <svg width="17" height="17" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l6-6C33.9 6.9 29.2 5 24 5 13 5 4 14 4 25s9 20 20 20 20-9 20-20c0-1.3-.1-2.5-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.7l6-6C33.9 6.9 29.2 5 24 5c-7.6 0-14.1 4.3-17.7 9.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-1.9 13.4-5.1l-6.2-5.2C29.2 36.4 26.7 37 24 37c-5.3 0-9.6-3.6-11.2-8.4l-6.5 5C9.8 40.6 16.3 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.7l6.2 5.2C40.9 36 44 30.9 44 25c0-1.3-.1-2.5-.4-3.5z"/></svg>
      Cadastrar com Google
    </a>
    <div class="acc-switch">Já tem conta? <a onclick="accountModalShow('login')">Entrar</a></div>
  `;
}

function accountModalLoggedView(){
  const initial = (currentCustomer.name || currentCustomer.email || '?').trim().charAt(0).toUpperCase();
  return `
    <span class="acc-close" onclick="closeAccountModal()">&times;</span>
    <div class="acc-logged">
      <div class="acc-avatar">${initial}</div>
      <div style="font-weight:600;margin-bottom:2px;">${currentCustomer.name || 'Minha conta'}</div>
      <div style="font-size:12.5px;color:#b8b3a8;margin-bottom:20px;">${currentCustomer.email}</div>
      <button class="acc-btn" style="background:transparent;border:1px solid #2a2a2a;color:#f2f0ea;" onclick="doShopLogout()">SAIR DA CONTA</button>
    </div>
  `;
}

function accountModalShow(view){
  ensureAccountModal();
  const body = document.getElementById('accModalBody');
  if(currentCustomer) body.innerHTML = accountModalLoggedView();
  else if(view === 'signup') body.innerHTML = accountModalSignupView();
  else body.innerHTML = accountModalLoginView();
}

function openAccountModal(){
  ensureAccountModal();
  accountModalShow(currentCustomer ? 'logged' : 'login');
  document.getElementById('accountModal').classList.add('open');
}
function closeAccountModal(){
  const m = document.getElementById('accountModal');
  if(m) m.classList.remove('open');
}

function showAccError(msg){
  const el = document.getElementById('accError');
  if(el){ el.textContent = msg; el.style.display = 'block'; }
}

async function doShopLogin(){
  if(!isApiMode()){ showAccError('Login indisponível: backend não conectado.'); return; }
  const email = document.getElementById('accEmail').value.trim();
  const password = document.getElementById('accPassword').value;
  try{
    const data = await apiShopLogin(email, password);
    currentCustomer = data.customer;
    updateAccountHeader();
    closeAccountModal();
  }catch(err){ showAccError(err.message || 'Não foi possível entrar.'); }
}

async function doShopSignup(){
  if(!isApiMode()){ showAccError('Cadastro indisponível: backend não conectado.'); return; }
  const name = document.getElementById('accName').value.trim();
  const email = document.getElementById('accEmail').value.trim();
  const password = document.getElementById('accPassword').value;
  try{
    const data = await apiShopSignup(email, password, name);
    currentCustomer = data.customer;
    updateAccountHeader();
    closeAccountModal();
  }catch(err){ showAccError(err.message || 'Não foi possível criar a conta.'); }
}

async function doShopLogout(){
  try{ await apiShopLogout(); }catch(err){ /* ignora erro de rede no logout */ }
  currentCustomer = null;
  updateAccountHeader();
  closeAccountModal();
}

function doGoogleLogin(){
  const url = shopGoogleLoginUrl();
  if(!url){ showAccError('Login com Google indisponível: backend não conectado.'); return; }
  window.location.href = url;
}

/** Atualiza o texto "Olá, faça seu login" / "Olá, <nome>" no header, se existir. */
function updateAccountHeader(){
  const topEl = document.getElementById('accountTop');
  if(topEl) topEl.textContent = currentCustomer ? `Olá, ${(currentCustomer.name || currentCustomer.email).split(' ')[0]}` : 'Olá, faça seu login';
}

/** Roda em toda página que incluir este arquivo: tenta restaurar a sessão
 *  do cliente (se houver cookie válido) e liga o clique no header. */
(async function initCustomerAuth(){
  const accountAction = document.getElementById('accountAction');
  if(accountAction) accountAction.onclick = openAccountModal;

  if(isApiMode()){
    try{
      const data = await apiShopMe();
      currentCustomer = data.customer;
      updateAccountHeader();
    }catch(err){ /* não logado — normal */ }
  }

  // Depois de voltar do login com Google (?shop_login=ok/error na URL).
  const params = new URLSearchParams(location.search);
  if(params.get('shop_login') === 'ok'){
    history.replaceState(null, '', location.pathname);
  } else if(params.get('shop_login') === 'error'){
    history.replaceState(null, '', location.pathname);
    alert('Não foi possível entrar com o Google. Tente novamente.');
  }
})();
