// 统一请求封装：基于 uni.request
// 说明：
// 1. 后端为若依(RuoYi)框架，C 端接口路径以 /app 开头；
//    H5 首期通过 vite 代理转发到网关（/app -> http://192.168.110.11:18081），
//    小程序 / 生产环境按需改为完整网关地址。
// 2. 成功码为 200，响应为平铺结构（{ code, msg, ...业务字段 }），无统一 data 包装。
// 3. 登录后自动注入 Authorization: Bearer <token>。

const BASE_URL = '';

const TOKEN_KEY = 'xczx-tuijian-access-token';

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

    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...header,
      },
      success(res) {
        const body = res.data || {};

        // 登录态失效：清除本地 token
        if (body.code === 401) {
          clearToken();
        }

        if (body.code === 200) {
          resolve(body);
          return;
        }

        const message = body.msg || '请求失败';
        if (showError) {
          uni.showToast({ title: message, icon: 'none' });
        }
        reject(new Error(message));
      },
      fail(err) {
        if (showError) {
          uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
        }
        reject(err);
      },
    });
  });
}