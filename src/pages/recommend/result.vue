<script setup>
import { computed, ref, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useAppStore } from "@/store/app";
import { getAiChatLog } from "@/utils/api";

const store = useAppStore();

const override = ref(null);
const trace = ref([]);
const loadingSession = ref(false);

function pushTrace(tag, payload) {
  try {
    const count =
      (payload &&
        typeof payload === "object" &&
        Array.isArray(payload.products) &&
        payload.products.length) ||
      (!Array.isArray(payload) &&
      typeof payload === "object" &&
      payload &&
      payload.reply
        ? "hasReply"
        : 0);
    const meta =
      typeof payload === "string"
        ? "s:" + payload.length
        : payload && typeof payload === "object"
          ? "o:" +
            (Array.isArray(payload.products) ? payload.products.length : 0)
          : typeof payload;
    trace.value.push(tag + ":" + meta + ":" + count);
  } catch (error) {
    trace.value.push(tag + ":err:" + String((error && error.message) || error));
  }
}

function normalizeObject(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  if (
    Array.isArray(obj.products) ||
    typeof obj.reply === "string" ||
    obj.success !== undefined
  ) {
    return obj;
  }
  if (typeof obj.text === "string") {
    try {
      const inner = JSON.parse(obj.text);
      if (inner && typeof inner === "object") return inner;
    } catch (ignore) {
      // ignore
    }
  }
  if (obj.data && typeof obj.data === "object") {
    return normalizeObject(obj.data);
  }
  return null;
}

function parseMaybeString(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return normalizeObject(p);
    } catch (ignore) {
      return null;
    }
  }
  return normalizeObject(raw);
}

function pickBestRecommendation(queryData) {
  // 1. URL query 参数（来自 question.vue navigateTo 拼的 data）
  if (queryData) {
    const parsed = parseMaybeString(queryData);
    pushTrace("1_query", parsed);
    if (parsed && Array.isArray(parsed.products) && parsed.products.length)
      return parsed;
  }

  // 2. window 全局单例（question.vue 写入）
  let windowObj = null;
  try {
    if (typeof window !== "undefined" && window.__XZZX_RECOMMENDATION__) {
      windowObj = normalizeObject(window.__XZZX_RECOMMENDATION__);
    }
  } catch (ignore) {
    // ignore
  }
  pushTrace("2_window", windowObj);
  if (
    windowObj &&
    Array.isArray(windowObj.products) &&
    windowObj.products.length
  )
    return windowObj;

  // 3. getApp().globalData
  let globalObj = null;
  try {
    if (typeof getApp === "function") {
      const app = getApp();
      if (app && app.globalData && app.globalData.pendingRecommendation) {
        globalObj = normalizeObject(app.globalData.pendingRecommendation);
      }
    }
  } catch (ignore) {
    // ignore
  }
  pushTrace("3_globalData", globalObj);
  if (
    globalObj &&
    Array.isArray(globalObj.products) &&
    globalObj.products.length
  )
    return globalObj;

  // 4. 独立 storage key（question.vue 写入）
  let storageObj = null;
  try {
    const s = uni.getStorageSync("xczx-tuijian-pending-recommendation");
    if (s && typeof s === "string") storageObj = parseMaybeString(s);
  } catch (ignore) {
    // ignore
  }
  pushTrace("4_storagePending", storageObj);
  if (
    storageObj &&
    Array.isArray(storageObj.products) &&
    storageObj.products.length
  )
    return storageObj;

  // 5. store 内存（持久化 read 出来的 recommendation）
  const storeObj = normalizeObject(store.recommendation);
  pushTrace("5_storeMemory", storeObj);
  if (storeObj && Array.isArray(storeObj.products) && storeObj.products.length)
    return storeObj;

  // 最后兜底：把 store.recommendation 原样返回当回复文本用
  return (
    storeObj ||
    storageObj ||
    globalObj ||
    windowObj ||
    parseMaybeString(queryData) ||
    null
  );
}

