<script setup>
import { ref, computed, onMounted } from 'vue';
import { getAiSessions } from '@/utils/api';

const loading = ref(true);
const list = ref([]);
const errorMsg = ref('');
const errorCode = ref(0);
const requestDebug = ref('');

const rows = computed(() => list.value.slice().sort((a, b) => timeStamp(b.lastTime || b.createTime) - timeStamp(a.lastTime || a.createTime)));

function timeStamp(s) {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}
function pad(n) {
  return n < 10 ? '0' + n : String(n);
}
function formatTime(s) {
  if (!s) return '--';
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function load() {
  loading.value = true;
  errorMsg.value = '';
  errorCode.value = 0;
  requestDebug.value = '';
  try {
    const res = await getAiSessions();
    list.value = Array.isArray(res && res.data) ? res.data : [];
  } catch (error) {
    const raw = error && (error.rawBody || error.raw || error.response);
    if (raw && typeof raw === 'object') {
      errorCode.value = Number(raw.code) || (res && res.code) || 0;
      errorMsg.value = raw.msg || raw.message || error.message || '加载失败，请稍后重试';
    } else if (error && typeof error === 'object') {
      errorMsg.value = error.msg || error.message || '加载失败，请稍后重试';
      requestDebug.value = error && error.stack ? error.stack.slice(0, 200) : '';
    } else {
      errorMsg.value = String(error || '加载失败，请稍后重试');
    }
    list.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function goLogin() {
  uni.navigateTo({
    url: '/pages/user/login',
    fail() {
      try { uni.reLaunch({ url: '/pages/user/login' }); } catch (ignore) { /* ignore */ }
    },
  });
}

function openDetail(item) {
  if (!item || !item.sessionId) return;
  uni.navigateTo({
    url: `/pages/recommend/result?sessionId=${encodeURIComponent(item.sessionId)}`,
  });
}

function goRecommend() {
  uni.navigateTo({ url: '/pages/recommend/question' });
}
</script>

<template>
  <view class="page-shell history-page">
    <view class="page-header">
      <view class="header-info">
        <view class="header-title">智能推荐历史</view>
        <view class="header-subtitle">最近 AI 会话 · 按时间倒序</view>
      </view>
    </view>

    <view v-if="loading" class="section-card loading-card">
      <view class="loading-text">加载中...</view>
    </view>

    <view v-else-if="errorMsg" class="section-card empty-card">
      <view class="section-title">
        {{ errorCode === 401 ? '登录态已失效' : errorCode === 404 ? '后端未配置历史接口' : '加载失败' }}
      </view>
      <view class="section-subtitle">{{ errorMsg }}</view>
      <view v-if="requestDebug" class="debug-text-tiny">{{ requestDebug }}</view>
      <view v-if="errorCode === 401" class="primary-btn" @tap="goLogin">重新登录</view>
      <view v-else class="primary-btn" @tap="load">重新加载</view>
      <view class="ghost-btn" @tap="goRecommend">去做一次新推荐</view>
    </view>

    <view v-else-if="rows.length" class="session-list">
      <view v-for="item in rows" :key="item.sessionId || item.id" class="card session-card" @tap="openDetail(item)">
        <view class="session-time-block">
          <view class="time-main">
            <text class="time-label">最近对话</text>
            <text class="time-val">{{ formatTime(item.lastTime) }}</text>
          </view>
          <view class="time-sub">
            <text class="time-label">创建于</text>
            <text class="time-sub-val">{{ formatTime(item.createTime) }}</text>
          </view>
        </view>

        <view class="session-body">
          <view class="session-title">
            {{ item.title || item.firstPrompt || '未命名会话' }}
          </view>
          <view class="session-meta">
            <view class="meta-chip meta-chip--round">
              {{ item.appName || 'AI 推荐' }}
            </view>
            <view class="meta-chip">
              {{ Number(item.messageCount) >= 0 ? Number(item.messageCount) + ' 轮' : '' }}
            </view>
            <view class="arrow">›</view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="section-card empty-card">
      <view class="section-title">还没有推荐历史</view>
      <view class="section-subtitle">先去填写问卷，AI 会为您生成专属推荐会话</view>
      <view class="primary-btn" @tap="goRecommend">立即体验</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.history-page {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 4rpx 4rpx;
}
.header-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #0f172a;
}
.header-subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #64748b;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.session-card {
  padding: 28rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 30rpx rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.session-time-block {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding-bottom: 18rpx;
  border-bottom: 1rpx dashed #e2e8f0;
}
.time-main,
.time-sub {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.time-sub { align-items: flex-end; }
.time-label {
  font-size: 22rpx;
  color: #94a3b8;
}
.time-val {
  font-size: 30rpx;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.2rpx;
}
.time-sub-val {
  font-size: 24rpx;
  font-weight: 600;
  color: #475569;
}

.session-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}
.session-title {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  line-height: 1.5;
  font-weight: 700;
  color: #0f172a;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.session-meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex: 0 0 auto;
}
.meta-chip {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
  font-size: 22rpx;
  line-height: 1.4;
  font-weight: 600;
}
.meta-chip--round {
  background: linear-gradient(135deg, #0f766e 0%, #28c4b8 100%);
  color: #ffffff;
}
.arrow {
  font-size: 40rpx;
  color: #94a3b8;
  padding-left: 4rpx;
}

.loading-card,
.empty-card {
  text-align: center;
}
.loading-text {
  font-size: 26rpx;
  color: #64748b;
}
.debug-text-tiny {
  margin-top: 16rpx;
  font-size: 20rpx;
  color: #94a3b8;
  text-align: left;
  word-break: break-all;
  padding: 16rpx 12rpx;
  border-radius: 14rpx;
  background: #f8fafc;
}
</style>
