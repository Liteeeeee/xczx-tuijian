<script setup>
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";

const props = defineProps({
  current: {
    type: Number,
    default: 0,
  },
});

const list = ref([
  {
    pagePath: "/pages/index/index",
    text: "首页",
    iconPath: "/static/tabbar-home.png",
    selectedIconPath: "/static/tabbar-home-active.png",
  },
  {
    pagePath: "/pages/combo/index",
    text: "营养组合",
    iconPath: "/static/tabbar-combo.png",
    selectedIconPath: "/static/tabbar-combo-active.png",
  },
  {
    pagePath: "/pages/user/index",
    text: "我的",
    iconPath: "/static/tabbar-user.png",
    selectedIconPath: "/static/tabbar-user-active.png",
  },
]);

function switchTab(index, path) {
  if (props.current === index) return;
  uni.switchTab({
    url: path,
  });
}
</script>

<template>
  <view class="custom-tab-bar">
    <view
      v-for="(item, index) in list"
      :key="index"
      class="tab-item"
      @tap="switchTab(index, item.pagePath)"
    >
      <image
        class="tab-icon"
        :src="current === index ? item.selectedIconPath : item.iconPath"
        mode="aspectFit"
      />
      <text class="tab-text" :class="{ active: current === index }">
        {{ item.text }}
      </text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.custom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  padding-top: 12rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 9999;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.tab-icon {
  width: 40rpx; /* 对应 20px */
  height: 48rpx; /* 对应 24px */
  margin-bottom: 6rpx;
}

.tab-text {
  font-size: 20rpx;
  color: #1d2129;
}

.tab-text.active {
  color: #bc581c;
}
</style>