function isAssistantMsg(m) {
  if (!m || typeof m !== "object") return false;
  const raw =
    (typeof m.role === "string" ? m.role : "") +
    "|" +
    (typeof m.messageType === "string" ? m.messageType : "") +
    "|" +
    (typeof m.sender === "string" ? m.sender : "") +
    "|" +
    (typeof m.senderRole === "string" ? m.senderRole : "") +
    "|" +
    (typeof m.type === "string" ? m.type : "");
  return /assistant|ai|bot|robot|模型|回复|回答|智能体/i.test(raw);
}

function pickStringField(m, candidates) {
  for (const k of candidates) {
    const v = m[k];
    if (typeof v === "string" && v) return v;
  }
  return "";
}

function extractLastAiReplyText(data) {
  if (!data || typeof data !== "object") return "";
  const candidates = [];
  const keysToScan = [
    "messages",
    "messageList",
    "chatMessages",
    "logs",
    "logList",
    "records",
    "chatRecords",
    "list",
    "items",
    "conversation",
    "dialogs",
    "history",
    "rows",
    "data",
  ];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      if (
        node.some(
          (n) =>
            n &&
            typeof n === "object" &&
            (n.role || n.sender || n.messageType || isAssistantMsg(n)),
        )
      ) {
        candidates.push(...node.filter((n) => n && typeof n === "object"));
      }
      node.forEach(walk);
      return;
    }
    for (const k of keysToScan) {
      if (Array.isArray(node[k])) {
        node[k].forEach(walk);
      }
    }
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (!v) continue;
      if (typeof v === "object") walk(v);
    }
  }
  walk(data);
  const assistants = candidates.filter((m) => isAssistantMsg(m));
  if (!assistants.length) {
    const arr = Object.values(data).find((v) => Array.isArray(v));
    if (Array.isArray(arr)) {
      for (let i = arr.length - 1; i >= 0; i -= 1) {
        const e = arr[i];
        if (e && typeof e === "object") {
          const txt = pickStringField(e, [
            "text",
            "content",
            "reply",
            "message",
            "answer",
            "result",
            "response",
          ]);
          if (txt) return txt;
        }
      }
    }
    return "";
  }
  const last = assistants[assistants.length - 1];
  const text = pickStringField(last, [
    "text",
    "content",
    "reply",
    "message",
    "answer",
    "result",
    "response",
    "output",
  ]);
  if (text) return text;
  if (last.result && typeof last.result === "string") return last.result;
  if (last.result && typeof last.result === "object") {
    const inner = pickStringField(last.result, [
      "text",
      "content",
      "reply",
      "message",
      "answer",
      "result",
      "response",
    ]);
    if (inner) return inner;
  }
  return "";
}

async function loadFromSessionId(sessionId) {
  if (!sessionId) return null;
  loadingSession.value = true;
  try {
    const res = await getAiChatLog(sessionId);
    const payload =
      (res && (res.data || res.rows || res.result || res)) || null;
    const text = extractLastAiReplyText(payload);
    pushTrace("6_sessionLog", text || null);
    if (!text) return null;
    let obj = parseMaybeString(text);
    if (!obj) {
      obj = { reply: text, products: [] };
    }
    if (
      obj &&
      typeof obj.text === "string" &&
      (!Array.isArray(obj.products) || obj.products.length === 0)
    ) {
      const inner = parseMaybeString(obj.text);
      if (inner) obj = inner;
    }
    if (
      typeof obj.reply !== "string" &&
      typeof text === "string" &&
      !Array.isArray(obj.products)
    ) {
      obj.reply = text;
    }
    pushTrace("7_sessionParsed", obj);
    return obj;
  } catch (error) {
    pushTrace("6_sessionErr", {
      reply: String((error && (error.msg || error.message)) || error),
    });
    return null;
  } finally {
    loadingSession.value = false;
  }
}

