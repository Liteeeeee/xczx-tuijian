<script setup>
import { useAppStore } from '@/store/app';

const store = useAppStore();

const menus = [
  { title: '个人资料', url: '/pages/user/profile' },
  { title: '关于我们', url: '/pages/user/about' },
  { title: '服务协议', url: '/pages/user/agreement' },
];

function goLogin() {
  uni.navigateTo({
    url: '/pages/user/login',
  });
}

function goPage(url) {
  uni.navigateTo({ url });
}

function logout() {
  store.logout();
  uni.showToast({
    title: '已退出账号',
    icon: 'success',
  });
}
</script>

<template>
  <view class="page-shell user-page">
    <view class="profile-card">
      <view class="avatar">{{ store.displayName.slice(0, 1) }}</view>
      <view class="profile-info">
        <view class="profile-name">{{ store.displayName }}</view>
        <view class="profile-phone">{{ store.maskedPhone }}</view>
      </view>
      <view class="action-link" @tap="store.loggedIn ? goPage('/pages/user/profile') : goLogin()">
        {{ store.loggedIn ? '编辑资料' : '去登录' }}
      </view>
    </view>

    <view class="section-card">
      <view v-for="item in menus" :key="item.title" class="list-item" @tap="goPage(item.url)">
        <text>{{ item.title }}</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <view v-if="store.loggedIn" class="ghost-btn" @tap="logout">退出账号</view>
    <view v-else class="primary-btn" @tap="goLogin">注册 / 登录</view>
  </view>
</template>

<style lang="scss" scoped>
.user-page {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  border-radius: 32rpx;
  background: linear-gradient(145deg, #111827 0%, #1f2937 40%, #0f766e 100%);
  color: #ffffff;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  font-size: 40rpx;
  font-weight: 700;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 34rpx;
  font-weight: 700;
}

.profile-phone {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.72);
}

.action-link {
  font-size: 24rpx;
  color: #d1fae5;
}

.arrow {
  font-size: 40rpx;
  color: #94a3b8;
}
</style>
