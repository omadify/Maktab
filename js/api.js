// Hardened Supabase Data Access Layer: AbortController, Timeouts, File Magic Validation, V4 RPC + Legacy Fallback
import { CFG, detectClientMeta, tempPw } from './config.js';

const SESSION_KEY = 'maktab_session_v4';
const LEGACY_KEY = 'maktab_user';
const REQUEST_TIMEOUT_MS = 15000;

let activeControllers = new Set();
let v4MigrationAvailable = null; // null = unknown, true = V4 RPCs active, false = legacy schema

export function isV4SecurityActive() {
  return v4MigrationAvailable === true;
}

export function cancelPendingRequests() {
  for (const ctrl of activeControllers) {
    try { ctrl.abort(); } catch {}
  }
  activeControllers.clear();
}

export function saveSession(user, token = null, expiresAt = null) {
  if (!user) {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LEGACY_KEY);
    return;
  }
  const safeUser = {
    id: user.id,
    login: user.login,
    name: user.name,
    subject: user.subject,
    role: user.role,
    ranked: user.ranked,
    active: user.active,
    must_change: user.must_change
  };
  sessionStorage.setItem(LEGACY_KEY, JSON.stringify(safeUser));
  if (token) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      user: safeUser,
      token,
      expiresAt: expiresAt || new Date(Date.now() + 12 * 3600 * 1000).toISOString()
    }));
  }
}

export function loadSession() {
  try {
    const v4Raw = sessionStorage.getItem(SESSION_KEY);
    if (v4Raw) {
      const parsed = JSON.parse(v4Raw);
      if (parsed?.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
        saveSession(null);
        return null;
      }
      if (parsed?.user && parsed?.token) {
        v4MigrationAvailable = true;
        return { user: parsed.user, token: parsed.token, expiresAt: parsed.expiresAt };
      }
    }
    const legRaw = sessionStorage.getItem(LEGACY_KEY);
    if (legRaw) {
      return { user: JSON.parse(legRaw), token: null, expiresAt: null };
    }
    return null;
  } catch {
    return null;
  }
}

export function getSessionToken() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw)?.token || null : null;
  } catch {
    return null;
  }
}

