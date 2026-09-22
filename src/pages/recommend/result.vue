<script setup>
import { computed, ref, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useAppStore } from "@/store/app";
import { useRecommendStore } from "@/store/recommend";
import { getAiChatLog } from "@/utils/api";

const store = useAppStore();
const recommendStore = useRecommendStore();

const override = ref(null);
const urlTitle = ref("");
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

function stripMarkdownCode(raw) {
  if (typeof raw !== "string") return raw;
  let s = raw.trim();
  const triple = s.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (triple) s = triple[1].trim();
  const fence = s.match(/^`{1,2}(?:json)?\s*([\s\S]*?)`{1,2}$/i);
  if (fence) s = fence[1].trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1);
  }
  return s;
}

function normalizeAiPayload(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  if (typeof raw !== "object") return null;
  const arrCandidates = [
    raw.items,
    raw.rows,
    raw.combos,
    raw.list,
    raw.productList,
    raw.itemList,
    raw.comboList,
    raw.goodsList,
  ];
  if (raw.result && typeof raw.result === "object") {
    arrCandidates.push(
      raw.result.items,
      raw.result.rows,
      raw.result.combos,
      raw.result.list,
      raw.result.products,
    );
  }
  if (raw.data && typeof raw.data === "object") {
    arrCandidates.push(
      raw.data.items,
      raw.data.rows,
      raw.data.combos,
      raw.data.list,
      raw.data.products,
    );
  }
  const hasList = arrCandidates.some((v) => Array.isArray(v) && v.length);
  const hasProducts = Array.isArray(raw.products) && raw.products.length;
  const hasOnlyReply =
    typeof raw.reply === "string" && !raw.products && !hasList;
  if (
    hasProducts ||
    hasList ||
    raw.success !== undefined ||
    raw.recommendMode !== undefined ||
    hasOnlyReply
  ) {
    return raw;
  }
  if (typeof raw.text === "string" && raw.text.length > 0) {
    return raw.text;
  }
  return raw;
}

function normalizeObject(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  if (
    Array.isArray(obj.products) ||
    Array.isArray(obj.items) ||
    Array.isArray(obj.rows) ||
    Array.isArray(obj.combos) ||
    Array.isArray(obj.list) ||
    Array.isArray(obj.productList) ||
    Array.isArray(obj.itemList) ||
    Array.isArray(obj.comboList) ||
    Array.isArray(obj.goodsList) ||
    typeof obj.reply === "string" ||
    obj.success !== undefined ||
    obj.recommendMode !== undefined
  ) {
    return obj;
  }
  if (typeof obj.text === "string") {
    try {
      const inner = JSON.parse(stripMarkdownCode(obj.text));
      if (inner && typeof inner === "object") {
        const normalized = normalizeAiPayload(inner);
        if (normalized && typeof normalized === "object") return normalized;
        return inner;
      }
    } catch (ignore) {
      // ignore
    }
  }
  if (obj.response && typeof obj.response === "object") {
    const inner = normalizeObject(obj.response);
    if (inner) return inner;
  }
  if (obj.result && typeof obj.result === "object") {
    const inner = normalizeObject(obj.result);
    if (inner) return inner;
  }
  if (obj.data && typeof obj.data === "object") {
    const inner = normalizeObject(obj.data);
    if (inner) return inner;
  }
  return obj;
}

function parseMaybeString(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    const cleaned = stripMarkdownCode(raw);
    try {
      const p = JSON.parse(cleaned);
      const normalized = normalizeAiPayload(p);
      return normalizeObject(normalized) || normalizeObject(p);
    } catch (ignore) {
      return { reply: cleaned || raw, products: [] };
    }
  }
  const normalized = normalizeAiPayload(raw);
  if (typeof normalized === "string") {
    const cleaned = stripMarkdownCode(normalized);
    try {
      const p = JSON.parse(cleaned);
      return normalizeObject(p) || { reply: cleaned, products: [] };
    } catch (ignore2) {
      return { reply: cleaned || normalized, products: [] };
    }
  }
  return normalizeObject(normalized) || normalizeObject(raw);
}

