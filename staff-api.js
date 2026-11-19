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

      // ---------- заказы (видят официант и владелец — проверяет база) ----------
      // без toIso: все незакрытые + всё созданное с fromIso; с toIso: история за период
      async orders(fromIso, toIso) {
        let q = sb.from('orders').select('*');
        q = toIso
          ? q.gte('created_at', fromIso).lt('created_at', toIso)
          : q.or(`created_at.gte.${fromIso},status.in.(new,accepted,cooking)`);
        const { data, error } = await q.order('created_at', { ascending: true }).limit(2000);
        fail(error); return data || [];
      },
      // официант или владелец принимает новый заказ; changed=false — его уже принял кто-то другой (или отменили)
      async acceptOrder(id) {
        const { data, error } = await sb.rpc('accept_order', { p_id: id });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      async setOrderStatus(id, status) {
        const { data, error } = await sb.from('orders').update({ status }).eq('id', id).select().single();
        fail(error); return data;
      },

      // ---------- зал: столы без кодов, вызовы, счета ----------
      async floorTables() {
        const { data, error } = await sb.rpc('floor_tables'); fail(error); return data || [];
      },
      // открытые вызовы + закрытые за последние fromIso
      async calls(fromIso) {
        const { data, error } = await sb.from('calls').select('*').or(`done_at.is.null,created_at.gte.${fromIso}`)
          .order('created_at', { ascending: true }).limit(500);
        fail(error); return data || [];
      },
      async doneCall(id) { const { error } = await sb.rpc('done_call', { p_id: id }); fail(error); },
      async bills(fromIso, toIso) {
        let q = sb.from('bills').select('*').gte('paid_at', fromIso);
        if (toIso) q = q.lt('paid_at', toIso);
        const { data, error } = await q.order('paid_at', { ascending: false }).limit(5000);
        fail(error); return data || [];
      },
      async closeBill(tableId, method, orderIds, tip = 0, payments = null) {
        const { data, error } = await sb.rpc('close_bill', { p_table: tableId, p_method: method, p_orders: orderIds || null, p_tip: tip || 0, p_payments: payments });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      async claimTable(tableId, on) { const { error } = await sb.rpc('claim_table', { p_table: tableId, p_claim: on }); fail(error); },
      async staffPlaceOrder(tableId, items, note, key) {
        const { data, error } = await sb.rpc('staff_place_order', { p_table: tableId, p_items: items, p_note: note, p_client_key: key });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      async serveOrder(id) {
        const { data, error } = await sb.rpc('serve_order', { p_id: id });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      // ---------- свой Telegram (сотрудник) ----------
      async myTelegram() { const { data, error } = await sb.rpc('my_telegram'); fail(error); return Array.isArray(data) ? data[0] : data; },
      async myTelegramStart() { const { data, error } = await sb.rpc('my_telegram_start'); fail(error); return Array.isArray(data) ? data[0] : data; },
      async myTelegramCheck() { const { data, error } = await sb.rpc('my_telegram_check'); fail(error); return data; },
      async myTelegramOff() { const { error } = await sb.rpc('my_telegram_off'); fail(error); },
      // ---------- владелец: изменить состав заказа; кухня ----------
      async editOrder(id, items) {
        const { data, error } = await sb.rpc('edit_order', { p_id: id, p_items: items });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      async kitchenSet(id, status) {
        const { data, error } = await sb.rpc('kitchen_set', { p_id: id, p_status: status });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      // ---------- журнал изменений (только владелец) ----------
      async audit(fromIso, toIso) {
        const { data, error } = await sb.from('audit_log').select('*').gte('at', fromIso).lt('at', toIso)
          .order('at', { ascending: false }).limit(1000);
        fail(error); return data || [];
      },
      // ---------- отзывы гостей (только владелец) ----------
      async reviews(fromIso, toIso) {
        const { data, error } = await sb.from('reviews').select('*').gte('created_at', fromIso).lt('created_at', toIso)
          .order('created_at', { ascending: false }).limit(1000);
        fail(error); return data || [];
      },
      async setTelegramReviews(on) { const { error } = await sb.rpc('set_telegram_reviews', { p_on: on }); fail(error); },
      // ---------- Telegram (только владелец; токен наружу не отдаётся) ----------
      async telegramStatus() {
        const { data, error } = await sb.rpc('telegram_status'); fail(error); return Array.isArray(data) ? data[0] : data;
      },
      async setTelegram(token, chats, orders, calls, bills) {
        const { error } = await sb.rpc('set_telegram', { p_token: token, p_chats: chats, p_orders: orders, p_calls: calls, p_bills: bills }); fail(error);
      },
      async clearTelegram() { const { error } = await sb.rpc('clear_telegram'); fail(error); },
      async telegramTest() { const { data, error } = await sb.rpc('telegram_test'); fail(error); return data; },

      // ---------- столы и QR ----------
      async tables() {
        const { data, error } = await sb.from('tables').select('*').order('sort').order('label');
        fail(error); return data || [];
      },
      async saveTable(row) {
        const { data, error } = await sb.from('tables').upsert(row).select().single();
        fail(error); return data;
      },
      async deleteTable(id) { const { error } = await sb.from('tables').delete().eq('id', id); fail(error); },
      async createTables(from, to) {
        const { data, error } = await sb.rpc('create_tables', { p_from: from, p_to: to }); fail(error); return data;
      },
      async resetTableToken(id) {
        const { data, error } = await sb.rpc('reset_table_token', { p_id: id }); fail(error); return data;
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
