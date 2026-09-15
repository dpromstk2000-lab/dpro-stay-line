/** DPRO GREEN LINE / CONTACT-V1-7-GREEN-1 / CUSTOMER-HERO-2 / SHOP-R1.2 / OWNER-FLOW-R1 / OWNER-UX-FIX-R1 */
window.GREEN_CONFIG = Object.freeze({
  API_BASE: "https://dpro-green-rental-line-api.dpromstk2000.workers.dev",
  FACILITY_CODE: "dpro_green_rental_demo",
  LIFF_ID: "",
  DEMO_MEMBER_TOKEN: "GREEN-DEMO",
  DEMO_CUSTOMER_NUMBER: "DEMO-GREEN-001",
  MAX_PHOTOS: 4,
  MAX_IMAGE_EDGE: 1600,
  JPEG_QUALITY: 0.82,
  CONTACT_ENABLED: true,
  CONTACT_URL: "contact-green.html",
  SHOP_MODULE: Object.freeze({
    enabled: true,
    websiteUrl: "https://dpromstk2000-lab.github.io/dpro-green-website/shop.html",
    storageMode: "demo-local",
  }),
  CUSTOMER_HERO: Object.freeze({
    enabled: true,
    desktopImage: "https://dpromstk2000-lab.github.io/dpro-green-website/owner-hero.webp",
    mobileImage: "https://dpromstk2000-lab.github.io/dpro-green-website/hero-mobile-lobby.webp",
    eyebrow: "GREEN RENTAL CUSTOMER PORTAL",
    title: "空間に、やすらぎと品格を。",
    badge: "ご利用中のお客様専用マイページ",
    lead: "設置植物・次回訪問・作業報告・ご相談を、ひとつの画面で。",
    alt: "観葉植物のある心地よい空間",
  }),
});

window.DPRO_CUSTOMER_HERO_CONFIG = window.GREEN_CONFIG.CUSTOMER_HERO;

