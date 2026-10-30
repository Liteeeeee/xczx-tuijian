<script setup>
import { reactive, ref, onUnmounted } from "vue";
import { useAppStore } from "@/store/app";
import { sendSmsCode } from "@/utils/api";
import { getStatusBarHeight } from "@/utils/status-bar";

const store = useAppStore();
const statusBarHeight = getStatusBarHeight();

const form = reactive({
  phone: store.user.phone,
  code: "",
});

const sending = ref(false);
const countdown = ref(0);
// 协议同意状态：默认不勾选，必须由用户主动勾选后才能登录
const agreed = ref(false);
let timer = null;

function validatePhone() {
  if (!/^1\d{10}$/.test(form.phone)) {
    uni.showToast({
      title: "请输入正确手机号",
      icon: "none",
    });
    return false;
  }
  return true;
}

async function getCode() {
  if (!validatePhone()) return;
  if (countdown.value > 0) return;

  sending.value = true;
  try {
    await sendSmsCode(form.phone);
    uni.showToast({
      title: "验证码已发送",
      icon: "none",
    });
    startCountdown();
  } catch (error) {
    // 错误已在 request 层统一提示
  } finally {
    sending.value = false;
  }
}

function startCountdown() {
  countdown.value = 60;
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      clearInterval(timer);
      timer = null;
    }
  }, 1000);
}

async function login() {
  // 必须由用户主动勾选同意协议，不允许默认同意
  if (!agreed.value) {
    uni.showToast({
      title: "请先阅读并勾选同意协议",
      icon: "none",
    });
    return;
  }

  if (!validatePhone()) return;

  if (!form.code || form.code.length < 4) {
    uni.showToast({
      title: "请输入验证码",
      icon: "none",
    });
    return;
  }
  try {
    await store.login(form.phone, form.code);
    uni.showToast({
      title: "登录成功",
      icon: "success",
    });
    setTimeout(() => {
      uni.switchTab({
        url: "/pages/index/index",
      });
    }, 500);
  } catch (error) {
    const code =
      (error &&
        typeof error === "object" &&
        (error.code ?? error.statusCode ?? error.status)) ??
      null;
    const msg =
      (error &&
        typeof error === "object" &&
        String(error.bizMsg || error.msg || error.message || "")) ||
      "";
    const isCode500 = code === 500;
    const isSmsWrong =
      isCode500 ||
      /短信验证码错误|短信验证码已过期|验证码不正确|验证码错误|验证码已过期/.test(
        msg,
      );
    if (isSmsWrong) {
      uni.showToast({
        title: "验证码不正确",
        icon: "none",
      });
    }
  }
}

function openAgreement(type) {
  uni.navigateTo({
    url: `/pages/user/agreement?type=${type}`,
  });
}

// 提供明确的取消/返回入口，避免用户被迫停留在登录页
function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
    return;
  }
  uni.switchTab({ url: "/pages/index/index" });
}

