import { defineStore } from 'pinia';
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

function toPlain(value) {
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return null;
  }
}

const RECOMMENDATION_KEYS = [
  'recommendation',
  'recommendationText',
  'recommendation_text',
  'recommendationStr',
  'recommendation_str',
  'recommendationData',
  'recommendation_data',
  'recommendationResult',
  'recommendation_result',
  'rec',
  'recResult',
  'rec_result',
  'aiResult',
  'ai_result',
  'aiRecommendation',
  'ai_recommendation',
  'result',
  'data',
  'payload',
  'chatResult',
  'chat_result',
  'content',
  'message',
];

function parseRecommendationCandidate(raw) {
  if (!raw) return null;
  let candidate = raw;
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate);
    } catch (ignore) {
      candidate = null;
    }
  }
  if (typeof candidate === 'object' && candidate && !Array.isArray(candidate)) {
    if (typeof candidate.text === 'string' && (candidate.success === undefined || candidate.products === undefined)) {
      try {
        const inner = JSON.parse(candidate.text);
        if (inner && typeof inner === 'object') return inner;
      } catch (ignore) {
        // ignore
      }
    }
    if (typeof candidate.data === 'object' && candidate.data && (Array.isArray(candidate.data.products) || typeof candidate.data.reply === 'string')) {
      return candidate.data;
    }
    return candidate;
  }
  return null;
}

function extractRecommendationFromObject(cached) {
  if (!cached || typeof cached !== 'object' || Array.isArray(cached)) {
    return parseRecommendationCandidate(cached);
  }
  for (const k of RECOMMENDATION_KEYS) {
    const v = cached[k];
    if (v === undefined || v === null) continue;
    const r = parseRecommendationCandidate(v);
    if (r && (Array.isArray(r.products) || typeof r.reply === 'string' || r.success !== undefined)) {
      return r;
    }
  }
  try {
    const keys = Object.keys(cached);
    for (const k of keys) {
      const v = cached[k];
      if (typeof v === 'string' && v.length > 60 && (v.includes('"products"') || v.includes('"success"') || v.includes('"reply"'))) {
        const r = parseRecommendationCandidate(v);
        if (r && (Array.isArray(r.products) || typeof r.reply === 'string')) return r;
      }
      if (v && typeof v === 'object' && (Array.isArray(v.products) || typeof v.reply === 'string')) {
        return v;
      }
    }
  } catch (ignore) {
    // ignore
  }
  return null;
}

function loadState() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY);
    let cached = raw;
    if (typeof raw === 'string' && raw) {
      try {
        cached = JSON.parse(raw);
      } catch (error) {
        cached = null;
      }
    }
    if (!cached || typeof cached !== 'object') {
      return {
        loggedIn: false,
        user: { ...defaultUser },
        lastAnswers: {},
        lastQuestionText: '',
        recommendation: null,
        history: [],
      };
    }
    const user = cached.user && typeof cached.user === 'object' ? cached.user : {};
    const lastAnswers = cached.lastAnswers && typeof cached.lastAnswers === 'object' && !Array.isArray(cached.lastAnswers)
      ? cached.lastAnswers
      : {};
    const lastQuestionText = typeof cached.lastQuestionText === 'string' ? cached.lastQuestionText : '';

    let recommendation = extractRecommendationFromObject(cached);

    let history = Array.isArray(cached.history) ? cached.history.filter((h) => h && typeof h === 'object') : [];

    return {
      loggedIn: Boolean(cached.loggedIn),
      user: { ...defaultUser, ...user },
      lastAnswers,
      lastQuestionText,
      recommendation,
      history,
    };
  } catch (error) {
    return {
      loggedIn: false,
      user: { ...defaultUser },
      lastAnswers: {},
      lastQuestionText: '',
      recommendation: null,
      history: [],
    };
  }
}

