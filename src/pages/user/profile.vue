<script setup>
import { reactive } from 'vue';
import { useAppStore } from '@/store/app';

const store = useAppStore();

const form = reactive({
  nickname: store.user.nickname,
  phone: store.user.phone,
  birthday: store.user.birthday,
  gender: store.user.gender,
});

const genders = ['女士', '先生'];

function saveProfile() {
  if (!form.nickname) {
    uni.showToast({
      title: '请填写昵称',
      icon: 'none',
    });
    return;
  }

  store.saveProfile({ ...form });
  uni.showToast({
    title: '资料已保存',
    icon: 'success',
  });
}

function pickGender(item) {
  form.gender = item;
}

function onDateChange(event) {
  form.birthday = event.detail.value;
}
</script>

<template>
  <view class="page-shell profile-page">
    <view class="section-card">
      <view class="field-label">手机</view>
      <input v-model="form.phone" class="field-input" type="number" maxlength="11" placeholder="请输入手机号" />

      <view class="field-label">昵称</view>
      <input v-model="form.nickname" class="field-input" maxlength="20" placeholder="请输入昵称" />

      <view class="field-label">生日</view>
      <picker mode="date" :value="form.birthday" @change="onDateChange">
        <view class="picker-field">{{ form.birthday || '未填写' }}</view>
      </picker>

      <view class="field-label">性别</view>
      <view class="gender-list">
        <view
          v-for="item in genders"
          :key="item"
          class="gender-item"
          :class="{ active: form.gender === item }"
          @tap="pickGender(item)"
        >
          {{ item }}
        </view>
      </view>
    </view>

    <view class="primary-btn" @tap="saveProfile">保存资料</view>
  </view>
</template>

<style lang="scss" scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.field-label {
  margin-top: 20rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #374151;
}

.field-label:first-child {
  margin-top: 0;
}

.field-input,
.picker-field {
  margin-top: 14rpx;
  height: 92rpx;
  padding: 0 24rpx;
  border-radius: 24rpx;
  background: #f8fafc;
  border: 2rpx solid #e5e7eb;
  font-size: 28rpx;
  color: #111827;
  display: flex;
  align-items: center;
}

.gender-list {
  margin-top: 16rpx;
  display: flex;
  gap: 16rpx;
}

.gender-item {
  flex: 1;
  height: 88rpx;
  border-radius: 24rpx;
  background: #f8fafc;
  border: 2rpx solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #374151;
}

.gender-item.active {
  background: rgba(40, 196, 184, 0.1);
  border-color: #28c4b8;
  color: #0f766e;
}
</style>
