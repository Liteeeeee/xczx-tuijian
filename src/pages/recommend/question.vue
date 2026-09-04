<script setup>
import { reactive } from 'vue';
import { useAppStore } from '@/store/app';
import { recommendationQuestions } from '@/utils/mock';

const store = useAppStore();

const form = reactive(
  recommendationQuestions.reduce((result, item) => {
    result[item.key] = store.lastAnswers[item.key] || '';
    return result;
  }, {})
);

function selectOption(key, value) {
  form[key] = value;
}

function submitForm() {
  const missing = recommendationQuestions.find((item) => !form[item.key]);
  if (missing) {
    uni.showToast({
      title: `请先完成${missing.title}`,
      icon: 'none',
    });
    return;
  }

  store.saveAnswers({ ...form });
  uni.navigateTo({
    url: '/pages/recommend/result',
  });
}
</script>

<template>
  <view class="page-shell question-page">
    <view class="section-card top-card">
      <view class="tag">智能推荐</view>
      <view class="section-title">5 步生成专属营养方案</view>
      <view class="section-subtitle">根据蓝湖原型的“智能推荐”页整理为移动端问答流程，当前用本地规则先行生成建议。</view>
    </view>

    <view v-for="item in recommendationQuestions" :key="item.key" class="section-card question-card">
      <view class="question-title">{{ item.title }}</view>
      <view class="option-list">
        <view
          v-for="option in item.options"
          :key="option"
          class="option-item"
          :class="{ active: form[item.key] === option }"
          @tap="selectOption(item.key, option)"
        >
          <view class="option-radio"></view>
          <text>{{ option }}</text>
        </view>
      </view>
    </view>

    <view class="primary-btn submit-btn" @tap="submitForm">查看推荐</view>
  </view>
</template>

<style lang="scss" scoped>
.question-page {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding-bottom: 48rpx;
}

.top-card {
  background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
}

.question-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #111827;
}

.option-list {
  margin-top: 28rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 96rpx;
  padding: 0 24rpx;
  border-radius: 24rpx;
  border: 2rpx solid #e5e7eb;
  background: #f8fafc;
  font-size: 28rpx;
  color: #374151;
}

.option-item.active {
  border-color: #28c4b8;
  background: rgba(40, 196, 184, 0.1);
  color: #0f766e;
}

.option-radio {
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
  border: 4rpx solid #cbd5e1;
  background: #ffffff;
}

.option-item.active .option-radio {
  border-color: #28c4b8;
  background: radial-gradient(circle, #28c4b8 0 50%, #ffffff 51% 100%);
}

.submit-btn {
  margin-top: 8rpx;
}
</style>
