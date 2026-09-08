// 接口定义：C 端模块（若依框架，路径以 /app 开头）
import request from './request';

// 发送短信验证码
// body: { username }，未配置短信服务时回落默认验证码 000000（返回 mock: true）
export function sendSmsCode(username) {
  return request({
    url: '/app/sms/send',
    method: 'POST',
    data: { username },
  });
}

// 手机号 + 验证码登录
// 返回 { code, msg, token }
export function smsLogin(username, code) {
  return request({
    url: '/app/sms/login',
    method: 'POST',
    data: { username, code },
  });
}

// 获取当前登录用户信息
// 返回 { code, msg, userType, user }
export function getUserInfo() {
  return request({
    url: '/app/user/info',
    method: 'GET',
  });
}

// 商品推荐组合分页
// params: { pageNum, pageSize }
export function getComboList(params) {
  return request({
    url: '/app/product/combo/list',
    method: 'GET',
    data: params,
  });
}