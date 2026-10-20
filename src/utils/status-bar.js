/**
 * 获取设备真实状态栏高度（单位 px）。
 *
 * 小程序编译产物中的 --status-bar-height 是编译期常量（固定 25px），
 * 与真机状态栏实际高度（20~59px）不一致，导致 navigationStyle: custom
 * 的页面顶部内容被状态栏遮挡。这里改为运行时读取真实高度。
 * H5 无状态栏，返回 0，保持原有设计间距不变。
 */
let cachedHeight = null;

export function getStatusBarHeight() {
  if (cachedHeight !== null) {
    return cachedHeight;
  }
  let height = 0;
  // #ifdef MP-WEIXIN
  try {
    const info = uni.getWindowInfo
      ? uni.getWindowInfo()
      : uni.getSystemInfoSync();
    height = (info && info.statusBarHeight) || 0;
  } catch (error) {
    height = 0;
  }
  // #endif
  cachedHeight = Number(height) || 0;
  return cachedHeight;
}
