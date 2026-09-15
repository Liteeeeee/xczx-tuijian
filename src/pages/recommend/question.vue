<script setup>
import { reactive, ref, computed, onMounted } from "vue";
import { useAppStore } from "@/store/app";
import {
  getAiQaTemplateDefault,
  aiChatAsync,
  aiChatAsyncResult,
} from "@/utils/api";

const store = useAppStore();

const loading = ref(true);
const submitting = ref(false);
const template = ref(null);
const form = reactive({});

const items = computed(() => {
  const list = (template.value && template.value.items) || [];
  return list
    .filter((item) => item.status !== "0")
    .slice()
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
});

function initForm() {
  items.value.forEach((item) => {
    const prev = store.lastAnswers[item.itemId];
    if (item.questionType === "checkbox") {
      form[item.itemId] = Array.isArray(prev) ? prev : [];
    } else {
      form[item.itemId] = prev || "";
    }
  });
}

onMounted(async () => {
  try {
    const res = await getAiQaTemplateDefault();
    template.value = (res && res.data) || null;
    initForm();
  } catch (error) {
    // 错误已在 request 层统一提示
  } finally {
    loading.value = false;
  }
});

function selectOption(key, value) {
  form[key] = value;
}

function toggleOption(key, value) {
  const list = form[key] || [];
  form[key] = list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function isEmpty(value) {
  if (Array.isArray(value)) return value.length === 0;
  return value === "" || value === null || value === undefined;
}

function formatAnswer(item, value) {
  if (item.questionType === "checkbox") {
    return (value || []).join("、");
  }
  return value || "";
}

function buildPrompt() {
  const lines = items.value.map(
    (item) => `${item.question}：${formatAnswer(item, form[item.itemId])}`,
  );
  const lead = template.value && template.value.leadText;
  return lead ? `${lead}\n${lines.join("\n")}` : lines.join("\n");
}

function genTaskId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const hasProducts = Array.isArray(raw.products) && raw.products.length;
  const hasOnlyReply = typeof raw.reply === "string" && !raw.products;
  if (
    hasProducts ||
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

function parseAiResult(raw) {
  if (!raw) return null;
  const normalized = normalizeAiPayload(raw);
  if (!normalized) return null;
  if (typeof normalized === "object") return normalized;
  if (typeof normalized !== "string") return { reply: String(normalized) };
  const cleaned = stripMarkdownCode(normalized);
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (error) {
    // ignore
  }
  return { reply: cleaned || raw };
}

async function pollResult(taskId) {
  for (let i = 0; i < 30; i += 1) {
    const res = await aiChatAsyncResult(taskId);
    const task = (res && res.data) || {};
    if (task.status === "0") return task.result || {};
    if (task.status === "1") {
      uni.showToast({ title: task.errorMsg || "AI 推荐失败", icon: "none" });
      throw new Error(task.errorMsg || "AI 推荐失败");
    }
    await sleep(1500);
  }
  uni.showToast({ title: "AI 推荐超时，请稍后重试", icon: "none" });
  throw new Error("AI 推荐超时");
}

function safeClone(value) {
  try {
    if (value === undefined || value === null) return value;
    if (typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map((v) => safeClone(v));
    const out = {};
    Object.keys(value).forEach((k) => {
      out[k] = safeClone(value[k]);
    });
    return out;
  } catch (error) {
    return value;
  }
}

async function submitForm() {
  const missing = items.value.find(
    (item) => item.requiredFlag === "1" && isEmpty(form[item.itemId]),
  );
  if (missing) {
    uni.showToast({ title: `请先完成：${missing.question}`, icon: "none" });
    return;
  }

  submitting.value = true;
  let aiResult = null;
  let aiError = null;
  let polledRaw = null;
  try {
    const prompt = buildPrompt();
    try {
      if (typeof store.saveQuestionText === "function") {
        store.saveQuestionText(prompt);
      }
    } catch (ignore) {
      // ignore
    }
    try {
      if (typeof window !== "undefined") {
        window.__XZZX_LAST_QUESTION__ = prompt;
      }
    } catch (ignore) {}
    try {
      uni.setStorageSync("xczx-tuijian-last-question", prompt);
    } catch (ignore) {}
    const taskId = genTaskId();
    await aiChatAsync({ taskId, prompt });
    const polled = await pollResult(taskId);
    polledRaw = polled;
    aiResult = polled || {};
  } catch (error) {
    aiError = error;
  }

  if (!aiResult) {
    submitting.value = false;
    uni.showToast({
      title: `①AI结果为空${aiError ? ":" + (aiError.message || String(aiError)) : ""}`,
      icon: "none",
      duration: 2500,
    });
    return;
  }

  let recommendation = null;
  try {
    recommendation = parseAiResult(aiResult);
  } catch (error) {
    aiError = aiError || error;
  }
  const parsedCount =
    (recommendation &&
      recommendation.products &&
      recommendation.products.length) ||
    0;
  uni.showToast({
    title: `②polled=${typeof polledRaw} parsed.products=${parsedCount}`,
    icon: "none",
    duration: 2500,
  });
  if (typeof window !== "undefined") {
    try {
      // eslint-disable-next-line no-console
      console.log(
        "[question.submit] polledRaw",
        polledRaw,
        "aiResult",
        aiResult,
        "recommendation",
        recommendation,
      );
    } catch (ignore) {
      // ignore
    }
  }

  try {
    store.saveRecommendation(recommendation);
  } catch (error) {
    aiError = aiError || error;
  }

  try {
    if (typeof store.migrateIfNeeded === "function") {
      store.migrateIfNeeded();
    }
  } catch (error) {
    // ignore
  }

  const recommendationPlain = (() => {
    try {
      return JSON.parse(JSON.stringify(recommendation || null));
    } catch (error) {
      return null;
    }
  })();

  try {
    if (typeof getApp === "function") {
      const app = getApp();
      if (app && typeof app === "object") {
        app.globalData = app.globalData || {};
        app.globalData.pendingRecommendation = recommendationPlain;
      }
    }
  } catch (error) {
    // ignore
  }
  try {
    if (typeof window !== "undefined") {
      window.__XZZX_RECOMMENDATION__ = recommendationPlain;
    }
  } catch (error) {
    // ignore
  }
  try {
    uni.setStorageSync(
      "xczx-tuijian-pending-recommendation",
      recommendationPlain ? JSON.stringify(recommendationPlain) : "",
    );
  } catch (error) {
    // ignore
  }

  const finalProducts =
    (store.recommendation &&
      store.recommendation.products &&
      store.recommendation.products.length) ||
    0;
  const recObjProducts =
    (recommendationPlain &&
      recommendationPlain.products &&
      recommendationPlain.products.length) ||
    0;
  uni.showToast({
    title: `④store内存=${finalProducts} recPlain=${recObjProducts}`,
    icon: "none",
    duration: 2500,
  });

  try {
    store.saveAnswers(safeClone(form));
  } catch (error) {
    aiError = aiError || error;
  }

  submitting.value = false;

  let query = "";
  if (recommendationPlain) {
    try {
      query =
        "?data=" + encodeURIComponent(JSON.stringify(recommendationPlain));
    } catch (ignore) {
      // ignore
    }
  }
  uni.navigateTo({
    url: "/pages/recommend/result" + query,
    fail(err) {
      const msg = (err && err.errMsg) || "跳转结果页失败";
      uni.showToast({ title: msg, icon: "none" });
    },
  });
}
</script>

<template>
  <view class="question-page">
    <view class="question-inner">
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

      <view v-if="loading" class="loading-tip">问卷加载中…</view>

      <template v-else-if="items.length">
        <view class="form-card">
          <view
            v-for="(item, qIdx) in items"
            :key="item.itemId"
            class="q-block"
          >
            <view class="q-title">{{ `${qIdx + 1}.${item.question}` }}</view>

            <view v-if="item.questionType === 'radio'" class="opt-grid">
              <view
                v-for="option in item.options"
                :key="option"
                class="opt-pill"
                :class="{ active: form[item.itemId] === option }"
                @tap="selectOption(item.itemId, option)"
              >
                <view class="opt-radio">
                  <view
                    v-if="form[item.itemId] === option"
                    class="opt-radio-dot"
                  ></view>
                </view>
                <text class="opt-text">{{ option }}</text>
              </view>
            </view>

            <view v-else-if="item.questionType === 'checkbox'" class="opt-grid">
              <view
                v-for="option in item.options"
                :key="option"
                class="opt-pill"
                :class="{ active: (form[item.itemId] || []).includes(option) }"
                @tap="toggleOption(item.itemId, option)"
              >
                <view class="opt-check">
                  <text
                    v-if="(form[item.itemId] || []).includes(option)"
                    class="opt-check-tick"
                    >✓</text
                  >
                </view>
                <text class="opt-text">{{ option }}</text>
              </view>
            </view>

            <view v-else class="field-wrap">
              <input
                v-model="form[item.itemId]"
                class="field-input"
                type="text"
                placeholder="请输入喜欢的食材，如蓝莓、坚果、全麦"
                placeholder-class="field-placeholder"
              />
            </view>
          </view>
        </view>

        <view
          class="submit-bottom"
          :class="{ disabled: submitting }"
          @tap="submitForm"
        >
          {{ submitting ? "正在生成推荐…" : "查看推荐" }}
        </view>
        <view class="safe-bottom-spacer"></view>
      </template>

      <view v-else class="empty-tip">暂无问卷题目</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.question-page {
  min-height: 100vh;
  background: url("/static/images/推荐结果 demo/background.png") no-repeat top
    center / cover;
  background-color: #fff8f1;
}

.question-inner {
  padding: 0 28rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.custom-nav {
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  padding-top: calc(var(--status-bar-height, 44px) + 16rpx);
  padding-bottom: 14rpx;
}

.avatar-block {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 14rpx rgba(29, 33, 41, 0.08);
}

.avatar-meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.avatar-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #1d2129;
  letter-spacing: 1rpx;
}

.avatar-sub {
  font-size: 22rpx;
  color: #86909c;
}

.loading-tip,
.empty-tip {
  padding: 80rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #86909c;
}

.form-card {
  background: #ffffff;
  border-radius: 28rpx;
  padding: 36rpx 32rpx 16rpx;
  box-shadow: 0 6rpx 24rpx rgba(29, 33, 41, 0.06);
}

.q-block {
  margin-bottom: 36rpx;
}

.q-title {
  font-size: 28rpx;
  font-weight: 800;
  color: #a24617;
  letter-spacing: 1rpx;
  margin-bottom: 22rpx;
}

.opt-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.opt-pill {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 84rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: #fff3e6;
  border: 2rpx solid transparent;
  transition: all 0.15s ease;
}

.opt-pill.active {
  background: #ffe1c9;
  border-color: #bc581c;
}

.opt-radio {
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  border: 3rpx solid #c9cdd4;
  background: #ffffff;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.opt-pill.active .opt-radio {
  border-color: #bc581c;
}

.opt-radio-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #bc581c;
}

.opt-check {
  width: 30rpx;
  height: 30rpx;
  border-radius: 8rpx;
  border: 3rpx solid #c9cdd4;
  background: #ffffff;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.opt-pill.active .opt-check {
  border-color: #bc581c;
  background: #bc581c;
}

.opt-check-tick {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 800;
  line-height: 1;
}

.opt-text {
  font-size: 28rpx;
  color: #4e5969;
  font-weight: 500;
}

.opt-pill.active .opt-text {
  color: #8a3d12;
  font-weight: 700;
}

.field-wrap {
  width: 100%;
}

.field-input {
  width: 100%;
  min-height: 88rpx;
  padding: 0 28rpx;
  border-radius: 24rpx;
  background: #fff3e6;
  border: 2rpx solid transparent;
  font-size: 28rpx;
  color: #1d2129;
  box-sizing: border-box;
}

.field-input:focus {
  background: #ffffff;
  border-color: #bc581c;
}

.field-placeholder {
  color: #a4a9ad;
  font-size: 26rpx;
}

.submit-bottom {
  margin-top: 4rpx;
  height: 96rpx;
  line-height: 96rpx;
  flex-shrink: 0;
  text-align: center;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #bc581c 0%, #d9743a 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
  box-shadow: 0 8rpx 24rpx rgba(188, 88, 28, 0.28);
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
}

.submit-bottom.disabled {
  opacity: 0.6;
}

.safe-bottom-spacer {
  width: 100%;
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
  flex-shrink: 0;
}
</style>
