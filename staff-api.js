// =====================================================================
//  Связь панелей сотрудников с базой (Supabase).
//  Все запросы — здесь; страницы зовут понятные функции.
//  Права проверяет сама база (supabase/schema.sql): даже если кто-то
//  вызовет эти функции вручную, официант ничего не сможет изменить.
// =====================================================================
(() => {
  'use strict';

  const BUCKET = 'menu-photos';
  const PROMO_BUCKET = 'promo-videos';
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));
  // расширение файла ролика: из имени, иначе по типу
  const videoExt = (file) => {
    const m = String(file?.name || '').toLowerCase().match(/\.(mp4|mov|webm|m4v)$/);
    if (m) return m[1] === 'm4v' ? 'mp4' : m[1];
    return ({ 'video/quicktime': 'mov', 'video/webm': 'webm' })[file?.type] || 'mp4';
  };
  const fail = (error) => { if (error) throw new Error(error.message || String(error)); };
  // Supabase отдаёт не больше 1000 строк за запрос — забираем по страницам, чтобы отчёты за месяц не теряли заказы
  async function pages(make, max = 20000) {
    const out = [];
    for (let from = 0; from < max; from += 1000) {
      const { data, error } = await make(from, from + 999);
      fail(error);
      out.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    return out;
  }

  function makeSupabaseApi(B) {
    if (!B?.url || !B?.key || !window.supabase?.createClient) return null;
    const sb = window.supabase.createClient(B.url, B.key, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'menu-staff-auth' },
    });
    const pathOf = (url, bucket = BUCKET) => {
      const m = String(url || '').match(new RegExp(`/object/public/${bucket}/(.+)$`));
      return m ? decodeURIComponent(m[1]) : null;
    };
    const promoUpload = async (path, body, contentType) => {
      const { error } = await sb.storage.from(PROMO_BUCKET).upload(path, body, { contentType, cacheControl: '31536000', upsert: false });
      fail(error);
      return sb.storage.from(PROMO_BUCKET).getPublicUrl(path).data.publicUrl;
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

      // ---------- рекламные ролики на главной (меняет только владелец; гость видит включённые) ----------
      async promos() {
        const { data, error } = await sb.from('promos').select('*').order('sort').order('created_at', { ascending: false });
        fail(error); return data || [];
      },
      // без id — новый ролик; с id — правка (подпись, показ, порядок)
      async savePromo(row) {
        const q = row.id ? sb.from('promos').update(row).eq('id', row.id) : sb.from('promos').insert(row);
        const { data, error } = await q.select().single();
        fail(error); return data;
      },
      // удаляет строку, потом файлы ролика и обложки, если они лежат в нашем хранилище
      async deletePromo(id) {
        const { data: row } = await sb.from('promos').select('video_url, poster_url').eq('id', id).maybeSingle();
        const { error } = await sb.from('promos').delete().eq('id', id);
        fail(error);
        const paths = [row?.video_url, row?.poster_url].map((u) => pathOf(u, PROMO_BUCKET)).filter(Boolean);
        if (paths.length) await sb.storage.from(PROMO_BUCKET).remove(paths); // ошибку не показываем: файл просто останется
      },
      async uploadPromoVideo(file) {
        return promoUpload(`promos/${uuid()}.${videoExt(file)}`, file, file.type || 'video/mp4');
      },
      // обложка (кадр ролика), jpeg
      async uploadPromoPoster(blob) {
        return promoUpload(`promos/${uuid()}.jpg`, blob, 'image/jpeg');
      },

      // ---------- заказы (видят официант и владелец — проверяет база) ----------
      // без toIso: все незакрытые (и доставки в пути) + всё созданное с fromIso; с toIso: история за период.
      // Курьер получает только доставку — это решает база (orders_staff_read).
      async orders(fromIso, toIso) {
        // доставки, которые ждут звонка дольше 30 минут, база отменяет как «не дозвонились» (без cron — при обновлении списка)
        if (!toIso) { try { await sb.rpc('dv_expire'); } catch { /* не страшно: отменится при следующем обновлении */ } }
        return pages((from, to) => {
          let q = sb.from('orders').select('*');
          q = toIso
            ? q.gte('created_at', fromIso).lt('created_at', toIso)
            : q.or(`created_at.gte.${fromIso},status.in.(confirm,new,accepted,cooking,ready,on_the_way)`);
          return q.order('created_at', { ascending: true }).order('id', { ascending: true }).range(from, to);
        });
      },
      // официант или владелец принимает новый заказ; changed=false — его уже принял кто-то другой (или отменили)
      async acceptOrder(id) {
        const { data, error } = await sb.rpc('accept_order', { p_id: id });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      // ---------- доставка: курьер забрал → «В пути»; доставил → оплачено, счёт создан ----------
      async courierTake(id) {
        const { data, error } = await sb.rpc('courier_take', { p_id: id });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      async courierDone(id, method) {
        const { data, error } = await sb.rpc('courier_done', { p_id: id, p_method: method });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      // ---------- доставка ждёт звонка: «Принять заказ» → на кухню; «Не дозвонились» → отмена ----------
      async confirmDelivery(id) {
        const { data, error } = await sb.rpc('confirm_delivery', { p_order: id });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      // reason: no_answer | refused | other
      async rejectDelivery(id, reason) {
        const { data, error } = await sb.rpc('reject_delivery', { p_order: id, p_reason: reason });
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
        return pages((from, to) => {
          let q = sb.from('bills').select('*').gte('paid_at', fromIso);
          if (toIso) q = q.lt('paid_at', toIso);
          return q.order('paid_at', { ascending: false }).order('id', { ascending: true }).range(from, to);
        });
      },
      async closeBill(tableId, method, orderIds, tip = 0, payments = null, discount = null) {
        const { data, error } = await sb.rpc('close_bill', { p_table: tableId, p_method: method, p_orders: orderIds || null, p_tip: tip || 0, p_payments: payments, p_discount: discount });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      // резервная копия: вся таблица целиком, по 1000 строк
      async dump(table, order, key = 'id') {
        return pages((from, to) => sb.from(table).select('*').order(order, { ascending: true }).order(key, { ascending: true }).range(from, to), 500000);
      },
      async markBackup() { const { data, error } = await sb.rpc('mark_backup'); fail(error); return data; },
      // Wi‑Fi ресторана (читает и меняет только владелец; гость видит через table_info)
      async wifi() {
        const { data, error } = await sb.from('wifi').select('name, pass').eq('id', 1).maybeSingle();
        fail(error); return data || { name: '', pass: '' };
      },
      async saveWifi(name, pass) {
        const { error } = await sb.from('wifi').update({ name: name || '', pass: pass || '' }).eq('id', 1); fail(error);
      },
      // владелец: отменить оплату (заказы снова ждут оплаты)
      async voidBill(id, reason) {
        const { data, error } = await sb.rpc('void_bill', { p_bill: id, p_reason: reason });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      // пересадить гостей: заказы (все или выбранные) на другой стол
      async moveOrders(fromTable, toTable, orderIds) {
        const { data, error } = await sb.rpc('move_orders', { p_from: fromTable, p_to: toTable, p_orders: orderIds || null });
        fail(error); return data;
      },
      // закрытие дня (Z-отчёт)
      async zPreview() { const { data, error } = await sb.rpc('z_preview'); fail(error); return data; },
      async closeDay(counted, note) {
        const { data, error } = await sb.rpc('close_day', { p_counted: counted ?? null, p_note: note || null });
        fail(error); return Array.isArray(data) ? data[0] : data;
      },
      async zReports() {
        const { data, error } = await sb.from('z_reports').select('*').order('closed_at', { ascending: false }).limit(60);
        fail(error); return data || [];
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
        return pages((from, to) => sb.from('audit_log').select('*').gte('at', fromIso).lt('at', toIso)
          .order('at', { ascending: false }).order('id', { ascending: true }).range(from, to), 5000);
      },
      // ---------- отзывы гостей (только владелец) ----------
      async reviews(fromIso, toIso) {
        const { data, error } = await sb.from('reviews').select('*').gte('created_at', fromIso).lt('created_at', toIso)
          .order('created_at', { ascending: false }).limit(1000);
        fail(error); return data || [];
      },
      // ---------- стоп-лист и остатки (владелец, менеджер, повар) ----------
      async setDishAvailable(id, on) { const { data, error } = await sb.rpc('set_dish_available', { p_dish: id, p_on: on }); fail(error); return data?.[0]; },
      async setDishStock(id, stock) { const { data, error } = await sb.rpc('set_dish_stock', { p_dish: id, p_stock: stock }); fail(error); return data?.[0]; },
      // ---------- себестоимость (только владелец) ----------
      async dishCosts() { const { data, error } = await sb.from('dish_costs').select('dish_id,cost'); fail(error); return data || []; },
      async saveDishCost(id, cost) {
        if (cost == null) { const { error } = await sb.from('dish_costs').delete().eq('dish_id', id); fail(error); return; }
        const { error } = await sb.from('dish_costs').upsert({ dish_id: id, cost, updated_at: new Date().toISOString() }); fail(error);
      },
      // ---------- оценки блюд гостями (владелец, менеджер) ----------
      async dishVotes(fromIso, toIso) {
        return pages((from, to) => sb.from('dish_votes').select('*').gte('created_at', fromIso).lt('created_at', toIso).order('created_at').range(from, to));
      },
      // ---------- брони (зал) ----------
      async bookings(fromIso, toIso) {
        const { data, error } = await sb.from('reservations').select('*').gte('at', fromIso).lt('at', toIso).order('at').limit(1000);
        fail(error); return data || [];
      },
      async setBooking(id, status, tableId = null) {
        const { data, error } = await sb.rpc('set_booking', { p_id: id, p_status: status, p_table: tableId }); fail(error); return data?.[0];
      },
      // ---------- смены ----------
      async shiftStart() { const { data, error } = await sb.rpc('shift_start'); fail(error); return data?.[0] || null; },
      async shiftEnd() { const { data, error } = await sb.rpc('shift_end'); fail(error); return data?.[0] || null; },
      async myShift(userId) {
        const { data, error } = await sb.from('shifts').select('*').eq('user_id', userId).is('ended_at', null).limit(1); fail(error); return data?.[0] || null;
      },
      async shifts(fromIso, toIso) {
        return pages((from, to) => sb.from('shifts').select('*').or(`ended_at.is.null,ended_at.gte.${fromIso}`).lt('started_at', toIso).order('started_at').range(from, to));
      },
      async setTelegramReviews(on) { const { error } = await sb.rpc('set_telegram_reviews', { p_on: on }); fail(error); },
      // ---------- Telegram (только владелец; токен наружу не отдаётся) ----------
      async telegramStatus() {
        const { data, error } = await sb.rpc('telegram_status'); fail(error); return Array.isArray(data) ? data[0] : data;
      },
      async setTelegram(token, chats, orders, calls, bills) {
        const { error } = await sb.rpc('set_telegram', { p_token: token, p_chats: chats, p_orders: orders, p_calls: calls, p_bills: bills }); fail(error);
      },
      // ---------- SMS (Twilio; только владелец). Токен только записывается: наружу { configured, from, sid_tail } ----------
      async smsStatus() { const { data, error } = await sb.rpc('sms_status'); fail(error); return data; },
      async setSms(sid, token, from) {
        const { data, error } = await sb.rpc('set_sms', { p_sid: sid || '', p_token: token || '', p_from: from || '' }); fail(error); return data;
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
