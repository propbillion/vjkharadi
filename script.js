/* =========================================================
   VJ New Launch - Upper Kharadi | Landing Page Script
   ========================================================= */

/* ---------- CONFIG: edit only this block ---------- */
const CONFIG = {
  projectName: "VJ New Launch - Upper Kharadi",
  phone: "918857090799",               // call + WhatsApp number (country code, no +)

  // Lead capture endpoint (Google Apps Script web app / CRM webhook).
  // Leave empty to skip the POST (lead will still go via WhatsApp option on thank-you).
  formEndpoint: "",

  // Google Ads conversion. Format: "AW-XXXXXXXXXX/AbCdEfGhIj". Leave empty to disable.
  adsConversion: "",

  // Countdown in top bar. Set to null to hide.
  tokenDeadline: "2026-11-30T23:59:59+05:30",
  timerLabel: "Token window closes in",

  // Popup: auto-open after N seconds, once per session. Set 0 to disable.
  popupDelaySec: 15,

  // Redirect after successful submit (e.g. "thank-you.html"). Empty = show thank-you modal.
  thankYouUrl: ""
};
/* -------------------------------------------------- */

(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ---------- Safe storage ---------- */
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  /* ---------- UTM / click ID capture ---------- */
  const TRACK_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid", "fbclid"];
  const params = new URLSearchParams(window.location.search);
  TRACK_KEYS.forEach((k) => { if (params.get(k)) store.set(k, params.get(k)); });
  const getTracking = () => {
    const t = {};
    TRACK_KEYS.forEach((k) => { t[k] = store.get(k) || ""; });
    return t;
  };

  /* ---------- Header scroll + mobile nav ---------- */
  const header = $("#header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navToggle = $("#navToggle");
  navToggle.addEventListener("click", () => header.classList.toggle("nav-open"));
  $$("#nav a").forEach((a) => a.addEventListener("click", () => header.classList.remove("nav-open")));

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Countdown ---------- */
  const timerEl = $("#topbarTimer");
  if (CONFIG.tokenDeadline && timerEl) {
    const end = new Date(CONFIG.tokenDeadline).getTime();
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) { timerEl.hidden = true; return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      timerEl.textContent = `${CONFIG.timerLabel}: ${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
      timerEl.hidden = false;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Modals ---------- */
  const leadModal = $("#leadModal");
  const thankModal = $("#thankModal");
  let lastSource = "Direct";

  const openModal = (m) => {
    $$(".modal.open").forEach((x) => closeModal(x));
    m.classList.add("open");
    m.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-lock");
    const first = m.querySelector("input:not([type=checkbox])");
    if (first && window.innerWidth > 640) setTimeout(() => first.focus(), 250);
  };
  const closeModal = (m) => {
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
    if (!$(".modal.open")) document.body.classList.remove("modal-lock");
  };

  $$(".js-open-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      lastSource = btn.dataset.source || "Button";
      const form = $("form", leadModal);
      form.dataset.source = "Popup - " + lastSource;
      if (btn.dataset.config) $("select[name=config]", form).value = btn.dataset.config;
      store.set("popupShown", "1");
      openModal(leadModal);
    });
  });

  $$("[data-close]").forEach((el) => {
    el.addEventListener("click", () => closeModal(el.closest(".modal")));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $$(".modal.open").forEach(closeModal);
  });

  // Auto popup once per session
  if (CONFIG.popupDelaySec > 0 && !store.get("popupShown") && !store.get("leadDone")) {
    setTimeout(() => {
      if (!$(".modal.open") && !store.get("leadDone")) {
        store.set("popupShown", "1");
        $("form", leadModal).dataset.source = "Popup - Auto";
        openModal(leadModal);
      }
    }, CONFIG.popupDelaySec * 1000);
  }

  /* ---------- WhatsApp + call ---------- */
  const waLink = (source, lead) => {
    let msg = `Hi, I'm interested in ${CONFIG.projectName}. Please share the price sheet and early access details.`;
    if (lead && lead.name) msg = `Hi, I'm ${lead.name}. I'm interested in ${lead.config || "a residence"} at ${CONFIG.projectName}. Please share the cost sheet and token details.`;
    return `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(msg)}`;
  };

  let lastLead = null;
  $$(".js-whatsapp").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      pushEvent("whatsapp_click", { source: a.dataset.source || "" });
      window.open(waLink(a.dataset.source, lastLead), "_blank", "noopener");
    });
  });
  $$(".js-call").forEach((a) => a.addEventListener("click", () => pushEvent("call_click", {})));

  /* ---------- Analytics helpers ---------- */
  function pushEvent(name, data) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name }, data));
  }
  function fireConversion() {
    if (CONFIG.adsConversion && typeof window.gtag === "function") {
      window.gtag("event", "conversion", { send_to: CONFIG.adsConversion });
    }
  }

  /* ---------- Forms ---------- */
  const phoneOk = (v) => /^[6-9]\d{9}$/.test(v);
  const nameOk = (v) => v.trim().length >= 2 && /^[a-zA-Z .'-]+$/.test(v.trim());

  const setError = (input, msg) => {
    const field = input.closest(".field");
    if (!field) return;
    field.classList.add("error");
    let m = field.querySelector(".err-msg");
    if (!m) { m = document.createElement("span"); m.className = "err-msg"; field.appendChild(m); }
    m.textContent = msg;
  };
  const clearError = (input) => {
    const field = input.closest(".field");
    if (!field) return;
    field.classList.remove("error");
    const m = field.querySelector(".err-msg");
    if (m) m.remove();
  };

  $$(".lead-form").forEach((form) => {
    const phone = $("input[name=phone]", form);
    const name = $("input[name=name]", form);

    phone.addEventListener("input", () => {
      phone.value = phone.value.replace(/\D/g, "").slice(0, 10);
      clearError(phone);
    });
    name.addEventListener("input", () => clearError(name));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let valid = true;
      if (!nameOk(name.value)) { setError(name, "Please enter a valid name"); valid = false; }
      if (!phoneOk(phone.value)) { setError(phone, "Enter a valid 10-digit mobile number"); valid = false; }
      const consent = $("input[name=consent]", form);
      if (consent && !consent.checked) { alertConsent(consent); valid = false; }
      if (!valid) return;

      const btn = $("button[type=submit]", form);
      const btnText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Submitting...";

      const lead = Object.assign({
        name: name.value.trim(),
        phone: "+91" + phone.value,
        config: ($("select[name=config]", form) || {}).value || "",
        source: form.dataset.source || "Form",
        project: CONFIG.projectName,
        page: window.location.href.split("?")[0],
        submitted_at: new Date().toISOString()
      }, getTracking());

      try {
        if (CONFIG.formEndpoint) {
          const body = new URLSearchParams(lead);
          await fetch(CONFIG.formEndpoint, { method: "POST", mode: "no-cors", body });
        }
      } catch (err) {
        console.warn("Lead POST failed:", err);
      }

      lastLead = lead;
      store.set("leadDone", "1");
      pushEvent("lead_submit", { source: lead.source, config: lead.config });
      fireConversion();

      form.reset();
      btn.disabled = false;
      btn.textContent = btnText;

      if (CONFIG.thankYouUrl) {
        window.location.href = CONFIG.thankYouUrl;
      } else {
        openModal(thankModal);
      }
    });
  });

  function alertConsent(cb) {
    const label = cb.closest(".consent");
    if (!label) return;
    label.style.color = "#d70015";
    setTimeout(() => { label.style.color = ""; }, 2000);
  }

  /* ---------- Footer year ---------- */
  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();
})();