function pickBestRecommendation(queryData) {
  // 1. URL query 参数（来自 question.vue navigateTo 拼的 data）——最高优先级
  if (queryData) {
    const parsed = parseMaybeString(queryData);
    pushTrace("1_query", parsed);
    if (parsed && extractList(parsed).length) {
      return parsed;
    }
  }

  // 2. 纯内存 Pinia Store（推荐方案，question.vue 写入）
  const memRec = recommendStore.currentRecommendation;
  if (memRec) {
    const memObj = normalizeObject(memRec);
    pushTrace("2_piniaMemory", memObj);
    // 即用即毁，绝不产生跨会话脏数据
    recommendStore.clearRecommendation();
    if (memObj && extractList(memObj).length) {
      return memObj;
    }
  }

  // 兜底：把 queryData 解析当回复文本用
  return parseMaybeString(queryData) || null;
}

async function loadFromSessionId(sessionId) {
  if (!sessionId) return null;
  loadingSession.value = true;
  try {
    const res = await getAiChatLog(sessionId);
    const payload = res && res.data ? res.data : null;

    if (Array.isArray(payload) && payload.length > 0) {
      // 遍历所有返回的消息，优先寻找有 response 并且解析后有 products 的条目
      for (const item of payload) {
        const userQuestion = item.prompt || "";
        let responseObj = null;

        if (item.response) {
          if (typeof item.response === "string") {
            try {
              responseObj = JSON.parse(item.response);
            } catch (ignore) {}
          } else if (typeof item.response === "object") {
            responseObj = item.response;
          }
        }

        // 如果找到有效的推荐对象，直接返回
        if (responseObj && Array.isArray(responseObj.products)) {
          pushTrace("7_sessionParsed_exact", responseObj);
          return {
            question: userQuestion,
            reply: responseObj.reply || "",
            products: responseObj.products,
            recommendMode: responseObj.recommendMode || "",
          };
        }
      }

      // 如果循环完没找到有 products 的，返回第一条数据的文本作为兜底
      const firstItem = payload[0];
      return {
        question: firstItem.prompt || "",
        reply: firstItem.response || "该历史会话暂无推荐内容",
        products: [],
      };
    }

    return { reply: "该历史会话暂无推荐内容", products: [] };
  } catch (error) {
    const errText = String((error && (error.msg || error.message)) || error);
    pushTrace("6_sessionErr", { reply: errText });
    return { reply: errText || "加载历史会话失败", products: [] };
  } finally {
    loadingSession.value = false;
  }
}

