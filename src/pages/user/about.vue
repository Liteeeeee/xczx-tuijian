<template>
  <view class="page-shell about-page">
    <view class="section-card brand-card">
      <view class="tag">关于我们</view>
      <view class="section-title">仙草甄选（北京）科技有限公司</view>
      <view class="section-subtitle">
        致力推动东方食养的健康哲学，让道地草本融入民生日常，成为一种可触可感、从容自在的生活方式。
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">版权信息</view>
      <view class="content-text">
        Copyright © www.xiancaozhenxuan.com, All Rights Reserved.
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.brand-card {
  background: linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%);
}

.content-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  line-height: 1.9;
  color: #374151;
}
</style>
