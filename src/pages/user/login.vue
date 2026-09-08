<script setup>
import { reactive, ref, onUnmounted } from 'vue';
import { useAppStore } from '@/store/app';
import { sendSmsCode } from '@/utils/api';

const store = useAppStore();

const form = reactive({
  phone: store.user.phone,
  code: '',
});

const sending = ref(false);
const countdown = ref(0);
let timer = null;

function validatePhone() {
  if (!/^1\d{10}$/.test(form.phone)) {
    uni.showToast({
      title: '请输入正确手机号',
      icon: 'none',
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
      title: '验证码已发送',
      icon: 'none',
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
      title: '请输入验证码',
      icon: 'none',
    });
    return;
  }

  try {
    await store.login(form.phone, form.code);
    uni.showToast({
      title: '登录成功',
      icon: 'success',
    });
    setTimeout(() => {
      uni.switchTab({
        url: '/pages/index/index',
      });
    }, 500);
  } catch (error) {
    // 错误已在 request 层统一提示
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
      <view class="login-title">营养推荐官</view>
      <view class="login-subtitle">注册 / 登录</view>

      <view class="field-label">手机号码</view>
      <input v-model="form.phone" class="field-input" type="number" maxlength="11" placeholder="请输入手机号" />

      <view class="field-label">验证码</view>
      <view class="code-row">
        <input v-model="form.code" class="field-input code-input" maxlength="6" placeholder="请输入验证码" />
        <view class="code-btn" :class="{ disabled: countdown > 0 }" @tap="getCode">
          {{ countdown > 0 ? `${countdown}s后重发` : (sending ? '发送中…' : '获取验证码') }}
        </view>
      </view>

      <view class="agreement-hint">点击注册或登录即表示您同意《用户服务协议》</view>
      <view class="primary-btn login-btn" @tap="login">注册 / 登录</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-page {
  padding-top: 48rpx;
}

.login-card {
  padding: 40rpx 32rpx;
  border-radius: 36rpx;
  background: #ffffff;
  box-shadow: 0 24rpx 60rpx rgba(15, 23, 42, 0.08);
}

.login-title {
  font-size: 46rpx;
  font-weight: 700;
  color: #111827;
}

.login-subtitle {
  margin-top: 10rpx;
  font-size: 28rpx;
  color: #6b7280;
}

.field-label {
  margin-top: 28rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #374151;
}

.field-input {
  margin-top: 14rpx;
  height: 92rpx;
  padding: 0 24rpx;
  border-radius: 24rpx;
  border: 2rpx solid #e5e7eb;
  background: #f8fafc;
  font-size: 28rpx;
}

.code-row {
  display: flex;
  gap: 16rpx;
  align-items: flex-end;
}

.code-input {
  flex: 1;
}

.code-btn {
  width: 200rpx;
  height: 92rpx;
  border-radius: 24rpx;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 600;
  margin-top: 14rpx;
}

.code-btn.disabled {
  color: #94a3b8;
  background: #f1f5f9;
}

.agreement-hint {
  margin-top: 28rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #6b7280;
}

.login-btn {
  margin-top: 28rpx;
}
</style>