async function req(endpoint, options = {}) {
  const ctrl = new AbortController();
  activeControllers.add(ctrl);
  const timer = setTimeout(() => ctrl.abort('timeout'), options.timeout || REQUEST_TIMEOUT_MS);

  const url = `${CFG.SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    apikey: CFG.SUPABASE_KEY,
    Authorization: `Bearer ${CFG.SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers, signal: ctrl.signal });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const err = new Error(`Server xatosi (${res.status}): ${errText || res.statusText}`);
      err.status = res.status;
      err.body = errText;
      throw err;
    }
    return res.status !== 204 ? res.json() : null;
  } catch (err) {
    if (err.name === 'AbortError' || err === 'timeout') {
      throw new Error('So‘rov vaqti tugadi yoki bekor qilindi. Internet aloqasini tekshiring.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
    activeControllers.delete(ctrl);
  }
}

function isRpcMissing(err) {
  return err?.status === 404 || (err?.body || '').includes('PGRST202');
}

// Validate PDF / PNG / JPEG using real magic header bytes + extension + size
export async function validateProofFile(file) {
  if (!file) return;
  if (file.size > CFG.MAX_PROOF_BYTES) {
    throw new Error('Fayl hajmi 15 MB dan oshmasligi kerak.');
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
    throw new Error('Faqat PDF, JPG yoki PNG formatdagi hujjatlar qabul qilinadi.');
  }
  const buf = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47; // .PNG
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if ((ext === 'pdf' && !isPdf) || (ext === 'png' && !isPng) || ((ext === 'jpg' || ext === 'jpeg') && !isJpg)) {
    throw new Error('Fayl tarkibi tanlangan formatga mos kelmadi.');
  }
}

export const api = {
  async login(login, pw) {
    const meta = detectClientMeta();
    try {
      const res = await req('rpc/auth_login', {
        method: 'POST',
        body: JSON.stringify({
          p_login: login,
          p_pw: pw,
          p_device: meta.device_type,
          p_browser: meta.browser,
          p_os: meta.os
        })
      });
      v4MigrationAvailable = true;
      if (!res || !res.ok) {
        return { ok: false, error: res?.error || 'Login yoki parol noto‘g‘ri.' };
      }
      saveSession(res.user, res.token, res.expires_at);
      return { ok: true, user: res.user, token: res.token, expiresAt: res.expires_at };
    } catch (err) {
      if (!isRpcMissing(err)) throw err;
      // Legacy fallback when V4 SQL migration is not yet applied
      v4MigrationAvailable = false;
      const rows = await req('rpc/login_user', {
        method: 'POST',
        body: JSON.stringify({ p_login: login, p_pw: pw })
      });
      const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (!user) return { ok: false, error: 'Login yoki parol noto‘g‘ri.' };
      saveSession(user, null, null);
      return { ok: true, user, token: null };
    }
  },

  async logout() {
    const token = getSessionToken();
    cancelPendingRequests();
    if (token && v4MigrationAvailable) {
      try {
        await req('rpc/auth_logout', {
          method: 'POST',
          body: JSON.stringify({ p_token: token })
        });
      } catch {}
    }
    saveSession(null);
  },

  async changePassword(uid, oldPw, newPw) {
    const token = getSessionToken();
    if (token && v4MigrationAvailable) {
      const res = await req('rpc/auth_change_password', {
        method: 'POST',
        body: JSON.stringify({ p_token: token, p_old_pw: oldPw, p_new_pw: newPw })
      });
      if (!res?.ok) throw new Error(res?.error || 'Joriy parol noto‘g‘ri.');
      return true;
    }
    const ok = await req('rpc/change_user_password', {
      method: 'POST',
      body: JSON.stringify({ p_uid: uid, p_old_pw: oldPw, p_new_pw: newPw })
    });
    if (!ok) throw new Error('Joriy parol noto‘g‘ri.');
    return true;
  },

  async fetchWorkspaceData() {
    const token = getSessionToken();
    if (token) {
      try {
        const data = await req('rpc/get_workspace_data', {
          method: 'POST',
          body: JSON.stringify({ p_token: token })
        });
        v4MigrationAvailable = true;
        return {
          me: data.me,
          users: data.users || [],
          entries: data.entries || []
        };
      } catch (err) {
        if (!isRpcMissing(err)) throw err;
        v4MigrationAvailable = false;
      }
    }
    // Legacy parallel fetch
    v4MigrationAvailable = false;
    const [users, entries] = await Promise.all([
      req('users?select=id,login,name,subject,role,ranked,active,must_change,created&order=id.asc'),
      req('entries?select=*&order=id.desc')
    ]);
    return { me: null, users: users || [], entries: entries || [] };
  },

  async submitEntry(entry) {
    const token = getSessionToken();
    if (token && v4MigrationAvailable) {
      return req('rpc/submit_entry', {
        method: 'POST',
        body: JSON.stringify({
          p_token: token,
          p_ind: entry.ind,
          p_type: entry.type,
          p_qty: entry.qty,
          p_descr: entry.descr,
          p_date: entry.date,
          p_fname: entry.fname || null,
          p_fpath: entry.fpath || null
        })
      });
    }
    return req('entries', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
  },

  async reviewEntry(id, status, note, revUid) {
    const token = getSessionToken();
    if (token && v4MigrationAvailable) {
      const res = await req('rpc/review_entry_atomic', {
        method: 'POST',
        body: JSON.stringify({ p_token: token, p_entry_id: id, p_status: status, p_note: note || '' })
      });
      if (res && res.ok === false) throw new Error(res.error || 'Ariza allaqachon ko‘rib chiqilgan.');
      return res;
    }
    // Conditional atomic update in legacy mode to guard concurrent review
    const updated = await req(`entries?id=eq.${id}&status=neq.${status}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note: note || '', rev: revUid })
    });
    if (!Array.isArray(updated) || updated.length === 0) {
      throw new Error('Ariza holati allaqachon o‘zgartirilgan.');
    }
    return updated;
  },

  async deleteEntry(id) {
    const token = getSessionToken();
    if (token && v4MigrationAvailable) {
      return req('rpc/delete_entry_safe', {
        method: 'POST',
        body: JSON.stringify({ p_token: token, p_entry_id: id })
      });
    }
    return req(`entries?id=eq.${id}`, { method: 'DELETE' });
  },

  async createUsers(usersList) {
    const token = getSessionToken();
    if (token && v4MigrationAvailable) {
      const res = await req('rpc/admin_create_users', {
        method: 'POST',
        body: JSON.stringify({ p_token: token, p_users: usersList })
      });
      return res.created || [];
    }
    const prepared = usersList.map(u => ({
      ...u,
      pw: u.pw || tempPw(),
      active: u.active ?? 1,
      must_change: 1
    }));
    await req('users', { method: 'POST', body: JSON.stringify(prepared) });
    return prepared;
  },

  async updateUser(id, updates) {
    const token = getSessionToken();
    if (token && v4MigrationAvailable) {
      return req('rpc/admin_update_user', {
        method: 'POST',
        body: JSON.stringify({ p_token: token, p_target_uid: id, p_updates: updates })
      });
    }
    return req(`users?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },

  async resetUserPassword(u) {
    const token = getSessionToken();
    if (token && v4MigrationAvailable) {
      return req('rpc/admin_reset_password', {
        method: 'POST',
        body: JSON.stringify({ p_token: token, p_target_uid: u.id })
      });
    }
    const np = tempPw();
    await req(`users?id=eq.${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ pw: np, must_change: 1 })
    });
    return { ok: true, login: u.login, name: u.name, pw: np };
  },

  async fetchMonitoringData(limit = 150) {
    const token = getSessionToken();
    if (!token) {
      return { available: false, activities: [], logins: [], presence: [] };
    }
    try {
      const res = await req('rpc/get_monitoring_data', {
        method: 'POST',
        body: JSON.stringify({ p_token: token, p_limit: limit })
      });
      return {
        available: true,
        activities: res.activities || [],
        logins: res.logins || [],
        presence: res.presence || [],
        serverTime: res.server_time
      };
    } catch (err) {
      if (isRpcMissing(err)) {
        return { available: false, activities: [], logins: [], presence: [] };
      }
      throw err;
    }
  },

  async heartbeatPresence() {
    const token = getSessionToken();
    if (!token || !v4MigrationAvailable) return null;
    try {
      return await req('rpc/heartbeat_presence', {
        method: 'POST',
        body: JSON.stringify({ p_token: token })
      });
    } catch {
      return null;
    }
  },

  async fetchNotifications() {
    const token = getSessionToken();
    if (!token || !v4MigrationAvailable) return [];
    try {
      const rows = await req('rpc/get_user_notifications', {
        method: 'POST',
        body: JSON.stringify({ p_token: token })
      });
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  },

  async markNotificationRead(id = null) {
    const token = getSessionToken();
    if (!token || !v4MigrationAvailable) return false;
    try {
      return await req('rpc/mark_notification_read', {
        method: 'POST',
        body: JSON.stringify({ p_token: token, p_id: id })
      });
    } catch {
      return false;
    }
  },

  async uploadProofFile(file) {
    await validateProofFile(file);
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const rand = new Uint8Array(6);
    globalThis.crypto.getRandomValues(rand);
    const hex = Array.from(rand, b => b.toString(16).padStart(2, '0')).join('');
    const cleanName = `${Date.now()}_${hex}.${ext}`;
    const uploadUrl = `${CFG.SUPABASE_URL}/storage/v1/object/${CFG.STORAGE_BUCKET}/${cleanName}`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: CFG.SUPABASE_KEY,
        Authorization: `Bearer ${CFG.SUPABASE_KEY}`,
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: file
    });
    if (!res.ok) {
      throw new Error('Hujjatni bulutli saqlashga yuklashda xatolik yuz berdi.');
    }
    const publicUrl = `${CFG.SUPABASE_URL}/storage/v1/object/public/${CFG.STORAGE_BUCKET}/${cleanName}`;
    return { fname: file.name, fpath: publicUrl, objectName: cleanName };
  },

  async deleteProofObject(objectName) {
    if (!objectName) return;
    try {
      await fetch(`${CFG.SUPABASE_URL}/storage/v1/object/${CFG.STORAGE_BUCKET}/${objectName}`, {
        method: 'DELETE',
        headers: {
          apikey: CFG.SUPABASE_KEY,
          Authorization: `Bearer ${CFG.SUPABASE_KEY}`
        }
      });
    } catch {}
  }
};
