<script setup>
import { ref, computed } from "vue";
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

const platform = computed(() => {
  try {
    const sys = uni.getSystemInfoSync();
    return sys.platform || "";
  } catch (ignore) {
    return "";
  }
});

const safeAreaBottom = computed(() => {
  try {
    const sys = uni.getSystemInfoSync();
    if (sys.safeAreaInsets && typeof sys.safeAreaInsets.bottom === "number") {
      return sys.safeAreaInsets.bottom + "px";
    }
  } catch (ignore) {
    /* ignore */
  }
  return "env(safe-area-inset-bottom)";
});

function switchTab(index, path) {
  if (props.current === index) return;
  uni.switchTab({
    url: path,
  });
}

// #ifdef MP-WEIXIN
// 小程序端：每次 onShow 强制隐藏原生 tabbar，防止闪回
try {
  onShow(() => {
    uni.hideTabBar({
      animation: false,
      fail() { /* ignore */ },
    });
  });
} catch (ignore) { /* ignore */ }
// #endif
</script>

<template>
  <view
    class="custom-tab-bar"
    :class="{ 'mp-weixin': platform === 'devtools' || platform === 'mp-weixin' }"
    :style="{ paddingBottom: 'calc(12rpx + ' + safeAreaBottom + ')' }"
  >
    <view
      v-for="(item, index) in list"
      :key="index"
      class="tab-item"
      :class="{ active: current === index }"
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
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 9999;
  border-top: 1rpx solid rgba(242, 243, 245, 1);
}

/* 小程序端：避免穿透/与原生 tabbar 层级冲突，再补高一级 z-index */
.custom-tab-bar.mp-weixin {
  z-index: 99999;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 104rpx;
  transition: transform 0.15s ease;
}

.tab-item:active {
  transform: scale(0.96);
}

.tab-icon {
  width: 40rpx; /* 对应 20px */
  height: 48rpx; /* 对应 24px */
  margin-bottom: 6rpx;
}

.tab-text {
  font-size: 20rpx;
  color: #1d2129;
  line-height: 1.2;
}

.tab-text.active {
  color: #bc581c;
  font-weight: 500;
}
</style>
