<script setup>
import { computed } from 'vue';
import { useAppStore } from '@/store/app';

const store = useAppStore();

const result = computed(() => store.recommendation);

function goRecommend() {
  uni.navigateTo({
    url: '/pages/recommend/question',
  });
}

function saveReport() {
  uni.showToast({
    title: '营养报告已暂存',
    icon: 'success',
  });
}
</script>

<template>
  <view class="page-shell result-page">
    <view class="section-card summary-card">
      <view class="summary-head">
        <view>
          <view class="tag">推荐结果</view>
          <view class="section-title">为您推荐</view>
        </view>
        <view class="save-btn" @tap="saveReport">保存营养报告</view>
      </view>
      <view class="section-subtitle">{{ result.summary }}</view>
      <view class="prompt-box">{{ result.prompt }}</view>
    </view>

    <view class="section-card">
      <view class="section-title">{{ result.primary.title }}</view>
      <view class="section-subtitle">{{ result.primary.reason }}</view>
      <view class="product-grid">
        <view v-for="product in result.primary.products" :key="product" class="product-item">
          <view class="product-image">{{ product.slice(0, 2) }}</view>
          <view class="product-name">{{ product }}</view>
        </view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">备选组合</view>
      <view class="alt-list">
        <view v-for="item in result.alternates" :key="item.id" class="alt-item">
          <view class="alt-title">{{ item.title }}</view>
          <view class="alt-text">{{ item.products.join(' / ') }}</view>
        </view>
      </view>
    </view>

    <view class="ghost-btn" @tap="goRecommend">重新填写问卷</view>
  </view>
</template>

<style lang="scss" scoped>
.result-page {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding-bottom: 48rpx;
}

.summary-card {
  background: linear-gradient(180deg, #0f172a 0%, #0f766e 100%);
  color: #ffffff;
}

.summary-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.save-btn {
  padding: 14rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
  font-size: 24rpx;
  color: #ffffff;
}

.prompt-box {
  margin-top: 28rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.1);
  font-size: 26rpx;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.9);
}

.product-grid {
  margin-top: 28rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
}

.product-item {
  padding: 24rpx;
  border-radius: 26rpx;
  background: #f8fafc;
}

.product-image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 180rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #e0f2fe 0%, #dcfce7 100%);
  font-size: 36rpx;
  font-weight: 700;
  color: #0f766e;
}

.product-name {
  margin-top: 20rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
}

.alt-list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.alt-item {
  padding: 24rpx;
  border-radius: 24rpx;
  background: #f8fafc;
}

.alt-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
}

.alt-text {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #6b7280;
}
</style>