onLoad(async (options) => {
  const historyId =
    options && options.historyId ? decodeURIComponent(options.historyId) : "";
  if (historyId && typeof store.getHistoryById === "function") {
    const historyItem = store.getHistoryById(historyId);
    if (
      historyItem &&
      (Array.isArray(historyItem.products) ||
        typeof historyItem.reply === "string")
    ) {
      override.value = historyItem;
      if (historyId) {
        try {
          uni.setNavigationBarTitle({ title: "历史推荐详情" });
        } catch (ignore) {
          // ignore
        }
      }
      return;
    }
  }

  const sessionId =
    options && options.sessionId ? decodeURIComponent(options.sessionId) : "";
  if (sessionId) {
    try {
      uni.setNavigationBarTitle({ title: "历史推荐详情" });
    } catch (ignore) {
      // ignore
    }
    const sessionObj = await loadFromSessionId(sessionId);
    if (
      sessionObj &&
      (Array.isArray(sessionObj.products) ||
        typeof sessionObj.reply === "string")
    ) {
      override.value = sessionObj;
      return;
    }
  }

  let queryData = null;
  if (options && options.data) {
    try {
      queryData = decodeURIComponent(options.data);
    } catch (ignore) {
      queryData = String(options.data);
    }
  }
  const best = pickBestRecommendation(queryData);
  if (
    best &&
    (Array.isArray(best.products) || typeof best.reply === "string")
  ) {
    override.value = best;
    try {
      if (typeof store.saveRecommendation === "function") {
        store.saveRecommendation(best);
      }
    } catch (ignore) {
      // ignore
    }
  }
});

const rawDebug = ref("");
const storageDebug = ref("");
const migratedDebug = ref("");
const fieldsDebug = ref("");
const traceDebug = ref("");

const CANDIDATE_KEYS = [
  "recommendation",
  "recommendationText",
  "recommendation_text",
  "recommendationStr",
  "recommendation_str",
  "recommendationData",
  "recommendation_data",
  "recommendationResult",
  "recommendation_result",
  "rec",
  "recResult",
  "rec_result",
  "aiResult",
  "ai_result",
  "aiRecommendation",
  "ai_recommendation",
  "result",
  "data",
  "payload",
  "chatResult",
  "chat_result",
  "content",
  "message",
];

onMounted(() => {
  let migrateInfo = null;
  try {
    if (typeof store.migrateIfNeeded === "function") {
      migrateInfo = store.migrateIfNeeded();
    }
  } catch (error) {
    migratedDebug.value =
      "migrate error: " + String((error && error.message) || error);
  }
  if (!migratedDebug.value) {
    migratedDebug.value = JSON.stringify(migrateInfo || null);
  }

  try {
    rawDebug.value = JSON.stringify(
      override.value || store.recommendation || null,
      null,
      2,
    ).slice(0, 600);
  } catch (error) {
    rawDebug.value = String((error && error.message) || error);
  }
  traceDebug.value = trace.value.join(" | ");

  try {
    const s = uni.getStorageSync("xczx-tuijian-app-state");
    let parsed = s;
    if (typeof s === "string" && s) {
      try {
        parsed = JSON.parse(s);
      } catch (ignore) {
        /* ignore */
      }
    }
    if (typeof parsed === "object" && parsed && !Array.isArray(parsed)) {
      const lines = [];
      lines.push("actual storage object keys=" + Object.keys(parsed).join(","));
      for (const k of CANDIDATE_KEYS) {
        if (k in parsed === false) continue;
        const v = parsed[k];
        let tail = "";
        if (typeof v === "string") {
          tail = " string(len=" + v.length + ") sample=" + v.slice(0, 60);
        } else if (v && typeof v === "object") {
          tail =
            " object keys=" +
            Object.keys(v).join(",") +
            " products=" +
            (Array.isArray(v.products) ? v.products.length : "no");
        } else {
          tail = " " + typeof v + "=" + String(v).slice(0, 40);
        }
        lines.push("  [" + k + "]" + tail);
      }
      fieldsDebug.value = lines.join("\n").slice(0, 900);
    } else {
      fieldsDebug.value =
        "storage 解析失败，raw typeof=" +
        typeof s +
        " content=" +
        (typeof s === "string" ? s.slice(0, 300) : String(s).slice(0, 300));
    }
    storageDebug.value =
      typeof s === "string"
        ? s.slice(0, 500)
        : JSON.stringify(s || null).slice(0, 500);
  } catch (error) {
    storageDebug.value = String((error && error.message) || error);
  }
});

