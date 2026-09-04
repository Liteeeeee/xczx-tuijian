<script setup>
import { agreementSections } from '@/utils/mock';
</script>

<template>
  <view class="page-shell agreement-page">
    <view class="section-card" v-for="item in agreementSections" :key="item.title">
      <view class="section-title">{{ item.title }}</view>
      <view class="agreement-text">{{ item.content }}</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.agreement-page {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding-bottom: 48rpx;
}

.agreement-text {
  margin-top: 20rpx;
  font-size: 26rpx;
  line-height: 1.9;
  color: #4b5563;
}
</style>
