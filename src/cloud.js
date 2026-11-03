// ---------- облако: аккаунты, сохранение, рекорды (Supabase, чистый fetch) ----------
// anon-ключ публичный по замыслу Supabase; доступ к данным закрыт политиками RLS (supabase/schema.sql).
const Cloud = (() => {
  const URL_ = "https://jctckwqczujjrknrwdyb.supabase.co";
  const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjdGNrd3FjenVqanJrbnJ3ZHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2ODU5MTIsImV4cCI6MjEwOTI2MTkxMn0.WRvbBftA4ZebC3Wb5MIM665I_E0YMn8pK3SX6Mgmv-c";
  const AUTH = "pristav-auth", DOMAIN = "@pristav.game";
  let auth = null, pushTimer = 0;
  try { auth = JSON.parse(localStorage.getItem(AUTH)); } catch (e) {}
  const hasNet = () => typeof fetch === "function";
  const saveAuth = () => { try { if (auth) localStorage.setItem(AUTH, JSON.stringify(auth)); else localStorage.removeItem(AUTH); } catch (e) {} };
  const nameOk = (u) => /^[a-z0-9_]{3,16}$/.test(u);
  const mailOk = (m) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m);

  async function raw(path, opts = {}, token) {
    if (!hasNet()) throw new Error("Нет соединения");
    const headers = Object.assign({ apikey: KEY, "Content-Type": "application/json", Authorization: "Bearer " + (token || KEY) }, opts.headers || {});
    let r;
    try { r = await fetch(URL_ + path, Object.assign({}, opts, { headers })); } catch (e) { throw new Error("Нет соединения"); }
    let body = null; const txt = await r.text(); try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = txt; }
    if (!r.ok) { const err = new Error((body && (body.msg || body.message || body.error_description || body.error)) || "Ошибка " + r.status); err.status = r.status; err.code = body && (body.error_code || body.code); throw err; }
    return body;
  }
  function setSession(b, username) {
    auth = { access: b.access_token, refresh: b.refresh_token, exp: Math.floor(Date.now() / 1000) + (b.expires_in || 3600), id: b.user.id, username: username || (b.user.user_metadata && b.user.user_metadata.username) || (auth && auth.username) || "" };
    saveAuth();
  }
  async function token() {
    if (!auth) return null;
    if (auth.exp - 60 < Date.now() / 1000) {
      try { const b = await raw("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: auth.refresh }) }); setSession(b, auth.username); }
      catch (e) { if (e.status === 400 || e.status === 401) { auth = null; saveAuth(); } throw e; }
    }
    return auth.access;
  }
  const authed = async (path, opts) => raw(path, opts, await token());

  function human(e) {
    const m = String(e.message || ""), c = e.code || "";
    if (/invalid login|invalid_credentials/i.test(m + c)) return "Неверный логин или пароль.";
    if (/already|exists|duplicate|username_format|profiles_username/i.test(m + c) || e.status === 422 && !/password|weak/i.test(m)) return "Такой логин уже занят.";
    if (/password/i.test(m)) return "Пароль слишком простой: нужно минимум 6 символов.";
    if (e.status === 429 || /rate/i.test(m)) return "Слишком много попыток, подождите минуту.";
    if (/соединени/i.test(m)) return "Нет соединения. Можно играть гостем.";
    return "Не вышло: " + m;
  }

  return {
    human,
    get user() { return auth ? auth.username : null; },
    get online() { return !!auth; },
    async signUp(username, email, password) {
      username = String(username || "").trim().toLowerCase(); email = String(email || "").trim();
      if (!nameOk(username)) throw new Error("Логин: 3–16 символов, латиница, цифры и _.");
      if (!mailOk(email)) throw new Error("Введите настоящую почту.");
      if (String(password || "").length < 6) throw new Error("Пароль: минимум 6 символов.");
      const free = await raw("/rest/v1/rpc/username_free", { method: "POST", body: JSON.stringify({ name: username }) });
      if (free === false) throw new Error("Такой логин уже занят.");
      const b = await raw("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email: username + DOMAIN, password, data: { username, real_email: email } }) });
      if (!b || !b.access_token) throw new Error("Регистрация не завершилась, попробуйте войти.");
      setSession(b, username);
    },
    async signIn(username, password) {
      username = String(username || "").trim().toLowerCase();
      if (!nameOk(username) || !password) throw new Error("Неверный логин или пароль.");
      const b = await raw("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: username + DOMAIN, password }) });
      setSession(b, username);
    },
    signOut() { auth = null; saveAuth(); clearTimeout(pushTimer); },
    // облако -> устройство; если облако пусто, на устройстве остаётся то, что есть (перенос в первый профиль)
    async pull() {
      const rows = await authed("/rest/v1/saves?select=data,settings&limit=1");
      return rows && rows[0] ? rows[0] : null;
    },
    async push() {
      if (!auth) return;
      let data = {}; try { data = JSON.parse(localStorage.getItem(SAVE)) || {}; } catch (e) {}
      await authed("/rest/v1/saves?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: auth.id, data, settings: settings, updated_at: new Date().toISOString() }) });
    },
    schedulePush() { if (!auth || !hasNet()) return; clearTimeout(pushTimer); pushTimer = setTimeout(() => { Cloud.push().catch(() => {}); }, 1500); },
    async submitScore(score, day, ending) { if (!auth) return; await authed("/rest/v1/rpc/submit_score", { method: "POST", body: JSON.stringify({ p_score: score, p_day: day, p_ending: ending }) }); },
    async leaderboard() { return raw("/rest/v1/scores?select=username,score,day,ending&order=score.desc,updated_at.asc&limit=10"); }
  };
})();