const recommendation = computed(
  () => override.value || store.recommendation || null,
);
const reply = computed(() => {
  const v = recommendation.value && recommendation.value.reply;
  return typeof v === "string" ? v : "";
});
const products = computed(() => {
  const arr = recommendation.value && recommendation.value.products;
  return Array.isArray(arr) ? arr : [];
});
const recommendMode = computed(() => {
  const v = recommendation.value && recommendation.value.recommendMode;
  return typeof v === "string" ? v : "";
});
const sessionTitle = computed(() => {
  const v = recommendation.value;
  if (!v) return "";
  const cands = [v.title, v.firstPrompt, v.prompt, v.question];
  for (const c of cands) if (typeof c === "string" && c.trim()) return c.trim();
  return "";
});
const userQuestion = computed(() => {
  if (sessionTitle.value) return sessionTitle.value;
  const s =
    typeof store.lastQuestionText === "string" ? store.lastQuestionText : "";
  if (s) return s;
  try {
    if (typeof window !== "undefined" && window.__XZZX_LAST_QUESTION__) {
      return String(window.__XZZX_LAST_QUESTION__);
    }
  } catch (ignore) {}
  try {
    const v = uni.getStorageSync("xczx-tuijian-last-question");
    if (typeof v === "string" && v) return v;
  } catch (ignore) {}
  return "";
});
const questionDisplay = computed(() => {
  const q = userQuestion.value;
  let clean = [];
  if (q) {
    clean = q
      .replace(/^\s+|\s+$/g, "")
      .split(/\r?\n/g)
      .filter((l) => l && l.trim())
      .map((l) => {
        const m = l.match(/^[^：:]*[：:](.*)$/);
        if (m) return (m[1] || "").trim();
        return l.trim();
      })
      .filter(Boolean)
      .slice(0, 6);
  }
  if (!clean.length) {
    if (products.value && products.value.length) {
      return "请问我适合吃些什么？";
    }
    return "";
  }
  const joined = clean.join("、");
  if (/适合吃些什么|推荐|请问|我想/.test(joined)) return joined;
  return "请问" + joined + "、适合吃些什么？";
});

const productDesc = (product, idx) => {
  if (!product) return "";
  if (typeof product.reason === "string" && product.reason) {
    const slice = product.reason.replace(/\r?\n/g, " ").slice(0, 30);
    if (slice) return slice;
  }
  if (typeof product.description === "string" && product.description) {
    return product.description.replace(/\r?\n/g, " ").slice(0, 30);
  }
  if (typeof product.sellingPoints === "string" && product.sellingPoints) {
    return product.sellingPoints.slice(0, 24);
  }
  if (typeof product.features === "string" && product.features) {
    return product.features.slice(0, 24);
  }
  const defaults = [
    "果香浓郁，营养轻负担",
    "酸甜绵软，早餐好搭档",
    "原麦香浓，口感扎实",
    "莓果叠加，活力一整天",
    "软绵香甜，越嚼越香",
    "双重果味，层次丰富",
  ];
  return defaults[idx % defaults.length];
};

const productCover = (product, idx) => {
  if (!product) return "";
  const c = [
    product.cover,
    product.image,
    product.productImage,
    product.pic,
    product.img,
    product.picture,
    product.picUrl,
    product.imageUrl,
  ].find((x) => typeof x === "string" && x);
  if (c) return c;
  return idx % 2 === 0
    ? "/static/images/推荐结果 demo/默认商品底图 1.png"
    : "/static/images/推荐结果 demo/默认商品底图 2.png";
};

const modeText = computed(() => {
  const map = {
    matched: "精准匹配",
    fallback: "通用推荐",
    partial: "部分匹配",
  };
  return map[recommendMode.value] || "智能推荐";
});

const scoreLevel = (score) => {
  const s = Number(score) || 0;
  if (s <= 0) return { label: "备选", cls: "score-zero" };
  const list = products.value
    .map((p) => Number(p.score) || 0)
    .filter((v) => v > 0);
  const max = list.length ? Math.max(...list) : 0;
  if (max > 0) {
    const ratio = s / max;
    if (ratio >= 0.85) return { label: "高匹配", cls: "score-high" };
    if (ratio >= 0.6) return { label: "中匹配", cls: "score-mid" };
    return { label: "参考", cls: "score-low" };
  }
  if (s >= 80) return { label: "高匹配", cls: "score-high" };
  if (s >= 40) return { label: "中匹配", cls: "score-mid" };
  return { label: "参考", cls: "score-low" };
};

