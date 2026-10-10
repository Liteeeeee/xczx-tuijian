<script setup>
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';

const visible = ref(false);
const versionOK = ref(false);

function compareVersion(v1, v2) {
  const a1 = v1.split('.').map((x) => parseInt(x, 10) || 0);
  const a2 = v2.split('.').map((x) => parseInt(x, 10) || 0);
  const len = Math.max(a1.length, a2.length);
  while (a1.length < len) a1.push(0);
  while (a2.length < len) a2.push(0);
  for (let i = 0; i < len; i++) {
    if (a1[i] > a2[i]) return 1;
    if (a1[i] < a2[i]) return -1;
  }
  return 0;
}

function checkAndShow() {
  // #ifdef MP-WEIXIN
  try {
    const sys = uni.getSystemInfoSync();
    const sdk = sys.SDKVersion || '0.0.0';
    versionOK.value = compareVersion(sdk, '2.32.3') >= 0;
    if (!versionOK.value) return;
    if (typeof wx !== 'undefined' && wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success(res) {
          if (res.needAuthorization) {
            visible.value = true;
          }
        },
        fail() {
          visible.value = false;
        },
      });
    }
  } catch (ignore) {
    visible.value = false;
  }
  // #endif
  // #ifndef MP-WEIXIN
  visible.value = false;
  // #endif
}

function onAgreePrivacy(e) {
  // #ifdef MP-WEIXIN
  if (e && e.detail && e.detail.errMsg && e.detail.errMsg.indexOf('ok') >= 0) {
    visible.value = false;
  }
  // #endif
}

function openAgreement() {
  uni.navigateTo({ url: '/pages/user/agreement' });
}

function handleDisagree() {
  uni.showModal({
    title: '提示',
    content: '若您不同意《用户隐私保护指引》，将无法使用个性化推荐等核心功能，是否重新考虑？',
    confirmText: '同意',
    cancelText: '退出',
    success: (res) => {
      if (!res.confirm) {
        try {
          // #ifdef MP-WEIXIN
          if (typeof wx !== 'undefined' && wx.exitMiniProgram) {
            wx.exitMiniProgram();
          }
          // #endif
        } catch (ignore) { /* ignore */ }
      }
    },
  });
}

onMounted(checkAndShow);
try {
  onShow(checkAndShow);
} catch (ignore) { /* ignore */ }
</script>

<template>
  <view
    v-if="visible"
    class="privacy-mask"
    @tap.stop
  >
    <view class="privacy-dialog">
      <view class="privacy-title">用户隐私保护提示</view>
      <view class="privacy-desc">
        感谢您使用「仙草甄选AI推荐」小程序，在您使用前，请仔细阅读
        <text class="privacy-link" @tap="openAgreement">《用户隐私保护指引》</text>
        。如您同意，请点击下方「同意并继续」开始使用我们的服务。
      </view>
      <view class="privacy-actions">
        <view class="privacy-btn privacy-btn-cancel" @tap="handleDisagree">
          <text class="privacy-btn-text privacy-btn-text-cancel">不同意</text>
        </view>
        <!-- #ifdef MP-WEIXIN -->
        <button
          class="privacy-btn privacy-btn-confirm"
          open-type="agreePrivacyAuthorization"
          @agreeprivacyauthorization="onAgreePrivacy"
        >
          同意并继续
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="privacy-btn privacy-btn-confirm" @tap="visible = false">
          <text class="privacy-btn-text privacy-btn-text-confirm">同意并继续</text>
        </view>
        <!-- #endif -->
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.privacy-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.privacy-dialog {
  width: 600rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx 32rpx;
  box-shadow: 0 20rpx 60rpx rgba(15, 23, 42, 0.18);
}

.privacy-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #111827;
  text-align: center;
  line-height: 1.3;
}

.privacy-desc {
  margin-top: 28rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: #4b5563;
}

.privacy-link {
  color: #bc581c;
}

.privacy-actions {
  margin-top: 48rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.privacy-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 84rpx;
  border-radius: 999rpx;
}

.privacy-btn-cancel {
  background: #f3f4f6;
}

.privacy-btn-text-cancel {
  color: #6b7280;
  font-size: 28rpx;
  font-weight: 500;
}

.privacy-btn-confirm {
  margin: 0;
  padding: 0;
  border: 0;
  background: linear-gradient(90deg, #f37e41 0%, #fcbb69 100%);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 84rpx;
  border-radius: 999rpx;
}

.privacy-btn-confirm::after {
  border: 0;
}

.privacy-btn-text-confirm {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
}
</style>
