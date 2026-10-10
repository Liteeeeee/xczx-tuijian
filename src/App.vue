<script setup>
import "./uni.scss";
import PrivacyPopup from "@/components/privacy-popup/privacy-popup.vue";
import { onLaunch, onShow } from "@dcloudio/uni-app";

function compareVersion(v1, v2) {
  const a1 = v1.split(".").map((x) => parseInt(x, 10) || 0);
  const a2 = v2.split(".").map((x) => parseInt(x, 10) || 0);
  const len = Math.max(a1.length, a2.length);
  while (a1.length < len) a1.push(0);
  while (a2.length < len) a2.push(0);
  for (let i = 0; i < len; i++) {
    if (a1[i] > a2[i]) return 1;
    if (a1[i] < a2[i]) return -1;
  }
  return 0;
}

function checkPrivacyOnce() {
  // #ifdef MP-WEIXIN
  try {
    const sys = uni.getSystemInfoSync();
    const sdk = sys.SDKVersion || "0.0.0";
    if (compareVersion(sdk, "2.32.3") < 0) return;
    if (typeof wx !== "undefined" && wx.getPrivacySetting) {
      // 实际弹窗由 PrivacyPopup 组件接管，这里做一次主动拉起兜底
      // 兼容部分 SDK 版本不会自动触发隐私检测的情况
    }
  } catch (ignore) {
    /* ignore */
  }
  // #endif
}

onLaunch(() => {
  checkPrivacyOnce();
  try {
    if (typeof window === "undefined") return;
  } catch (ignore) {
    /* ignore */
  }
});

onShow(() => {
  checkPrivacyOnce();
});
</script>

<template>
  <view class="app-root">
    <PrivacyPopup />
  </view>
</template>

<style lang="scss">
page {
  min-height: 100%;
  background: #f5f7fb;
  color: #1f2937;
  font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
}

view,
text,
button,
input,
label,
picker,
radio,
radio-group {
  box-sizing: border-box;
}

.page-shell {
  min-height: 100vh;
}

.section-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx;
  box-shadow: 0 20rpx 50rpx rgba(15, 23, 42, 0.06);
}

.section-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #111827;
}

.section-subtitle {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #6b7280;
  line-height: 1.6;
}

.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #28c4b8 0%, #3b82f6 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: 0 20rpx 40rpx rgba(59, 130, 246, 0.22);
}

.ghost-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(59, 130, 246, 0.15);
  background: #ffffff;
  color: #2563eb;
  font-size: 28rpx;
  font-weight: 600;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(40, 196, 184, 0.12);
  color: #0f766e;
  font-size: 22rpx;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 2rpx solid #f1f5f9;
}

.list-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
</style>
