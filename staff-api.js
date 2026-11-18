// =====================================================================
//  Связь панелей сотрудников с базой (Supabase).
//  Все запросы — здесь; страницы зовут понятные функции.
//  Права проверяет сама база (supabase/schema.sql): даже если кто-то
//  вызовет эти функции вручную, официант ничего не сможет изменить.
// =====================================================================
(() => {
  'use strict';

  const BUCKET = 'menu-photos';
  const fail = (error) => { if (error) throw new Error(error.message || String(error)); };

  function makeSupabaseApi(B) {
    if (!B?.url || !B?.key || !window.supabase?.createClient) return null;
    const sb = window.supabase.createClient(B.url, B.key, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'menu-staff-auth' },
    });
    const pathOf = (url) => {
      const m = String(url || '').match(new RegExp(`/object/public/${BUCKET}/(.+)$`));
      return m ? decodeURIComponent(m[1]) : null;
    };

    return {
      // ---------- вход ----------
      async session() { const { data } = await sb.auth.getSession(); return data.session; },
      async signIn(email, password) { const { error } = await sb.auth.signInWithPassword({ email, password }); fail(error); },
      async signUp(email, password, name) {
        const redirect = new URL('admin.html', location.href).href;
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: redirect } });
        fail(error);
        return { needsEmailConfirm: !data.session };
      },
      async resetPassword(email) {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: new URL('admin.html', location.href).href });
        fail(error);
      },
      async signOut() { await sb.auth.signOut(); },
      // { user_id, email, name, role, active, email_confirmed } — роль null, если не приглашён
      async whoami() {
        const { data, error } = await sb.rpc('whoami');
        fail(error);
        return Array.isArray(data) ? data[0] || null : data;
      },

      // ---------- ресторан и меню ----------
      async settings() {
        const { data, error } = await sb.from('settings').select('*').eq('id', 1).single();
        fail(error); return data;
      },
      async saveSettings(patch) {
        const { data, error } = await sb.from('settings').update(patch).eq('id', 1).select().single();
        fail(error); return data;
      },
      async categories() {
        const { data, error } = await sb.from('categories').select('*').order('sort').order('id');
        fail(error); return data || [];
      },
      async saveCategory(row) {
        const { data, error } = await sb.from('categories').upsert(row).select().single();
        fail(error); return data;
      },
      async deleteCategory(id) { const { error } = await sb.from('categories').delete().eq('id', id); fail(error); },
      async dishes() {
        const { data, error } = await sb.from('dishes').select('*').order('sort').order('id');
        fail(error); return data || [];
      },
      async saveDish(row) {
        const { data, error } = await sb.from('dishes').upsert(row).select().single();
        fail(error); return data;
      },
      async patchDish(id, patch) {
        const { data, error } = await sb.from('dishes').update(patch).eq('id', id).select().single();
        fail(error); return data;
      },
      async deleteDish(id) { const { error } = await sb.from('dishes').delete().eq('id', id); fail(error); },

      // ---------- фото ----------
      async uploadImage(blob, folder) {
        const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
        fail(error);
        return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      },
      async deleteImage(url) {
        const path = pathOf(url);
        if (!path) return;
        await sb.storage.from(BUCKET).remove([path]); // ошибку не показываем: старый файл просто останется
      },

      // ---------- сотрудники ----------
      async staff() {
        const { data, error } = await sb.from('staff').select('*').order('created_at');
        fail(error); return data || [];
      },
      async invites() {
        const { data, error } = await sb.from('staff_invites').select('*').order('created_at');
        fail(error); return data || [];
      },
      async invite(email, role, name) {
        const { data, error } = await sb.rpc('invite_staff', { p_email: email, p_role: role, p_name: name });
        fail(error); return data;
      },
      async revokeInvite(email) { const { error } = await sb.rpc('revoke_invite', { p_email: email }); fail(error); },
      async setStaff(userId, role, name, active) {
        const { error } = await sb.rpc('set_staff', { p_user: userId, p_role: role, p_name: name, p_active: active }); fail(error);
      },
      async removeStaff(userId) { const { error } = await sb.rpc('remove_staff', { p_user: userId }); fail(error); },

      // ---------- живые обновления ----------
      subscribe(tables, onChange, onState) {
        let ch = sb.channel(`live-${Math.random().toString(36).slice(2, 8)}`);
        tables.forEach((table) => { ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange(table)); });
        ch.subscribe((st) => onState?.(st === 'SUBSCRIBED'));
        return () => sb.removeChannel(ch);
      },
    };
  }

  window.makeStaffApi = () => window.STAFF_TEST_API || makeSupabaseApi(window.MENU_BACKEND);
})();
