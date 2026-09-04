import { defineStore } from 'pinia';
import { buildRecommendation } from '@/utils/mock';

const STORAGE_KEY = 'xczx-tuijian-app-state';

const defaultUser = {
  phone: '',
  nickname: '营养推荐官用户',
  birthday: '',
  gender: '',
};

function loadState() {
  try {
    const cached = uni.getStorageSync(STORAGE_KEY);
    if (!cached) {
      return {
        loggedIn: false,
        user: { ...defaultUser },
        lastAnswers: {},
      };
    }
    return {
      loggedIn: Boolean(cached.loggedIn),
      user: { ...defaultUser, ...(cached.user || {}) },
      lastAnswers: cached.lastAnswers || {},
    };
  } catch (error) {
    return {
      loggedIn: false,
      user: { ...defaultUser },
      lastAnswers: {},
    };
  }
}

export const useAppStore = defineStore('app', {
  state: () => loadState(),
  getters: {
    recommendation(state) {
      return buildRecommendation(state.lastAnswers);
    },
    displayName(state) {
      return state.user.nickname || state.user.phone || '营养推荐官用户';
    },
    maskedPhone(state) {
      if (!state.user.phone || state.user.phone.length < 7) return state.user.phone || '未登录';
      return `${state.user.phone.slice(0, 3)}****${state.user.phone.slice(-4)}`;
    },
  },
  actions: {
    persist() {
      uni.setStorageSync(STORAGE_KEY, {
        loggedIn: this.loggedIn,
        user: this.user,
        lastAnswers: this.lastAnswers,
      });
    },
    login(phone) {
      this.loggedIn = true;
      this.user.phone = phone;
      if (!this.user.nickname || this.user.nickname === defaultUser.nickname) {
        this.user.nickname = `Windir${phone}`;
      }
      this.persist();
    },
    logout() {
      this.loggedIn = false;
      this.user = { ...defaultUser };
      this.persist();
    },
    saveProfile(payload) {
      this.user = {
        ...this.user,
        ...payload,
      };
      this.persist();
    },
    saveAnswers(payload) {
      this.lastAnswers = {
        ...payload,
      };
      this.persist();
    },
  },
});
