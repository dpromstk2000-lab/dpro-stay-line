(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-JST-DATETIME-FIX-R1.0-20260915";
  if (!/\/owner\.html$/.test(location.pathname)) return;
  if (!window.Green?.api) return;

  document.documentElement.dataset.greenOwnerJstDatetimeFix = VERSION;

  const originalApi = window.Green.api.bind(window.Green);
  let lastReplacementScheduledAt = "";

  function withTokyoOffset(value) {
    if (!value || typeof value !== "string") return value;
    const text = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(text)) return value;
    return `${text.length === 16 ? `${text}:00` : text}+09:00`;
  }

  function tokyoInputValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
    );
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  }

  function isReplacementPath(path) {
    return /^\/api\/admin\/replacements(?:\/|$)/.test(String(path || ""));
  }

  window.Green.api = async function patchedApi(path, options) {
    let nextOptions = options;

    if (isReplacementPath(path) && options?.json && typeof options.json === "object") {
      const json = { ...options.json };
      if (typeof json.scheduledAt === "string") json.scheduledAt = withTokyoOffset(json.scheduledAt);
      if (typeof json.scheduled_at === "string") json.scheduled_at = withTokyoOffset(json.scheduled_at);
      nextOptions = { ...options, json };
    }

    const response = await originalApi(path, nextOptions);

    const match = String(path || "").match(/^\/api\/admin\/replacements\/([0-9a-f-]{36})$/i);
    if (match && (!nextOptions?.method || String(nextOptions.method).toUpperCase() === "GET")) {
      lastReplacementScheduledAt = response?.data?.request?.scheduled_at || "";
      queueMicrotask(applyReplacementInputFix);
      setTimeout(applyReplacementInputFix, 0);
      setTimeout(applyReplacementInputFix, 50);
    }

    return response;
  };

  function applyReplacementInputFix() {
    const dialog = document.querySelector("#owner-dialog");
    if (!dialog || !dialog.open || !lastReplacementScheduledAt) return;

    const form =
      dialog.querySelector("#replacement-edit-form") ||
      dialog.querySelector("#replacement-approve-form");

    if (!form) return;

    const input = form.querySelector('input[name="scheduledAt"]');
    if (!input) return;

    const corrected = tokyoInputValue(lastReplacementScheduledAt);
    if (!corrected) return;

    input.value = corrected;
    input.step = "900";
    input.dataset.greenJstFixed = "1";
    input.title = "日本時間（Asia/Tokyo）で入力します。";
  }

  const target = document.querySelector("#owner-dialog") || document.body;
  const observer = new MutationObserver(() => applyReplacementInputFix());
  observer.observe(target, { childList: true, subtree: true });

  console.info(`[DPRO GREEN] ${VERSION} active`);
})();
