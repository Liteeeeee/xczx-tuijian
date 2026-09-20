<script setup>
import { reactive, ref, onUnmounted } from "vue";
import { useAppStore } from "@/store/app";
import { sendSmsCode } from "@/utils/api";

const store = useAppStore();

const form = reactive({
  phone: store.user.phone,
  code: "",
});

const sending = ref(false);
const countdown = ref(0);
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
  if (!validatePhone()) return;

  if (!form.code || form.code.length < 4) {
    uni.showToast({
      title: "请输入验证码",
      icon: "none",
    });
    return;
  }
  debugger;
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

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<template>
  <view class="page-shell login-page">
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

      <view class="primary-btn login-btn" @tap="login">登录</view>

      <view class="agreement-hint">
        <text class="hint-text">登录即代表您同意我们的</text>
        <text class="link-text">《用户服务协议》</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: url("/static/images/登录_slices/pagebackground.png") no-repeat top
    center / cover;
  background-color: #fff8f1;
  display: flex;
  flex-direction: column;
}

.login-card {
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

.agreement-hint {
  margin-top: 40rpx;
  text-align: center;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hint-text {
  color: #86909c;
}

.link-text {
  color: #bc581c;
}
</style>