(() => {
  "use strict";
  const HERO_ADMIN_VERSION = "DPRO-CUSTOMER-HERO-2-20260808";
  const SHOP_OWNER_VERSION = "GREEN-SHOP-OWNER-R1.2-20260831";
  const OWNER_FLOW_VERSION = "GREEN-OWNER-FLOW-R1.2-20260901";
  const OWNER_UX_FIX_VERSION = "GREEN-OWNER-UX-FIX-R2.9-20260915";
  const OWNER_JST_FIX_VERSION = "GREEN-OWNER-JST-DATETIME-FIX-R1.0-20260915";

  function installContactMenu() {
    if (!window.GREEN_CONFIG?.CONTACT_ENABLED) return;
    if (!/\/owner\.html$/.test(location.pathname)) return;
    const nav = document.querySelector(".owner-nav");
    if (!nav || document.getElementById("green-contact-menu")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "green-contact-menu";
    button.innerHTML = "<span>話</span>LINE・顧客対応";
    button.setAttribute("aria-label", "LINEで継続中のお客様対応を開く");
    button.title = "LINEで継続中の会話を確認・返信";
    button.addEventListener("click", () => {
      location.href = window.GREEN_CONFIG.CONTACT_URL || "contact-green.html";
    });
    const messageButton = nav.querySelector('[data-view="messages"]');
    if (messageButton) nav.insertBefore(button, messageButton);
    else nav.append(button);
  }

  function installCustomerHeroAdmin() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (!document.querySelector('link[data-customer-hero-admin]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `customer-hero-admin.css?v=${encodeURIComponent(HERO_ADMIN_VERSION)}`;
      link.dataset.customerHeroAdmin = HERO_ADMIN_VERSION;
      document.head.append(link);
    }
    if (!document.querySelector('script[data-customer-hero-admin]')) {
      const script = document.createElement("script");
      script.src = `customer-hero-admin.js?v=${encodeURIComponent(HERO_ADMIN_VERSION)}`;
      script.defer = true;
      script.dataset.customerHeroAdmin = HERO_ADMIN_VERSION;
      document.head.append(script);
    }
  }

  function installTutorialRuntime() {
    if (document.documentElement.dataset.dproTutorialRuntime === "green-r3") return;
    document.documentElement.dataset.dproTutorialRuntime = "green-r3";
    if (!document.querySelector('link[data-dpro-tutorial-green]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "dpro-tutorial-green.css?v=GREEN-TUTORIAL-R3.1-20260822";
      link.dataset.dproTutorialGreen = "R3";
      document.head.append(link);
    }
    if (!document.querySelector('script[data-dpro-tutorial-green]')) {
      const script = document.createElement("script");
      script.src = "dpro-tutorial-green.js?v=GREEN-TUTORIAL-R3.1-20260822";
      script.defer = true;
      script.dataset.dproTutorialGreen = "R3";
      document.head.append(script);
    }
  }

  function installShopModule() {
    if (!window.GREEN_CONFIG?.SHOP_MODULE?.enabled) return;
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (document.querySelector('script[data-green-shop-owner]')) return;
    const script = document.createElement("script");
    script.src = `green-shop-owner.js?v=${encodeURIComponent(SHOP_OWNER_VERSION)}`;
    script.defer = true;
    script.dataset.greenShopOwner = SHOP_OWNER_VERSION;
    document.head.append(script);
  }

  function installContactFlowCopy() {
    if (!/\/contact-green\.html$/.test(location.pathname)) return;

    const setTextIfChanged = (element, text) => {
      if (element && element.textContent !== text) element.textContent = text;
    };

    const apply = () => {
      const pageTitle = document.getElementById("pageTitle");
      const pageLead = document.getElementById("pageLead");
      const topDescription = document.getElementById("topbarDescription");

      setTextIfChanged(pageTitle, "LINEでの継続対応をひとつに");
      if (pageLead) {
        const preparing = window.DPRO_CONTACT_CONFIG?.features?.line === false;
        setTextIfChanged(
          pageLead,
          preparing
            ? "現在はLINE公式アカウント接続前の準備モードです。接続後は、相談受付後や契約中のお客様とのLINE会話をこの画面で確認・返信できます。"
            : "相談受付後や契約中のお客様とのLINE会話を確認し、そのまま返信できます。新しい相談の一覧はGREEN管理画面の「相談受付」で確認します。"
        );
      }
      if (window.DPRO_CONTACT_CONFIG?.features?.line !== false) {
        setTextIfChanged(topDescription, "LINEで継続中の会話を確認・返信");
      }
    };

    const start = () => {
      apply();
      const target = document.getElementById("app") || document.body;
      if (!target) return;
      const observer = new MutationObserver(() => {
        clearTimeout(start._timer);
        start._timer = setTimeout(apply, 10);
      });
      observer.observe(target, { childList: true, subtree: true, characterData: true });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => setTimeout(start, 0), { once: true });
    } else {
      setTimeout(start, 0);
    }
  }

  function installOwnerFlowClarity() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (!document.querySelector('link[data-green-owner-flow]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `green-owner-flow.css?v=${encodeURIComponent(OWNER_FLOW_VERSION)}`;
      link.dataset.greenOwnerFlow = OWNER_FLOW_VERSION;
      document.head.append(link);
    }
    if (!document.querySelector('script[data-green-owner-flow]')) {
      const script = document.createElement("script");
      script.src = `green-owner-flow.js?v=${encodeURIComponent(OWNER_FLOW_VERSION)}`;
      script.defer = true;
      script.dataset.greenOwnerFlow = OWNER_FLOW_VERSION;
      document.head.append(script);
    }
  }

  function installOwnerUxFix() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (!document.querySelector('link[data-green-owner-ux-fix]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `green-owner-ux-fix.css?v=${encodeURIComponent(OWNER_UX_FIX_VERSION)}`;
      link.dataset.greenOwnerUxFix = OWNER_UX_FIX_VERSION;
      document.head.append(link);
    }
    if (!document.querySelector('script[data-green-owner-ux-fix]')) {
      const script = document.createElement("script");
      script.src = `green-owner-ux-fix.js?v=${encodeURIComponent(OWNER_UX_FIX_VERSION)}`;
      script.defer = true;
      script.dataset.greenOwnerUxFix = OWNER_UX_FIX_VERSION;
      document.head.append(script);
    }
  }

  function installOwnerJstDatetimeFix() {
    if (!/\/owner\.html$/.test(location.pathname)) return;
    if (document.querySelector('script[data-green-owner-jst-fix]')) return;
    const script = document.createElement("script");
    script.src = `green-owner-jst-fix.js?v=${encodeURIComponent(OWNER_JST_FIX_VERSION)}`;
    script.defer = true;
    script.dataset.greenOwnerJstFix = OWNER_JST_FIX_VERSION;
    document.head.append(script);
  }

  function boot() {
    installContactMenu();
    installCustomerHeroAdmin();
    installTutorialRuntime();
    installShopModule();
    installOwnerFlowClarity();
    installOwnerUxFix();
    installOwnerJstDatetimeFix();
    installContactFlowCopy();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
