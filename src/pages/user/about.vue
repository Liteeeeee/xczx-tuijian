<template>
  <view class="page-shell about-page">
    <view class="section-card brand-card">
      <view class="tag">关于我们</view>
      <view class="section-title">仙草甄选（北京）科技有限公司</view>
      <view class="section-subtitle">
        当前页面按原型中的“关于我们”信息搭建，作为 H5 首期信息展示页，后续可接企业介绍与客服入口。
      </view>
    </view>

    <view class="section-card">
      <view class="section-title">项目定位</view>
      <view class="content-text">
        通过 AI 营养推荐问答与商品组合推荐，帮助用户快速了解更适合自己的营养方案，并为后续下单、内容推荐、会员体系打基础。
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
