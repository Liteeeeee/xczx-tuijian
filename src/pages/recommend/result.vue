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
    title: "营养报告已暂存",
    icon: "success",
  });
}

function openProduct(product) {
  uni.showToast({
    title: `查看：${product.productName}`,
    icon: "none",
  });
}
</script>

<template>
  <view class="page-shell result-page">
    <view class="section-card summary-card">
      <view class="summary-head">
        <view>
          <view class="tag">{{ modeText }}</view>
          <view class="section-title">为您推荐</view>
        </view>
        <view class="save-btn" @tap="saveReport">保存营养报告</view>
      </view>
      <view v-if="reply" class="reply-text">{{ reply }}</view>
      <view v-else class="reply-text reply-empty"
        >AI 正在完善您的专属推荐说明</view
      >
    </view>

    <view v-if="products.length" class="section-card">
      <view class="section-title">推荐商品</view>
      <view class="section-subtitle">
        共 {{ products.length }} 款，按匹配度由高到低排序
      </view>
      <view class="product-list">
        <view
          v-for="(product, idx) in products"
          :key="product.productId || idx"
          class="product-card"
          @tap="openProduct(product)"
        >
          <view class="product-rank" v-if="idx < 3">{{
            ["Top1", "Top2", "Top3"][idx]
          }}</view>
          <view class="product-main">
            <view class="product-cover">{{
              productInitial(product.productName)
            }}</view>
            <view class="product-info">
              <view class="product-row">
                <view class="product-name">{{ product.productName }}</view>
                <view
                  class="product-score"
                  :class="scoreLevel(product.score).cls"
                >
                  {{ scoreLevel(product.score).label }}
                  <text class="score-num">{{ product.score || 0 }}</text>
                </view>
              </view>
              <view class="product-meta">
                <text v-if="product.categoryName" class="meta-chip">{{
                  product.categoryName
                }}</text>
                <text v-if="product.productCode" class="meta-chip meta-code"
                  >编号 {{ product.productCode }}</text
                >
              </view>
              <view class="product-reason" v-if="product.reason">{{
                product.reason
              }}</view>
              <view class="product-bottom">
                <view class="product-price">{{
                  formatPrice(product.price, product.unit)
                }}</view>
                <view class="product-action">查看详情</view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="section-card empty-card">
      <view class="section-title">暂无结果</view>
      <view class="section-subtitle">还未生成智能推荐结果，请先填写问卷</view>
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

    <view class="ghost-btn" @tap="goRecommend">重新填写问卷</view>
  </view>
</template>

<style lang="scss" scoped>
.result-page {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding-bottom: 48rpx;
}

.summary-card {
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #0f766e 60%, #14b8a6 100%);
  color: #ffffff;
  overflow: hidden;
}

.summary-card::after {
  content: "";
  position: absolute;
  right: -80rpx;
  top: -80rpx;
  width: 280rpx;
  height: 280rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.summary-head {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.save-btn {
  padding: 14rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
  font-size: 24rpx;
  color: #ffffff;
}

.reply-text {
  position: relative;
  margin-top: 28rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.1);
  font-size: 28rpx;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.95);
}

.reply-empty {
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
}

.product-list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.product-card {
  position: relative;
  padding: 24rpx;
  border-radius: 28rpx;
  background: #ffffff;
  border: 2rpx solid #f1f5f9;
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.04);
}

.product-rank {
  position: absolute;
  top: 0;
  left: 0;
  padding: 8rpx 18rpx;
  border-top-left-radius: 28rpx;
  border-bottom-right-radius: 20rpx;
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  color: #ffffff;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.product-main {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
}

.product-cover {
  flex-shrink: 0;
  width: 160rpx;
  height: 160rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #dcfce7 0%, #e0f2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
  font-weight: 800;
  color: #0f766e;
  margin-top: 8rpx;
}

.product-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.product-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.product-name {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
  padding-right: 8rpx;
}

.product-score {
  flex-shrink: 0;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.score-num {
  font-weight: 800;
  font-size: 24rpx;
}

.score-high {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.score-mid {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.score-low {
  background: rgba(148, 163, 184, 0.16);
  color: #475569;
}

.score-zero {
  background: rgba(241, 245, 249, 0.8);
  color: #64748b;
}

.product-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
}

.meta-chip {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #eff6ff;
  color: #2563eb;
  font-size: 22rpx;
  font-weight: 500;
}

.meta-code {
  background: #f8fafc;
  color: #64748b;
}

.product-reason {
  margin-top: 4rpx;
  padding: 16rpx 18rpx;
  border-radius: 18rpx;
  background: #f8fafc;
  font-size: 24rpx;
  line-height: 1.7;
  color: #475569;
  border-left: 6rpx solid #28c4b8;
}

.product-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.product-price {
  font-size: 34rpx;
  font-weight: 800;
  color: #dc2626;
  letter-spacing: -0.5rpx;
}

.product-action {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: #0f766e;
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 600;
}

.empty-card {
  padding: 48rpx 32rpx;
  text-align: center;
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
</style>
