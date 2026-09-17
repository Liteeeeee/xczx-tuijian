<script setup>
import { ref, onMounted, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getComboList, getBannerList } from "@/utils/api";
import { useAppStore } from "@/store/app";
import CustomTabBar from "@/components/custom-tab-bar/custom-tab-bar.vue";

const store = useAppStore();

const loading = ref(false);
const combos = ref([]);
const total = ref(0);
const banners = ref([]);

onShow(() => {
  uni.hideTabBar({
    animation: false,
  });
});

async function loadBanners() {
  try {
    const res = await getBannerList();
    // 假设返回结构为 { code, msg, data: [] } 或平铺 data
    let list = Array.isArray(res && res.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];

    if (list.length > 0) {
      // 兼容后端不同字段名，将 imageUrl 映射到我们使用的 picUrl
      banners.value = list.map((item) => ({
        id: item.bannerId || item.id,
        picUrl: item.imageUrl || item.picUrl,
      }));
    } else {
      // 没配置数据时，保留一个默认兜底图
      banners.value = [
        {
          id: 1,
          picUrl: "/static/images/推荐 demo 首页切图/Group 8@2x.png",
        },
      ];
    }
  } catch (ignore) {
    banners.value = [
      {
        id: 1,
        picUrl: "/static/images/推荐 demo 首页切图/Group 8@2x.png",
      },
    ];
  }
}

async function loadCombos() {
  loading.value = true;
  try {
    const res = await getComboList({ pageNum: 1, pageSize: 3 });
    const list = Array.isArray(res && res.rows) ? res.rows : [];
    combos.value = list;
    total.value = Number(res && res.total) || 0;
  } catch (ignore) {
    combos.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadBanners();
  loadCombos();
});

function goRecommend() {
  uni.navigateTo({
    url: "/pages/recommend/question",
  });
}

function goAbout() {
  uni.navigateTo({
    url: "/pages/user/about",
  });
}

function goCombo() {
  uni.switchTab({
    url: "/pages/combo/index",
  });
}

function openComboDetail(combo) {
  if (!combo) return;
  uni.switchTab({
    url: "/pages/combo/index",
  });
}

function splitKeywords(s) {
  if (!s) return [];
  if (Array.isArray(s)) return s.slice(0, 5);
  return String(s)
    .split(/[,，、;；|\s]+/g)
    .filter(Boolean)
    .slice(0, 3);
}

function comboProductNames(combo) {
  const items = combo && Array.isArray(combo.items) ? combo.items : [];
  if (items.length)
    return items
      .map((i) => i.productName)
      .filter(Boolean)
      .join(" / ");
  return combo.productNames || "";
}

function comboTag(combo) {
  const kws = splitKeywords(combo.keywords);
  if (kws.length) return kws[0];
  if (combo.sellingPoints && String(combo.sellingPoints).length <= 10)
    return combo.sellingPoints;
  if (combo.features && String(combo.features).length <= 10)
    return combo.features;
  return "精选方案";
}

