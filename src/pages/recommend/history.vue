<script setup>
import { ref, computed, onMounted } from "vue";
import { getAiSessions } from "@/utils/api";

const loading = ref(true);
const list = ref([]);
const errorMsg = ref("");
const errorCode = ref(0);
const requestDebug = ref("");

const rows = computed(() =>
  list.value
    .slice()
    .sort(
      (a, b) =>
        timeStamp(b.lastTime || b.createTime) -
        timeStamp(a.lastTime || a.createTime),
    ),
);

function timeStamp(s) {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}
function pad(n) {
  return n < 10 ? "0" + n : String(n);
}
function formatTime(s) {
  if (!s) return "--";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function load() {
  loading.value = true;
  errorMsg.value = "";
  errorCode.value = 0;
  requestDebug.value = "";
  try {
    const res = await getAiSessions();
    list.value = Array.isArray(res && res.data) ? res.data : [];
  } catch (error) {
    const raw = error && (error.rawBody || error.raw || error.response);
    if (raw && typeof raw === "object") {
      errorCode.value = Number(raw.code) || (res && res.code) || 0;
      errorMsg.value =
        raw.msg || raw.message || error.message || "加载失败，请稍后重试";
    } else if (error && typeof error === "object") {
      errorMsg.value = error.msg || error.message || "加载失败，请稍后重试";
      requestDebug.value =
        error && error.stack ? error.stack.slice(0, 200) : "";
    } else {
      errorMsg.value = String(error || "加载失败，请稍后重试");
    }
    list.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function goLogin() {
  uni.navigateTo({
    url: "/pages/user/login",
    fail() {
      try {
        uni.reLaunch({ url: "/pages/user/login" });
      } catch (ignore) {
        /* ignore */
      }
    },
  });
}

function openDetail(item) {
  if (!item || !item.sessionId) return;
  let url = `/pages/recommend/result?sessionId=${encodeURIComponent(item.sessionId)}`;
  if (item.title) {
    url += `&title=${encodeURIComponent(item.title)}`;
  }
  uni.navigateTo({ url });
}

function goRecommend() {
  uni.navigateTo({ url: "/pages/recommend/question" });
}
</script>

<template>
  <view class="page-shell history-page">
    <view class="custom-nav">
      <view class="avatar-block">
        <image
          class="avatar"
          src="/static/images/推荐结果 demo/顶部 icon.png"
          mode="aspectFit"
        />
        <view class="avatar-meta">
          <view class="avatar-title">元气食集</view>
          <view class="avatar-sub">用AI发现更适合你的美味生活</view>
        </view>
      </view>
      <view class="nav-right-placeholder"></view>
    </view>

    <view v-if="loading" class="loading-wrap">
      <view class="loading-dashed">正在加载历史记录…</view>
    </view>

    <template v-else-if="rows.length">
      <view class="session-list">
        <view
          v-for="(item, idx) in rows"
          :key="item.sessionId || item.id"
          class="session-card"
          @tap="openDetail(item)"
        >
          <view class="card-top-line">
            <view class="date-chip">
              <view class="clock-icon">
                <text class="clock-inner">⏰</text>
              </view>
              <text class="date-text">{{
                formatTime(item.lastTime || item.createTime)
              }}</text>
            </view>
            <view class="card-right">
              <image
                class="arrow-icon"
                src="/static/images/历史对话_slices/arrow.png"
                mode="aspectFit"
              />
            </view>
          </view>
          <view class="question-lines">
            <view class="question-line">
              {{ item.title || item.firstPrompt || "查看本次AI面包推荐详情" }}
            </view>
          </view>
        </view>
      </view>
    </template>

    <view v-else-if="errorMsg" class="empty-wrap">
      <view class="empty-title">
        {{
          errorCode === 401
            ? "登录态已失效"
            : errorCode === 404
              ? "后端未配置历史接口"
              : "加载失败"
        }}
      </view>
      <view class="empty-subtitle">{{ errorMsg }}</view>
      <view v-if="errorCode === 401" class="primary-btn" @tap="goLogin"
        >重新登录</view
      >
      <view v-else class="primary-btn" @tap="load">重新加载</view>
      <view class="ghost-btn" @tap="goRecommend">去做一次新推荐</view>
    </view>

    <view v-else class="empty-wrap">
      <view class="empty-icon">📋</view>
      <view class="empty-title">还没有推荐历史</view>
      <view class="empty-subtitle"
        >先去填写问卷，AI 会为您生成专属面包推荐</view
      >
      <view class="primary-btn" @tap="goRecommend">立即体验</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.history-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background:
    url("/static/images/历史对话_slices/pageBackground.png") top center / 100%
      auto no-repeat,
    #fff8f1;
  padding: 0 32rpx 48rpx;
  box-sizing: border-box;
}

.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 60rpx 0 28rpx;
}
.avatar-block {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 22rpx;
  box-shadow: 0 8rpx 24rpx rgba(188, 88, 28, 0.18);
}
.avatar-meta {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.avatar-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1d2129;
  letter-spacing: 0.3rpx;
}
.avatar-sub {
  font-size: 22rpx;
  color: #86909c;
  font-weight: 500;
}
.nav-right-placeholder {
  width: 64rpx;
  height: 64rpx;
}

.loading-wrap {
  padding: 120rpx 0;
  display: flex;
  justify-content: center;
}
.loading-dashed {
  padding: 20rpx 36rpx;
  border: 2rpx dashed #c7a27f;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #8c6a48;
  background: rgba(255, 243, 230, 0.6);
}

.session-list {
  padding-top: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.session-card {
  position: relative;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-radius: 28rpx;
  padding: 28rpx;
  box-shadow: 0 10rpx 32rpx rgba(141, 85, 34, 0.08);
  overflow: hidden;
}
.card-wheat-tag {
  position: absolute;
  top: 18rpx;
  right: 18rpx;
  background: linear-gradient(135deg, #ffd89b 0%, #f5b974 100%);
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 12rpx rgba(200, 140, 60, 0.25);
}
.wheat-tag-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #6b3f12;
  letter-spacing: 0.2rpx;
}

.card-top-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 22rpx;
}
.date-chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 20rpx;
  background: #fff3e6;
  border-radius: 999rpx;
  flex: 0 0 auto;
}
.clock-icon {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #fff3e6;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(188, 88, 28, 0.15);
}
.clock-inner {
  font-size: 22rpx;
  line-height: 1;
}
.date-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #8c5a2a;
  letter-spacing: 0.2rpx;
}
.card-right {
  flex: 0 0 auto;
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.arrow-icon {
  width: 32rpx;
  height: 32rpx;
  opacity: 0.8;
}
.question-lines {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding-left: 4rpx;
  padding-right: 8rpx;
}
.question-line {
  font-size: 28rpx;
  line-height: 1.55;
  font-weight: 600;
  color: #5a3a1c;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}
.question-line--sub {
  -webkit-line-clamp: 1;
  font-weight: 500;
  color: #9a7754;
  font-size: 24rpx;
}

.empty-wrap {
  padding: 160rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  text-align: center;
}
.empty-icon {
  font-size: 120rpx;
  opacity: 0.8;
  margin-bottom: 12rpx;
}
.empty-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #5a3a1c;
}
.empty-subtitle {
  font-size: 26rpx;
  color: #a07e5b;
  line-height: 1.6;
  max-width: 560rpx;
  padding: 0 20rpx;
}
.primary-btn {
  margin-top: 32rpx;
  padding: 24rpx 80rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #d89134 0%, #bc581c 100%);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: 0 10rpx 28rpx rgba(188, 88, 28, 0.3);
  letter-spacing: 0.3rpx;
}
.ghost-btn {
  margin-top: 10rpx;
  padding: 20rpx 64rpx;
  border-radius: 999rpx;
  background: #fff3e6;
  color: #8c5a2a;
  font-size: 26rpx;
  font-weight: 600;
}
</style>