const formatPrice = (price, unit) => {
  const num = Number(price);
  if (Number.isNaN(num)) return `${price || 0}${unit || ""}`;
  return `¥${num.toFixed(2)}${unit ? ` / ${unit}` : ""}`;
};

const productInitial = (name) => {
  const n = name || "";
  return n.slice(0, 1);
};

function goRecommend() {
  uni.navigateTo({
    url: "/pages/recommend/question",
  });
}

function saveReport() {
  uni.showToast({
    title: "营养报告已保存",
    icon: "success",
    duration: 1500,
  });
  setTimeout(() => {
    uni.switchTab({
      url: "/pages/index/index",
    });
  }, 1500);
}

function openProduct(product) {
  uni.showToast({
    title: `查看：${product.productName}`,
    icon: "none",
  });
}

function goBack() {
  const pages = getCurrentPages();
  if (pages && pages.length > 1) {
    uni.navigateBack();
    return;
  }
  uni.switchTab({
    url: "/pages/index/index",
  });
}
</script>

<template>
  <view class="page-shell result-page">
    <view class="page-inner">
      <view class="custom-nav">
        <view class="avatar-block">
          <image
            class="avatar"
            src="/static/images/推荐结果 demo/顶部 icon.png"
            mode="aspectFit"
          />
          <view class="avatar-meta">
            <view class="avatar-title">AI面包推荐官</view>
            <view class="avatar-sub">用AI发现更适合你的美味生活</view>
          </view>
        </view>
      </view>

      <view v-if="loadingSession" class="empty-loading">
        <view class="loading-dashed">正在加载历史详情…</view>
      </view>

      <template v-else>
        <view v-if="questionDisplay" class="user-bubble">
          <view class="user-bubble-card">
            <text class="user-bubble-text">{{ questionDisplay }}</text>
          </view>
          <view class="user-avatar">
            <text class="user-avatar-letter">U</text>
          </view>
        </view>

        <view class="rec-title-block">
          <view class="rec-title-left">
            <image
              class="rec-title-icon"
              src="/static/images/推荐结果 demo/为你推荐 icon.png"
              mode="aspectFit"
            />
            <text class="rec-title-text">为你推荐</text>
          </view>
        </view>
      </template>

      <view v-if="products.length && !loadingSession" class="grid-wrap">
        <view
          v-for="(product, idx) in products"
          :key="product.productId || idx"
          class="grid-item"
          @tap="openProduct(product)"
        >
          <view class="grid-img-wrap">
            <image
              class="grid-img"
              :src="productCover(product, idx)"
              mode="aspectFill"
            />
          </view>
          <view class="grid-text">
            <view class="grid-name">{{ product.productName }}</view>
            <view class="grid-desc">{{ productDesc(product, idx) }}</view>
          </view>
        </view>
      </view>

      <view
        v-if="products.length && !loadingSession"
        class="save-bottom"
        @tap="saveReport"
        >保存营养报告</view
      >

      <view v-if="!products.length && !loadingSession" class="empty-result">
        <view class="empty-title">还未生成智能推荐结果</view>
        <view class="empty-action" @tap="goRecommend">立即填写</view>
        <view class="debug-block">
          <view class="debug-label"
            >5 路取数 trace (1 query 2 window 3 globalData 4 storagePending 5
            store)</view
          >
          <view class="debug-text">{{ traceDebug || "(空)" }}</view>
          <view class="debug-label">迁移状态</view>
          <view class="debug-text">{{ migratedDebug || "(未执行)" }}</view>
          <view class="debug-label">候选字段探查 (storage 实际落地)</view>
          <view class="debug-text">{{ fieldsDebug || "(空)" }}</view>
          <view class="debug-label">最终生效对象 (override or store)</view>
          <view class="debug-text">{{ rawDebug || "(空)" }}</view>
          <view class="debug-label">localStorage xczx-tuijian-app-state</view>
          <view class="debug-text">{{ storageDebug || "(空)" }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.result-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background-color: #fff8f1;
  background-image: url("/static/images/推荐结果 demo/background.png");
  background-size: cover;
  background-position: top center;
  background-repeat: no-repeat;
}

