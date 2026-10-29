<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { agreementSections, privacySections } from '@/utils/mock';

const sections = ref(agreementSections);

onLoad((options) => {
  const isPrivacy = options && options.type === 'privacy';
  sections.value = isPrivacy ? privacySections : agreementSections;
  uni.setNavigationBarTitle({
    title: isPrivacy ? '隐私政策' : '用户服务协议',
  });
});
</script>

<template>
  <view class="page-shell agreement-page">
    <view class="section-card" v-for="item in sections" :key="item.title">
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
