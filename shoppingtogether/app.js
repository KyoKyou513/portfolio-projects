(() => {
  "use strict";

  // ============================================================
  // Shopping Together · frontend v0.4（正式前端）→ v0.4.2 手机端修订轮（2026-09-02）→ v0.4.3 手机端捉虫轮（2026-09-04）
  // 底稿：阿晏 frontend-v0.3；本版：穗
  // 台词唯一来源：data/copy-library.js（ST-COPY-004 v1.0 定稿）
  // 本文件不再硬编码任何搭子台词；页面能说的话都在库里。
  // 事件引擎按契约 v1.0：11 事件槽、每槽一次冷却、一次一句、
  // 变量缺失走 fallback、fallback 为 null 则沉默。
  // ============================================================

  const STORAGE = {
    companion: "st:selectedCompanion",
    cart: "st:sessionCart",
    context: "st:sessionContext",
    records: "st:records",
    lastShelfSlogan: "st:lastShelfSlogan",
    promptedReceipts: "st:secondTripPromptedReceipts",
    fired: "st:firedEvents",
    removed: "st:removedSkus"
  };

  const shelfSlogans = [
    "不赶时间，只挑心动。",
    "时间还早，慢慢逛就好。",
    "今天的货架，刚摆好。",
    "逛的是超市，过的是日子。",
    "把喜欢的，一样样摆进生活。"
  ];

  const LIB = window.COPY_LIBRARY || { events: {}, greetings: {}, system: {}, secondTrip: {}, switching: {}, actions: {} };
  const secondTripPrompts = Object.values(LIB.secondTrip || {});

  // 母题章双规格制（ST-FE-004 装饰轮）：sealS 简洁版=名字旁/小票卡索引章；sealL 华丽版=结账镜像信头。
  // 陪逛栏画像旁旧章（motif）按改单第 4 条撤职：与画像手持物重复。
  const companions = {
    lili: { name: "厘厘", role: "精明与比较", image: "assets/lili.webp", sealS: "assets/deco2/seal-lili-s.png", sealL: "assets/deco2/seal-lili-l.png", intro: "价格、容量和差别，我会摊开给你看。怎么选，仍然在你。" },
    niannian: { name: "念念", role: "细节与惦记", image: "assets/niannian.webp", sealS: "assets/deco2/seal-niannian-s.png", sealL: "assets/deco2/seal-niannian-l.png", intro: "我不催你补齐，只替今天的生活多惦记一点。" },
    yaya: { name: "芽芽", role: "好奇与尝鲜", image: "assets/yaya.webp", sealS: "assets/deco2/seal-yaya-s.png", sealL: "assets/deco2/seal-yaya-l.png", intro: "好不好吃还不知道，但开袋的时候我在。" },
    // 无搭子的记号是小推车（车徽走名字位与索引位；镜像信头素面——信头是搭子说话的场合，车不说话）
    none: { name: "无搭子模式", role: "安静记录", image: "assets/deco2/cart-none.png", sealS: "assets/deco2/seal-none-s.png", sealL: "", intro: LIB.switching["companion-none-system"] || "现在自己逛逛，购物车和记录照常保留。" }
  };

  const purposes = [
    { id: "restock", label: "日常常备见底了", tail: "greeting-purpose-restock" },
    { id: "treat", label: "想找点好吃好喝的", tail: "greeting-purpose-treat" },
    { id: "try_new", label: "今天想尝尝新品", tail: "greeting-purpose-try-new" },
    { id: "prepare_hunger", label: "给饿的时候备一点", tail: "greeting-purpose-prepare-hunger" },
    { id: "stock_up", label: "准备认真囤一轮", tail: "greeting-purpose-stock-up" },
    { id: "browse", label: "先随便看看", tail: "greeting-purpose-browse" }
  ];

  const categories = [
    { id: "all", label: "全部" },
    { id: "drinks", label: "饮品" },
    { id: "snacks", label: "零食" },
    { id: "bakery", label: "乳品烘焙" },
    { id: "meals", label: "速食顶饿" },
    { id: "fruit", label: "水果轻食" },
    { id: "daily", label: "基础日用" }
  ];

  const roleLabels = {
    compare: "可比较", repeat: "回购演示", absence: "缺席提醒", stockScale: "囤货尺度",
    revisit: "回访", budget: "预算", newTrial: "尝鲜", summary: "整车回看", hungerGap: "顶饿检查"
  };

  const HUNGER_ROLES = ["hunger", "instant", "lowPrep"];

  const productData = window.ST_PRODUCT_DATA || { products: [] };
  const products = productData.products || [];
  const productById = new Map(products.map((product) => [product.id, product]));

  const restoredContext = safeRead(sessionStorage, STORAGE.context, {});
  const state = {
    companion: validCompanion(localStorage.getItem(STORAGE.companion)) || "unset",
    purposes: new Set(Array.isArray(restoredContext.purposes) ? restoredContext.purposes : []),
    budgetCents: Number(restoredContext.budgetCents) || 0,
    cart: normalizeCart(safeRead(sessionStorage, STORAGE.cart, {})),
    category: "all",
    sort: "default",
    lastMessage: "",
    fired: new Set(safeRead(sessionStorage, STORAGE.fired, [])),
    removedSkus: new Set(safeRead(sessionStorage, STORAGE.removed, []))
  };

  const els = {
    body: document.body,
    views: [...document.querySelectorAll("[data-view]")],
    purposeChips: document.querySelector(".purpose-chips"),
    categoryBar: document.querySelector(".category-bar"),
    productGrid: document.querySelector("[data-product-grid]"),
    emptyState: document.querySelector("[data-empty-state]"),
    emptyStateCopy: document.querySelector("[data-empty-state-copy]"),
    shelfSlogan: document.querySelector("[data-shelf-slogan]"),
    budget: document.querySelector("[data-budget]"),
    enterShop: document.querySelector("[data-enter-shop]"),
    onboardingNote: document.querySelector("[data-onboarding-note]"),
    purposeSummary: document.querySelector("[data-purpose-summary]"),
    rail: document.querySelector("[data-companion-rail]"),
    railImage: document.querySelector("[data-rail-image]"),
    railMotif: document.querySelector("[data-rail-motif]"),
    railRole: document.querySelector("[data-rail-role]"),
    railName: document.querySelector("[data-rail-name]"),
    railSeal: document.querySelector("[data-rail-seal]"),
    mirrorByline: document.querySelector("[data-mirror-byline]"),
    checkoutSeal: document.querySelector("[data-checkout-seal]"),
    companionMessage: document.querySelector("[data-companion-message]"),
    switchRow: document.querySelector("[data-switch-row]"),
    switchNote: document.querySelector("[data-switch-note]"),
    cartDrawer: document.querySelector("[data-cart-drawer]"),
    cartItems: document.querySelector("[data-cart-items]"),
    cartCount: document.querySelector("[data-cart-count]"),
    cartTotal: document.querySelector("[data-cart-total]"),
    scrim: document.querySelector(".drawer-scrim"),
    shelfCheckout: document.querySelector("[data-shelf-checkout]"),
    shelfCheckoutSummary: document.querySelector("[data-shelf-checkout-summary]"),
    checkoutDialog: document.querySelector("[data-checkout-dialog]"),
    checkoutMirror: document.querySelector("[data-checkout-mirror]"),
    recordList: document.querySelector("[data-record-list]"),
    secondTripPrompt: document.querySelector("[data-second-trip-prompt]"),
    secondTripCopy: document.querySelector("[data-second-trip-copy]"),
    sort: document.querySelector("[data-sort]")
  };

  // ---------- 基础工具 ----------

  function safeRead(storage, key, fallback) {
    try {
      const value = storage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function normalizeCart(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, qty]) => productById.has(id) && Number.isInteger(qty) && qty > 0));
  }

  function validCompanion(value) {
    return Object.prototype.hasOwnProperty.call(companions, value) ? value : null;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function money(cents) {
    return `¥${(Number(cents || 0) / 100).toFixed(2)}`;
  }

  function categoryInfo(id) {
    return categories.find((item) => item.id === id) || { id, label: id };
  }

  function persistContext() {
    sessionStorage.setItem(STORAGE.context, JSON.stringify({ purposes: [...state.purposes], budgetCents: state.budgetCents }));
  }

  function persistCart() {
    sessionStorage.setItem(STORAGE.cart, JSON.stringify(state.cart));
  }

  function persistFired() {
    sessionStorage.setItem(STORAGE.fired, JSON.stringify([...state.fired]));
    sessionStorage.setItem(STORAGE.removed, JSON.stringify([...state.removedSkus]));
  }

  // ---------- 台词引擎 ----------
  // fmt：填变量；填完仍剩 {占位} 即视为变量缺失，返回 null
  function fmt(template, vars = {}) {
    if (typeof template !== "string") return null;
    let text = template;
    for (const [key, value] of Object.entries(vars)) {
      if (value === null || value === undefined || value === "") continue;
      text = text.split(`{${key}}`).join(String(value));
    }
    return /\{[a-zA-Z]+\}/.test(text) ? null : text;
  }

  // 事件槽取句：null 槽沉默；正句变量不齐走 fallback；fallback 也没有则沉默
  function lineFor(slotId, vars) {
    const slot = LIB.events[slotId];
    if (slot === null || slot === undefined) return null;
    if (typeof slot === "string") return fmt(slot, vars);
    const main = fmt(slot.text, vars);
    if (main !== null) return main;
    if (typeof slot.fallback === "string") return fmt(slot.fallback, vars);
    return null;
  }

  // 事件触发：每个 key 一次冷却，一次一句；null 槽也消耗冷却（沉默是这只搭子的回应）
  function fireEvent(eventBase, vars = {}, cooldownKey = eventBase) {
    if (state.companion === "unset" || state.companion === "none") return false;
    if (state.fired.has(cooldownKey)) return false;
    const line = lineFor(`${eventBase}-${state.companion}`, vars);
    state.fired.add(cooldownKey);
    persistFired();
    if (line === null) return false;
    setCompanionMessage(line);
    return true;
  }

  // ---------- 历史（由已完成小票派生） ----------

  function completedRecords() {
    const records = safeRead(localStorage, STORAGE.records, []);
    return (Array.isArray(records) ? records : []).filter((record) => record.status === "completed");
  }

  function draftRecords() {
    const records = safeRead(localStorage, STORAGE.records, []);
    return (Array.isArray(records) ? records : []).filter((record) => record.status === "draft");
  }

  function historyStats() {
    const stats = new Map();
    for (const record of completedRecords()) {
      for (const line of record.lines || []) {
        const entry = stats.get(line.skuId) || { count: 0, maxQty: 0, name: line.nameSnapshot };
        entry.count += 1;
        entry.maxQty = Math.max(entry.maxQty, Number(line.qty) || 0);
        stats.set(line.skuId, entry);
      }
    }
    return stats;
  }

  // ---------- 渲染 ----------

  function renderPurposeChips() {
    els.purposeChips.innerHTML = purposes.map((purpose) => `
      <button type="button" data-purpose="${purpose.id}" aria-pressed="${state.purposes.has(purpose.id)}">${purpose.label}</button>
    `).join("");
  }

  function renderCategories() {
    els.categoryBar.innerHTML = categories.map((category) => `
      <button type="button" data-category="${category.id}" aria-pressed="${state.category === category.id}">${category.label}</button>
    `).join("");
  }

  function rotateShelfSlogan() {
    const stored = sessionStorage.getItem(STORAGE.lastShelfSlogan);
    const previous = stored === null ? -1 : Number(stored);
    const choices = shelfSlogans.map((_, index) => index).filter((index) => index !== previous);
    const next = choices[Math.floor(Math.random() * choices.length)];
    sessionStorage.setItem(STORAGE.lastShelfSlogan, String(next));
    els.shelfSlogan.textContent = shelfSlogans[next];
  }

  function selectCompanion(id) {
    state.companion = id;
    els.body.dataset.companion = id;
    document.querySelectorAll("[data-pick-companion]").forEach((button) => {
      button.setAttribute("aria-checked", String(button.dataset.pickCompanion === id));
    });
    els.enterShop.disabled = false;
    els.enterShop.textContent = id === "none" ? "自己进商超" : `和${companions[id].name}进商超`;
    els.onboardingNote.textContent = id === "none" ? "无搭子模式仍会保存购物车与本地小票。" : `${companions[id].name}会按自己的注意力陪你看，但不会替你修改商品。`;
    renderRail();
  }

  function togglePurpose(id) {
    if (id === "browse") {
      state.purposes = state.purposes.has("browse") ? new Set() : new Set(["browse"]);
    } else {
      state.purposes.delete("browse");
      if (state.purposes.has(id)) state.purposes.delete(id);
      else if (state.purposes.size < 2) state.purposes.add(id);
      else els.onboardingNote.textContent = "购物目的最多选两项；可以先取消一项再换。";
    }
    renderPurposeChips();
    persistContext();
  }

  function setView(name) {
    if (name === "shop" && state.companion === "unset") {
      name = "welcome";
      requestAnimationFrame(() => document.querySelector("[data-picker]")?.scrollIntoView({ behavior: "smooth" }));
    }
    els.views.forEach((view) => {
      const active = view.dataset.view === name;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });
    document.querySelectorAll("[data-view-target]").forEach((button) => button.classList.toggle("is-active", button.dataset.viewTarget === name));
    if (name === "shop") {
      rotateShelfSlogan();
      renderProducts();
    }
    if (name === "records") renderRecords();
    if (name !== "records") els.secondTripPrompt.hidden = true;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  // 入店：回访事件优先（E10 一次冷却），否则招呼拼接（基句 + 目的尾巴）
  function greetingLine() {
    if (state.companion === "none") return companions.none.intro;
    const base = LIB.greetings[`greeting-base-${state.companion}`] || companions[state.companion].intro;
    const firstPurpose = purposes.find((item) => state.purposes.has(item.id));
    const tail = firstPurpose ? LIB.greetings[firstPurpose.tail] : "";
    return tail ? `${base}${tail}` : base;
  }

  function revisitLine() {
    if (state.companion === "none" || state.companion === "unset") return null;
    if (state.fired.has("E10")) return null;
    const drafts = draftRecords();
    const completed = completedRecords();
    let slot = null;
    let vars = {};
    if (drafts.length) slot = `E10-draft-${state.companion}`;
    else if (completed.length) {
      slot = `E10-completed-${state.companion}`;
      vars = { name: completed[0]?.lines?.[0]?.nameSnapshot };
    }
    if (!slot) return null;
    let line = lineFor(slot, vars);
    if (line === null) line = lineFor(`E10-fallback-${state.companion}`, {});
    if (line !== null) {
      state.fired.add("E10");
      persistFired();
    }
    return line;
  }

  function enterShop() {
    if (state.companion === "unset") return;
    if (state.purposes.size === 0) state.purposes.add("browse");
    state.budgetCents = Number(els.budget.value) || 0;
    localStorage.setItem(STORAGE.companion, state.companion);
    persistContext();
    els.purposeSummary.textContent = [...state.purposes].map((id) => purposes.find((item) => item.id === id)?.label).filter(Boolean).join(" · ");
    renderPurposeChips();
    const entry = revisitLine() || greetingLine();
    state.lastMessage = entry;
    renderRail(entry);
    setView("shop");
  }

  function renderProducts() {
    let visible = products.filter((product) => state.category === "all" || product.categoryMain === state.category);
    if (state.sort === "price-asc") visible = [...visible].sort((a, b) => a.priceCents - b.priceCents);
    if (state.sort === "price-desc") visible = [...visible].sort((a, b) => b.priceCents - a.priceCents);
    els.emptyState.hidden = visible.length !== 0;
    els.productGrid.hidden = visible.length === 0;
    if (els.emptyStateCopy) els.emptyStateCopy.textContent = LIB.system["system-empty-filter"] || "这一架暂时空着，换一架看看吧。";
    els.productGrid.innerHTML = visible.map(productCard).join("");
  }

  function productCard(product) {
    const category = categoryInfo(product.categoryMain);
    const quantity = state.cart[product.id] || 0;
    const unit = product.unitPrice ? `${money(product.unitPrice.cents)} / ${product.unitPrice.per}${product.unitPrice.unit}` : "单位价暂不可算";
    const tags = (product.demoRoles || []).slice(0, 2).map((tag) => roleLabels[tag]).filter(Boolean);
    return `
      <article class="product-card" data-category="${escapeHtml(product.categoryMain)}" data-product-id="${escapeHtml(product.id)}">
        <div class="product-card__visual">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}商品图" loading="lazy" decoding="async">
        </div>
        <div class="product-card__body">
          <div class="product-card__meta"><span>${category.label}</span><span>${product.isNew ? "NEW · 演示标签" : "本地商品"}</span></div>
          <h3>${escapeHtml(product.name)}</h3>
          <p class="product-card__package">${escapeHtml(product.packageText || "规格待补")}</p>
          <div class="product-card__facts">${tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
          <div class="product-card__footer">
            <span class="product-card__price"><strong>${money(product.priceCents)}</strong><small>${unit}</small></span>
            ${quantity ? `<span class="product-card__qty"><button type="button" data-cart-delta="-1" aria-label="减少一件">−</button><b>${quantity}</b><button type="button" data-cart-delta="1" aria-label="增加一件">＋</button></span>` : `<button class="product-card__add" type="button" data-cart-delta="1" aria-label="加入${escapeHtml(product.name)}">＋</button>`}
          </div>
        </div>
      </article>`;
  }

  // ---------- 购物车与事件判定 ----------

  function cartEntries() {
    return Object.entries(state.cart)
      .map(([id, qty]) => ({ product: productById.get(id), qty }))
      .filter((entry) => entry.product);
  }

  function cartLineCount() {
    return cartEntries().reduce((sum, entry) => sum + entry.qty, 0);
  }

  function cartTotal() {
    return cartEntries().reduce((sum, entry) => sum + entry.product.priceCents * entry.qty, 0);
  }

  function distinctInCategory(category) {
    return cartEntries().filter((entry) => entry.product.categoryMain === category).length;
  }

  function hasApplePair() {
    return Boolean(state.cart["drink-apple-nfc-s"] && state.cart["drink-apple-nfc-l"]);
  }

  function hasHungerItem() {
    return cartEntries().some(({ product }) => (product.lifeRoles || []).some((role) => HUNGER_ROLES.includes(role)));
  }

  // 加车后的事件裁定：E4 > E1 > E3 > E2 > E7 > E8 > E6，一次只说一句
  // E4 排在 E1 前：二次体验的立意是让用户亲身遇见"回购"，熟面孔的招呼比"第一件"更值得说
  function onItemAdded(product, wasEmpty, newQty) {
    const stats = historyStats();
    const sku = stats.get(product.id);
    const vars = { name: product.name, price: money(product.priceCents), categoryName: categoryInfo(product.categoryMain).label };

    if (sku && sku.count >= 1 && newQty === 1 && fireEvent("E4", { ...vars, purchaseCount: sku.count }, `E4:${product.id}`)) return;
    if (wasEmpty && fireEvent("E1", vars)) return;
    if (product.isNew && newQty === 1 && fireEvent("E3", vars, `E3:${product.id}`)) return;
    if (distinctInCategory(product.categoryMain) >= 2 && fireEvent("E2", vars, `E2:${product.categoryMain}`)) return;
    if (sku && sku.maxQty >= 1 && newQty > Math.max(sku.maxQty, 1) && fireEvent("E7", { ...vars, qty: newQty }, `E7:${product.id}`)) return;
    if (state.budgetCents > 0 && cartTotal() >= state.budgetCents * 0.8) {
      const percent = Math.round((cartTotal() / state.budgetCents) * 100);
      if (fireEvent("E8", { totalPrice: money(cartTotal()), budgetPercent: percent })) return;
    }
    const wantsHunger = state.purposes.has("prepare_hunger") || state.purposes.has("stock_up");
    if (wantsHunger && cartLineCount() >= 3 && !hasHungerItem()) fireEvent("E6", {});
  }

  function changeQuantity(id, delta) {
    const product = productById.get(id);
    if (!product) return;
    const previousTotal = cartLineCount();
    const previousQty = state.cart[id] || 0;
    const next = Math.max(0, Math.min(20, previousQty + delta));
    if (next === 0) delete state.cart[id];
    else state.cart[id] = next;
    persistCart();
    renderProducts();
    renderCart();
    if (delta > 0 && next > previousQty) {
      if (previousQty === 0 && state.removedSkus.has(id)) {
        state.removedSkus.delete(id);
        persistFired();
        if (fireEvent("E9", { name: product.name }, `E9:${id}`)) return;
      }
      onItemAdded(product, previousTotal === 0, next);
    } else if (previousQty > 0 && next === 0) {
      state.removedSkus.add(id);
      persistFired();
    }
  }

  // ---------- 陪逛栏 ----------

  function renderRail(message = state.lastMessage) {
    if (state.companion === "unset") return;
    const companion = companions[state.companion];
    els.body.dataset.companion = state.companion;
    els.railName.textContent = companion.name;
    els.railRole.textContent = companion.role;
    els.railImage.src = companion.image || "assets/trio.webp";
    els.railImage.alt = companion.image ? companion.name : "";
    els.railImage.hidden = !companion.image;
    if (els.railMotif) els.railMotif.hidden = true;
    if (els.railSeal) {
      // 无搭子名旁不落车徽（画像即是车，名旁再挂就重复）；小票索引章照旧
      if (companion.sealS && state.companion !== "none") {
        els.railSeal.src = companion.sealS;
        els.railSeal.hidden = false;
      } else {
        els.railSeal.hidden = true;
      }
    }
    els.companionMessage.textContent = message || companion.intro;
    renderSwitchRow();
  }

  function renderSwitchRow() {
    if (!els.switchRow) return;
    const order = ["lili", "niannian", "yaya", "none"];
    els.switchRow.innerHTML = order.map((id) => `
      <button type="button" data-switch-companion="${id}" aria-pressed="${state.companion === id}" title="${id === "none" ? "今天自己逛" : `换${companions[id].name}陪你`}">${id === "none" ? "自" : companions[id].name.slice(0, 1)}</button>
    `).join("");
  }

  // ST-FE-003：就地换搭子——不离开货架，车原样带着
  function switchCompanion(id) {
    if (id === state.companion) return;
    state.companion = id;
    localStorage.setItem(STORAGE.companion, id);
    els.body.dataset.companion = id;
    const line = id === "none" ? companions.none.intro : (LIB.switching[`switch-${id}`] || companions[id].intro);
    state.lastMessage = line;
    renderRail(line);
    if (els.switchNote) {
      const showNote = id !== "none" && cartLineCount() > 0;
      els.switchNote.textContent = showNote ? (LIB.switching["switch-cart-retained"] || "") : "";
      els.switchNote.hidden = !showNote;
    }
  }

  function setCompanionMessage(message) {
    state.lastMessage = message;
    renderRail(message);
    if (els.switchNote) els.switchNote.hidden = true;
  }

  // ---------- 主动授权操作（只在点击后出现） ----------

  function actionLine(action) {
    const entries = cartEntries();
    if (state.companion === "none") return LIB.actions["companion-action-none-common"];
    if (!entries.length) return LIB.actions["companion-action-empty-cart-common"];
    const who = state.companion;

    if (action === "look") {
      const topNames = entries.slice(0, 2).map(({ product }) => product.name).join("、");
      return fmt(LIB.actions[`companion-action-look-${who}`], {
        itemCount: cartLineCount(), totalPrice: money(cartTotal()), topNames
      });
    }

    if (action === "compare") {
      if (hasApplePair()) return LIB.actions[`companion-action-compare-apple-pair-${who}`];
      const group = categories.slice(1)
        .map((category) => ({ category, items: entries.filter(({ product }) => product.categoryMain === category.id) }))
        .find((item) => item.items.length >= 2);
      if (!group) return LIB.actions["companion-action-compare-no-pair-common"];
      const [a, b] = group.items.map(({ product }) => product);
      return fmt(LIB.actions[`companion-action-compare-${who}`], {
        nameA: a.name, priceA: money(a.priceCents), nameB: b.name, priceB: money(b.priceCents),
        categoryName: group.category.label
      });
    }

    if (action === "organize") {
      const total = cartTotal();
      if (state.budgetCents && total >= state.budgetCents * 0.8) {
        return fmt(LIB.actions[`companion-action-organize-budget-${who}`], {
          totalPrice: money(total), budgetAmount: money(state.budgetCents),
          budgetRelation: total > state.budgetCents ? "超过" : "接近"
        });
      }
      const wantsHunger = state.purposes.has("prepare_hunger") || state.purposes.has("stock_up");
      if (wantsHunger && !hasHungerItem()) return LIB.actions["companion-action-organize-hunger-gap-common"];
      return LIB.actions["companion-action-organize-default-common"];
    }
    return companions[who].intro;
  }

  // ---------- 购物车抽屉 ----------

  function renderCart() {
    const entries = cartEntries();
    els.cartCount.textContent = cartLineCount();
    els.cartTotal.textContent = money(cartTotal());
    // 货架尽头结算卡（改单第 6 条案一）：逛到头自然遇见收银台；空车不摆台
    if (els.shelfCheckout) {
      els.shelfCheckout.hidden = !entries.length;
      if (entries.length && els.shelfCheckoutSummary) {
        els.shelfCheckoutSummary.textContent = `这辆车 ${cartLineCount()} 件 · 合计 ${money(cartTotal())}`;
      }
    }
    if (!entries.length) {
      els.cartItems.innerHTML = `<div class="cart-empty"><img class="cart-empty__bird" src="assets/deco/deco-bird.png" alt="" aria-hidden="true"><p>${escapeHtml(LIB.system["system-empty-cart"] || "购物车还空着，慢慢逛。")}</p></div>`;
      return;
    }
    els.cartItems.innerHTML = entries.map(({ product, qty }) => `
      <article class="cart-item" data-cart-id="${escapeHtml(product.id)}">
        <div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.packageText)} · ${money(product.priceCents * qty)}</p></div>
        <div class="cart-item__controls"><button type="button" data-drawer-delta="-1" aria-label="减少一件">−</button><b>${qty}</b><button type="button" data-drawer-delta="1" aria-label="增加一件">＋</button></div>
      </article>
    `).join("");
  }

  function openCart() {
    els.cartDrawer.classList.add("is-open");
    els.cartDrawer.setAttribute("aria-hidden", "false");
    els.scrim.hidden = false;
  }

  function closeCart() {
    els.cartDrawer.classList.remove("is-open");
    els.cartDrawer.setAttribute("aria-hidden", "true");
    els.scrim.hidden = true;
  }

  // ---------- 结账镜像（E11 拼片）与 E5 缺席检查 ----------

  // E11：最贵 → 新品 → 回购，同款不重复点名，缺哪类就少点一件
  function mirrorLine() {
    const entries = cartEntries();
    if (state.companion === "none" || state.companion === "unset") return null;
    const slot = LIB.events[`E11-${state.companion}`];
    if (!slot || typeof slot !== "object") return null;
    const stats = historyStats();
    const used = new Set();
    const pieces = [];

    const top = [...entries].sort((a, b) => b.product.priceCents - a.product.priceCents)[0];
    if (top) {
      const piece = fmt(slot.top, { topName: top.product.name });
      if (piece) { pieces.push(piece); used.add(top.product.id); }
    }
    const fresh = entries.find(({ product }) => product.isNew && !used.has(product.id));
    if (fresh) {
      const piece = fmt(slot.fresh, { newName: fresh.product.name });
      if (piece) { pieces.push(piece); used.add(fresh.product.id); }
    }
    const repeat = entries.find(({ product }) => (stats.get(product.id)?.count || 0) >= 1 && !used.has(product.id));
    if (repeat) {
      const piece = fmt(slot.repeat, { repeatName: repeat.product.name });
      if (piece) pieces.push(piece);
    }
    if (!pieces.length) return typeof slot.fallback === "string" ? slot.fallback : null;
    return pieces.join("，") + (slot.tail || "。");
  }

  function neutralSummary() {
    return `共 ${cartLineCount()} 件，合计 ${money(cartTotal())}。`;
  }

  function openCheckout() {
    if (!cartEntries().length) {
      closeCart();
      return;
    }
    // E5：常备品缺席——买过两次以上、这次没在车里
    const stats = historyStats();
    const missing = [...stats.entries()].find(([skuId, info]) => info.count >= 2 && !state.cart[skuId]);
    if (missing) fireEvent("E5", { name: missing[1].name });

    const line = mirrorLine();
    els.checkoutMirror.innerHTML = `${line ? `<p>${escapeHtml(line)}</p>` : ""}<p><strong>${money(cartTotal())}</strong> · ${cartLineCount()} 件</p>`;
    // 信头 + 落款分工（改单第 5 条修订版）：华丽章当信头，署名行只留文字；无搭子素面
    const speaking = state.companion !== "none" && state.companion !== "unset";
    const mirrorCompanion = companions[state.companion];
    if (els.mirrorByline) {
      els.mirrorByline.textContent = speaking && line ? `${mirrorCompanion.name} · 整车回看` : "";
      els.mirrorByline.hidden = !(speaking && line);
    }
    if (els.checkoutSeal) {
      // v0.4.3 改判：无搭子镜像也落一枚车徽（简洁版、略淡），免得素面信头被读成"装饰没加载"；落款行仍不出现
      const noneSeal = state.companion === "none" ? companions.none.sealS : "";
      const src = speaking && mirrorCompanion.sealL ? mirrorCompanion.sealL : noneSeal;
      els.checkoutSeal.classList.toggle("checkout-seal--none", Boolean(noneSeal));
      if (src) {
        els.checkoutSeal.src = src;
        els.checkoutSeal.hidden = false;
      } else {
        els.checkoutSeal.hidden = true;
      }
    }
    closeCart();
    if (typeof els.checkoutDialog.showModal === "function") els.checkoutDialog.showModal();
    else els.checkoutDialog.setAttribute("open", "");
  }

  // ---------- 小票 ----------

  function buildRecord(status) {
    const now = new Date().toISOString();
    return {
      id: `receipt-${Date.now()}`,
      status,
      createdAt: now,
      updatedAt: now,
      purchasedAt: status === "completed" ? now : null,
      purposes: [...state.purposes],
      companion: state.companion,
      lines: cartEntries().map(({ product, qty }) => ({
        skuId: product.id,
        nameSnapshot: product.name,
        priceCentsSnapshot: product.priceCents,
        packageTextSnapshot: product.packageText,
        qty
      })),
      summary: neutralSummary(),
      totalCents: cartTotal()
    };
  }

  function saveRecord(status) {
    if (!cartEntries().length) return null;
    const records = safeRead(localStorage, STORAGE.records, []);
    const record = buildRecord(status);
    const next = [record, ...(Array.isArray(records) ? records : [])].slice(0, 24);
    localStorage.setItem(STORAGE.records, JSON.stringify(next));
    return record;
  }

  function saveDraft() {
    if (!saveRecord("draft")) {
      closeCart();
      return;
    }
    setCompanionMessage("这辆车已保存成本地草稿，下次从小票记录能找到。");
    closeCart();
  }

  function confirmCheckout(event) {
    event.preventDefault();
    const completedRecord = saveRecord("completed");
    if (!completedRecord) return;
    state.cart = {};
    persistCart();
    renderCart();
    renderProducts();
    els.checkoutDialog.close("confirm");
    setView("records");
    showSecondTripPrompt(completedRecord.id);
  }

  function showSecondTripPrompt(receiptId) {
    const prompted = safeRead(localStorage, STORAGE.promptedReceipts, []);
    if (Array.isArray(prompted) && prompted.includes(receiptId)) return;
    const nextPrompted = [receiptId, ...(Array.isArray(prompted) ? prompted : [])].slice(0, 24);
    localStorage.setItem(STORAGE.promptedReceipts, JSON.stringify(nextPrompted));
    if (!secondTripPrompts.length) return;
    const index = Math.floor(Math.random() * secondTripPrompts.length);
    els.secondTripCopy.textContent = secondTripPrompts[index];
    els.secondTripPrompt.hidden = false;
  }

  function startSecondTrip() {
    state.purposes = new Set();
    state.budgetCents = 0;
    state.cart = {};
    state.category = "all";
    state.sort = "default";
    state.lastMessage = "";
    state.fired = new Set();
    state.removedSkus = new Set();
    els.budget.value = "";
    els.sort.value = "default";
    els.purposeSummary.textContent = "先随便看看";
    persistContext();
    persistCart();
    persistFired();
    renderPurposeChips();
    renderCategories();
    renderProducts();
    renderCart();
    els.secondTripPrompt.hidden = true;
    selectCompanion(state.companion);
    setView("welcome");
    requestAnimationFrame(() => document.querySelector("[data-picker]")?.scrollIntoView({ behavior: "smooth" }));
  }

  function renderRecords() {
    const records = safeRead(localStorage, STORAGE.records, []);
    if (!Array.isArray(records) || !records.length) {
      els.recordList.innerHTML = `<div class="record-empty"><img class="record-empty__bird" src="assets/deco/deco-bird.png" alt="" aria-hidden="true"><p class="eyebrow">No local receipt yet</p><h2>还没有保存的小票</h2><p>${escapeHtml(LIB.system["system-no-completed-receipt"] || "")}</p></div>`;
      return;
    }
    els.recordList.innerHTML = records.map((record) => {
      const companion = companions[record.companion] || companions.none;
      const date = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(record.purchasedAt || record.createdAt));
      const names = (record.lines || []).slice(0, 3).map((line) => line.nameSnapshot).join("、");
      const seal = companion.sealS ? `<img class="record-seal" src="${companion.sealS}" alt="" aria-hidden="true">` : "";
      return `<article class="record-card" data-companion="${escapeHtml(record.companion || "none")}"><div class="record-card__top"><span>${record.status === "completed" ? "已完成" : "草稿"}</span><time>${date}</time></div><h2>${record.companion === "none" ? "自己逛" : `${companion.name}同行`}${seal}</h2><p>${escapeHtml(names || "空记录")}</p><p>${(record.lines || []).length > 3 ? `另有 ${(record.lines || []).length - 3} 种商品` : ""}</p><strong>${money(record.totalCents)}</strong></article>`;
    }).join("");
  }

  // ---------- 事件绑定 ----------

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const viewButton = event.target.closest("[data-view-target]");
      if (viewButton) setView(viewButton.dataset.viewTarget);

      const pick = event.target.closest("[data-pick-companion]");
      if (pick) selectCompanion(pick.dataset.pickCompanion);

      const purpose = event.target.closest("[data-purpose]");
      if (purpose) togglePurpose(purpose.dataset.purpose);

      // 只认类目栏里的筹码：商品卡也带 data-category（供 CSS 配色），不许它劫持筛选
      const category = event.target.closest(".category-bar [data-category]");
      if (category) {
        state.category = category.dataset.category;
        renderCategories();
        renderProducts();
      }

      const productButton = event.target.closest("[data-cart-delta]");
      if (productButton) {
        const card = productButton.closest("[data-product-id]");
        changeQuantity(card.dataset.productId, Number(productButton.dataset.cartDelta));
      }

      const drawerButton = event.target.closest("[data-drawer-delta]");
      if (drawerButton) {
        const item = drawerButton.closest("[data-cart-id]");
        changeQuantity(item.dataset.cartId, Number(drawerButton.dataset.drawerDelta));
      }

      const switcher = event.target.closest("[data-switch-companion]");
      if (switcher) switchCompanion(switcher.dataset.switchCompanion);

      const action = event.target.closest("[data-companion-action]");
      if (action) {
        const line = actionLine(action.dataset.companionAction);
        if (line) setCompanionMessage(line);
      }
    });

    document.querySelector("[data-scroll-to-picker]").addEventListener("click", () => document.querySelector("[data-picker]").scrollIntoView({ behavior: "smooth" }));
    els.enterShop.addEventListener("click", enterShop);
    els.budget.addEventListener("change", () => { state.budgetCents = Number(els.budget.value) || 0; persistContext(); });
    els.sort.addEventListener("change", () => { state.sort = els.sort.value; renderProducts(); });
    document.querySelector("[data-change-companion]").addEventListener("click", () => { setView("welcome"); requestAnimationFrame(() => document.querySelector("[data-picker]").scrollIntoView({ behavior: "smooth" })); });
    document.querySelector("[data-cart-toggle]").addEventListener("click", openCart);
    document.querySelectorAll("[data-cart-close]").forEach((button) => button.addEventListener("click", closeCart));
    document.querySelector("[data-save-draft]").addEventListener("click", saveDraft);
    document.querySelector("[data-checkout]").addEventListener("click", openCheckout);
    document.querySelector("[data-shelf-checkout-btn]")?.addEventListener("click", openCheckout);
    document.querySelector("[data-confirm-checkout]").addEventListener("click", confirmCheckout);
    document.querySelector("[data-start-second-trip]").addEventListener("click", startSecondTrip);
  }

  function init() {
    renderPurposeChips();
    renderCategories();
    renderProducts();
    renderCart();
    renderRecords();
    els.budget.value = state.budgetCents ? String(state.budgetCents) : "";
    if (state.companion !== "unset") selectCompanion(state.companion);
    else els.body.dataset.companion = "unset";
    bindEvents();
    warmDecor();
  }

  // v0.4.3：镜像信头章与抽屉干花卡在手机上是按需加载的（打开时才取），弱网下先出字后出章，
  // 会被读成"装饰掉了"。首屏渲染完后空闲时预热一遍，打开镜像即见。
  function warmDecor() {
    const list = [companions.lili.sealL, companions.niannian.sealL, companions.yaya.sealL, companions.none.sealS, "assets/deco2/card-flowers.png"];
    const run = () => list.forEach((src) => { const img = new Image(); img.decoding = "async"; img.src = src; });
    if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 2500 });
    else window.setTimeout(run, 800);
  }

  init();
})();
