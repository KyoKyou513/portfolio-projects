// ============================================================
// ST copyLibrary v1.0
// 唯一真源：协作咖啡厅/60_已定稿/ST-COPY-004__ST__台词终版合集__v1.0.md
// 装配：穗（奉滢滢 2026-08-29 04:48 指派），逐字照录，零润色
// 结构：flat map，键 = 定稿稳定编号（81 个）
//   事件槽：{ text, fallback }（null = 设计沉默，不是缺档）
//   E11：拼片 { top, fresh, repeat, tail, fallback }
//   其余：字符串
// 装配约定（renderer 侧执行）：
//   1) {topNames} 至多拼 2 个商品名（3 名并列超 60 字尺）
//   2) 变量缺失时走 fallback。fallback 为 null 则该次沉默
//   3) E8-yaya 句末波浪号为滢滢特批正字
//   4) 全库禁分号、禁斜杠分支——装配时机检已核，改动须重跑机检
// ============================================================

const COPY_LIBRARY = {
  version: "1.0",
  source: "ST-COPY-004 v1.0 (2026-08-29 定稿)",

  events: {
    "E1-lili":     { text: "{name}，{price}。我先记下。", fallback: "第一件。我先记下。" },
    "E1-niannian": { text: "第一件是{name}，我记住啦。", fallback: "第一件，我记住啦。" },
    "E1-yaya":     { text: "{name}！第一件就有意思。", fallback: "第一件就有意思。" },

    "E2-lili":     { text: "两件{categoryName}，差别我给你摊开。", fallback: "两件同类，差别我给你摊开。" },
    "E2-niannian": null,
    "E2-yaya":     { text: "两件{categoryName}，看着就不一样呢。", fallback: "两件同类品，但看着就不一样呢。" },

    "E3-lili":     { text: "{name}，{price}。新品我先记下。", fallback: "新品，先记一笔。" },
    "E3-niannian": { text: "{name}是新面孔呢，慢慢挑。", fallback: "新面孔呀，我们慢慢挑。" },
    "E3-yaya":     { text: "{name}是新面孔！味道开袋才知道。", fallback: "新面孔！好不好吃，开袋才知道。" },

    "E4-lili":     { text: "{name}，我们买过{purchaseCount}次了。", fallback: "买过几次，不算新客。" },
    "E4-niannian": { text: "{name}又来啦，你带过它{purchaseCount}次了哦。", fallback: "又见面咯，以前带过它呢。" },
    "E4-yaya":     { text: "{name}嘿！熟面孔，我见过它{purchaseCount}次。", fallback: null },

    "E5-lili":     null,
    "E5-niannian": { text: "常买的{name}这次没在。我先替你记着。", fallback: "有样常买的这次没在。念念会先记着的。" },
    "E5-yaya":     { text: "{name}这次没在，下次再看看吧。", fallback: null },

    "E6-lili":     { text: "顶饿的现在还是0件，要补一点吗？", fallback: "顶饿的现在是0件，要补一点吗？" },
    "E6-niannian": { text: "车里还缺一样垫肚子的，要再看看嘛？", fallback: "还缺一样垫肚子的，要再看看嘛？" },
    "E6-yaya":     { text: "嗯？这次不备点扛饿的吗？", fallback: null },

    "E7-lili":     { text: "{name}×{qty}，比惯常多。", fallback: "这次的数量似乎比惯常多。" },
    "E7-niannian": { text: "{name}拿了{qty}件，比平时多些呢。", fallback: "这次比平时多些呢。" },
    "E7-yaya":     { text: "哇，{name}一下拿了{qty}件，芽芽也想试试！", fallback: null },

    "E8-lili":     { text: "整车{totalPrice}，到预算{budgetPercent}%了。数字在这。", fallback: "到预算线了。这是总价。" },
    "E8-niannian": { text: "到预算线了哦，总价是{totalPrice}，念念算好啦。", fallback: null },
    "E8-yaya":     { text: "诶，快到预算线啦，芽芽提个醒~", fallback: null },

    "E9-lili":     { text: "{name}加回来了。好，我记下了。", fallback: "加回来了。按现在的总价算。" },
    "E9-niannian": { text: "{name}回来啦。", fallback: "回来了。刚才那趟不算数哦。" },
    "E9-yaya":     { text: "嘿，{name}又回来啦。", fallback: null },

    "E10-draft-lili":         "上次那辆车还在，今天接着对对看？",
    "E10-draft-niannian":     "上次那辆车还留着，今天接着慢慢逛嘛？",
    "E10-draft-yaya":         "上次那辆车还在！今天接着找点新东西。",
    "E10-completed-lili":     "上次的小票还在，今天新开一页。",
    "E10-completed-niannian": "回来啦。上次带走了{name}。",
    "E10-completed-yaya":     "又见面啦！今天会有什么新发现呢。",
    "E10-demo-lili":          "演示记录已载入，今天另开一页账。",
    "E10-demo-niannian":      "演示记录还在，今天慢慢看看嘛？",
    "E10-demo-yaya":          "演示记录已载入！今天会遇上什么呢。",
    "E10-fallback-lili":      "记录还在，今天另开一页。",
    "E10-fallback-niannian":  "回来啦，今天可以慢慢看。",
    "E10-fallback-yaya":      "又见面啦！看看今天的新发现。",

    "E11-lili": {
      top: "{topName}最贵", fresh: "{newName}新品", repeat: "{repeatName}回购",
      tail: "。", fallback: "整车点过了，合计在这里。"
    },
    "E11-niannian": {
      top: "{topName}备上", fresh: "{newName}新面孔", repeat: "{repeatName}又见面",
      tail: "。都记着。", fallback: "这辆车看过了，带不带走可以慢慢想。"
    },
    "E11-yaya": {
      top: "{topName}镇场", fresh: "{newName}新面孔", repeat: "{repeatName}又回来",
      tail: "。还想逛也行！", fallback: "这辆车有意思，还想逛也行！"
    }
  },

  greetings: {
    "greeting-base-lili":     "来了。慢慢逛，数字我来盯着。",
    "greeting-base-niannian": "来了，今天慢慢看。",
    "greeting-base-yaya":     "来啦！看看今天有什么新货。",
    "greeting-purpose-restock":        "常备见底，先从熟悉的补起。",
    "greeting-purpose-treat":          "好吃好喝的，往口味那边看。",
    "greeting-purpose-try-new":        "新品都摆在显眼位置。",
    "greeting-purpose-prepare-hunger": "备点顶饿的，慢慢挑。",
    "greeting-purpose-stock-up":       "认真囤一轮，大规格都在架上。",
    "greeting-purpose-browse":         "没有目标也没关系，随便逛逛。"
  },

  system: {
    "system-empty-cart":           "购物车还空着，慢慢逛。",
    "system-empty-filter":         "这一架暂时空着，换一架看看吧。",
    "system-no-completed-receipt": "还没有完成的小票。完成第一张后，这里会有记录。",
    "system-missing-variable":     "这件的信息还不全，先看看别的。"
  },

  secondTrip: {
    "second-trip-1": "要不要换个搭子，再走一程？",
    "second-trip-2": "或许可以听听另一种声音？",
    "second-trip-3": "再逛一趟，有什么想回购的嘛？",
    "second-trip-4": "下一趟，什么品类会勾起好奇心呢。"
  },

  switching: {
    "switch-lili":         "换我了。账目我来接手看。",
    "switch-niannian":     "换我陪你，前面的路我都记得哦。",
    "switch-yaya":         "轮到我啦！新东西我来看。",
    "switch-cart-retained": "购物车会原样带着的。",
    "companion-none-system": "现在自己逛逛，购物车和记录照常保留。"
  },

  actions: {
    "companion-action-empty-cart-common": "车还是空的。等有一两件商品，我们再一起看吧。",
    "companion-action-none-common": "今天自己逛，搭子不插话。购物车和小票照常工作。",
    "companion-action-look-lili": "这辆车现在有 {itemCount} 件，合计 {totalPrice}。前几件是{topNames}。数字我先记下。",
    "companion-action-look-niannian": "我先看见了{topNames}。它们把这辆车填满不少啦。",
    "companion-action-look-yaya": "嗯，{topNames}站在前排，一眼就看到啦。后面的商品呢？让我来看看。",
    "companion-action-compare-no-pair-common": "当前还没有两件同类商品可以比较。再逛一会儿，或者就保持现在这样。",
    "companion-action-compare-lili": "{nameA}是 {priceA}，{nameB}是 {priceB}，规格也不同。一起看看差异。",
    "companion-action-compare-niannian": "{nameA}和{nameB}都在{categoryName}这一类哦。想都留下，还是没决定好？我们慢慢想。",
    "companion-action-compare-yaya": "{nameA}遇上{nameB}。同一格里的两种性格，有意思。",
    "companion-action-compare-apple-pair-lili": "同款苹果汁，大瓶每百毫升约便宜四成，小瓶胜在便携。两种各有优势，具体看你的需求。",
    "companion-action-compare-apple-pair-niannian": "小瓶和大瓶今天都在车里。它们可以各有用处，也可以只是同一口味的两种规格。我先把这点记下。",
    "companion-action-compare-apple-pair-yaya": "苹果汁的大小瓶都上车了：一个轻巧，一个管够。看起来像同一口味的两条路线。",
    "companion-action-organize-budget-lili": "当前合计 {totalPrice}，已经{budgetRelation}你设的 {budgetAmount}。数字到线了。要不要调整，由你决定。",
    "companion-action-organize-budget-niannian": "预算线在 {budgetAmount}，这辆车现在是 {totalPrice}。念念和你一起看，调不调整慢慢想。",
    "companion-action-organize-budget-yaya": "预算线在 {budgetAmount}，这辆车现在是 {totalPrice}。芽芽和你一起看，调不调整都行！",
    "companion-action-organize-hunger-gap-common": "你选了“给饿的时候备一点”，但车里暂时没有标作顶饿、即食或低准备的商品。可以去速食顶饿那格看看，也可以保持现在这样。",
    "companion-action-organize-default-common": "暂时没发现要动的地方。接着逛或停在这里，都可以。"
  }
};

// file:// 环境下与 data/products.js 同法：全局常量，无模块系统
if (typeof window !== "undefined") { window.COPY_LIBRARY = COPY_LIBRARY; }
