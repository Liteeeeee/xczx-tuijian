import { defineStore } from 'pinia';
import { buildRecommendation } from '@/utils/mock';
import { smsLogin, getUserInfo } from '@/utils/api';
import { setToken, clearToken } from '@/utils/request';

const STORAGE_KEY = 'xczx-tuijian-app-state';

const defaultUser = {
  phone: '',
  nickname: '营养推荐官用户',
  birthday: '',
  gender: '',
  avatar: '',
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
    async login(phone, code) {
      const loginData = await smsLogin(phone, code);
      setToken(loginData.token);

      // 登录成功后拉取用户信息（失败不阻断登录）
      let userInfo = null;
      try {
        userInfo = await getUserInfo();
      } catch (error) {
        // ignore
      }

      this.loggedIn = true;
      this.user.phone = phone;
      if (userInfo && userInfo.user) {
        const user = userInfo.user;
        this.user.phone = user.phonenumber || phone;
        this.user.nickname = user.nickName || phone;
        this.user.avatar = user.avatar || '';
      }
      this.persist();
      return loginData;
    },
    logout() {
      clearToken();
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
