<script setup>
import { nutritionCombos } from '@/utils/mock';

const highlights = [
  '基于年龄、生活方式与营养目标生成推荐',
  '首期聚焦移动端 H5，页面结构兼容小程序复用',
  '结合仙草甄选商品池输出可保存的营养报告',
];

function goRecommend() {
  uni.navigateTo({
    url: '/pages/recommend/question',
  });
}

function goAbout() {
  uni.navigateTo({
    url: '/pages/user/about',
  });
}
</script>

<template>
  <view class="page-shell home-page">
    <view class="hero-card">
      <view class="tag">AI 营养推荐官</view>
      <view class="hero-title">为我推荐</view>
      <view class="hero-subtitle">你的专属智能推荐官，帮助快速匹配适合自己的营养组合。</view>
      <view class="hero-actions">
        <view class="primary-btn" @tap="goRecommend">开始智能推荐</view>
        <view class="ghost-btn" @tap="goAbout">了解仙草甄选</view>
      </view>
    </view>

    <view class="section-card feature-card">
      <view class="section-title">一期能力</view>
      <view class="feature-list">
        <view v-for="item in highlights" :key="item" class="feature-item">
          <view class="feature-dot"></view>
          <text>{{ item }}</text>
        </view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">热门营养组合</view>
      <view class="section-subtitle">对齐蓝湖原型中的组合模块，先以静态组合卡形式上线。</view>
      <view class="combo-list">
        <view v-for="combo in nutritionCombos" :key="combo.id" class="combo-item">
          <view class="combo-head">
            <view>
              <view class="combo-title">{{ combo.title }}</view>
              <view class="combo-subtitle">{{ combo.subtitle }}</view>
            </view>
            <view class="combo-tag">{{ combo.tags[0] }}</view>
          </view>
          <view class="combo-products">{{ combo.products.join(' / ') }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.hero-card {
  padding: 40rpx 32rpx;
  border-radius: 36rpx;
  background: linear-gradient(145deg, #0f172a 0%, #1d4ed8 55%, #28c4b8 100%);
  color: #ffffff;
  box-shadow: 0 28rpx 60rpx rgba(29, 78, 216, 0.28);
}

.hero-title {
  margin-top: 28rpx;
  font-size: 56rpx;
  font-weight: 700;
}

.hero-subtitle {
  margin-top: 18rpx;
  font-size: 28rpx;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.86);
}

.hero-actions {
  margin-top: 36rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.feature-card {
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.feature-list {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  font-size: 28rpx;
  color: #374151;
  line-height: 1.6;
}

.feature-dot {
  width: 16rpx;
  height: 16rpx;
  margin-top: 14rpx;
  border-radius: 50%;
  background: #28c4b8;
  flex-shrink: 0;
}

.combo-list {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.combo-item {
  padding: 28rpx;
  border-radius: 28rpx;
  background: #f8fafc;
}

.combo-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
}

.combo-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #111827;
}

.combo-subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.combo-tag {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  font-size: 22rpx;
}

.combo-products {
  margin-top: 22rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: #374151;
}
</style>