function toggleAgree() {
  agreed.value = !agreed.value;
}

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<template>
  <view
    class="page-shell login-page"
    :style="{ '--status-bar-height': statusBarHeight + 'px' }"
  >
    <image
      class="page-bg"
      src="/static/images/登录_slices/pagebackground.jpg"
      mode="widthFix"
    />
    <!-- 自定义导航栏下必须提供返回/取消入口 -->
    <view class="nav-back" @tap="goBack">
      <text class="nav-back-icon">‹</text>
    </view>
    <view class="login-card">
      <view class="login-title">手机号登录</view>
      <view class="login-subtitle">未注册的手机号验证后自动创建账户</view>

      <view class="input-group">
        <view class="input-wrapper">
          <image
            class="input-icon"
            src="/static/images/登录_slices/mobilephone.png"
            mode="aspectFit"
          />
          <input
            v-model="form.phone"
            class="field-input"
            type="number"
            maxlength="11"
            placeholder="请输入手机号码"
            placeholder-class="input-placeholder"
          />
        </view>
        <view class="divider"></view>

        <view class="input-wrapper code-wrapper">
          <image
            class="input-icon"
            src="/static/images/登录_slices/password.png"
            mode="aspectFit"
          />
          <input
            v-model="form.code"
            class="field-input"
            maxlength="6"
            placeholder="请输入验证码"
            placeholder-class="input-placeholder"
          />
          <view
            class="code-btn"
            :class="{ disabled: countdown > 0 }"
            @tap="getCode"
          >
            {{
              countdown > 0
                ? `${countdown}s后重发`
                : sending
                  ? "发送中…"
                  : "获取验证码"
            }}
          </view>
        </view>
      </view>

      <!-- 协议需用户主动勾选，不默认同意 -->
      <view class="agree-row">
        <view
          class="agree-box"
          :class="{ checked: agreed }"
          @tap="toggleAgree"
        >
          <text v-if="agreed" class="agree-tick">✓</text>
        </view>
        <view class="agree-text" @tap="toggleAgree">
          我已阅读并同意
          <text class="link-text" @tap.stop="openAgreement('service')"
            >《用户服务协议》</text
          >
          与
          <text class="link-text" @tap.stop="openAgreement('privacy')"
            >《隐私政策》</text
          >
        </view>
      </view>

      <view class="primary-btn login-btn" @tap="login">登录</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-page {
  position: relative;
  z-index: 0;
  overflow: hidden;
  min-height: 100vh;
  background-color: #fff8f1;
  display: flex;
  flex-direction: column;
}

/* 小程序 WXSS 不支持本地 background-image，改用 <image> 铺底 */
.page-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: -1;
}

.nav-back {
  position: absolute;
  left: 24rpx;
  top: calc(var(--status-bar-height, 20px) + 12rpx);
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(188, 88, 28, 0.12);
  z-index: 10;
}

.nav-back-icon {
  font-size: 44rpx;
  line-height: 1;
  color: #1d2129;
  margin-top: -8rpx;
}

.login-card {
  position: relative;
  z-index: 1;
  margin: 180rpx 40rpx 0;
  padding: 60rpx 40rpx;
  border-radius: 40rpx;
  background: #ffffff;
  box-shadow: 0 16rpx 48rpx rgba(188, 88, 28, 0.08);
}

.login-title {
  font-size: 44rpx;
  font-weight: 800;
  color: #1d2129;
  letter-spacing: 2rpx;
}

.login-subtitle {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #86909c;
  margin-bottom: 60rpx;
}

.input-group {
  border-radius: 24rpx;
  background: #f7f8fa;
  padding: 0 32rpx;
  margin-bottom: 60rpx;
}

.input-wrapper {
  display: flex;
  align-items: center;
  height: 110rpx;
}

.input-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.field-input {
  flex: 1;
  height: 100%;
  font-size: 30rpx;
  color: #1d2129;
  background: transparent;
  border: none;
  outline: none;
}

.input-placeholder {
  color: #c9cdd4;
  font-size: 30rpx;
}

.divider {
  height: 2rpx;
  background: #e5e6eb;
  margin-left: 64rpx; /* 避开 icon */
}

.code-wrapper {
  justify-content: space-between;
}

.code-btn {
  margin-left: 20rpx;
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 32rpx;
  background: #fff3e6;
  color: #bc581c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  white-space: nowrap;
}

.code-btn.disabled {
  color: #86909c;
  background: #f2f3f5;
}

.login-btn {
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #bc581c 0%, #d9743a 100%);
  font-size: 32rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
  box-shadow: 0 8rpx 24rpx rgba(188, 88, 28, 0.28);
}

.agree-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 32rpx;
}

.agree-box {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  margin: 4rpx 12rpx 0 0;
  border: 2rpx solid #c9cdd4;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.agree-box.checked {
  background: #bc581c;
  border-color: #bc581c;
}

.agree-tick {
  font-size: 20rpx;
  line-height: 1;
  font-weight: 700;
  color: #ffffff;
}

.agree-text {
  flex: 1;
  font-size: 24rpx;
  line-height: 1.5;
  color: #86909c;
}

.link-text {
  color: #bc581c;
}
</style>
