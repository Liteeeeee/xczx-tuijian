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

// ========== C 端 AI 对话 ==========

// 默认 AI 问题（data 为字符串数组）
export function getAiQuestions() {
  return request({
    url: '/app/ai/questions',
    method: 'GET',
  });
}

// 默认问答模板（含题目 items：itemId/question/questionType/requiredFlag/options/sortOrder）
export function getAiQaTemplateDefault() {
  return request({
    url: '/app/ai/qaTemplates/default',
    method: 'GET',
  });
}

// 问答模板分页
// params: { pageNum, pageSize, templateName?, templateCode?, isDefault?, keyword? }
export function getAiQaTemplates(params) {
  return request({
    url: '/app/ai/qaTemplates',
    method: 'GET',
    data: params,
  });
}

// 默认欢迎语
export function getAiWelcome() {
  return request({
    url: '/app/ai/welcome',
    method: 'GET',
  });
}

// AI 同步对话
// data: { prompt(必填), sessionId?(可选) }，返回 body.data = { text, sessionId, requestId, finishReason }
export function aiChat(data) {
  return request({
    url: '/app/ai/chat',
    method: 'POST',
    data,
  });
}

// AI 异步对话提交
// data: { taskId(必填,前端唯一), prompt(必填), sessionId?(可选) }
export function aiChatAsync(data) {
  return request({
    url: '/app/ai/chat/async',
    method: 'POST',
    data,
  });
}

// AI 异步对话查询
// 返回 body.data = { taskId, status(2进行中/0成功/1失败), result:{text,sessionId,...}, errorMsg }
export function aiChatAsyncResult(taskId) {
  return request({
    url: `/app/ai/chat/async/${taskId}`,
    method: 'GET',
  });
}

// C端用户AI会话列表（历史记录）
// 返回 body.data = AiChatSession[]，AiChatSession：{id,sessionId,appId,appName,firstPrompt,title,messageCount,createTime,lastTime,...}
export function getAiSessions() {
  return request({
    url: '/app/ai/sessions',
    method: 'GET',
  });
}

// 会话详情（含对话明细）
// 路径 /ai/chat/log/{sessionId}（非 C 端 app 前缀版本，若依通用 AI 对话记录接口）
// 返回 body.data = 会话消息日志 { messages, session, ... }
export function getAiChatLog(sessionId) {
  return request({
    url: `/ai/chat/log/${encodeURIComponent(sessionId)}`,
    method: 'GET',
  });
}