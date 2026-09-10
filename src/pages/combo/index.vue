<script setup>
import { ref, computed, onMounted } from "vue";
import { onReachBottom } from "@dcloudio/uni-app";
import { getComboList } from "@/utils/api";
import { useAppStore } from "@/store/app";

const store = useAppStore();

const loading = ref(true);
const loadingMore = ref(false);
const errorMsg = ref("");
const pageNum = ref(1);
const pageSize = 12;
const total = ref(0);
const rows = ref([]);

const themeMeta = [
  {
    badgeClass: "theme-badge--orange",
    cardClass: "theme-card--orange",
    icon: "/static/images/营养推荐/默认推荐分类icon1.png",
    title: "明目亮睛推荐",
    tag: "明亮双眸 · 看见美好",
    tagEmoji: "🌅",
  },
  {
    badgeClass: "theme-badge--purple",
    cardClass: "theme-card--purple",
    icon: "/static/images/营养推荐/默认推荐分类icon2.png",
    title: "熬夜加班推荐",
    tag: "深夜有能量 · 明天更出色",
    tagEmoji: "🌙",
  },
  {
    badgeClass: "theme-badge--rose",
    cardClass: "theme-card--rose",
    icon: "/static/images/营养推荐/默认推荐分类icon3.png",
    title: "身高助长推荐",
    tag: "助力成长 · 看见更高",
    tagEmoji: "🌱",
  },
];

async function loadFirst() {
  loading.value = true;
  errorMsg.value = "";
  pageNum.value = 1;
  try {
    const res = await getComboList({ pageNum: 1, pageSize });
    const list = Array.isArray(res && res.rows) ? res.rows : [];
    rows.value = list;
    total.value = Number(res && res.total) || 0;
  } catch (error) {
    errorMsg.value =
      error && (error.msg || error.message)
        ? error.msg || error.message
        : "加载失败，请稍后重试";
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value) return;
  if (rows.value.length >= total.value) return;
  loadingMore.value = true;
  try {
    const nextPage = pageNum.value + 1;
    const res = await getComboList({ pageNum: nextPage, pageSize });
    const list = Array.isArray(res && res.rows) ? res.rows : [];
    if (list.length) {
      rows.value = rows.value.concat(list);
      pageNum.value = nextPage;
    }
    total.value = Number(res && res.total) || total.value;
  } catch (ignore) {
    // ignore silently for infinite scroll
  } finally {
    loadingMore.value = false;
  }
}

onMounted(loadFirst);
onReachBottom(loadMore);

function goRecommend() {
  uni.navigateTo({ url: "/pages/recommend/question" });
}

function splitKeywords(s) {
  if (!s) return [];
  if (Array.isArray(s)) return s.slice(0, 4);
  const str = String(s);
  const parts = str.split(/[,，、;；|\s]+/g).filter(Boolean);
  return parts.slice(0, 4);
}

function getThemeMeta(i) {
  return themeMeta[i % themeMeta.length];
}

function comboTitle(combo, fallback) {
  return (combo && (combo.comboName || combo.title || combo.name)) || fallback;
}

function comboSubtitle(combo, fallback) {
  return (
    (combo &&
      (combo.features ||
        combo.sellingPoints ||
        combo.hotTopics ||
        combo.subtitle)) ||
    fallback
  );
}

function comboProducts(combo) {
  if (!combo) return [];
  const items = Array.isArray(combo.items) ? combo.items : [];
  if (items.length) {
    return items.slice(0, 4).map((it) => ({
      name: it.productName || it.name || it.title || "商品",
      image: it.cover || it.image || it.pic || it.productImage || "",
    }));
  }
  const names = splitKeywords(combo.productNames);
  if (names.length) {
    return names.map((n) => ({ name: n, image: "" }));
  }
  if (Number(combo.productCount) > 0) {
    return Array.from(
      { length: Math.min(4, Number(combo.productCount)) },
      (_, i) => ({
        name: `商品${i + 1}`,
        image: "",
      }),
    );
  }
  return [];
}

function paddedProducts(combo) {
  const list = comboProducts(combo);
  while (list.length < 4)
    list.push({ name: "敬请期待", image: "", placeholder: true });
  return list.slice(0, 4);
}
</script>

