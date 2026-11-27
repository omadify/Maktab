// Hardened Supabase Data Access Layer V6: AbortController, Timeouts, File Magic Validation, V4+V6 RPCs + Graceful Fallback
import { CFG, detectClientMeta, tempPw } from './config.js';

const SESSION_KEY = 'maktab_session_v4';
const LEGACY_KEY = 'maktab_user';
const REQUEST_TIMEOUT_MS = 15000;

let activeControllers = new Set();
let v4MigrationAvailable = null; // null = unknown, true = V4 RPCs active, false = legacy schema
let v6MigrationAvailable = null; // null = unknown, true = V6 RPCs active, false = V4/legacy only

export function isV4SecurityActive() {
  return v4MigrationAvailable === true;
}

export function isV6UpgradeActive() {
  return v6MigrationAvailable === true;
}

export function cancelPendingRequests() {
  for (const ctrl of activeControllers) {
    try { ctrl.abort(); } catch {}
  }
  activeControllers.clear();
}

export function saveSession(user, token = undefined, expiresAt = undefined) {
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
    must_change: user.must_change,
    bio: user.bio || '',
    avatar_url: user.avatar_url || null,
    cover_style: user.cover_style || 'ocean-glass',
    cover_url: user.cover_url || null,
    phone: user.phone || '',
    telegram_handle: user.telegram_handle || '',
    contact_public: Boolean(user.contact_public),
    preferences: user.preferences || {},
    last_login_at: user.last_login_at || null
  };
  sessionStorage.setItem(LEGACY_KEY, JSON.stringify(safeUser));

  let existing = null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) existing = JSON.parse(raw);
  } catch {}

  const finalToken = token !== undefined ? token : (existing?.token || null);
  const finalExp = expiresAt !== undefined ? expiresAt : (existing?.expiresAt || null);

  if (finalToken) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      user: safeUser,
      token: finalToken,
      expiresAt: finalExp || new Date(Date.now() + 12 * 3600 * 1000).toISOString()
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
  const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if ((ext === 'pdf' && !isPdf) || (ext === 'png' && !isPng) || ((ext === 'jpg' || ext === 'jpeg') && !isJpg)) {
    throw new Error('Fayl tarkibi tanlangan formatga mos kelmadi.');
  }
}

