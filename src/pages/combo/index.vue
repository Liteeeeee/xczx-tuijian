<script setup>
import { nutritionCombos } from '@/utils/mock';
import { useAppStore } from '@/store/app';

const store = useAppStore();

function goRecommend() {
  uni.navigateTo({
    url: '/pages/recommend/question',
  });
}
</script>

<template>
  <view class="page-shell combo-page">
    <view class="section-card intro-card">
      <view class="tag">营养组合</view>
      <view class="section-title">原型首期组合专区</view>
      <view class="section-subtitle">
        结合当前推荐问卷与仙草甄选商品池，先以{{ store.loggedIn ? '已登录' : '游客' }}身份浏览组合内容。
      </view>
    </view>

    <view v-for="combo in nutritionCombos" :key="combo.id" class="section-card combo-card">
      <view class="combo-cover">
        <view class="cover-tag">{{ combo.tags.join(' · ') }}</view>
      </view>
      <view class="combo-title">{{ combo.title }}</view>
      <view class="combo-subtitle">{{ combo.subtitle }}</view>
      <view class="combo-products">
        <view v-for="product in combo.products" :key="product" class="product-chip">{{ product }}</view>
      </view>
      <view class="combo-reason">{{ combo.reason }}</view>
    </view>

    <view class="primary-btn" @tap="goRecommend">去做智能推荐</view>
  </view>
</template>

<style lang="scss" scoped>
.combo-page {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding-bottom: 48rpx;
}

.intro-card {
  background: linear-gradient(180deg, #ffffff 0%, #ecfeff 100%);
}

.combo-cover {
  height: 220rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #22c55e 0%, #0ea5e9 100%);
  display: flex;
  align-items: flex-end;
  padding: 24rpx;
}

.cover-tag {
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 22rpx;
}

.combo-title {
  margin-top: 24rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #111827;
}

.combo-subtitle {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #6b7280;
}

.combo-products {
  margin-top: 24rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.product-chip {
  padding: 14rpx 18rpx;
  border-radius: 999rpx;
  background: #eff6ff;
  color: #2563eb;
  font-size: 24rpx;
}

.combo-reason {
  margin-top: 24rpx;
  font-size: 26rpx;
  line-height: 1.8;
  color: #374151;
}
</style>