function formatPicUrl(url) {
  if (!url) return "";
  // 1. 去除 URL 中可能被错误包裹的反引号
  // 2. 将空格转换为 %20
  return url.replace(/`/g, "").replace(/ /g, "%20");
}

function onBannerError(item) {
  item.picUrl = "/static/images/推荐 demo 首页切图/Group 8@2x.png";
}

const userName = computed(() => {
  const phone = (store.user && store.user.phone) || "";
  if (phone && phone.length >= 7)
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  return store.user && store.user.nickname ? store.user.nickname : "营养推荐官";
});

const userAvatarBg = computed(() => "#BC581C");
</script>

<template>
  <view class="home-page">
    <view class="hero-wrap">
      <view class="hero-card">
        <view class="custom-nav">
          <view class="avatar-block">
            <image
              class="avatar"
              src="/static/images/推荐 demo 首页切图/图标1@2x.png"
              mode="aspectFit"
            />
            <view class="avatar-meta">
              <view class="avatar-title">AI面包推荐官</view>
              <view class="avatar-sub">用AI发现更适合你的美味生活</view>
            </view>
          </view>
        </view>

        <swiper
          class="hero-swiper"
          :indicator-dots="banners.length > 1"
          :autoplay="banners.length > 1"
          :interval="3000"
          :duration="500"
          circular
          indicator-color="rgba(255, 255, 255, 0.4)"
          indicator-active-color="#ffffff"
        >
          <swiper-item v-for="item in banners" :key="item.id">
            <image
              class="hero-bg"
              :src="formatPicUrl(item.picUrl)"
              mode="widthFix"
              @error="onBannerError(item)"
            />
          </swiper-item>
        </swiper>
      </view>
    </view>

    <view class="page-body">
      <view class="entry-grid">
        <image
          class="entry-card entry-card--left"
          src="/static/images/推荐 demo 首页切图/按钮1@2x.png"
          mode="widthFix"
          @tap="goRecommend"
        />

        <image
          class="entry-card entry-card--right"
          src="/static/images/推荐 demo 首页切图/按钮2@2x.png"
          mode="widthFix"
          @tap="goCombo"
        />
      </view>

      <!-- <view v-if="combos.length" class="section-card">
        <view class="section-head">
          <view>
            <view class="section-title">热门营养组合</view>
            <view class="section-subtitle"
              >共 {{ total }} 组精选，点击「查看全部」进入组合列表。</view
            >
          </view>
          <view class="link-btn" @tap="goCombo">查看全部 ›</view>
        </view>

        <view v-if="loading" class="combo-loading">加载中...</view>
        <view v-else class="combo-list">
          <view
            v-for="combo in combos"
            :key="combo.comboId"
            class="combo-item"
            @tap="openComboDetail(combo)"
          >
            <view class="combo-head">
              <view>
                <view class="combo-title">{{ combo.comboName }}</view>
                <view class="combo-subtitle">{{
                  combo.features || combo.sellingPoints || "精心搭配的营养方案"
                }}</view>
              </view>
              <view class="combo-tag">{{ comboTag(combo) }}</view>
            </view>
            <view v-if="comboProductNames(combo)" class="combo-products">{{
              comboProductNames(combo)
            }}</view>
            <view v-else-if="combo.productCount" class="combo-products"
              >共 {{ combo.productCount }} 款商品搭配</view
            >
          </view>
        </view>
      </view> -->

      <view class="footer-copy"> 仙草甄选（北京）科技有限公司技术支持 </view>
    </view>
    <custom-tab-bar :current="0" />
  </view>
</template>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background: #fdfbf9;
  display: flex;
  flex-direction: column;
}

.hero-wrap {
  position: relative;
  background: linear-gradient(180deg, #fff6ee 0%, #fffdf8 62%, #ffffff 100%);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.custom-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  padding: calc(var(--status-bar-height, 44px) + 16rpx) 32rpx 10rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
}

.avatar-block {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.avatar {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.avatar-text {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}
.avatar-meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.avatar-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1d2129;
  line-height: 1.2;
}
.avatar-sub {
  font-size: 22rpx;
  color: #86909c;
  line-height: 1.4;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.nav-dot {
  padding: 0 6rpx;
  font-size: 30rpx;
  color: #4e5969;
  letter-spacing: 2rpx;
  transform: translateY(-2rpx);
}
.nav-icon-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #4e5969;
  border: 1rpx solid rgba(29, 33, 41, 0.08);
}

.hero-card {
  position: relative;
  margin: 8rpx 0 0;
  width: 100%;
  border-radius: 0;
  overflow: hidden;
  background: transparent;
}
.hero-swiper {
  width: 100%;
  height: 815rpx; /* 原图比例 563x612，转换为 750rpx 宽度的标准屏幕对应高度约为 815rpx */
}
.hero-bg {
  width: 100%;
  display: block;
}

.page-body {
  flex: 1;
  padding: 16rpx 32rpx calc(140rpx + env(safe-area-inset-bottom)); /* 为自定义 tabbar 预留空间 */
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  background: #fdfbf9;
}

.entry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: stretch;
  gap: 20rpx;
  margin-top: 2rpx;
}

.entry-card {
  width: 100%;
  display: block;
}
.entry-card--left {
  /* background placeholder */
}
.entry-card--right {
  /* background placeholder */
}

.entry-icon {
  position: absolute;
  top: 18rpx;
  left: 18rpx;
  width: 96rpx;
  height: 96rpx;
}
.entry-icon--right {
  left: auto;
  right: 18rpx;
}

.entry-btn {
  position: absolute;
  left: 24rpx;
  bottom: 24rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14rpx 22rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
  gap: 8rpx;
}
.entry-btn--primary {
  background: #bc581c;
  color: #ffffff;
}
.entry-btn--ghost {
  background: #ffffff;
  color: #ff8fa3;
  border: 1rpx solid rgba(255, 143, 163, 0.3);
}
.btn-icon {
  width: 26rpx;
  height: 26rpx;
  flex: 0 0 auto;
}

.section-card {
  padding: 28rpx;
  border-radius: 28rpx;
  background: #fafbfc;
}
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #1d2129;
  line-height: 1.3;
}
.section-subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #86909c;
  line-height: 1.6;
}
.link-btn {
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #bc581c;
  background: rgba(188, 88, 28, 0.08);
  font-weight: 600;
  flex-shrink: 0;
}

.combo-loading {
  margin-top: 28rpx;
  padding: 28rpx;
  text-align: center;
  font-size: 26rpx;
  color: #86909c;
  background: #f2f3f5;
  border-radius: 24rpx;
}

.combo-list {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}
.combo-item {
  padding: 24rpx;
  border-radius: 24rpx;
  background: #ffffff;
  border: 1rpx solid rgba(29, 33, 41, 0.06);
}
.combo-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}
.combo-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1d2129;
  line-height: 1.4;
}
.combo-subtitle {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #86909c;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.combo-tag {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(188, 88, 28, 0.1);
  color: #bc581c;
  font-size: 20rpx;
  font-weight: 600;
  flex-shrink: 0;
  max-width: 180rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.combo-products {
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #4e5969;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.footer-copy {
  margin-top: 8rpx;
  padding: 24rpx 0 12rpx;
  text-align: center;
  font-size: 22rpx;
  color: #c9cdd4;
  line-height: 1.5;
}
</style>
