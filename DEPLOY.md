# FlashMind 部署教程

FlashMind 是一个英语单词卡学习应用，前端使用 React + Vite + TypeScript，后端使用 Node.js + Express。

---

## 目录

- [1. 环境准备要求](#1-环境准备要求)
- [2. 详细部署步骤](#2-详细部署步骤)
  - [2.1 克隆仓库](#21-克隆仓库)
  - [2.2 安装前端依赖](#22-安装前端依赖)
  - [2.3 安装后端依赖](#23-安装后端依赖)
  - [2.4 配置 SMTP 邮件服务](#24-配置-smtp-邮件服务)
  - [2.5 构建前端生产包](#25-构建前端生产包)
  - [2.6 配置 Nginx 反向代理](#26-配置-nginx-反向代理)
  - [2.7 使用 PM2 管理进程](#27-使用-pm2-管理进程)
  - [2.8 一键部署脚本](#28-一键部署脚本)
- [3. 常见问题排查与解决方案](#3-常见问题排查与解决方案)
- [4. 验证部署成功](#4-验证部署成功)

---

## 1. 环境准备要求

### 必需软件与版本

| 软件 | 最低版本 | 推荐版本 | 用途 |
|------|---------|---------|------|
| **Node.js** | 20.x | 22.x LTS | JavaScript 运行时 |
| **npm** | 10.x | 随 Node.js 附带 | 包管理器 |
| **Nginx** | 1.18+ | 1.24+ | Web 服务器 / 反向代理 |
| **PM2** | 5.x | 最新版 | Node.js 进程守护 |
| **Git** | 2.30+ | 最新版 | 克隆仓库 |

### 可选软件

| 软件 | 用途 |
|------|------|
| SMTP 邮箱账号 | 用户注册验证码发送（QQ邮箱 / 163邮箱 / Gmail 等） |
| Certbot | 免费 HTTPS 证书（推荐用于生产环境） |

### 硬件建议

- CPU: 1 核及以上
- 内存: 512MB 及以上
- 磁盘: 1GB 可用空间

### 环境检查命令

在开始部署前，运行以下命令确认环境就绪：

```bash
node --version    # 应输出 v20.x 或更高
npm --version     # 应输出 10.x 或更高
nginx -v          # 应输出 nginx version: 1.x.x
git --version     # 应输出 git version 2.x.x
```

---

## 2. 详细部署步骤

### 2.1 克隆仓库

```bash
# 克隆项目到服务器
git clone https://github.com/Weas1y/flashmind.git
cd flashmind
```

### 2.2 安装前端依赖

```bash
# 在项目根目录安装前端依赖
npm install
```

如果安装速度较慢，可使用国内镜像：

```bash
npm install --registry=https://registry.npmmirror.com
```

### 2.3 安装后端依赖

```bash
# 进入 server 目录并安装后端依赖
cd server
npm install
cd ..
```

> **注意**：`bcrypt` 包需要系统安装编译工具。如果安装失败，请参考[常见问题](#bcrypt-安装失败)。

### 2.4 配置 SMTP 邮件服务

应用的用户注册功能通过邮箱验证码实现，需要配置 SMTP 服务。

#### 方案 A：使用 QQ 邮箱（推荐国内用户）

1. 登录 QQ 邮箱 → 设置 → 账户 → 开启 POP3/SMTP 服务
2. 获取**授权码**（非邮箱密码）
3. 创建环境变量文件：

```bash
# 创建 .env 文件（在项目根目录的 server/ 下）
cat > server/.env << 'EOF'
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=你的QQ邮箱@qq.com
SMTP_PASS=你的QQ邮箱授权码
PORT=3001
EOF
```

#### 方案 B：使用 Gmail

```bash
cat > server/.env << 'EOF'
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=你的Gmail地址@gmail.com
SMTP_PASS=你的Gmail应用专用密码
PORT=3001
EOF
```

> Gmail 需要先开启两步验证，然后生成「应用专用密码」。

#### 方案 C：开发模式（不发送真实邮件）

如果不配置 SMTP，系统会自动进入**开发模式**——验证码不会发送邮件，而是直接打印在服务器日志中：

```bash
# 查看验证码
pm2 logs flashmind-api
```

### 2.5 构建前端生产包

```bash
# 回到项目根目录
cd /path/to/flashmind

# 执行构建（TypeScript 编译 + Vite 打包）
npm run build
```

构建成功后，`dist/` 目录下会生成以下文件：

```
dist/
├── index.html
├── favicon.svg
└── assets/
    ├── index-XXXXX.css      (CSS 样式文件)
    ├── index-XXXXX.js        (JavaScript 主文件)
    └── index-XXXXX.js.map    (Source Map)
```

### 2.6 配置 Nginx 反向代理

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/flashmind
```

粘贴以下配置：

```nginx
server {
    listen 80;
    server_name 你的域名或IP地址;

    # 前端静态文件
    root /path/to/flashmind/dist;
    index index.html;

    # 前端路由（SPA 必须配置）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源缓存（可选优化）
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

启用站点并重载 Nginx：

```bash
# 创建软链接启用站点
sudo ln -s /etc/nginx/sites-available/flashmind /etc/nginx/sites-enabled/

# 测试 Nginx 配置
sudo nginx -t

# 重载 Nginx
sudo nginx -s reload
```

#### HTTPS 配置（推荐）

```bash
# 使用 Certbot 自动获取免费 SSL 证书
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d 你的域名
```

### 2.7 使用 PM2 管理进程

PM2 确保后端服务在后台持续运行，崩溃后自动重启。

```bash
# 全局安装 PM2
npm install -g pm2

# 启动后端服务
cd /path/to/flashmind/server
pm2 start server.js --name flashmind-api

# 设置开机自启
pm2 startup
pm2 save

# 常用管理命令
pm2 status          # 查看所有进程状态
pm2 logs flashmind-api       # 查看日志
pm2 restart flashmind-api    # 重启服务
pm2 stop flashmind-api       # 停止服务
```

### 2.8 一键部署脚本

项目中已包含 `deploy.mjs` 脚本，可通过 SSH 远程部署：

```bash
# 本地执行（自动连接服务器并进行部署）
node deploy.mjs
```

部署脚本将自动完成：
1. 连接远程服务器
2. 构建生产包
3. 上传到服务器
4. 安装依赖
5. 重启服务

---

## 3. 常见问题排查与解决方案

### 问题：`bcrypt` 安装失败

**错误信息**：`node-gyp rebuild` 相关错误

**解决方案**：

```bash
# Ubuntu/Debian 安装编译工具
sudo apt install build-essential python3 -y

# CentOS/RHEL
sudo yum install gcc-c++ make python3 -y

# 安装完成后重新安装
cd server && npm install
```

### 问题：端口被占用

**错误信息**：`EADDRINUSE: address already in use :::3001`

**解决方案**：

```bash
# 查看占用端口的进程
sudo lsof -i :3001

# 终止该进程，然后重启
pm2 restart flashmind-api
```

### 问题：Nginx 返回 403 Forbidden

**原因**：Nginx 没有权限读取 dist 目录

**解决方案**：

```bash
# 确保 dist 目录及其父目录有执行权限
chmod +x /path/to/flashmind
chmod +x /path/to/flashmind/dist

# 或更改所有者
sudo chown -R www-data:www-data /path/to/flashmind/dist
```

### 问题：前端页面刷新后 404

**原因**：Nginx 未配置 SPA 路由回退

**解决方案**：确保 Nginx 配置中包含：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

然后重载 Nginx：

```bash
sudo nginx -s reload
```

### 问题：API 请求返回 CORS 错误

**原因**：前后端跨域配置问题

**解决方案**：

1. 确保使用 Nginx 反向代理（前后端同域），而非直接访问不同端口
2. 检查 server.js 中的 `cors()` 中间件是否正常加载

### 问题：验证码邮件未收到

**排查步骤**：

1. 检查 SMTP 配置是否正确：

   ```bash
   cat server/.env
   ```

2. 查看邮件发送日志：

   ```bash
   pm2 logs flashmind-api | grep EMAIL
   cat server/data/email.log
   ```

3. 测试 SMTP 连接：

   ```bash
   node check_smtp.mjs
   ```

4. 检查邮箱是否开启了 SMTP 服务并使用了正确的授权码

5. 查看垃圾邮件箱

### 问题：PM2 进程频繁重启

**排查步骤**：

```bash
# 查看详细日志
pm2 logs flashmind-api --lines 50

# 查看重启历史
pm2 list

# 检查内存使用
pm2 monit
```

### 问题：依赖项版本不兼容

```bash
# 清除依赖后重新安装
rm -rf node_modules package-lock.json
npm install

cd server
rm -rf node_modules package-lock.json
npm install
```

---

## 4. 验证部署成功

### 4.1 基础功能检查清单

| 检查项 | 方法 | 预期结果 |
|--------|------|---------|
| 前端页面可访问 | 浏览器打开 `http://你的域名/` | 显示 FlashMind 首页 |
| API 健康检查 | `curl http://你的域名/api/auth/me` | 返回 `{"success":false,"error":"未登录"}` |
| 后端进程运行 | `pm2 status` | `flashmind-api` 状态为 `online` |
| Nginx 运行 | `sudo nginx -t` | 返回 `syntax is ok` |
| 静态资源加载 | 浏览器打开 F12 → Network | CSS/JS 文件加载正常，无 404 |

### 4.2 功能验证流程

1. **访问首页**：浏览器打开网站，确认页面正常加载
2. **注册账号**：输入用户名、邮箱、密码，获取验证码并完成注册
3. **登录系统**：使用注册的账号登录
4. **创建单词集**：点击「创建单词集」，添加英文单词和中文释义
5. **学习模式**：进入学习模式，确认卡片翻转正常
6. **游戏模式**：测试匹配游戏和拼写测试功能

### 4.3 性能验证

```bash
# 检查后端 API 响应时间
curl -w "\n响应时间: %{time_total}s\n" http://localhost:3001/api/auth/me

# 检查 Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# 检查 PM2 资源使用
pm2 status
```

### 4.4 一键验证脚本

将以下内容保存为 `verify-deploy.sh` 并执行：

```bash
#!/bin/bash
DOMAIN="你的域名"
echo "========================================"
echo "  FlashMind 部署验证"
echo "========================================"

# 1. 检查前端
echo -n "[1/5] 前端页面... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN/)
if [ "$STATUS" = "200" ]; then echo "通过 (200)"; else echo "失败 ($STATUS)"; fi

# 2. 检查 API
echo -n "[2/5] API 接口... "
API_RESP=$(curl -s http://$DOMAIN/api/auth/me)
if echo "$API_RESP" | grep -q "success"; then echo "通过"; else echo "失败"; fi

# 3. 检查 PM2
echo -n "[3/5] PM2 进程... "
if pm2 list | grep -q "flashmind-api.*online"; then echo "通过"; else echo "失败"; fi

# 4. 检查 Nginx
echo -n "[4/5] Nginx 配置... "
if sudo nginx -t 2>&1 | grep -q "successful"; then echo "通过"; else echo "失败"; fi

# 5. 检查静态资源
echo -n "[5/5] 静态资源... "
JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN/assets/)
if [ "$JS_STATUS" = "200" ] || [ "$JS_STATUS" = "403" ]; then echo "通过"; else echo "失败 ($JS_STATUS)"; fi

echo "========================================"
echo "  验证完成"
echo "========================================"
```

---

## 附录：项目技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| CSS 方案 | Tailwind CSS 3 |
| 路由 | React Router v7 |
| 状态管理 | Zustand |
| 图标库 | Lucide React |
| 后端框架 | Express 4 |
| 认证方式 | Bearer Token + 邮箱验证码 |
| 密码加密 | bcrypt |
| 邮件服务 | Nodemailer + SMTP |

---

> 如有任何问题，请检查日志文件或联系项目维护者。