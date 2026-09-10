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
  <view class="page-shell question-page">
    <view class="section-card top-card">
      <view class="tag">智能推荐</view>
      <view class="section-title">{{
        template && template.templateName
          ? template.templateName
          : "营养方案问卷"
      }}</view>
      <view class="section-subtitle"
        >根据您的选择，AI 将为您生成专属营养推荐。</view
      >
    </view>

    <view v-if="loading" class="section-card loading-card">问卷加载中…</view>

    <template v-else-if="items.length">
      <view
        v-for="item in items"
        :key="item.itemId"
        class="section-card question-card"
      >
        <view class="question-title">{{ item.question }}</view>

        <view v-if="item.questionType === 'radio'" class="option-list">
          <view
            v-for="option in item.options"
            :key="option"
            class="option-item"
            :class="{ active: form[item.itemId] === option }"
            @tap="selectOption(item.itemId, option)"
          >
            <view class="option-radio"></view>
            <text>{{ option }}</text>
          </view>
        </view>

        <view v-else-if="item.questionType === 'checkbox'" class="option-list">
          <view
            v-for="option in item.options"
            :key="option"
            class="option-item"
            :class="{ active: (form[item.itemId] || []).includes(option) }"
            @tap="toggleOption(item.itemId, option)"
          >
            <view class="option-check"></view>
            <text>{{ option }}</text>
          </view>
        </view>

        <input
          v-else
          v-model="form[item.itemId]"
          class="field-input"
          type="text"
          placeholder="请输入"
        />
      </view>

      <view
        class="primary-btn submit-btn"
        :class="{ disabled: submitting }"
        @tap="submitForm"
      >
        {{ submitting ? "正在生成推荐…" : "查看推荐" }}
      </view>
    </template>

    <view v-else class="section-card empty-card">暂无问卷题目</view>
  </view>
</template>

<style lang="scss" scoped>
.question-page {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding-bottom: 48rpx;
}

.top-card {
  background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
}

.question-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #111827;
}

.option-list {
  margin-top: 28rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 96rpx;
  padding: 0 24rpx;
  border-radius: 24rpx;
  border: 2rpx solid #e5e7eb;
  background: #f8fafc;
  font-size: 28rpx;
  color: #374151;
}

.option-item.active {
  border-color: #28c4b8;
  background: rgba(40, 196, 184, 0.1);
  color: #0f766e;
}

.option-radio,
.option-check {
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
  border: 4rpx solid #cbd5e1;
  background: #ffffff;
  flex-shrink: 0;
}

.option-check {
  border-radius: 8rpx;
}

.option-item.active .option-radio {
  border-color: #28c4b8;
  background: radial-gradient(circle, #28c4b8 0 50%, #ffffff 51% 100%);
}

.option-item.active .option-check {
  border-color: #28c4b8;
  background: #28c4b8;
}

.field-input {
  margin-top: 28rpx;
  height: 92rpx;
  padding: 0 24rpx;
  border-radius: 24rpx;
  border: 2rpx solid #e5e7eb;
  background: #f8fafc;
  font-size: 28rpx;
}

.loading-card,
.empty-card {
  padding: 48rpx 32rpx;
  text-align: center;
  font-size: 28rpx;
  color: #6b7280;
}

.submit-btn {
  margin-top: 8rpx;
}

.submit-btn.disabled {
  opacity: 0.6;
}
</style>
