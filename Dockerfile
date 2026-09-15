# 直接用轻量 nginx
FROM xczx-2026-registry.cn-hangzhou.cr.aliyuncs.com/frontend/nginx:latest

# 把你本地 build 好的 dist 目录复制到 nginx 网页目录
COPY dist /usr/share/nginx/html

# 可选：解决前端路由刷新404
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]