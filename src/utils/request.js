// 统一请求封装：基于 uni.request
// 说明：
// 1. 后端为若依(RuoYi)框架，C 端接口路径以 /app 开头；
//    H5 首期通过 vite 代理转发到网关（/app -> http://192.168.110.11:18081），
//    小程序 / 生产环境按需改为完整网关地址。
// 2. 成功码为 200，响应为平铺结构（{ code, msg, ...业务字段 }），无统一 data 包装。
// 3. 登录后自动注入 Authorization: Bearer <token>。

const BASE_URL = '';

const TOKEN_KEY = 'xczx-tuijian-access-token';
const STATE_KEY = 'xczx-tuijian-app-state';

export function getToken() {
  try {
    return uni.getStorageSync(TOKEN_KEY) || '';
  } catch (error) {
    return '';
  }
}

export function setToken(token) {
  try {
    uni.setStorageSync(TOKEN_KEY, token);
  } catch (error) {
    // ignore
  }
}

export function clearToken() {
  try {
    uni.removeStorageSync(TOKEN_KEY);
  } catch (error) {
    // ignore
  }
  try {
    const raw = uni.getStorageSync(STATE_KEY);
    let cached = raw;
    if (typeof raw === 'string' && raw) {
      try {
        cached = JSON.parse(raw);
      } catch (ignore) {
        cached = null;
      }
    }
    const user = cached && cached.user && typeof cached.user === 'object' ? cached.user : {};
    const next = {
      loggedIn: false,
      user: {
        phone: user.phone || '',
        nickname: user.nickname || '营养推荐官用户',
        birthday: user.birthday || '',
        gender: user.gender || '',
        avatar: user.avatar || '',
      },
      lastAnswers: cached && typeof cached.lastAnswers === 'object' && !Array.isArray(cached.lastAnswers) ? cached.lastAnswers : {},
      recommendation: cached && cached.recommendation ? cached.recommendation : null,
      history: cached && Array.isArray(cached.history) ? cached.history : [],
    };
    uni.setStorageSync(STATE_KEY, JSON.stringify(next));
  } catch (ignore) {
    // ignore
  }
}

function maskToken(token) {
  if (!token || typeof token !== 'string') return '(no token)';
  if (token.length <= 8) return token.slice(0, 2) + '***' + token.slice(-2);
  return `${token.slice(0, 4)}****${token.slice(-4)}(len=${token.length})`;
}

export default function request(options = {}) {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    showError = true,
  } = options;

  return new Promise((resolve, reject) => {
    const token = getToken();

    const finalHeader = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...header,
    };

    try {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.log('[request]', method, url, 'Authorization=', maskToken(token));
      }
    } catch (ignore) {
      // ignore
    }

    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: finalHeader,
      success(res) {
        const body = res.data || {};
        const code = body.code;

        // 登录态失效：清除本地 token + 重置登录态 + 跳登录页
        if (code === 401) {
          clearToken();
          setTimeout(() => {
            const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
            const cur = pages && pages.length ? pages[pages.length - 1] : null;
            const curRoute = cur && (cur.route || cur.$page && cur.$page.fullPath && cur.$page.fullPath.path);
            const isLoginPage = curRoute === 'pages/user/login';
            if (!isLoginPage) {
              uni.navigateTo({
                url: '/pages/user/login',
                fail() {
                  try { uni.reLaunch({ url: '/pages/user/login' }); } catch (ignore) { /* ignore */ }
                },
              });
            }
          }, 600);
          reject(new Error(body.msg || '登录态已失效'));
          return;
        }

        if (code === 200) {
          resolve(body);
          return;
        }

        const message = body.msg || '请求失败';
        reject(new Error(message));
      },
      fail(err) {
        reject(err);
      },
    });
  });
}