export const useAppStore = defineStore('app', {
  state: () => loadState(),
  getters: {
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
      const payload = {
        loggedIn: this.loggedIn,
        user: toPlain(this.user),
        lastAnswers: toPlain(this.lastAnswers),
        lastQuestionText: typeof this.lastQuestionText === 'string' ? this.lastQuestionText : '',
        recommendation: toPlain(this.recommendation),
        history: Array.isArray(this.history) ? this.history.map((h) => toPlain(h)).filter(Boolean) : [],
      };
      try {
        uni.setStorageSync(STORAGE_KEY, JSON.stringify(payload));
      } catch (error) {
        try {
          uni.setStorageSync(STORAGE_KEY, payload);
        } catch (ignore) {
          // ignore
        }
      }
    },
    addHistory(recommendation) {
      try {
        const obj = toPlain(recommendation);
        if (!obj || typeof obj !== 'object') return null;
        if (!Array.isArray(obj.products) || obj.products.length === 0) return null;
        const now = Date.now();
        const id = 'rec_' + now.toString(36) + Math.random().toString(36).slice(2, 8);
        const entry = {
          id,
          createTime: now,
          recommendMode: typeof obj.recommendMode === 'string' ? obj.recommendMode : '',
          reply: typeof obj.reply === 'string' ? obj.reply : '',
          products: Array.isArray(obj.products) ? obj.products.slice() : [],
          success: obj.success,
          limit: obj.limit,
          raw: obj,
        };
        const next = [entry].concat(Array.isArray(this.history) ? this.history : []).slice(0, 50);
        this.history = next;
        this.persist();
        return entry;
      } catch (error) {
        return null;
      }
    },
    removeHistory(id) {
      if (!id) return;
      this.history = (Array.isArray(this.history) ? this.history : []).filter((h) => h.id !== id);
      this.persist();
    },
    clearHistory() {
      this.history = [];
      this.persist();
    },
    getHistoryById(id) {
      if (!id) return null;
      const list = Array.isArray(this.history) ? this.history : [];
      const found = list.find((h) => h.id === id);
      if (!found) return null;
      if (found && found.raw && typeof found.raw === 'object') return toPlain(found.raw);
      return toPlain({
        success: found.success,
        recommendMode: found.recommendMode,
        reply: found.reply,
        limit: found.limit,
        products: found.products,
      });
    },
    migrateIfNeeded() {
      const raw = uni.getStorageSync(STORAGE_KEY);
      let cached = raw;
      if (typeof raw === 'string' && raw) {
        try {
          cached = JSON.parse(raw);
        } catch (ignore) {
          cached = null;
        }
      }
      if (!cached || typeof cached !== 'object') return { tried: false, reason: 'empty' };
      const extracted = extractRecommendationFromObject(cached);
      if (!extracted) return { tried: true, ok: false, reason: 'extract-failed' };
      const currentProducts = (this.recommendation && Array.isArray(this.recommendation.products)) ? this.recommendation.products.length : 0;
      const hasMigration = extracted && Array.isArray(extracted.products) && extracted.products.length > 0 && currentProducts === 0;
      if (hasMigration) {
        try {
          this.recommendation = toPlain(extracted) || null;
          const newState = {
            loggedIn: this.loggedIn,
            user: toPlain(this.user),
            lastAnswers: toPlain(this.lastAnswers),
            recommendation: toPlain(this.recommendation),
          };
          uni.setStorageSync(STORAGE_KEY, JSON.stringify(newState));
          return { tried: true, ok: true, reason: 'migrated', products: newState.recommendation && newState.recommendation.products && newState.recommendation.products.length };
        } catch (error) {
          return { tried: true, ok: false, reason: 'write-error:' + (error && error.message || String(error)) };
        }
      }
      return { tried: true, ok: false, reason: 'no-need', currentProducts, extractedProducts: extracted && extracted.products && extracted.products.length };
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
    saveQuestionText(text) {
      this.lastQuestionText = typeof text === 'string' ? text : '';
      this.persist();
    },
    saveRecommendation(data) {
      try {
        let raw = data;
        if (typeof raw === 'string' && raw) {
          try {
            raw = JSON.parse(raw);
          } catch (ignore) {
            // ignore
          }
        }
        if (typeof raw === 'object' && raw && !Array.isArray(raw)) {
          let text = typeof raw.text !== undefined ? raw.text : undefined;
          let parsed = raw;
          if (
            text !== undefined &&
            (raw.success === undefined || raw.products === undefined)
          ) {
            if (typeof text === 'string') {
              try {
                const inner = JSON.parse(text);
                if (inner && typeof inner === 'object') {
                  parsed = inner;
                }
              } catch (ignore) {
                // ignore
              }
            }
          }
          const plain = toPlain(parsed) || {};
          const list = Array.isArray(plain.products) ? plain.products.slice() : [];
          if (list.length > 1) {
            list.sort((a, b) => {
              const sa = Number(a && a.score) || 0;
              const sb = Number(b && b.score) || 0;
              if (sb !== sa) return sb - sa;
              return (Number(a && a.productId) || 0) - (Number(b && b.productId) || 0);
            });
            plain.products = list;
          }
          this.recommendation = plain;
          this.addHistory(plain);
        } else {
          this.recommendation = null;
        }
      } catch (error) {
        this.recommendation = null;
      }
      this.persist();
    },
  },
});