// Validate Avatar / Cover image (PNG / JPEG / WEBP <= 5 MB)
export async function validateImageFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Rasm hajmi 5 MB dan oshmasligi kerak.');
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    throw new Error('Faqat PNG, JPG yoki WEBP formatdagi rasmlar qabul qilinadi.');
  }
  const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isWebp = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45;
  if ((ext === 'png' && !isPng) || ((ext === 'jpg' || ext === 'jpeg') && !isJpg) || (ext === 'webp' && !isWebp)) {
    throw new Error('Rasm fayli buzilgan yoki formati noto‘g‘ri.');
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
      v4MigrationAvailable = false;
      v6MigrationAvailable = false;
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
        if (data?.me && ('bio' in data.me || 'cover_style' in data.me)) {
          v6MigrationAvailable = true;
        }
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
    v4MigrationAvailable = false;
    v6MigrationAvailable = false;
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
    if (!token) return { available: false, activities: [], logins: [], presence: [] };
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
      if (isRpcMissing(err)) return { available: false, activities: [], logins: [], presence: [] };
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

  /* ========================================================================
     V6 PROFILE, SESSIONS, PERSONAL ACTIVITY, APPEALS & DEVELOPMENT PLAN RPCs
     ======================================================================== */
  async updateMyProfile(updates) {
    const token = getSessionToken();
    if (!token) throw new Error('V6 profil tahrirlash uchun server sessiyasi talab qilinadi.');
    try {
      const res = await req('rpc/update_my_profile', {
        method: 'POST',
        body: JSON.stringify({ p_token: token, p_updates: updates })
      });
      v6MigrationAvailable = true;
      return res;
    } catch (err) {
      if (isRpcMissing(err)) {
        v6MigrationAvailable = false;
        throw new Error('V6 profil migratsiyasi (20261127_v6_platform_upgrade.sql) hali bazada qo‘llanmagan.');
      }
      throw err;
    }
  },

  async updateMyPreferences(prefs) {
    const token = getSessionToken();
    if (!token || !v4MigrationAvailable) return { ok: false, skipped: true };
    try {
      return await req('rpc/update_my_preferences', {
        method: 'POST',
        body: JSON.stringify({ p_token: token, p_prefs: prefs })
      });
    } catch {
      return { ok: false };
    }
  },

  async fetchMySessions() {
    const token = getSessionToken();
    if (!token) return { available: false, rows: [] };
    try {
      const rows = await req('rpc/get_my_sessions', {
        method: 'POST',
        body: JSON.stringify({ p_token: token })
      });
      v6MigrationAvailable = true;
      return { available: true, rows: Array.isArray(rows) ? rows : [] };
    } catch (err) {
      if (isRpcMissing(err)) return { available: false, rows: [] };
      throw err;
    }
  },

  async revokeMySession(sessionId) {
    const token = getSessionToken();
    if (!token) throw new Error('Sessiya topilmadi.');
    return req('rpc/revoke_my_session', {
      method: 'POST',
      body: JSON.stringify({ p_token: token, p_session_id: sessionId })
    });
  },

  async fetchMyActivity(limit = 120) {
    const token = getSessionToken();
    if (!token) return { available: false, rows: [] };
    try {
      const rows = await req('rpc/get_my_activity', {
        method: 'POST',
        body: JSON.stringify({ p_token: token, p_limit: limit })
      });
      v6MigrationAvailable = true;
      return { available: true, rows: Array.isArray(rows) ? rows : [] };
    } catch (err) {
      if (isRpcMissing(err)) {
        v6MigrationAvailable = false;
        return { available: false, rows: [] };
      }
      throw err;
    }
  },

  async fetchAppeals() {
    const token = getSessionToken();
    if (!token) return { available: false, rows: [] };
    try {
      const rows = await req('rpc/get_appeals', {
        method: 'POST',
        body: JSON.stringify({ p_token: token })
      });
      v6MigrationAvailable = true;
      return { available: true, rows: Array.isArray(rows) ? rows : [] };
    } catch (err) {
      if (isRpcMissing(err)) {
        v6MigrationAvailable = false;
        return { available: false, rows: [] };
      }
      throw err;
    }
  },

  async createAppeal({ entry_id = null, ind = null, category = 'evaluation_review', subject, message, attachment_name = null, attachment_url = null }) {
    const token = getSessionToken();
    if (!token) throw new Error('Murojaat yuborish uchun server sessiyasi talab qilinadi.');
    return req('rpc/create_appeal', {
      method: 'POST',
      body: JSON.stringify({
        p_token: token,
        p_entry_id: entry_id,
        p_ind: ind,
        p_category: category,
        p_subject: subject,
        p_message: message,
        p_att_name: attachment_name,
        p_att_url: attachment_url
      })
    });
  },

  async addAppealMessage(appealId, body, attachmentName = null, attachmentUrl = null) {
    const token = getSessionToken();
    if (!token) throw new Error('Sessiya yaroqsiz.');
    return req('rpc/add_appeal_message', {
      method: 'POST',
      body: JSON.stringify({
        p_token: token,
        p_appeal_id: appealId,
        p_body: body,
        p_att_name: attachmentName,
        p_att_url: attachmentUrl
      })
    });
  },

  async updateAppealStatus(appealId, status, note = '', escalate = false) {
    const token = getSessionToken();
    if (!token) throw new Error('Sessiya yaroqsiz.');
    return req('rpc/update_appeal_status', {
      method: 'POST',
      body: JSON.stringify({
        p_token: token,
        p_appeal_id: appealId,
        p_status: status,
        p_note: note,
        p_escalate: Boolean(escalate)
      })
    });
  },

  async fetchDevGoals() {
    const token = getSessionToken();
    if (!token) return { available: false, rows: [] };
    try {
      const rows = await req('rpc/get_dev_goals', {
        method: 'POST',
        body: JSON.stringify({ p_token: token })
      });
      v6MigrationAvailable = true;
      return { available: true, rows: Array.isArray(rows) ? rows : [] };
    } catch (err) {
      if (isRpcMissing(err)) {
        v6MigrationAvailable = false;
        return { available: false, rows: [] };
      }
      throw err;
    }
  },

  async upsertDevGoal(goal) {
    const token = getSessionToken();
    if (!token) throw new Error('Sessiya yaroqsiz.');
    return req('rpc/upsert_dev_goal', {
      method: 'POST',
      body: JSON.stringify({ p_token: token, p_goal: goal })
    });
  },

  async deleteDevGoal(goalId) {
    const token = getSessionToken();
    if (!token) throw new Error('Sessiya yaroqsiz.');
    return req('rpc/delete_dev_goal', {
      method: 'POST',
      body: JSON.stringify({ p_token: token, p_goal_id: goalId })
    });
  },

  async upsertDevTask(task) {
    const token = getSessionToken();
    if (!token) throw new Error('Sessiya yaroqsiz.');
    return req('rpc/upsert_dev_task', {
      method: 'POST',
      body: JSON.stringify({ p_token: token, p_task: task })
    });
  },

  async deleteDevTask(taskId) {
    const token = getSessionToken();
    if (!token) throw new Error('Sessiya yaroqsiz.');
    return req('rpc/delete_dev_task', {
      method: 'POST',
      body: JSON.stringify({ p_token: token, p_task_id: taskId })
    });
  },

  /* ========================================================================
     STORAGE HELPERS (PROOFS, AVATARS, COVERS)
     ======================================================================== */
  async uploadProofFile(file) {
    await validateProofFile(file);
    return this._uploadToStorage(file, '');
  },

  async uploadProfileMedia(blobOrFile, folder = 'avatars') {
    if (blobOrFile instanceof File) {
      await validateImageFile(blobOrFile);
    }
    return this._uploadToStorage(blobOrFile, `${folder}/`);
  },

  async _uploadToStorage(fileOrBlob, prefix = '') {
    const origName = fileOrBlob.name || 'image.png';
    const ext = (origName.split('.').pop() || 'png').toLowerCase();
    const rand = new Uint8Array(6);
    globalThis.crypto.getRandomValues(rand);
    const hex = Array.from(rand, b => b.toString(16).padStart(2, '0')).join('');
    const cleanName = `${prefix}${Date.now()}_${hex}.${ext}`;
    const uploadUrl = `${CFG.SUPABASE_URL}/storage/v1/object/${CFG.STORAGE_BUCKET}/${cleanName}`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: CFG.SUPABASE_KEY,
        Authorization: `Bearer ${CFG.SUPABASE_KEY}`,
        'Content-Type': fileOrBlob.type || 'application/octet-stream'
      },
      body: fileOrBlob
    });
    if (!res.ok) {
      throw new Error('Faylni bulutli saqlashga yuklashda xatolik yuz berdi.');
    }
    const publicUrl = `${CFG.SUPABASE_URL}/storage/v1/object/public/${CFG.STORAGE_BUCKET}/${cleanName}`;
    return { fname: origName, fpath: publicUrl, objectName: cleanName };
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
