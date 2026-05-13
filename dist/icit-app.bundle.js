(() => {
  // src/core/constants.js
  var SUPABASE_URL = "https://xvweanlqcbgbiyxqhwux.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2d2VhbmxxY2JnYml5eHFod3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTY0NjcsImV4cCI6MjA5MjYzMjQ2N30.Fs819XQjDXoT8l0qZreFEjeu_Xf2zjzqBG87BjGTQM4";
  var EDGE_FN_BASE = SUPABASE_URL + "/functions/v1";
  var WITHDRAW_ALLOWED = ["draft", "submitted", "in_review", "waitlisted", "accepted"];

  // src/core/supabase.js
  var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  db.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  });

  // src/core/auth.js
  async function getSession() {
    const { data } = await db.auth.getSession();
    return data.session;
  }
  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      window.location.href = "/login";
      return new Promise(() => {
      });
    }
    return session;
  }
  async function requireGuest() {
    const session = await getSession();
    if (session) {
      window.location.href = "/dashboard";
      return new Promise(() => {
      });
    }
  }
  function isLoginAuthReturn() {
    if (window.location.pathname !== "/login") return false;
    const search = new URLSearchParams(window.location.search || "");
    const hash = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
    return search.has("code") || search.has("token_hash") || search.has("type") || hash.has("access_token") || hash.has("refresh_token") || hash.has("type") || hash.has("error");
  }
  async function completeLoginAuthReturn() {
    if (!isLoginAuthReturn()) return false;
    const session = await getSession();
    if (session) await signOut();
    window.history.replaceState({}, "", "/login");
    return true;
  }
  async function signIn(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  }
  async function signUp(email, password, firstName, lastName) {
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/login",
        data: { first_name: firstName, last_name: lastName }
      }
    });
    if (error) throw error;
    return data.session;
  }
  async function signOut() {
    const { error } = await db.auth.signOut();
    if (error) throw error;
  }

  // src/core/ui.js
  function q(selector, root = document) {
    return root.querySelector(selector);
  }
  function show(el) {
    if (!el) return;
    el.style.display = "";
    if (getComputedStyle(el).display === "none") el.style.display = "block";
  }
  function hide(el) {
    if (el) el.style.display = "none";
  }
  function setText(el, text) {
    if (el) el.textContent = text;
  }
  function setHref(el, href) {
    if (el) el.href = href;
  }
  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }
  function formatCurrency(cents) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  }
  function applyDesignSystemClasses() {
    [1, 2, 3, 4, 5].forEach((n) => {
      const sec = q('[wized="form-section-' + n + '"]');
      if (!sec) return;
      sec.classList.add("form-section");
      const header = sec.firstElementChild;
      if (header && header.tagName === "DIV") {
        header.classList.add("section-header-1");
        const spans = Array.from(header.querySelectorAll(":scope > span"));
        if (spans[0]) spans[0].classList.add("section-num");
        if (spans[1]) spans[1].classList.add("section-title");
      }
    });
    document.querySelectorAll(
      '[wized="form-section-2"] .w-input:not([type="file"]),[wized="form-section-4"] .w-input:not([type="file"]),[wized="form-section-2"] select,[wized="form-section-4"] select'
    ).forEach((el) => el.classList.add("form-input-1"));
    document.querySelectorAll(
      '[wized="form-section-2"] label,[wized="form-section-4"] label'
    ).forEach((el) => {
      if (!el.classList.contains("form-label")) el.classList.add("form-label");
    });
    const btnMap = {
      "change-course-btn": "btn-ghost-1",
      "next-section-1-btn": "btn-primary-1-2",
      "back-section-2-btn": "btn-ghost-1",
      "next-section-2-btn": "btn-primary-1-2",
      "back-section-3-btn": "btn-ghost-1",
      "next-section-3-btn": "btn-primary-1-2",
      "back-section-4-btn": "btn-ghost-1",
      "next-section-4-btn": "btn-primary-1-2",
      "back-section-5-btn": "btn-ghost-1",
      "submit-application-btn": "btn-submit"
    };
    Object.keys(btnMap).forEach((wid) => {
      const el = q('[wized="' + wid + '"]');
      if (el) el.classList.add(btnMap[wid]);
    });
    const zone = q('[wized="cv-upload-zone"]');
    if (zone) {
      zone.classList.add("upload-zone");
      const children = Array.from(zone.children);
      if (children[0]) children[0].classList.add("upload-icon");
      if (children[1]) children[1].classList.add("upload-label");
      if (children[2]) children[2].classList.add("upload-hint");
    }
    const uploadSuccess = q('[wized="cv-upload-success"]');
    if (uploadSuccess) uploadSuccess.classList.add("upload-success");
    const progressWrap = q('[wized="cv-upload-progress"]');
    if (progressWrap) {
      progressWrap.classList.add("upload-progress-wrap");
      const bar = progressWrap.querySelector("div");
      if (bar) {
        bar.classList.add("upload-progress-bar");
        const fill = bar.querySelector('[wized="cv-upload-progress-fill"]');
        if (fill) fill.classList.add("upload-progress-fill");
      }
      const pct = progressWrap.querySelector('[wized="cv-upload-pct"]');
      if (pct) pct.classList.add("upload-progress-pct");
    }
    const removeBtn = q('[wized="cv-remove-btn"]');
    if (removeBtn) removeBtn.classList.add("btn-danger-1");
  }
  function setCvProgress(percent) {
    var _a;
    const value = String(percent) + "%";
    setText(q('[wized="cv-upload-pct"]'), value);
    (_a = q('[wized="cv-upload-progress-fill"]')) == null ? void 0 : _a.style.setProperty("width", value, "important");
  }
  function revealPage() {
    const w = document.getElementById("icit-page-wrapper");
    if (w) w.style.visibility = "visible";
  }
  function pageRoot() {
    return document.getElementById("icit-page-wrapper") || document.body;
  }
  function showPageError(message) {
    const target = q('[wized="form-error-msg"]') || q('[wized="signin-error-msg"]') || q('[wized="signup-error-msg"]') || q('[wized="enroll-error-msg"]');
    setText(target, message);
    show(target);
  }
  function initPage(name, initFn) {
    Promise.resolve().then(initFn).catch((err) => {
      console.error("ICIT page init failed:", name, err);
      showPageError(err.message || "This page could not finish loading. Please refresh and try again.");
      revealPage();
    });
  }
  function ensureFallback(id, html) {
    if (document.getElementById(id)) return document.getElementById(id);
    const root = pageRoot();
    const el = document.createElement("div");
    el.id = id;
    el.innerHTML = html;
    root.appendChild(el);
    return el;
  }

  // src/pages/login.js
  async function initLogin() {
    const completedAuthReturn = await completeLoginAuthReturn();
    if (!completedAuthReturn) await requireGuest();
    const signinSection = q('[wized="signin-section"]');
    const signupSection = q('[wized="signup-section"]');
    if (!signinSection || !signupSection) {
      console.warn("ICIT login page is missing signin/signup section wized attributes.");
      revealPage();
      return;
    }
    show(signinSection);
    signinSection.classList.remove("auth-form-hidden");
    hide(signupSection);
    signupSection.classList.add("auth-form-hidden");
    hide(q('[wized="signin-error-msg"]'));
    hide(q('[wized="signin-loading"]'));
    hide(q('[wized="signup-error-msg"]'));
    hide(q('[wized="signup-loading"]'));
    if (completedAuthReturn) {
      setText(q('[wized="signin-error-msg"]'), "Email confirmed. Please sign in.");
      show(q('[wized="signin-error-msg"]'));
    }
    revealPage();
    const gotoSignup = q('[wized="goto-signup"]');
    if (gotoSignup) gotoSignup.addEventListener("click", (e) => {
      e.preventDefault();
      hide(signinSection);
      signinSection.classList.add("auth-form-hidden");
      show(signupSection);
      signupSection.classList.remove("auth-form-hidden");
    });
    const gotoSignin = q('[wized="goto-signin"]');
    if (gotoSignin) gotoSignin.addEventListener("click", (e) => {
      e.preventDefault();
      hide(signupSection);
      signupSection.classList.add("auth-form-hidden");
      show(signinSection);
      signinSection.classList.remove("auth-form-hidden");
    });
    const signinSubmitEl = q('[wized="signin-submit"]');
    if (signinSubmitEl) signinSubmitEl.addEventListener("click", async (e) => {
      e.preventDefault();
      hide(q('[wized="signin-error-msg"]'));
      show(q('[wized="signin-loading"]'));
      try {
        await signIn(
          q('[wized="signin-email"]').value.trim(),
          q('[wized="signin-password"]').value
        );
        window.location.href = "/dashboard";
      } catch (err) {
        hide(q('[wized="signin-loading"]'));
        setText(q('[wized="signin-error-msg"]'), err.message || "Invalid email or password.");
        show(q('[wized="signin-error-msg"]'));
      }
    });
    const signupSubmitEl = q('[wized="signup-submit"]');
    if (signupSubmitEl) signupSubmitEl.addEventListener("click", async (e) => {
      e.preventDefault();
      hide(q('[wized="signup-error-msg"]'));
      const password = q('[wized="signup-password"]').value;
      const confirmEl = q('[wized="signup-confirm-password"]');
      if (confirmEl && confirmEl.value !== password) {
        setText(q('[wized="signup-error-msg"]'), "Passwords do not match. Please try again.");
        show(q('[wized="signup-error-msg"]'));
        return;
      }
      show(q('[wized="signup-loading"]'));
      try {
        const session = await signUp(
          q('[wized="signup-email"]').value.trim(),
          password,
          q('[wized="signup-first-name"]').value.trim(),
          q('[wized="signup-last-name"]').value.trim()
        );
        if (session) {
          window.location.href = "/dashboard";
        } else {
          hide(q('[wized="signup-loading"]'));
          setText(q('[wized="signup-error-msg"]'), "Account created! Check your email to confirm your account, then sign in.");
          show(q('[wized="signup-error-msg"]'));
        }
      } catch (err) {
        hide(q('[wized="signup-loading"]'));
        setText(q('[wized="signup-error-msg"]'), err.message || "Sign up failed. Please try again.");
        show(q('[wized="signup-error-msg"]'));
      }
    });
  }

  // src/pages/dashboard.js
  var STATUS_MESSAGES = {
    draft: { msg: "Complete and submit your application.", href: "/apply" },
    submitted: { msg: "Your application is under review.", href: "/application-status" },
    in_review: { msg: "Your application is being reviewed by admissions.", href: "/application-status" },
    accepted: { msg: "Congratulations! Please confirm your enrollment.", href: "/enrollment-confirmation" },
    waitlisted: { msg: "You're on the waitlist. We'll notify you of any change.", href: "/application-status" },
    rejected: { msg: "We appreciate your interest in ICIT.", href: "/application-status" },
    enrolled: { msg: "Welcome to ICIT! Check your email for platform access.", href: "/application-status" },
    withdrawn: { msg: "Your application has been withdrawn.", href: "/application-status" }
  };
  async function loadApplications(session) {
    const { data, error } = await db.from("applications").select(`
      id, program_id, status, submitted_at, updated_at,
      cv_url, admin_notes, notes_response, locked_fields, program_answers,
      programs ( id, name, price_cents, program_questions )
    `).eq("applicant_id", session.user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return data != null ? data : [];
  }
  async function loadNotifications(session) {
    const { data, error } = await db.from("notifications").select("id, message, read, created_at").eq("applicant_id", session.user.id).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }
  async function markNotificationsRead(session) {
    const { error } = await db.from("notifications").update({ read: true }).eq("applicant_id", session.user.id).eq("read", false);
    if (error) throw error;
  }
  async function withdrawApplication(session, applicationId, currentStatus) {
    if (!WITHDRAW_ALLOWED.includes(currentStatus)) {
      throw new Error("Cannot withdraw from status: " + currentStatus);
    }
    const { error: upErr } = await db.from("applications").update({ status: "withdrawn" }).eq("id", applicationId).eq("applicant_id", session.user.id);
    if (upErr) throw upErr;
    const { error: evErr } = await db.from("application_events").insert({ application_id: applicationId, event_type: "withdrawn" });
    if (evErr) throw evErr;
  }
  async function loadPrograms() {
    const { data, error } = await db.from("programs").select("id, name, price_cents").in("status", ["active", "upcoming"]).order("name");
    if (error) throw error;
    return data != null ? data : [];
  }
  function getCourseColor(name) {
    const n = (name || "").toLowerCase();
    if (n.includes("international") && n.includes("surgeon")) return "#d9883d";
    if (n.includes("surgeon")) return "#c5543b";
    if (n.includes("international")) return "#5d8591";
    if (n.includes("foundational")) return "#3d7a7a";
    if (n.includes("efficiency") || n.includes("team")) return "#5d6b9e";
    return "#5b6b82";
  }
  function cloneRow(template) {
    const clone = template.cloneNode(true);
    clone.style.display = "";
    [...clone.classList].filter((c) => c.endsWith("-tpl")).forEach((c) => clone.classList.remove(c));
    return clone;
  }
  function renderEnrolledList(enrolled) {
    const listEl = q('[wized="enrolled-list"]');
    const itemTpl = q('[wized="enrolled-item"]');
    if (listEl && itemTpl) {
      listEl.querySelectorAll("[data-icit-clone]").forEach((el) => el.remove());
      hide(itemTpl);
      if (enrolled.length === 0) {
        hide(listEl);
        return;
      }
      show(listEl);
      enrolled.forEach((app) => {
        var _a;
        const row = cloneRow(itemTpl);
        row.dataset.icitClone = "1";
        setText(row.querySelector('[wized="enrolled-program-name"]'), ((_a = app.programs) == null ? void 0 : _a.name) || "");
        setText(row.querySelector('[wized="enrolled-date"]'), app.updated_at ? formatDate(app.updated_at) : "\u2014");
        itemTpl.parentElement.appendChild(row);
      });
      return;
    }
    if (enrolled.length === 0) return;
    const section = ensureFallback("icit-enrolled-courses", `
    <section style="max-width:860px;margin:32px auto;padding:0 24px;font-family:inherit;">
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827;">Enrolled Courses</h2>
      <div id="icit-enrolled-items"></div>
    </section>
  `);
    const items = section.querySelector("#icit-enrolled-items") || section;
    items.innerHTML = enrolled.map((app) => {
      var _a;
      return `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;background:#fff;">
      <div style="font-weight:600;color:#111827;">${escapeHtml(((_a = app.programs) == null ? void 0 : _a.name) || "Unknown Program")}</div>
      <div style="font-size:14px;color:#6b7280;margin-top:4px;">Enrolled ${app.updated_at ? formatDate(app.updated_at) : "\u2014"}</div>
    </div>
  `;
    }).join("");
  }
  async function initDashboard() {
    var _a, _b, _c;
    const session = await requireAuth();
    const [applications, notifications, programs] = await Promise.all([
      loadApplications(session),
      loadNotifications(session).catch((err) => {
        console.warn("ICIT notifications failed to load:", err);
        return [];
      }),
      loadPrograms().catch((err) => {
        console.warn("ICIT programs failed to load:", err);
        return [];
      })
    ]);
    const enrolled = applications.filter((a) => a.status === "enrolled");
    const active = (_a = applications.find((a) => a.status !== "enrolled")) != null ? _a : null;
    hide(q('[wized="dash-loading"]'));
    const meta = session.user.user_metadata || {};
    setText(q('[wized="dash-user-name"]'), ((meta.first_name || "") + " " + (meta.last_name || "")).trim());
    const signoutEl = q('[wized="dash-signout"]');
    if (signoutEl) signoutEl.addEventListener("click", async (e) => {
      e.preventDefault();
      await signOut();
      window.location.href = "/login";
    });
    if (!active) {
      show(q('[wized="dash-no-application"]'));
      hide(q('[wized="dash-application"]'));
      show(q('[wized="start-application-link"]'));
      hide(q('[wized="withdraw-btn"]'));
      if (!q('[wized="dash-no-application"]') && !q('[wized="start-application-link"]')) {
        ensureFallback("icit-dashboard-fallback", `
        <main style="max-width:860px;margin:48px auto;padding:0 24px;font-family:inherit;">
          <h1 style="margin:0 0 12px;color:#111827;">Application Dashboard</h1>
          <p style="margin:0 0 24px;color:#374151;">No application is saved yet.</p>
          <a href="/apply" style="display:inline-block;background:#2563eb;color:white;padding:12px 16px;border-radius:6px;text-decoration:none;">Start application</a>
        </main>
      `);
      }
      revealPage();
      const cardList = q('[wized="course-card-list"]');
      const cardTpl = q('[wized="course-card-item"]');
      if (cardList && cardTpl && programs.length > 0) {
        hide(cardTpl);
        let selectedProgramId = null;
        programs.forEach((prog) => {
          const card = cloneRow(cardTpl);
          card.dataset.icitClone = "1";
          card.style.setProperty("--course-color", getCourseColor(prog.name));
          setText(card.querySelector('[wized="course-card-name"]'), prog.name);
          const descEl = card.querySelector('[wized="course-card-desc"]');
          if (descEl) setText(descEl, "");
          cardList.appendChild(card);
          card.addEventListener("click", () => {
            selectedProgramId = prog.id;
            cardList.querySelectorAll("[data-icit-clone]").forEach((c) => c.classList.remove("selected"));
            card.classList.add("selected");
            hide(q('[wized="course-select-error"]'));
          });
        });
        const startBtn = q('[wized="start-application-btn"]');
        if (startBtn) startBtn.addEventListener("click", (e) => {
          e.preventDefault();
          if (!selectedProgramId) {
            show(q('[wized="course-select-error"]'));
            return;
          }
          const prog = programs.find((p) => p.id === selectedProgramId);
          sessionStorage.setItem("icit-selected-course", JSON.stringify({
            programId: selectedProgramId,
            programName: prog ? prog.name : ""
          }));
          window.location.href = "/apply";
        });
      }
    } else {
      hide(q('[wized="dash-no-application"]'));
      show(q('[wized="dash-application"]'));
      hide(q('[wized="start-application-link"]'));
      const programName = ((_b = active.programs) == null ? void 0 : _b.name) || "Selected program";
      setText(q('[wized="app-program-name"]'), programName);
      const info = STATUS_MESSAGES[active.status] || { msg: "", href: "/application-status" };
      setText(q('[wized="app-next-action-msg"]'), info.msg);
      setHref(q('[wized="app-next-action-link"]'), info.href);
      setText(q('[wized="app-submitted-date"]'), active.submitted_at ? formatDate(active.submitted_at) : "\u2014");
      setText(q('[wized="app-updated-date"]'), active.updated_at ? formatDate(active.updated_at) : "\u2014");
      show(q('[wized="view-status-link"]'));
      if (WITHDRAW_ALLOWED.includes(active.status)) {
        show(q('[wized="withdraw-btn"]'));
        q('[wized="withdraw-btn"]').addEventListener("click", async (e) => {
          e.preventDefault();
          if (!confirm("Withdraw your application? This cannot be undone.")) return;
          try {
            await withdrawApplication(session, active.id, active.status);
            location.reload();
          } catch (err) {
            console.error("Withdraw error:", err);
          }
        });
      } else {
        hide(q('[wized="withdraw-btn"]'));
      }
      if (!q('[wized="dash-application"]') && !q('[wized="app-program-name"]')) {
        ensureFallback("icit-dashboard-fallback", `
        <main style="max-width:860px;margin:48px auto;padding:0 24px;font-family:inherit;">
          <h1 style="margin:0 0 12px;color:#111827;">Application Dashboard</h1>
          <p style="margin:0 0 8px;color:#374151;"><strong>Program:</strong> ${escapeHtml(programName)}</p>
          <p style="margin:0 0 24px;color:#374151;"><strong>Status:</strong> ${escapeHtml(active.status.replace(/_/g, " "))}</p>
          <a href="${escapeHtml(info.href)}" style="display:inline-block;background:#2563eb;color:white;padding:12px 16px;border-radius:6px;text-decoration:none;">Continue</a>
        </main>
      `);
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "success" && active.status === "accepted") {
        const banner = document.createElement("p");
        banner.id = "payment-banner";
        banner.textContent = "Processing your enrollment\u2026";
        document.body.prepend(banner);
        let elapsed = 0;
        const poll = setInterval(async () => {
          elapsed += 3;
          try {
            const fresh = (await loadApplications(session)).find((a) => a.id === active.id);
            if (fresh && fresh.status === "enrolled") {
              clearInterval(poll);
              location.reload();
            } else if (elapsed >= 30) {
              clearInterval(poll);
              history.replaceState({}, "", "/dashboard");
              banner.textContent = "Payment received \u2014 your enrollment typically confirms within a few minutes.";
            }
          } catch (err) {
            clearInterval(poll);
          }
        }, 3e3);
      }
      revealPage();
    }
    renderEnrolledList(enrolled);
    const unread = notifications.filter((n) => !n.read).length;
    setText(q('[wized="notif-unread-count"]'), unread > 0 ? String(unread) : "");
    const drawer = q('[wized="notif-drawer"]');
    const notifTemplate = (_c = q('[wized="notif-item-msg"]')) == null ? void 0 : _c.parentElement;
    const notifBellEl = q('[wized="notif-bell"]');
    if (notifBellEl) notifBellEl.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!drawer) {
        const fallback = ensureFallback("icit-notification-fallback", `
        <aside style="position:fixed;top:72px;right:24px;width:min(360px,calc(100vw - 48px));background:white;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 16px 40px rgba(15,23,42,.18);padding:16px;z-index:9999;">
          <button type="button" data-icit-close style="float:right;border:0;background:transparent;font-size:20px;cursor:pointer;">x</button>
          <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Notifications</h2>
          <div data-icit-notifications></div>
        </aside>
      `);
        const list = fallback.querySelector("[data-icit-notifications]");
        list.innerHTML = notifications.length ? notifications.map((notif) => `<p style="margin:0 0 12px;color:#374151;">${escapeHtml(notif.message)}</p>`).join("") : '<p style="margin:0;color:#6b7280;">No notifications yet.</p>';
        fallback.querySelector("[data-icit-close]").onclick = () => fallback.remove();
      } else {
        show(drawer);
      }
      await markNotificationsRead(session).catch(() => {
      });
      setText(q('[wized="notif-unread-count"]'), "");
      if (!notifTemplate) return;
      notifTemplate.parentElement.querySelectorAll("[data-icit-clone]").forEach((el) => el.remove());
      hide(notifTemplate);
      if (notifications.length === 0) {
        show(q('[wized="notif-empty"]'));
      } else {
        hide(q('[wized="notif-empty"]'));
        notifications.forEach((notif) => {
          const row = cloneRow(notifTemplate);
          row.dataset.icitClone = "1";
          setText(row.querySelector('[wized="notif-item-msg"]'), notif.message);
          setText(row.querySelector('[wized="notif-item-time"]'), formatDate(notif.created_at));
          notifTemplate.parentElement.appendChild(row);
        });
      }
    });
    const notifCloseEl = q('[wized="notif-drawer-close"]');
    if (notifCloseEl) notifCloseEl.addEventListener("click", (e) => {
      e.preventDefault();
      hide(drawer);
    });
  }

  // src/pages/apply.js
  async function loadApplication(session) {
    const { data, error } = await db.from("applications").select(`
      id, program_id, status, submitted_at, updated_at,
      cv_url, locked_fields, program_answers,
      email_consent, phone, address, city, state, zip_code,
      country, credentials, current_role, institution,
      programs ( id, name, price_cents, program_questions )
    `).eq("applicant_id", session.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function loadPrograms2() {
    const { data, error } = await db.from("programs").select("id, name, deadline, price_cents, program_questions").in("status", ["active", "upcoming"]);
    if (error) throw error;
    return data;
  }
  async function saveDraft(session, fields) {
    await db.auth.updateUser({
      data: { first_name: fields.firstName, last_name: fields.lastName }
    });
    const payload = {
      applicant_id: session.user.id,
      program_id: fields.programId,
      status: "draft",
      locked_fields: { program: true, first_name: true, last_name: true },
      email_consent: !!fields.emailConsent,
      phone: fields.phone || null,
      address: fields.address || null,
      city: fields.city || null,
      state: fields.state || null,
      zip_code: fields.zipCode || null,
      country: fields.country || null,
      credentials: fields.credentials || null,
      current_role: fields.currentRole || null,
      institution: fields.institution || null
    };
    if (fields.id) payload.id = fields.id;
    if (fields.programAnswers) payload.program_answers = fields.programAnswers;
    const { data, error } = await db.from("applications").upsert(payload, { onConflict: "id" }).select().single();
    if (error) throw error;
    await db.from("application_events").insert({ application_id: data.id, event_type: "draft_saved" });
    return data;
  }
  async function uploadCV(session, applicationId, file) {
    const ext = file.name.split(".").pop();
    const path2 = session.user.id + "/" + applicationId + "." + ext;
    const { error: upErr } = await db.storage.from("cvs").upload(path2, file, { upsert: true });
    if (upErr) throw upErr;
    const { error: dbErr } = await db.from("applications").update({ cv_url: path2 }).eq("id", applicationId);
    if (dbErr) throw dbErr;
    return path2;
  }
  async function removeCV(session, applicationId) {
    const { error } = await db.from("applications").update({ cv_url: null }).eq("id", applicationId).eq("applicant_id", session.user.id);
    if (error) throw error;
  }
  async function submitApplication(session, applicationId) {
    const { data: updated, error: upErr } = await db.from("applications").update({
      status: "submitted",
      submitted_at: (/* @__PURE__ */ new Date()).toISOString(),
      locked_fields: { all: true }
    }).eq("id", applicationId).eq("status", "draft").select("id");
    if (upErr) throw upErr;
    if (!updated || updated.length === 0) {
      throw new Error("Application is no longer a draft and cannot be submitted.");
    }
    const { error: evErr } = await db.from("application_events").insert({ application_id: applicationId, event_type: "submitted" });
    if (evErr) throw evErr;
  }
  function normalizeQuestions(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  }
  function updateApplyStepper(sectionNumber) {
    for (let i = 1; i <= 5; i++) {
      const step = q('[wized="progress-step-' + i + '"]');
      if (!step) continue;
      step.classList.remove("completed", "current");
      if (i < sectionNumber) step.classList.add("completed");
      else if (i === sectionNumber) step.classList.add("current");
    }
  }
  function clearGeneratedQuestions() {
    document.querySelectorAll("[data-icit-generated-question]").forEach((el) => el.remove());
  }
  function questionHost(template) {
    var _a;
    if (template == null ? void 0 : template.parentElement) return template.parentElement;
    const dynamicQ = q('[wized="dynamic-questions"]');
    if (dynamicQ) return dynamicQ;
    const section = q('[wized="form-section-2"]') || document.body;
    let host = document.getElementById("icit-generated-questions");
    if (!host) {
      host = document.createElement("div");
      host.id = "icit-generated-questions";
      host.style.margin = "16px 0";
      const before = q('[wized="questions-empty"]') || ((_a = q('[wized="save-draft-2-btn"]')) == null ? void 0 : _a.parentElement);
      if ((before == null ? void 0 : before.parentElement) === section) {
        section.insertBefore(host, before);
      } else {
        section.appendChild(host);
      }
    }
    return host;
  }
  function createGeneratedQuestion(question, currentValue) {
    const row = document.createElement("div");
    row.dataset.icitGeneratedQuestion = "1";
    row.className = "form-group-1";
    const label = document.createElement("label");
    label.textContent = question.label || question.id;
    label.htmlFor = "icit-" + question.id;
    label.className = "form-label";
    row.appendChild(label);
    let control;
    if (question.type === "select") {
      control = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select an option";
      control.appendChild(placeholder);
      (question.options || []).forEach((opt) => {
        const el = document.createElement("option");
        el.value = opt;
        el.textContent = opt;
        control.appendChild(el);
      });
    } else {
      control = document.createElement(question.type === "textarea" ? "textarea" : "input");
      if (control.tagName === "INPUT") control.type = question.type === "email" ? "email" : "text";
    }
    control.id = "icit-" + question.id;
    control.name = question.id;
    control.dataset.questionId = question.id;
    control.value = currentValue || "";
    control.className = "form-input-1";
    row.appendChild(control);
    return { row, control };
  }
  function filenameFromPath(path2) {
    if (!path2) return "";
    return String(path2).split("/").pop() || "";
  }
  function cloneRow2(template) {
    const clone = template.cloneNode(true);
    clone.style.display = "";
    [...clone.classList].filter((c) => c.endsWith("-tpl")).forEach((c) => clone.classList.remove(c));
    return clone;
  }
  function populateReview(session, programId, programName, programAnswers, programs) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const meta = session.user.user_metadata || {};
    const firstName = meta.first_name || "";
    const lastName = meta.last_name || "";
    setText(q('[wized="review-name"]'), [firstName, lastName].filter(Boolean).join(" "));
    setText(q('[wized="review-contact"]'), [
      (_a = q('[wized="applicant-phone"]')) == null ? void 0 : _a.value,
      session.user.email
    ].filter(Boolean).join(" \u2022 "));
    setText(q('[wized="review-location"]'), [
      (_b = q('[wized="applicant-city"]')) == null ? void 0 : _b.value,
      (_c = q('[wized="applicant-state"]')) == null ? void 0 : _c.value,
      (_d = q('[wized="applicant-zip-code"]')) == null ? void 0 : _d.value,
      (_e = q('[wized="applicant-country"]')) == null ? void 0 : _e.value
    ].filter(Boolean).join(", "));
    setText(q('[wized="review-role"]'), ((_f = q('[wized="applicant-current-role"]')) == null ? void 0 : _f.value) || "");
    setText(q('[wized="review-institution"]'), ((_g = q('[wized="applicant-institution"]')) == null ? void 0 : _g.value) || "");
    setText(q('[wized="review-credentials"]'), ((_h = q('[wized="applicant-credentials"]')) == null ? void 0 : _h.value) || "");
    setText(q('[wized="review-program-name"]'), programName);
    const host = q('[wized="review-questions-host"]');
    if (host) {
      host.innerHTML = "";
      const prog = programs.find((p) => p.id === programId);
      const questions = normalizeQuestions(prog && prog.program_questions);
      questions.forEach((question) => {
        const answer = programAnswers[question.id] || "\u2014";
        const entry = document.createElement("div");
        entry.className = "cv-entry";
        entry.innerHTML = '<p class="cv-question">' + escapeHtml(question.label || question.id) + '</p><p class="cv-answer">' + escapeHtml(answer) + "</p>";
        host.appendChild(entry);
      });
    }
  }
  async function initApply() {
    var _a, _b;
    const session = await requireAuth();
    const [programs, draft] = await Promise.all([
      loadPrograms2(),
      loadApplication(session)
    ]);
    if (draft && draft.status !== "draft") {
      window.location.href = "/dashboard";
      return;
    }
    let programId = null;
    let programName = "";
    const cachedCourse = sessionStorage.getItem("icit-selected-course");
    if (cachedCourse) {
      try {
        const parsed = JSON.parse(cachedCourse);
        programId = parsed.programId || null;
        programName = parsed.programName || "";
      } catch (_) {
      }
    }
    if (!programId && draft && draft.program_id) {
      programId = draft.program_id;
      programName = ((_a = draft.programs) == null ? void 0 : _a.name) || "";
    }
    if (!programId) {
      window.location.href = "/dashboard";
      return;
    }
    revealPage();
    applyDesignSystemClasses();
    let applicationId = draft ? draft.id : null;
    let cvUploaded = !!(draft && draft.cv_url);
    let currentSection = 1;
    let programAnswers = {};
    setText(q('[wized="confirm-course-name"]'), programName);
    const prog = programs.find((p) => p.id === programId);
    setText(q('[wized="confirm-course-desc"]'), prog ? prog.description || "" : "");
    const changeCourseBtn = q('[wized="change-course-btn"]');
    if (changeCourseBtn) changeCourseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      sessionStorage.removeItem("icit-selected-course");
      window.location.href = "/dashboard";
    });
    function goToSection(n) {
      for (let i = 1; i <= 5; i++) {
        hide(q('[wized="form-section-' + i + '"]'));
      }
      show(q('[wized="form-section-' + n + '"]'));
      currentSection = n;
      updateApplyStepper(n);
    }
    goToSection(1);
    const sec1 = q('[wized="form-section-1"]');
    if (sec1 && !sec1.querySelector("[data-icit-back]")) {
      const back = document.createElement("a");
      back.href = "/dashboard";
      back.dataset.icitBack = "1";
      back.textContent = "\u2190 Back to Dashboard";
      back.className = "btn-secondary-1-2";
      back.style.cssText = "display:inline-block;margin-bottom:20px;";
      sec1.insertBefore(back, sec1.firstChild);
    }
    if (programs.length === 0) {
      hide(q('[wized="questions-loading"]'));
      show(q('[wized="questions-empty"]'));
      setText(q('[wized="form-error-msg"]'), "No active programs are available yet. Add a program in Supabase to continue testing.");
      show(q('[wized="form-error-msg"]'));
    }
    if (draft) {
      applicationId = draft.id;
      cvUploaded = !!draft.cv_url;
      if ((_b = draft.locked_fields) == null ? void 0 : _b.first_name) {
        if (q('[wized="applicant-first-name"]')) q('[wized="applicant-first-name"]').disabled = true;
        if (q('[wized="applicant-last-name"]')) q('[wized="applicant-last-name"]').disabled = true;
        show(q('[wized="first-name-locked"]'));
        show(q('[wized="last-name-locked"]'));
      }
    }
    function syncCvUi() {
      if (cvUploaded) {
        hide(q('[wized="cv-upload-zone"]'));
        show(q('[wized="cv-upload-success"]'));
        show(q('[wized="cv-remove-btn"]'));
        setText(q('[wized="cv-filename"]'), filenameFromPath(draft == null ? void 0 : draft.cv_url) || "CV uploaded");
        setCvProgress(100);
      } else {
        show(q('[wized="cv-upload-zone"]'));
        hide(q('[wized="cv-upload-success"]'));
        hide(q('[wized="cv-remove-btn"]'));
        setText(q('[wized="cv-filename"]'), "");
        setCvProgress(0);
      }
    }
    function renderQuestions(programId2, existingAnswers) {
      programAnswers = Object.assign({}, existingAnswers || {});
      const prog2 = programs.find((p) => p.id === programId2);
      const questions = normalizeQuestions(prog2 && prog2.program_questions);
      const template = q('[wized="question-item"]');
      clearGeneratedQuestions();
      if (template) {
        template.parentElement.querySelectorAll("[data-icit-clone]").forEach((el) => el.remove());
        hide(template);
      }
      if (questions.length === 0) {
        show(q('[wized="questions-empty"]'));
        hide(q('[wized="questions-loading"]'));
        return;
      }
      hide(q('[wized="questions-empty"]'));
      hide(q('[wized="questions-loading"]'));
      const host = questionHost(template);
      questions.forEach((question) => {
        let row;
        let control;
        if (template) {
          row = cloneRow2(template);
          row.dataset.icitClone = "1";
          const label = row.querySelector("label") || row.querySelector("[data-question-label]");
          if (label) label.textContent = question.label;
          const input = row.querySelector("input, select, textarea");
          if (input) {
            control = input;
            if (question.type === "select" && input.tagName !== "SELECT") {
              control = document.createElement("select");
              control.className = input.className;
              input.replaceWith(control);
            } else if (question.type === "textarea" && input.tagName !== "TEXTAREA") {
              control = document.createElement("textarea");
              control.className = input.className;
              control.placeholder = input.placeholder || "";
              input.replaceWith(control);
            } else if (question.type && question.type !== "select" && input.tagName === "INPUT") {
              input.type = question.type === "email" ? "email" : "text";
            }
          }
        } else {
          const generated = createGeneratedQuestion(question, programAnswers[question.id]);
          row = generated.row;
          control = generated.control;
        }
        if (control) {
          control.name = question.id;
          control.dataset.questionId = question.id;
          if (question.type === "select" && question.options && template) {
            control.innerHTML = "";
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = "Select an option";
            control.appendChild(placeholder);
            question.options.forEach((opt) => {
              const el = document.createElement("option");
              el.value = opt;
              el.textContent = opt;
              control.appendChild(el);
            });
          }
          control.value = programAnswers[question.id] || "";
          control.addEventListener("change", (e) => {
            programAnswers[question.id] = e.target.value;
          });
          control.addEventListener("input", (e) => {
            programAnswers[question.id] = e.target.value;
          });
        }
        host.appendChild(row);
      });
    }
    function collectFields() {
      return {
        id: applicationId,
        programId,
        firstName: (q('[wized="applicant-first-name"]') || {}).value || "",
        lastName: (q('[wized="applicant-last-name"]') || {}).value || "",
        programAnswers: Object.keys(programAnswers).length ? programAnswers : void 0,
        emailConsent: !!(q('[wized="applicant-email-consent"]') || {}).checked,
        phone: (q('[wized="applicant-phone"]') || {}).value || "",
        address: (q('[wized="applicant-address"]') || {}).value || "",
        city: (q('[wized="applicant-city"]') || {}).value || "",
        state: (q('[wized="applicant-state"]') || {}).value || "",
        zipCode: (q('[wized="applicant-zip-code"]') || {}).value || "",
        country: (q('[wized="applicant-country"]') || {}).value || "",
        credentials: (q('[wized="applicant-credentials"]') || {}).value || "",
        currentRole: (q('[wized="applicant-current-role"]') || {}).value || "",
        institution: (q('[wized="applicant-institution"]') || {}).value || ""
      };
    }
    async function doSaveDraft() {
      const fields = collectFields();
      if (!fields.programId) {
        throw new Error("Please select a program before saving your draft.");
      }
      const saved = await saveDraft(session, fields);
      applicationId = saved.id;
      const indicator = q('[wized="form-draft-status"]');
      show(indicator);
      setTimeout(() => hide(indicator), 3e3);
      return saved;
    }
    const nextSection1Btn = q('[wized="next-section-1-btn"]');
    if (nextSection1Btn) nextSection1Btn.addEventListener("click", (e) => {
      e.preventDefault();
      goToSection(2);
    });
    if (draft) {
      const meta = session.user.user_metadata || {};
      if (q('[wized="applicant-first-name"]')) q('[wized="applicant-first-name"]').value = meta.first_name || "";
      if (q('[wized="applicant-last-name"]')) q('[wized="applicant-last-name"]').value = meta.last_name || "";
      if (q('[wized="applicant-email"]')) q('[wized="applicant-email"]').value = session.user.email || "";
      if (q('[wized="applicant-email-consent"]')) q('[wized="applicant-email-consent"]').checked = !!draft.email_consent;
      if (q('[wized="applicant-phone"]')) q('[wized="applicant-phone"]').value = draft.phone || "";
      if (q('[wized="applicant-address"]')) q('[wized="applicant-address"]').value = draft.address || "";
      if (q('[wized="applicant-city"]')) q('[wized="applicant-city"]').value = draft.city || "";
      if (q('[wized="applicant-state"]')) q('[wized="applicant-state"]').value = draft.state || "";
      if (q('[wized="applicant-zip-code"]')) q('[wized="applicant-zip-code"]').value = draft.zip_code || "";
      if (q('[wized="applicant-country"]')) q('[wized="applicant-country"]').value = draft.country || "";
      if (q('[wized="applicant-credentials"]')) q('[wized="applicant-credentials"]').value = draft.credentials || "";
      if (q('[wized="applicant-current-role"]')) q('[wized="applicant-current-role"]').value = draft.current_role || "";
      if (q('[wized="applicant-institution"]')) q('[wized="applicant-institution"]').value = draft.institution || "";
    }
    if (q('[wized="applicant-email"]')) {
      q('[wized="applicant-email"]').value = session.user.email || "";
      q('[wized="applicant-email"]').disabled = true;
    }
    const backSection2Btn = q('[wized="back-section-2-btn"]');
    if (backSection2Btn) backSection2Btn.addEventListener("click", (e) => {
      e.preventDefault();
      goToSection(1);
    });
    const nextSection2Btn = q('[wized="next-section-2-btn"]');
    if (nextSection2Btn) nextSection2Btn.addEventListener("click", async (e) => {
      e.preventDefault();
      hide(q('[wized="form-error-msg"]'));
      try {
        await doSaveDraft();
        goToSection(3);
      } catch (err) {
        setText(q('[wized="form-error-msg"]'), err.message || "Please complete this section before continuing.");
        show(q('[wized="form-error-msg"]'));
      }
    });
    syncCvUi();
    const backSection3Btn = q('[wized="back-section-3-btn"]');
    if (backSection3Btn) backSection3Btn.addEventListener("click", (e) => {
      e.preventDefault();
      goToSection(2);
    });
    const nextSection3Btn = q('[wized="next-section-3-btn"]');
    if (nextSection3Btn) nextSection3Btn.addEventListener("click", (e) => {
      e.preventDefault();
      goToSection(4);
    });
    const cvFileInput = q('[wized="cv-file-input"]');
    if (cvFileInput) cvFileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!applicationId) {
        setText(q('[wized="form-error-msg"]'), "Please save your draft before uploading a CV.");
        show(q('[wized="form-error-msg"]'));
        return;
      }
      try {
        setCvProgress(0);
        await uploadCV(session, applicationId, file);
        cvUploaded = true;
        hide(q('[wized="cv-upload-zone"]'));
        show(q('[wized="cv-upload-success"]'));
        show(q('[wized="cv-remove-btn"]'));
        setText(q('[wized="cv-filename"]'), file.name);
        setCvProgress(100);
      } catch (err) {
        console.error("CV upload failed:", err);
      }
    });
    const cvRemoveBtn = q('[wized="cv-remove-btn"]');
    if (cvRemoveBtn) cvRemoveBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!applicationId) return;
      try {
        await removeCV(session, applicationId);
        cvUploaded = false;
        show(q('[wized="cv-upload-zone"]'));
        hide(q('[wized="cv-upload-success"]'));
        hide(q('[wized="cv-remove-btn"]'));
        if (q('[wized="cv-file-input"]')) q('[wized="cv-file-input"]').value = "";
        setText(q('[wized="cv-filename"]'), "");
        setCvProgress(0);
      } catch (err) {
        console.error(err);
      }
    });
    if (draft && draft.program_id) {
      renderQuestions(draft.program_id, draft.program_answers);
      if (draft.program_answers && typeof draft.program_answers === "object") {
        programAnswers = Object.assign({}, draft.program_answers);
        Object.entries(draft.program_answers).forEach(([id, val]) => {
          const input = q('[data-question-id="' + id + '"]');
          if (input) input.value = val;
        });
      }
    } else {
      renderQuestions(programId, {});
    }
    const backSection4Btn = q('[wized="back-section-4-btn"]');
    if (backSection4Btn) backSection4Btn.addEventListener("click", (e) => {
      e.preventDefault();
      goToSection(3);
    });
    const nextSection4Btn = q('[wized="next-section-4-btn"]');
    if (nextSection4Btn) nextSection4Btn.addEventListener("click", async (e) => {
      e.preventDefault();
      hide(q('[wized="form-error-msg"]'));
      try {
        await doSaveDraft();
        populateReview(session, programId, programName, programAnswers, programs);
        goToSection(5);
      } catch (err) {
        setText(q('[wized="form-error-msg"]'), err.message || "Please complete this section before continuing.");
        show(q('[wized="form-error-msg"]'));
      }
    });
    const backSection5Btn = q('[wized="back-section-5-btn"]');
    if (backSection5Btn) backSection5Btn.addEventListener("click", (e) => {
      e.preventDefault();
      goToSection(4);
    });
    const submitAppBtn = q('[wized="submit-application-btn"]');
    if (submitAppBtn) submitAppBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      hide(q('[wized="form-error-msg"]'));
      if (!cvUploaded) {
        goToSection(3);
        setText(q('[wized="form-error-msg"]'), "Please upload your CV before submitting.");
        show(q('[wized="form-error-msg"]'));
        return;
      }
      try {
        await doSaveDraft();
        await submitApplication(session, applicationId);
        sessionStorage.removeItem("icit-selected-course");
        window.location.href = "/application-submitted";
      } catch (err) {
        console.error("Submit failed:", err);
        setText(q('[wized="form-error-msg"]'), err.message || "Submission failed. Please try again.");
        show(q('[wized="form-error-msg"]'));
      }
    });
  }

  // src/pages/status.js
  var STATUS_TIMELINE = {
    draft: 0,
    submitted: 1,
    in_review: 2,
    more_info_requested: 2,
    accepted: 3,
    rejected: 3,
    waitlisted: 3,
    enrolled: 4,
    withdrawn: -1
  };
  var TIMELINE_STEPS = [
    "tl-draft",
    "tl-submitted",
    "tl-review",
    "tl-decision",
    "tl-enrolled"
  ];
  async function loadApplication2(session) {
    const { data, error } = await db.from("applications").select(`
      id, program_id, status, submitted_at, updated_at,
      cv_url, admin_notes, notes_response, locked_fields, program_answers,
      programs ( id, name, price_cents, program_questions )
    `).eq("applicant_id", session.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function loadApplicationHistory(session, applicationId) {
    const { data, error } = await db.from("application_events").select("id, event_type, created_at, metadata").eq("application_id", applicationId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }
  async function submitNotesResponse(session, applicationId, response) {
    const { error } = await db.from("applications").update({ notes_response: response }).eq("id", applicationId).eq("applicant_id", session.user.id);
    if (error) throw error;
  }
  async function withdrawApplication2(session, applicationId, currentStatus) {
    if (!WITHDRAW_ALLOWED.includes(currentStatus)) {
      throw new Error("Cannot withdraw from status: " + currentStatus);
    }
    const { error: upErr } = await db.from("applications").update({ status: "withdrawn" }).eq("id", applicationId).eq("applicant_id", session.user.id);
    if (upErr) throw upErr;
    const { error: evErr } = await db.from("application_events").insert({ application_id: applicationId, event_type: "withdrawn" });
    if (evErr) throw evErr;
  }
  function cloneRow3(template) {
    const clone = template.cloneNode(true);
    clone.style.display = "";
    [...clone.classList].filter((c) => c.endsWith("-tpl")).forEach((c) => clone.classList.remove(c));
    return clone;
  }
  async function initStatus() {
    var _a, _b, _c, _d;
    const session = await requireAuth();
    const application = await loadApplication2(session);
    if (!application) {
      window.location.href = "/dashboard";
      return;
    }
    const events = await loadApplicationHistory(session, application.id);
    revealPage();
    hide(q('[wized="status-loading"]'));
    show(q('[wized="status-content"]'));
    const statusContent = q('[wized="status-content"]');
    if (statusContent && !statusContent.querySelector("[data-icit-back]")) {
      const back = document.createElement("a");
      back.href = "/dashboard";
      back.dataset.icitBack = "1";
      back.textContent = "\u2190 Back to Dashboard";
      back.className = "btn-secondary-1-2";
      back.style.cssText = "display:inline-block;margin-bottom:20px;";
      statusContent.insertBefore(back, statusContent.firstChild);
    }
    setText(q('[wized="status-program-name"]'), ((_a = application.programs) == null ? void 0 : _a.name) || "");
    setText(q('[wized="status-submitted-date"]'), formatDate(application.submitted_at));
    setText(q('[wized="status-badge"]'), application.status.replace(/_/g, " "));
    const stepIndex = (_b = STATUS_TIMELINE[application.status]) != null ? _b : -1;
    TIMELINE_STEPS.forEach((wid, i) => {
      const el = q('[wized="' + wid + '"]');
      if (!el) return;
      if (i <= stepIndex) {
        el.classList.add("timeline-step-done");
      } else {
        el.classList.remove("timeline-step-done");
      }
    });
    const eventTemplate = (_c = q('[wized="event-type-label"]')) == null ? void 0 : _c.parentElement;
    if (eventTemplate) {
      eventTemplate.parentElement.querySelectorAll("[data-icit-clone]").forEach((el) => el.remove());
      hide(eventTemplate);
      if (events.length === 0) {
        show(q('[wized="events-empty"]'));
      } else {
        hide(q('[wized="events-empty"]'));
        events.forEach((ev) => {
          const row = cloneRow3(eventTemplate);
          row.dataset.icitClone = "1";
          setText(row.querySelector('[wized="event-type-label"]'), ev.event_type.replace(/_/g, " "));
          setText(row.querySelector('[wized="event-time"]'), formatDate(ev.created_at));
          eventTemplate.parentElement.appendChild(row);
        });
      }
    }
    const latestEventType = (_d = events[0]) == null ? void 0 : _d.event_type;
    if (latestEventType === "more_info_requested") {
      setText(q('[wized="admin-notes-msg"]'), application.admin_notes || "");
      show(q('[wized="admin-notes-panel"]') || q('[wized="admin-notes-msg"]'));
      if (!application.notes_response) {
        const notesInput = q('[wized="notes-response-input"]');
        const notesBtn = q('[wized="submit-notes-response-btn"]');
        show(notesInput);
        show(notesBtn);
        hide(q('[wized="notes-submitted-confirm"]'));
        if (notesBtn && notesInput) {
          notesBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const response = notesInput.value.trim();
            if (!response) return;
            try {
              await submitNotesResponse(session, application.id, response);
              location.reload();
            } catch (err) {
              console.error(err);
            }
          });
        }
      } else {
        hide(q('[wized="notes-response-input"]'));
        hide(q('[wized="submit-notes-response-btn"]'));
        show(q('[wized="notes-submitted-confirm"]'));
      }
    } else {
      hide(q('[wized="admin-notes-panel"]') || q('[wized="admin-notes-msg"]'));
      hide(q('[wized="notes-response-input"]'));
      hide(q('[wized="submit-notes-response-btn"]'));
      hide(q('[wized="notes-submitted-confirm"]'));
    }
    const withdrawBtn = q('[wized="status-withdraw-btn"]');
    if (WITHDRAW_ALLOWED.includes(application.status)) {
      show(withdrawBtn);
      if (withdrawBtn) {
        withdrawBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          if (!confirm("Withdraw your application? This cannot be undone.")) return;
          try {
            await withdrawApplication2(session, application.id, application.status);
            location.reload();
          } catch (err) {
            console.error("Withdraw error:", err);
          }
        });
      }
    } else {
      hide(withdrawBtn);
    }
    if (application.status === "draft") {
      show(q('[wized="edit-draft-link"]'));
    } else {
      hide(q('[wized="edit-draft-link"]'));
    }
  }

  // src/pages/enrollment.js
  async function loadApplication3(session) {
    const { data, error } = await db.from("applications").select(`
      id, program_id, status, submitted_at, updated_at,
      cv_url, admin_notes, notes_response, locked_fields, program_answers,
      programs ( id, name, price_cents, program_questions )
    `).eq("applicant_id", session.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function createCheckout(session, applicationId) {
    const resp = await fetch(EDGE_FN_BASE + "/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + session.access_token
      },
      body: JSON.stringify({ application_id: applicationId })
    });
    if (!resp.ok) {
      let msg = "Checkout failed";
      try {
        const body = await resp.json();
        if (body.error) msg = body.error;
      } catch (_) {
      }
      throw new Error(msg);
    }
    return resp.json();
  }
  async function initEnrollment() {
    var _a, _b, _c;
    const session = await requireAuth();
    const application = await loadApplication3(session);
    if (!application || application.status !== "accepted") {
      window.location.href = "/dashboard";
      return;
    }
    revealPage();
    hide(q('[wized="enroll-loading"]'));
    setText(q('[wized="enroll-program-name"]'), ((_a = application.programs) == null ? void 0 : _a.name) || "");
    setText(q('[wized="enroll-tuition"]'), formatCurrency((_c = (_b = application.programs) == null ? void 0 : _b.price_cents) != null ? _c : 0));
    setText(
      q('[wized="enroll-status-badge"]'),
      "Accepted"
    );
    hide(q('[wized="enroll-error-msg"]'));
    hide(q('[wized="enroll-processing"]'));
    const confirmBtn = q('[wized="confirm-enrollment-btn"]');
    if (confirmBtn) {
      confirmBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        show(q('[wized="enroll-processing"]'));
        hide(q('[wized="enroll-error-msg"]'));
        try {
          const result = await createCheckout(session, application.id);
          window.location.href = result.url;
        } catch (err) {
          hide(q('[wized="enroll-processing"]'));
          setText(q('[wized="enroll-error-msg"]'), err.message || "Could not start checkout. Please try again.");
          show(q('[wized="enroll-error-msg"]'));
        }
      });
    }
  }

  // src/main.js
  (function injectStyles() {
    const s = document.createElement("style");
    s.textContent = // Danger buttons
    ".btn-danger.w-button,.btn-danger-1.w-button{background-color:transparent!important;background-image:none!important;}.btn-danger.w-button:hover,.btn-danger-1.w-button:hover{background-color:#fef2f2!important;}.notif-drawer-close.w-button{background:#f1f5f9!important;background-image:none!important;color:#64748b!important;border:1px solid #e2e8f0!important;border-radius:6px!important;padding:4px 12px!important;font-size:17px!important;line-height:1.4!important;min-width:auto!important;}.notif-drawer-close.w-button:hover{background:#e2e8f0!important;}.btn-ghost-1.w-button{background-color:transparent!important;background-image:none!important;color:#6b7280!important;}.btn-ghost-1.w-button:hover{background-color:#f3f4f6!important;color:#374151!important;}.btn-primary-1-2.w-button,.btn-primary-1.w-button{background-color:#1a3a5c!important;background-image:none!important;color:#fff!important;}.btn-primary-1-2.w-button:hover,.btn-primary-1.w-button:hover{background-color:#123161!important;}.btn-submit.w-button{background-color:#16a34a!important;background-image:none!important;color:#fff!important;}.btn-submit.w-button:hover{background-color:#15803d!important;}.loading-spinner,.spinner,.spinner-1,.spinner-1-2{animation:.7s linear infinite spin!important;}.form-input-1:focus,.form-input-1:focus-visible{border-color:#63a3da!important;box-shadow:0 0 0 3px rgba(99,163,218,.15)!important;}.form-input-1[disabled]{background:#f3f4f6!important;color:#9ca3af!important;cursor:not-allowed!important;}[data-icit-generated-question] textarea{resize:vertical;min-height:96px;}";
    document.head.appendChild(s);
  })();
  var path = window.location.pathname;
  if (path === "/login") initPage("login", initLogin);
  else if (path === "/dashboard") initPage("dashboard", initDashboard);
  else if (path === "/apply") initPage("apply", initApply);
  else if (path === "/application-status") initPage("application-status", initStatus);
  else if (path === "/enrollment-confirmation") initPage("enrollment-confirmation", initEnrollment);
})();
