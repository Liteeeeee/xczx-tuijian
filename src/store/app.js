import { defineStore } from 'pinia';
import { smsLogin, getUserInfo } from '@/utils/api';
import { setToken, clearToken } from '@/utils/request';

const STORAGE_KEY = 'xczx-tuijian-app-state';
// history 离线缓存 TTL 7 天（无网降级，有网以服务端 /ai/sessions 为准）
const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// recommendation 离线缓存 TTL 5 分钟（只在本次打开没生成新推荐时临时兜底，不长期保存）
const RECOMMENDATION_TTL_MS = 5 * 60 * 1000;
// lastAnswers 表单草稿 TTL 1 天
const LAST_ANSWERS_TTL_MS = 24 * 60 * 60 * 1000;

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
    if (typeof candidate.text === 'string' && (candidate.success === undefined || candidate.products === undefined || !Array.isArray(candidate.products) || candidate.products.length === 0)) {
      try {
        const inner = JSON.parse(candidate.text);
        if (inner && typeof inner === 'object') candidate = inner;
      } catch (ignore) {
        // ignore
      }
    }
    if (typeof candidate.data === 'object' && candidate.data && !Array.isArray(candidate.data)) {
      const inner = parseRecommendationCandidate(candidate.data);
      if (inner && (Array.isArray(inner.products) || typeof inner.reply === 'string' || inner.success !== undefined)) {
        candidate = inner;
      }
    }
    if (typeof candidate.result === 'object' && candidate.result && !Array.isArray(candidate.result)) {
      const inner = parseRecommendationCandidate(candidate.result);
      if (inner && (Array.isArray(inner.products) || typeof inner.reply === 'string' || inner.success !== undefined)) {
        candidate = inner;
      }
    }
    if (!Array.isArray(candidate.products)) {
      const listCandidates = [
        candidate.items,
        candidate.rows,
        candidate.combos,
        candidate.list,
        candidate.productList,
        candidate.itemList,
        candidate.comboList,
        candidate.goodsList,
        candidate.result && typeof candidate.result === 'object' && candidate.result.items,
        candidate.result && typeof candidate.result === 'object' && candidate.result.rows,
        candidate.result && typeof candidate.result === 'object' && candidate.result.products,
        candidate.data && typeof candidate.data === 'object' && candidate.data.items,
        candidate.data && typeof candidate.data === 'object' && candidate.data.rows,
        candidate.data && typeof candidate.data === 'object' && candidate.data.products,
      ];
      const arr = listCandidates.find((v) => Array.isArray(v) && v.length);
      if (Array.isArray(arr) && arr.length) {
        candidate.products = arr.map((it) => (it && typeof it === 'object' ? it : null)).filter(Boolean);
      }
    }
    if (
      Array.isArray(candidate.products) ||
      typeof candidate.reply === 'string' ||
      candidate.success !== undefined ||
      candidate.recommendMode !== undefined
    ) {
      return candidate;
    }
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
    const meta = cached.__meta && typeof cached.__meta === 'object' ? cached.__meta : {};
    const now = Date.now();
    const user = cached.user && typeof cached.user === 'object' ? cached.user : {};
    const lastAnswersSavedAt =
      typeof meta.lastAnswersSavedAt === 'number' ? meta.lastAnswersSavedAt : 0;
    const lastAnswers =
      cached.lastAnswers &&
      typeof cached.lastAnswers === 'object' &&
      !Array.isArray(cached.lastAnswers) &&
      (!lastAnswersSavedAt || now - lastAnswersSavedAt <= LAST_ANSWERS_TTL_MS)
        ? cached.lastAnswers
        : {};
    const lastQuestionText = typeof cached.lastQuestionText === 'string' ? cached.lastQuestionText : '';

    // recommendation 严格 TTL：过 5 分钟即丢弃，防止跨用户/跨会话脏数据污染
    let recommendation = null;
    const recSavedAt =
      typeof meta.recommendationSavedAt === 'number' ? meta.recommendationSavedAt : 0;
    if (!recSavedAt || now - recSavedAt <= RECOMMENDATION_TTL_MS) {
      const extracted = extractRecommendationFromObject(cached);
      if (extracted && (Array.isArray(extracted.products) || typeof extracted.reply === 'string')) {
        recommendation = extracted;
      }
    }

    // history 严格 TTL：过 7 天即丢弃，防止无网时显示过旧数据
    let history = [];
    const histSavedAt =
      typeof meta.historySavedAt === 'number' ? meta.historySavedAt : 0;
    if (!histSavedAt || now - histSavedAt <= HISTORY_TTL_MS) {
      history = Array.isArray(cached.history)
        ? cached.history.filter(
            (h) =>
              h &&
              typeof h === 'object' &&
              (typeof h.createTime !== 'number' || now - Number(h.createTime) <= HISTORY_TTL_MS),
          )
        : [];
    }

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
      const now = Date.now();
      const payload = {
        __meta: {
          persistedAt: now,
          recommendationSavedAt:
            this.recommendation && typeof this.recommendation === 'object' ? now : 0,
          historySavedAt: Array.isArray(this.history) && this.history.length ? now : 0,
          lastAnswersSavedAt:
            this.lastAnswers &&
            typeof this.lastAnswers === 'object' &&
            Object.keys(this.lastAnswers).length
              ? now
              : 0,
        },
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
      this.recommendation = null;
      this.history = [];
      this.lastAnswers = {};
      this.lastQuestionText = '';
      try {
        uni.removeStorageSync('xczx-tuijian-pending-recommendation');
        uni.removeStorageSync('xczx-tuijian-last-question');
      } catch (ignore) {
        // ignore
      }
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