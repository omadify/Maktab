// Supabase REST, RPC & Storage API Client + Session Persistence
import { CFG } from './config.js';

export const api = {
  async req(endpoint, options = {}) {
    const url = `${CFG.SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
      apikey: CFG.SUPABASE_KEY,
      Authorization: `Bearer ${CFG.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Server xatosi (${res.status}): ${errText || res.statusText}`);
    }
    return res.status !== 204 ? res.json() : null;
  },

  async loginUser(login, pw) {
    const rows = await this.req('rpc/login_user', {
      method: 'POST',
      body: JSON.stringify({ p_login: login, p_pw: pw })
    });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  },

  async changePassword(uid, oldPw, newPw) {
    return this.req('rpc/change_user_password', {
      method: 'POST',
      body: JSON.stringify({ p_uid: uid, p_old_pw: oldPw, p_new_pw: newPw })
    });
  },

  async getUsers() {
    // Password column is never fetched to the browser
    return this.req('users?select=id,login,name,subject,role,ranked,active,must_change,created&order=id.asc');
  },

  async getEntries() {
    return this.req('entries?select=*&order=id.desc');
  },

  async insertEntry(entry) {
    return this.req('entries', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
  },

  async updateEntry(id, updates) {
    return this.req(`entries?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async deleteEntry(id) {
    return this.req(`entries?id=eq.${id}`, {
      method: 'DELETE'
    });
  },

  async insertUsers(users) {
    return this.req('users', {
      method: 'POST',
      body: JSON.stringify(users)
    });
  },

  async updateUser(id, updates) {
    return this.req(`users?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async uploadProofFile(file) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const cleanName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
      throw new Error('Hujjatni bulutli saqlashga yuklashda xatolik yuz berdi');
    }
    const publicUrl = `${CFG.SUPABASE_URL}/storage/v1/object/public/${CFG.STORAGE_BUCKET}/${cleanName}`;
    return { fname: file.name, fpath: publicUrl };
  }
};

export function saveSession(user) {
  if (user) {
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
    sessionStorage.setItem('maktab_user', JSON.stringify(safeUser));
  } else {
    sessionStorage.removeItem('maktab_user');
  }
}

export function loadSession() {
  try {
    const s = sessionStorage.getItem('maktab_user');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