.page-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  padding: 0 32rpx 48rpx;
  min-height: 100vh;
}

.custom-nav {
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  padding-top: calc(var(--status-bar-height, 44px) + 16rpx);
  padding-bottom: 18rpx;
}

.avatar-block {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-left: 0;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.avatar-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1d2129;
  line-height: 1.2;
}

.avatar-sub {
  font-size: 22rpx;
  color: #86909c;
  line-height: 1.4;
}

.empty-loading {
  padding: 80rpx 0 40rpx;
  display: flex;
  justify-content: center;
}
.loading-dashed {
  padding: 24rpx 40rpx;
  border: 2rpx dashed #c7a485;
  border-radius: 20rpx;
  color: #8b6746;
  font-size: 26rpx;
  background: rgba(255, 255, 255, 0.6);
}

.user-bubble {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 16rpx;
  padding-top: 8rpx;
}

.user-bubble-card {
  position: relative;
  max-width: 75%;
  padding: 22rpx 24rpx;
  border-radius: 24rpx 8rpx 24rpx 24rpx;
  background: #ffffff;
  box-shadow: 0 6rpx 20rpx rgba(29, 33, 41, 0.06);
}

.user-bubble-card::after {
  content: "";
  position: absolute;
  top: 22rpx;
  right: -10rpx;
  width: 0;
  height: 0;
  border-top: 10rpx solid transparent;
  border-bottom: 10rpx solid transparent;
  border-left: 12rpx solid #ffffff;
}

.user-bubble-text {
  font-size: 28rpx;
  line-height: 1.7;
  color: #1d2129;
}

.user-avatar {
  flex-shrink: 0;
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffb088 0%, #ff8899 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4rpx;
}

.user-avatar-letter {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
}

.rec-title-block {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 12rpx 4rpx 4rpx;
}

.rec-title-icon {
  width: 56rpx;
  height: 56rpx;
  flex-shrink: 0;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(29, 33, 41, 0.06);
}

.rec-title-text {
  font-size: 36rpx;
  font-weight: 800;
  color: #a24617;
  line-height: 1.2;
  letter-spacing: 2rpx;
}

.grid-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  padding-top: 8rpx;
}

.grid-item {
  background: #ffffff;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(29, 33, 41, 0.06);
  display: flex;
  flex-direction: column;
}

.grid-img-wrap {
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: 16rpx;
  box-sizing: border-box;
  background: linear-gradient(160deg, #fffaf3 0%, #fff4e6 100%);
}

.grid-img {
  width: 100%;
  height: 100%;
  border-radius: 20rpx;
  background: #faf0e3;
}

.grid-text {
  padding: 14rpx 20rpx 22rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.grid-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #1d2129;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.grid-desc {
  font-size: 22rpx;
  color: #86909c;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.empty-result {
  padding: 60rpx 32rpx 48rpx;
  text-align: center;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(29, 33, 41, 0.05);
}

.empty-title {
  font-size: 30rpx;
  color: #4e5969;
  margin-bottom: 24rpx;
}

.empty-action {
  display: inline-block;
  padding: 18rpx 56rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #bc581c 0%, #d9743a 100%);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  box-shadow: 0 6rpx 16rpx rgba(188, 88, 28, 0.2);
}

.debug-block {
  margin-top: 32rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: rgba(15, 23, 42, 0.92);
  color: #e2e8f0;
  text-align: left;
}
.debug-label {
  font-size: 22rpx;
  font-weight: 600;
  color: #fbbf24;
  margin-top: 12rpx;
}
.debug-label:first-child {
  margin-top: 0;
}
.debug-text {
  margin-top: 8rpx;
  font-size: 20rpx;
  line-height: 1.55;
  word-break: break-all;
  white-space: pre-wrap;
  color: #cbd5e1;
  max-height: 400rpx;
  overflow: hidden;
}

.save-bottom {
  margin-top: 16rpx;
  padding: 28rpx 0;
  text-align: center;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #bc581c 0%, #d9743a 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  box-shadow: 0 8rpx 24rpx rgba(188, 88, 28, 0.28);
  padding-bottom: calc(28rpx + env(safe-area-inset-bottom, 0px));
}
</style>