<template>
  <view class="page-shell combo-page">
    <view class="hero-wrap">
      <view class="banner-card">
        <view class="custom-nav">
          <view class="avatar-block">
            <image
              class="avatar"
              src="/static/images/营养推荐/顶部icon.png"
              mode="aspectFit"
            />
            <view class="avatar-meta">
              <view class="avatar-title">AI面包推荐官</view>
              <view class="avatar-sub">用AI发现更适合你的美味生活</view>
            </view>
          </view>
        </view>

        <image
          class="banner-img"
          src="/static/images/营养推荐/banner@3x.png"
          mode="widthFix"
        />
      </view>
    </view>

    <view v-if="loading" class="theme-card loading-card">
      <view class="loading-text">正在加载营养推荐方案...</view>
    </view>

    <view v-else-if="errorMsg" class="theme-card empty-card">
      <view class="empty-title">加载失败</view>
      <view class="empty-sub">{{ errorMsg }}</view>
      <view class="primary-btn" @tap="loadFirst">重新加载</view>
    </view>

    <view v-else class="theme-list">
      <view
        v-for="(combo, idx) in rows"
        :key="combo.comboId || `combo-${idx}`"
        class="theme-card"
        :class="getThemeMeta(idx).cardClass"
      >
        <view class="theme-head">
          <view class="theme-head-left">
            <image
              class="theme-icon"
              :src="getThemeMeta(idx).icon"
              mode="aspectFit"
            />
            <view class="theme-title-text">
              <view class="theme-title">
                {{ comboTitle(combo, getThemeMeta(idx).title) }}
              </view>
            </view>
          </view>
          <view class="theme-tag" :class="getThemeMeta(idx).badgeClass">
            <text class="theme-tag-emoji">{{
              getThemeMeta(idx).tagEmoji
            }}</text>
            <text class="theme-tag-text">
              {{ comboSubtitle(combo, getThemeMeta(idx).tag) }}
            </text>
          </view>
        </view>

        <view class="theme-products">
          <view
            v-for="(p, pidx) in paddedProducts(combo)"
            :key="pidx"
            class="theme-product"
          >
            <view class="product-img-wrap">
              <image
                v-if="p.image"
                class="product-img"
                :src="p.image"
                mode="aspectFill"
              />
              <view v-else class="product-img product-img--placeholder"></view>
            </view>
            <view class="product-name">{{ p.name }}</view>
          </view>
        </view>
      </view>

      <view v-if="!rows.length" class="theme-card empty-card">
        <view class="empty-title">暂无推荐</view>
        <view class="empty-sub">营养师正在准备今日推荐，稍后再来看看～</view>
        <view class="primary-btn" @tap="goRecommend">去做智能推荐</view>
      </view>

      <view v-if="loadingMore" class="load-more">加载中...</view>
      <view
        v-else-if="rows.length >= total && total > 0"
        class="load-more load-more--done"
      >
        已加载全部 {{ total }} 组
      </view>
    </view>

    <view class="footer-copy">仙草甄选（北京）科技有限公司技术支持</view>
  </view>
</template>

<style lang="scss" scoped>
.combo-page {
  display: flex;
  flex-direction: column;
  padding-bottom: 48rpx;
  background: #fdfbf9;
  min-height: 100vh;
}

.hero-wrap {
  position: relative;
  background: linear-gradient(180deg, #fff6ee 0%, #fffdf8 62%, #fdfbf9 100%);
  padding-bottom: 12rpx;
}

.custom-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  padding: calc(var(--status-bar-height, 44px) + 16rpx) 32rpx 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
}

.avatar-block {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background: #fff1e4;
}

.avatar-meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.avatar-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1d2129;
  letter-spacing: 0.5rpx;
}

.avatar-sub {
  font-size: 22rpx;
  color: #86909c;
  letter-spacing: 0.3rpx;
}

.banner-card {
  position: relative;
  margin: 0;
  border-radius: 0;
  overflow: hidden;
  background: #fff;
}

.banner-img {
  width: 100%;
  display: block;
}

.theme-list {
  padding: 20rpx 32rpx 12rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.theme-card {
  border-radius: 28rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(29, 33, 41, 0.04);
  background: #fffaf5;
}

.theme-card--orange {
  background: linear-gradient(180deg, #fff8ef 0%, #fffdf7 100%);
}

.theme-card--purple {
  background: linear-gradient(180deg, #faf6ff 0%, #fdfbff 100%);
}

.theme-card--rose {
  background: linear-gradient(180deg, #fff4f3 0%, #fffbfb 100%);
}

.theme-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 24rpx;
}

.theme-head-left {
  display: flex;
  align-items: center;
  gap: 18rpx;
  flex: 1;
  min-width: 0;
}

.theme-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
}

.theme-title-text {
  min-width: 0;
}

.theme-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1d2129;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-tag {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  flex-shrink: 0;
  max-width: 52%;
}

.theme-tag-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-badge--orange {
  background: #fff2e0;
  color: #bc581c;
}

.theme-badge--purple {
  background: #f1eaff;
  color: #8055d8;
}

.theme-badge--rose {
  background: #ffe7e4;
  color: #e0584a;
}

.theme-products {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}

.theme-product {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.product-img-wrap {
  width: 116rpx;
  height: 116rpx;
  border-radius: 50%;
  background: #fdfbf9;
  box-shadow: 0 2rpx 12rpx rgba(29, 33, 41, 0.05);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-img {
  width: 100%;
  height: 100%;
}

.product-img--placeholder {
  background: linear-gradient(135deg, #fff3e3 0%, #ffe9cf 100%);
}

.product-name {
  font-size: 22rpx;
  color: #4e5969;
  line-height: 1.3;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.loading-card,
.empty-card {
  margin: 20rpx 32rpx 0;
  text-align: center;
  background: linear-gradient(180deg, #fffaf4 0%, #fffdf8 100%);
}

.loading-text {
  font-size: 26rpx;
  color: #86909c;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1d2129;
}

.empty-sub {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #86909c;
  line-height: 1.6;
}

.primary-btn {
  margin: 28rpx auto 0;
  padding: 20rpx 48rpx;
  border-radius: 999rpx;
  background: #bc581c;
  color: #fdfbf9;
  font-size: 26rpx;
  font-weight: 600;
  display: inline-block;
  width: fit-content;
}

.load-more {
  margin-top: 8rpx;
  padding: 16rpx 24rpx;
  text-align: center;
  font-size: 22rpx;
  color: #94a3b8;
}

.load-more--done {
  color: #cbd5e1;
}

.footer-copy {
  margin-top: 36rpx;
  text-align: center;
  font-size: 22rpx;
  color: #c9cdd4;
  letter-spacing: 0.5rpx;
  padding: 0 32rpx 32rpx;
}
</style>
