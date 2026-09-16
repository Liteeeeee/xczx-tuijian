import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useRecommendStore = defineStore('recommend', () => {
  // 纯内存状态，不进行任何 localStorage 持久化
  // 页面关闭或应用退出后自动销毁，绝不产生跨会话脏数据
  const currentRecommendation = ref(null);

  function setRecommendation(data) {
    currentRecommendation.value = data;
  }

  function clearRecommendation() {
    currentRecommendation.value = null;
  }

  return {
    currentRecommendation,
    setRecommendation,
    clearRecommendation,
  };
});
