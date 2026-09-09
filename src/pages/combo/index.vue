<script setup>
import { ref, onMounted } from 'vue';
import { onReachBottom } from '@dcloudio/uni-app';
import { getComboList } from '@/utils/api';
import { useAppStore } from '@/store/app';

const store = useAppStore();

const loading = ref(true);
const loadingMore = ref(false);
const errorMsg = ref('');
const pageNum = ref(1);
const pageSize = 10;
const total = ref(0);
const rows = ref([]);

async function loadFirst() {
  loading.value = true;
  errorMsg.value = '';
  pageNum.value = 1;
  try {
    const res = await getComboList({ pageNum: 1, pageSize });
    const list = Array.isArray(res && res.rows) ? res.rows : [];
    rows.value = list;
    total.value = Number(res && res.total) || 0;
  } catch (error) {
    errorMsg.value = (error && (error.msg || error.message)) ? (error.msg || error.message) : '加载失败，请稍后重试';
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
  uni.navigateTo({
    url: '/pages/recommend/question',
  });
}

function splitKeywords(s) {
  if (!s) return [];
  if (Array.isArray(s)) return s.slice(0, 5);
  const str = String(s);
  const parts = str.split(/[,，、;；|\s]+/g).filter(Boolean);
  return parts.slice(0, 5);
}

function comboProductChips(combo) {
  const items = combo && Array.isArray(combo.items) ? combo.items : [];
  if (items.length) return items.map(i => i.productName).filter(Boolean);
  return splitKeywords(combo.productNames);
}
</script>

<template>
  <view class="page-shell combo-page">
    <view class="section-card intro-card">
      <view class="tag">营养组合</view>
      <view class="section-title">精选组合专区</view>
      <view class="section-subtitle">
        结合当前精选商品池（共 {{ total }} 组），以{{ store.loggedIn ? '已登录' : '游客' }}身份浏览组合内容。
      </view>
    </view>

    <view v-if="loading" class="section-card loading-card">
      <view class="loading-text">加载中...</view>
    </view>

    <view v-else-if="errorMsg" class="section-card empty-card">
      <view class="section-title">加载失败</view>
      <view class="section-subtitle">{{ errorMsg }}</view>
      <view class="primary-btn" @tap="loadFirst">重新加载</view>
    </view>

    <view v-else-if="!rows.length" class="section-card empty-card">
      <view class="section-title">暂无组合</view>
      <view class="section-subtitle">当前还没有可浏览的营养组合，稍后再来看看～</view>
      <view class="primary-btn" @tap="goRecommend">去做智能推荐</view>
    </view>

    <view v-else>
      <view v-for="combo in rows" :key="combo.comboId" class="section-card combo-card">
        <view class="combo-cover">
          <view v-if="splitKeywords(combo.keywords).length" class="cover-tag">{{ splitKeywords(combo.keywords).join(' · ') }}</view>
          <view v-else class="cover-tag">{{ combo.sellingPoints || combo.features || '精选营养组合' }}</view>
        </view>
        <view class="combo-title">{{ combo.comboName }}</view>
        <view class="combo-subtitle">
          {{ combo.features || combo.sellingPoints || combo.hotTopics || '精心搭配的营养方案' }}
        </view>
        <view class="combo-products">
          <view v-for="(name, idx) in comboProductChips(combo)" :key="idx" class="product-chip">{{ name }}</view>
          <view v-if="!comboProductChips(combo).length && combo.productCount" class="product-chip">
            {{ combo.productCount }} 款商品
          </view>
        </view>
        <view v-if="combo.description" class="combo-reason">{{ combo.description }}</view>
      </view>

      <view v-if="loadingMore" class="load-more">加载中...</view>
      <view v-else-if="rows.length >= total && total > 0" class="load-more load-more--done">已加载全部 {{ total }} 组</view>
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
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.combo-reason {
  margin-top: 24rpx;
  font-size: 26rpx;
  line-height: 1.8;
  color: #374151;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.loading-card,
.empty-card {
  text-align: center;
}
.loading-text {
  font-size: 26rpx;
  color: #64748b;
}
.load-more {
  margin-top: 12rpx;
  padding: 16rpx 24rpx;
  text-align: center;
  font-size: 22rpx;
  color: #94a3b8;
}
.load-more--done {
  color: #cbd5e1;
}
</style>
