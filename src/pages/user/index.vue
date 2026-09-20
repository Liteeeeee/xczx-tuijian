<script setup>
import { useAppStore } from '@/store/app';
import { onShow } from "@dcloudio/uni-app";
import CustomTabBar from "@/components/custom-tab-bar/custom-tab-bar.vue";

const store = useAppStore();

onShow(() => {
  uni.hideTabBar({
    animation: false
  });
});

const menus = [
  { title: '历史对话', url: '/pages/recommend/history', icon: '/static/images/个人中心/历史对话.png' },
  { title: '关于我们', url: '/pages/user/about', icon: '/static/images/个人中心/关于我们.png' },
];

function goLogin() {
  uni.navigateTo({
    url: '/pages/user/login',
  });
}

function goPage(url) {
  if (!store.loggedIn && url !== '/pages/user/about') {
    goLogin();
    return;
  }
  uni.navigateTo({ url });
}

function logout() {
  store.logout();
  uni.showToast({
    title: '已退出账号',
    icon: 'success',
    duration: 1200,
  });
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/user/login' });
  }, 1200);
}
</script>

<template>
  <view class="page-shell user-page">
    <view class="header-bg">
      <view class="profile-wrap" @tap="!store.loggedIn ? goLogin() : null">
        <image class="avatar" src="/static/images/推荐 demo 首页切图/图标1@2x.png" mode="aspectFill" />
        <view class="profile-info">
          <view class="profile-name">{{ store.loggedIn ? store.displayName : '未登录' }}</view>
          <view class="profile-phone">{{ store.loggedIn ? store.maskedPhone : '点击登录账号' }}</view>
        </view>
        <view class="arrow-right" v-if="!store.loggedIn">›</view>
      </view>
    </view>

    <view class="content-body">
      <view class="menu-card">
        <view v-for="(item, index) in menus" :key="item.title" class="menu-item" @tap="goPage(item.url)">
          <image class="menu-icon" :src="item.icon" mode="aspectFit" />
          <text class="menu-title">{{ item.title }}</text>
          <text class="menu-arrow">›</text>
          <view v-if="index !== menus.length - 1" class="menu-divider"></view>
        </view>
      </view>

      <view v-if="store.loggedIn" class="logout-btn" @tap="logout">退出登录</view>
    </view>

    <custom-tab-bar :current="2" />
  </view>
</template>

<style lang="scss" scoped>
.user-page {
  min-height: 100vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
  padding-bottom: 140rpx;
}

.header-bg {
  background: linear-gradient(135deg, #fff3e6 0%, #ffe1c9 100%);
  padding: calc(var(--status-bar-height, 44px) + 60rpx) 40rpx 100rpx;
}

.profile-wrap {
  display: flex;
  align-items: center;
  gap: 32rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #ffffff;
  border: 4rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8rpx 24rpx rgba(188, 88, 28, 0.12);
}

.profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.profile-name {
  font-size: 40rpx;
  font-weight: 800;
  color: #1d2129;
}

.profile-phone {
  font-size: 26rpx;
  color: #8a3d12;
}

.arrow-right {
  font-size: 48rpx;
  color: #bc581c;
  font-weight: 300;
}

.content-body {
  flex: 1;
  background: #f7f8fa;
  padding: 40rpx 32rpx;
  margin-top: -40rpx;
  border-top-left-radius: 40rpx;
  border-top-right-radius: 40rpx;
  position: relative;
  z-index: 2;
}

.menu-card {
  background: #ffffff;
  border-radius: 32rpx;
  padding: 0 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(29, 33, 41, 0.04);
}

.menu-item {
  display: flex;
  align-items: center;
  height: 112rpx;
  position: relative;
}

.menu-item:active {
  opacity: 0.7;
}

.menu-icon {
  width: 44rpx;
  height: 44rpx;
  margin-right: 24rpx;
}

.menu-title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 500;
  color: #1d2129;
}

.menu-arrow {
  font-size: 36rpx;
  color: #c9cdd4;
  font-weight: 300;
}

.menu-divider {
  position: absolute;
  bottom: 0;
  left: 68rpx;
  right: 0;
  height: 2rpx;
  background: #f2f3f5;
}

.logout-btn {
  margin-top: 48rpx;
  height: 96rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #f53f3f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 32rpx rgba(29, 33, 41, 0.04);
}

.logout-btn:active {
  opacity: 0.7;
}
</style>
