// Login & Password Change Views (Elegant Institutional Access)
import { api } from '../api.js';
import { icon } from '../icons.js';
import { $, esc, toast, applyTheme, resolveTheme } from '../ui.js';

export function renderLogin(root, { onLoginSuccess }) {
  const isDark = resolveTheme() === 'dark';

  root.innerHTML = `
    <div class="auth-shell">
      <aside class="auth-aside">
        <div class="auth-aside-inner">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:36px">
            <div class="brand-logo" style="width:40px;height:40px;border-radius:11px">
              ${icon('graduation-cap', 22)}
            </div>
            <div>
              <div style="font-size:15.5px;font-weight:700;letter-spacing:-0.02em">Pedagog Reyting</div>
              <div style="font-size:12.5px;color:#94A3B8">Norin tuman ixtisoslashtirilgan maktabi</div>
            </div>
          </div>

          <h1 style="font-size:30px;line-height:1.22;font-weight:700;color:#FFFFFF;letter-spacing:-0.03em;margin-bottom:14px">
            Ta’lim sifatini tahlil qilish va shaffof reyting tizimi
          </h1>
          <p style="font-size:14.5px;line-height:1.6;color:#94A3B8;margin:0">
            26-AF-sonli buyruq asosida pedagoglar faoliyatini 15 ta indikator va 130 ballik shkala bo‘yicha baholash, tasdiqlash va hisobotlarni shakllantirish platformasi.
          </p>

          <div class="auth-feature-list">
            <div class="auth-feature-item">
              <div class="auth-feature-icon">${icon('bar-chart-3', 17)}</div>
              <div>
                <div style="font-size:13.5px;font-weight:600;color:#F8FAFC">Institutional Intelligence</div>
                <div style="font-size:12.5px;color:#94A3B8;margin-top:2px">Salohiyat, o‘quvchi yutuqlari va fan faolligi bo‘yicha real tahlillar.</div>
              </div>
            </div>
            <div class="auth-feature-item">
              <div class="auth-feature-icon">${icon('shield', 17)}</div>
              <div>
                <div style="font-size:13.5px;font-weight:600;color:#F8FAFC">Xavfsiz tasdiqlash va audit</div>
                <div style="font-size:12.5px;color:#94A3B8;margin-top:2px">Mas’ul ekspertlar va rahbariyat nazorati ostida shaffof tekshiruv.</div>
              </div>
            </div>
            <div class="auth-feature-item">
              <div class="auth-feature-icon">${icon('printer', 17)}</div>
              <div>
                <div style="font-size:13.5px;font-weight:600;color:#F8FAFC">Rasmiy A4 portfolio va hisobotlar</div>
                <div style="font-size:12.5px;color:#94A3B8;margin-top:2px">Chop etishga tayyor shaxsiy portfolio va CSV eksport.</div>
              </div>
            </div>
          </div>
        </div>

        <div style="position:relative;z-index:1;font-size:12px;color:#64748B">
          26-AF buyruq standarti · 15 indikator · 130 ballik tizim
        </div>
      </aside>

      <main class="auth-main">
        <div class="auth-theme-float">
          <button type="button" class="btn btn-secondary btn-icon" id="auth-theme-btn" title="Mavzuni almashtirish" aria-label="Mavzuni almashtirish">
            ${icon(isDark ? 'sun' : 'moon', 17)}
          </button>
        </div>

        <div class="auth-card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
            <div class="brand-logo" style="width:36px;height:36px">${icon('graduation-cap', 19)}</div>
            <div>
              <div style="font-size:14.5px;font-weight:700;color:var(--text)">Pedagog Reyting</div>
              <div style="font-size:12px;color:var(--text-muted)">Norin tuman ixtisoslashtirilgan maktabi</div>
            </div>
          </div>

          <h2 style="font-size:20px;font-weight:700;margin-bottom:5px">Tizimga kirish</h2>
          <p style="font-size:13px;color:var(--text-muted);margin:0 0 20px">
            Shaxsiy kabinetingizga kirish uchun login va parolingizni kiriting.
          </p>

          <form id="login-form" class="stack-v" style="gap:15px" novalidate>
            <div class="field">
              <label for="lg">Login</label>
              <div class="input-icon-wrap">
                <span class="input-leading">${icon('user', 15)}</span>
                <input id="lg" name="login" class="input has-leading" type="text" autocomplete="username" placeholder="Masalan: a.karimov" required autofocus>
              </div>
            </div>

            <div class="field">
              <label for="pw">Parol</label>
              <div class="input-icon-wrap">
                <span class="input-leading">${icon('key', 15)}</span>
                <input id="pw" name="password" class="input has-leading" style="padding-right:42px" type="password" autocomplete="current-password" placeholder="Parolingizni kiriting" required>
                <button type="button" id="toggle-pw" class="btn btn-ghost btn-icon btn-sm input-trailing" aria-label="Parolni ko‘rsatish" title="Parolni ko‘rsatish">
                  ${icon('eye', 15)}
                </button>
              </div>
            </div>

            <div id="login-error" class="form-alert error" style="display:none" role="alert">
              ${icon('alert-circle', 16)}
              <span id="login-error-text"></span>
            </div>

            <button class="btn btn-primary" type="submit" id="l-btn" style="width:100%;min-height:42px;margin-top:4px">
              Kirish
            </button>
          </form>

          <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted);text-align:center">
            Parolni unutgan bo‘lsangiz, maktab IT mutaxassisiga murojaat qiling.
          </div>
        </div>
      </main>
    </div>
  `;

  $('#auth-theme-btn').onclick = () => {
    const next = resolveTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    $('#auth-theme-btn').innerHTML = icon(next === 'dark' ? 'sun' : 'moon', 17);
  };

  let pwShown = false;
  $('#toggle-pw').onclick = () => {
    pwShown = !pwShown;
    $('#pw').type = pwShown ? 'text' : 'password';
    $('#toggle-pw').innerHTML = icon(pwShown ? 'eye-off' : 'eye', 15);
    $('#toggle-pw').setAttribute('aria-label', pwShown ? 'Parolni yashirish' : 'Parolni ko‘rsatish');
  };

  const showErr = msg => {
    const box = $('#login-error');
    if (!msg) { box.style.display = 'none'; return; }
    $('#login-error-text').textContent = msg;
    box.style.display = 'flex';
  };

  let submitting = false;
  $('#login-form').onsubmit = async e => {
    e.preventDefault();
    if (submitting) return;
    showErr('');
    const login = $('#lg').value.trim().toLowerCase();
    const pw = $('#pw').value;
    if (!login || !pw) {
      showErr('Login va parol maydonlarini to‘ldiring.');
      return;
    }

    submitting = true;
    const btn = $('#l-btn');
    btn.disabled = true;
    btn.innerHTML = `${icon('refresh-cw', 15)} Tekshirilmoqda…`;

    try {
      const res = await api.login(login, pw);
      if (!res.ok || !res.user) {
        showErr(res.error || 'Login yoki parol noto‘g‘ri.');
        btn.disabled = false;
        btn.textContent = 'Kirish';
        submitting = false;
        return;
      }
      await onLoginSuccess(res.user);
    } catch (err) {
      showErr('Tizimga ulanishda xatolik: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Kirish';
      submitting = false;
    }
  };
}

export function renderPasswordChange(root, { user, forced, onDone, onCancel }) {
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg)">
      <div class="auth-card" style="max-width:430px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <div class="kpi-icon primary" style="width:38px;height:38px">${icon('key', 18)}</div>
          <div>
            <h2 style="font-size:18px;font-weight:700">${forced ? 'Yangi parol o‘rnating' : 'Parolni yangilash'}</h2>
            <div style="font-size:12.5px;color:var(--text-muted)">${esc(user.name)} (${esc(user.login)})</div>
          </div>
        </div>

        ${forced ? `
          <div class="form-alert info" style="margin-bottom:16px">
            ${icon('shield', 16)}
            <span>Xavfsizlik talabiga ko‘ra, birinchi kirishda vaqtinchalik parolni almashtirishingiz shart.</span>
          </div>
        ` : ''}

        <form id="pw-form" class="stack-v" style="gap:14px" novalidate>
          <div class="field">
            <label for="po">Joriy parol</label>
            <input id="po" class="input" type="password" autocomplete="current-password" required>
          </div>

          <div class="field">
            <label for="pn">Yangi parol (kamida 8 belgi)</label>
            <input id="pn" class="input" type="password" minlength="8" autocomplete="new-password" required>
            <div class="progress-single" style="margin-top:4px"><i id="pw-strength-bar" style="width:0%"></i></div>
            <span id="pw-strength-text" style="font-size:11.5px;color:var(--text-muted)">Kamida 8 ta belgi, katta-kichik harf va raqamdan foydalaning</span>
          </div>

          <div class="field">
            <label for="pc-inp">Yangi parolni tasdiqlang</label>
            <input id="pc-inp" class="input" type="password" minlength="8" autocomplete="new-password" required>
          </div>

          <div id="pw-error" class="form-alert error" style="display:none" role="alert">
            ${icon('alert-circle', 16)}
            <span id="pw-error-text"></span>
          </div>

          <div style="display:flex;gap:10px;margin-top:6px">
            <button class="btn btn-primary" type="submit" id="p-btn" style="flex:1">Saqlash</button>
            ${!forced ? '<button class="btn btn-secondary" type="button" id="p-cancel">Bekor qilish</button>' : ''}
          </div>
        </form>
      </div>
    </div>
  `;

  if (!forced && onCancel) $('#p-cancel').onclick = onCancel;

  $('#pn').oninput = () => {
    const val = $('#pn').value;
    let score = 0;
    if (val.length >= 8) score += 35;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 25;
    if (/\d/.test(val)) score += 20;
    if (/[^A-Za-z0-9]/.test(val)) score += 20;
    const bar = $('#pw-strength-bar');
    const txt = $('#pw-strength-text');
    bar.style.width = `${score}%`;
    if (score < 40) { bar.style.background = 'var(--error)'; txt.textContent = 'Zaif parol — kamida 8 belgi kiriting'; }
    else if (score < 75) { bar.style.background = 'var(--warning)'; txt.textContent = 'O‘rtacha parol — raqam yoki belgi qo‘shing'; }
    else { bar.style.background = 'var(--success)'; txt.textContent = 'Ishonchli parol'; }
  };

  const showErr = msg => {
    const box = $('#pw-error');
    if (!msg) { box.style.display = 'none'; return; }
    $('#pw-error-text').textContent = msg;
    box.style.display = 'flex';
  };

  $('#pw-form').onsubmit = async e => {
    e.preventDefault();
    showErr('');
    const oldPw = $('#po').value;
    const np = $('#pn').value;
    const cp = $('#pc-inp').value;
    if (!oldPw) return showErr('Joriy parolni kiriting.');
    if (np.length < 8) return showErr('Yangi parol kamida 8 ta belgidan iborat bo‘lishi kerak.');
    if (np !== cp) return showErr('Yangi parollar bir-biriga mos kelmadi.');

    const btn = $('#p-btn');
    btn.disabled = true;
    btn.textContent = 'Saqlanmoqda…';
    try {
      await api.changePassword(user.id, oldPw, np);
      user.must_change = 0;
      toast('Parol muvaffaqiyatli yangilandi.', 'success');
      onDone();
    } catch (err) {
      showErr(err.message || 'Parolni yangilashda xatolik.');
      btn.disabled = false;
      btn.textContent = 'Saqlash';
    }
  };
}