onLoad(async (options) => {
  if (options && options.title) {
    urlTitle.value = decodeURIComponent(options.title);
  }
  const historyId =
    options && options.historyId ? decodeURIComponent(options.historyId) : "";
  if (historyId) {
    try {
      uni.setNavigationBarTitle({ title: "历史推荐详情" });
    } catch (ignore) {
      // ignore
    }
    if (typeof store.getHistoryById === "function") {
      const historyItem = store.getHistoryById(historyId);
      if (historyItem && typeof historyItem === "object") {
        const hasContent =
          (Array.isArray(historyItem.products) &&
            historyItem.products.length > 0) ||
          (typeof historyItem.reply === "string" && historyItem.reply) ||
          (typeof historyItem.text === "string" && historyItem.text);
        if (hasContent) {
          override.value = historyItem;
          return;
        }
      }
    }
    override.value = {
      reply: "暂无该历史会话的推荐内容，请返回重新选择。",
      products: [],
    };
    return;
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
    if (sessionObj && typeof sessionObj === "object") {
      const hasContent =
        Array.isArray(sessionObj.products) && sessionObj.products.length > 0
          ? true
          : typeof sessionObj.reply === "string" && sessionObj.reply
            ? true
            : typeof sessionObj.text === "string" && sessionObj.text
              ? true
              : false;
      if (hasContent) {
        override.value = sessionObj;
        return;
      }
    }
    override.value = sessionObj || {
      reply: "暂无该历史会话的推荐内容，请返回重新选择。",
      products: [],
    };
    return;
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

onMounted(() => {
  try {
    if (typeof store.migrateIfNeeded === "function") {
      store.migrateIfNeeded();
    }
  } catch (ignore) {
    /* ignore */
  }
});

function normalizeProduct(item) {
  if (!item || typeof item !== "object") return null;
  const nameCands = [
    "productName",
    "name",
    "title",
    "itemName",
    "comboName",
    "goodsName",
    "skuName",
    "subTitle",
    "subtitle",
  ];
  const coverCands = [
    "coverImage",
    "cover",
    "itemCover",
    "image",
    "pic",
    "productImage",
    "itemImage",
    "img",
    "picture",
    "picUrl",
    "imageUrl",
    "goodsImage",
    "thumbnail",
    "thumb",
  ];
  const descCands = [
    "reason",
    "description",
    "sellingPoints",
    "features",
    "subtitle",
    "subTitle",
    "brief",
    "intro",
    "introduction",
  ];
  const out = {};
  for (const k of Object.keys(item)) {
    out[k] = item[k];
  }
  if (!out.productName) {
    for (const k of nameCands) {
      if (typeof item[k] === "string" && item[k]) {
        out.productName = item[k];
        break;
      }
    }
    if (!out.productName) out.productName = "商品";
  }
  if (!out.coverImage) {
    for (const k of coverCands) {
      if (typeof item[k] === "string" && item[k]) {
        out.coverImage = item[k];
        break;
      }
    }
  }
  if (!out.reason && !out.description) {
    for (const k of descCands) {
      if (typeof item[k] === "string" && item[k]) {
        out.description = item[k];
        break;
      }
    }
  }
  if (out.productId === undefined && item.id !== undefined) {
    out.productId = item.id;
  }
  return out;
}

function extractList(rec) {
  if (!rec || typeof rec !== "object") return [];
  const candidates = [
    rec.products,
    rec.items,
    rec.rows,
    rec.combos,
    rec.list,
    rec.comboList,
    rec.productList,
    rec.itemList,
    rec.goodsList,
    rec.result && rec.result.products,
    rec.result && rec.result.items,
    rec.result && rec.result.rows,
    rec.data && rec.data.products,
    rec.data && rec.data.items,
    rec.data && rec.data.rows,
    rec.data && Array.isArray(rec.data) ? rec.data : null,
  ];
  let arr = candidates.find((v) => Array.isArray(v) && v.length);
  if (!arr && rec.content && typeof rec.content === "object") {
    arr = [
      rec.content.products,
      rec.content.items,
      rec.content.rows,
      rec.content,
    ].find((v) => Array.isArray(v) && v.length);
  }
  if (!Array.isArray(arr) || !arr.length) return [];
  const list = [];
  for (const it of arr) {
    const p = normalizeProduct(it);
    if (p) list.push(p);
  }
  return list;
}

const recommendation = computed(
  () => override.value || store.recommendation || null,
);
const reply = computed(() => {
  const v = recommendation.value && recommendation.value.reply;
  return typeof v === "string" ? v : "";
});
const products = computed(() => extractList(recommendation.value));
const sessionTitle = computed(() => {
  const v = recommendation.value;
  if (!v) return "";
  const cands = [v.title, v.firstPrompt, v.prompt, v.question];
  for (const c of cands) if (typeof c === "string" && c.trim()) return c.trim();
  return "";
});
const userQuestion = computed(() => {
  if (sessionTitle.value) return sessionTitle.value;
  if (urlTitle.value) return urlTitle.value;
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
    const slice = product.reason.replace(/\r?\n/g, " ").slice(0, 20);
    if (slice) return slice;
  }
  if (typeof product.description === "string" && product.description) {
    return product.description.replace(/\r?\n/g, " ").slice(0, 20);
  }
  if (typeof product.sellingPoints === "string" && product.sellingPoints) {
    return product.sellingPoints.slice(0, 18);
  }
  if (typeof product.features === "string" && product.features) {
    return product.features.slice(0, 18);
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
    product.coverImage,
    product.cover,
    product.itemCover,
    product.image,
    product.pic,
    product.productImage,
    product.itemImage,
    product.img,
    product.picture,
    product.picUrl,
    product.imageUrl,
    product.goodsImage,
    product.thumbnail,
    product.thumb,
  ].find((x) => typeof x === "string" && x);
  if (c) return c;
  return idx % 2 === 0
    ? "/static/images/推荐结果 demo/默认商品底图 1.png"
    : "/static/images/推荐结果 demo/默认商品底图 2.png";
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

function openProduct(product) {}
</script>

<template>
  <view class="page-shell result-page">
    <view class="page-inner">
      <!-- 自定义导航栏 -->
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
        <view class="nav-right">
          <text class="nav-right-icon">···</text>
          <text class="nav-right-dot">⊙</text>
        </view>
      </view>

      <view v-if="loadingSession" class="empty-loading">
        <view class="loading-dashed">正在加载历史详情…</view>
      </view>

      <template v-else>
        <!-- 用户问题气泡 -->
        <view v-if="questionDisplay" class="text-wrapper_1 flex-col">
          <text class="paragraph_1">{{ questionDisplay }}</text>
        </view>

        <!-- 为你推荐 标题 -->
        <view class="rec-title-block">
          <image
            class="rec-title-icon"
            src="/static/images/推荐结果 demo/顶部 icon.png"
            mode="aspectFit"
          />
          <view class="rec-title-left">
            <text class="rec-title-text">为你推荐</text>
            <text class="rec-ai-tag">AI</text>
          </view>
        </view>

        <!-- 商品网格 -->
        <view v-if="products.length" class="product-grid">
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
            <view class="grid-name">{{ product.productName }}</view>
            <view class="grid-desc">{{ productDesc(product, idx) }}</view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="!products.length" class="empty-result">
          <view class="empty-title">还未生成智能推荐结果</view>
          <view class="empty-action" @tap="goRecommend">立即填写</view>
        </view>
      </template>

      <!-- 底部占位 -->
      <view class="bottom-spacer" v-if="products.length"></view>
    </view>

    <!-- 底部悬浮操作栏 -->
    <view v-if="products.length && !loadingSession" class="bottom-bar">
      <view class="bottom-bar-inner">
        <view class="btn-primary" @tap="saveReport">
          <text class="btn-text-bold">保存营养报告</text>
        </view>
      </view>
      <view class="safe-area"></view>
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
  background-size: 100% auto;
  background-position: top center;
  background-repeat: no-repeat;
}

.page-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  padding: 0 28rpx 48rpx;
  min-height: 100vh;
  padding-bottom: calc(200rpx + env(safe-area-inset-bottom));
}

/* ==================== 导航栏 ==================== */
.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: calc(var(--status-bar-height, 44px) + 16rpx);
  padding-bottom: 20rpx;
}

.avatar-block {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 18rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-meta {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}

.avatar-title {
  font-size: 28rpx;
  font-weight: 800;
  color: #1d2129;
  line-height: 1.2;
}

.avatar-sub {
  font-size: 20rpx;
  color: #86909c;
  line-height: 1.2;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 28rpx;
}

.nav-right-icon {
  font-size: 36rpx;
  color: #4e5969;
  letter-spacing: 2rpx;
  line-height: 1;
}

.nav-right-dot {
  font-size: 28rpx;
  color: #4e5969;
  line-height: 1;
  font-weight: 700;
}

/* ==================== 加载中 ==================== */
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

/* ==================== 用户气泡 ==================== */
.text-wrapper_1 {
  box-shadow: 0px 0px 10px 0px rgba(188, 88, 28, 0.1);
  background-color: rgba(255, 255, 255, 1);
  border-radius: 7px;
  padding: 18rpx 26rpx;
  box-sizing: border-box;
}

.flex-col {
  display: flex;
  flex-direction: column;
}

.paragraph_1 {
  overflow-wrap: break-word;
  color: rgba(188, 88, 28, 1);
  font-size: 28rpx;
  font-family: Source Han Sans SC-Regular;
  font-weight: normal;
  text-align: left;
  line-height: 44rpx;
}

/* ==================== 推荐标题栏 ==================== */
.rec-title-block {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 4rpx 4rpx;
}

.rec-title-icon {
  width: 56rpx;
  height: 56rpx;
  flex-shrink: 0;
  border-radius: 18rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(29, 33, 41, 0.06);
  overflow: hidden;
}

.rec-title-left {
  display: flex;
  align-items: flex-end;
  gap: 10rpx;
}

.rec-title-text {
  font-size: 32rpx;
  font-weight: 800;
  color: #a24617;
  line-height: 1.2;
}

.rec-ai-tag {
  margin-bottom: 2rpx;
  font-size: 18rpx;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #bc581c 0%, #d9743a 100%);
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  line-height: 1.4;
}

/* ==================== 商品网格 ==================== */
.product-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  padding-top: 4rpx;
}

.grid-item {
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(29, 33, 41, 0.05);
  display: flex;
  flex-direction: column;
}

.grid-item:active {
  transform: scale(0.99);
  opacity: 0.95;
}

.grid-img-wrap {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #ffffff;
  overflow: hidden;
  padding: 14rpx;
  box-sizing: border-box;
}

.grid-img {
  width: 100%;
  height: 100%;
  border-radius: 20rpx;
  background: #faf0e3;
}

.grid-name {
  padding: 0 20rpx;
  margin-top: 4rpx;
  font-size: 26rpx;
  font-weight: 800;
  color: #1d2129;
  line-height: 1.35;
}

.grid-desc {
  padding: 4rpx 20rpx 18rpx;
  font-size: 22rpx;
  color: #86909c;
  line-height: 1.5;
  word-break: break-all;
}

/* ==================== 空状态 ==================== */
.empty-result {
  margin-top: 60rpx;
  padding: 80rpx 32rpx 48rpx;
  text-align: center;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(29, 33, 41, 0.05);
}

.empty-title {
  font-size: 30rpx;
  color: #4e5969;
  margin-bottom: 32rpx;
}

.empty-action {
  display: inline-block;
  padding: 20rpx 64rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #bc581c 0%, #d9743a 100%);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: 0 6rpx 16rpx rgba(188, 88, 28, 0.2);
}

/* ==================== 底部占位 ==================== */
.bottom-spacer {
  flex-shrink: 0;
  height: 40rpx;
}

/* ==================== 底部悬浮操作栏 ==================== */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: linear-gradient(to top, #fff8f1 70%, rgba(255, 248, 241, 0));
  padding-top: 24rpx;
}

.bottom-bar-inner {
  margin: 0 28rpx;
  display: flex;
  align-items: center;
}

.btn-primary {
  flex: 1;
  height: 92rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #a0481b 0%, #c96d33 50%, #8f4219 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 28rpx rgba(188, 88, 28, 0.32);
}

.btn-primary:active {
  opacity: 0.92;
  transform: translateY(1rpx);
}

.btn-text-bold {
  font-size: 30rpx;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 2rpx;
}

.safe-area {
  width: 100%;
  height: calc(env(safe-area-inset-bottom) + 16rpx);
}
</style>
