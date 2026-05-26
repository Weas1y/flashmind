import { Client } from "ssh2"
import { readFileSync, readdirSync, statSync, existsSync } from "fs"
import { join, relative, normalize, sep } from "path"

const HOST = process.env.DEPLOY_HOST || ""
const PORT = parseInt(process.env.DEPLOY_PORT || "22")
const USERNAME = process.env.DEPLOY_USER || ""
const PASSWORD = process.env.DEPLOY_PASS || ""
const PRIVATE_KEY = process.env.DEPLOY_KEY_PATH || ""
const REMOTE_APP_DIR = process.env.DEPLOY_REMOTE_APP || "/var/www/html/flashcard"
const REMOTE_API_DIR = process.env.DEPLOY_REMOTE_API || "/opt/flashcard-api"
const LOCAL_DIST = "./dist"
const LOCAL_SERVER = "./server"

if (!HOST || !USERNAME) {
  console.error("错误：请设置 DEPLOY_HOST 和 DEPLOY_USER 环境变量")
  console.error("可选：DEPLOY_PASS (密码) 或 DEPLOY_KEY_PATH (SSH密钥路径)")
  console.error("示例：DEPLOY_HOST=1.2.3.4 DEPLOY_USER=root DEPLOY_PASS=xxx node deploy.mjs")
  process.exit(1)
}

const conn = new Client()

function getAllFiles(dir, baseDir) {
  const files = []
  if (!existsSync(dir)) return files
  const entries = readdirSync(dir)
  for (const entry of entries) {
    if (entry === "node_modules" || entry === "data") continue
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir))
    } else {
      const rel = relative(baseDir, fullPath).split(sep).join("/")
      files.push({
        localPath: fullPath,
        content: readFileSync(fullPath),
        remoteDir: REMOTE_API_DIR + "/" + rel.substring(0, rel.lastIndexOf("/")),
        remotePath: REMOTE_API_DIR + "/" + rel,
      })
    }
  }
  return files
}

function exec(cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ""
      stream.on("data", (d) => { out += d.toString() })
      stream.stderr.on("data", (d) => { out += d.toString() })
      stream.on("close", () => resolve(out.trim()))
    })
  })
}

function sftpPut(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err)
      const ws = sftp.createWriteStream(remotePath)
      ws.on("close", resolve)
      ws.on("error", reject)
      ws.end(readFileSync(localPath))
    })
  })
}

conn.on("ready", async () => {
  console.log("SSH 连接成功\n")

  try {
    console.log("=== 1/4 上传前端文件 ===")
    const baseDir = normalize(LOCAL_DIST)
    const frontendFiles = []
    const entries = readdirSync(baseDir)
    for (const entry of entries) {
      const fullPath = join(baseDir, entry)
      if (statSync(fullPath).isDirectory()) {
        const subEntries = readdirSync(fullPath)
        for (const sub of subEntries) {
          const subPath = join(fullPath, sub)
          if (statSync(subPath).isFile()) {
            frontendFiles.push({
              localPath: subPath,
              remotePath: REMOTE_APP_DIR + "/" + entry + "/" + sub,
            })
          }
        }
      } else {
        frontendFiles.push({
          localPath: fullPath,
          remotePath: REMOTE_APP_DIR + "/" + entry,
        })
      }
    }

    for (const f of frontendFiles) {
      await exec(`mkdir -p "${f.remotePath.substring(0, f.remotePath.lastIndexOf('/'))}"`)
      await sftpPut(f.localPath, f.remotePath)
      console.log(`  ✓ ${f.remotePath}`)
    }

    console.log("\n=== 2/4 上传 API 服务端 ===")
    const serverFiles = getAllFiles(normalize(LOCAL_SERVER), normalize(LOCAL_SERVER))

    for (const f of serverFiles) {
      await exec(`mkdir -p "${f.remoteDir}"`)
      const content = readFileSync(f.localPath)
      await new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err)
          const ws = sftp.createWriteStream(f.remotePath)
          ws.on("close", resolve)
          ws.on("error", reject)
          ws.end(content)
        })
      })
      console.log(`  ✓ ${f.remotePath}`)
    }

    console.log("\n  📦 安装依赖...")
    const installResult = await exec(`cd ${REMOTE_API_DIR} && npm install --omit=dev 2>&1`)
    if (installResult) console.log(`  ${installResult}`)

    console.log("\n=== 3/4 配置 systemd 服务 ===")
    const serviceFile = `[Unit]
Description=Flashcard API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${REMOTE_API_DIR}
ExecStart=/usr/bin/node ${REMOTE_API_DIR}/server.js
Restart=always
RestartSec=3
Environment=PORT=3001

[Install]
WantedBy=multi-user.target`

    await exec(`cat > /etc/systemd/system/flashcard-api.service << 'SYSTEMDEOF'\n${serviceFile}\nSYSTEMDEOF`)

    await exec("systemctl daemon-reload")
    await exec("systemctl enable flashcard-api")
    const restartResult = await exec("systemctl restart flashcard-api 2>&1")
    if (restartResult) console.log(`  ${restartResult}`)
    console.log("  ✓ systemd 服务已配置并启动")

    console.log("\n=== 4/4 配置 Nginx ===")
    const nginxConfig = `server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html/flashcard;

    index index.html;

    server_name _;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}`

    await exec(`cat > /etc/nginx/sites-available/flashcard << 'NGINXEOF'\n${nginxConfig}\nNGINXEOF`)

    const nginxTest = await exec("nginx -t 2>&1")
    if (nginxTest.includes("successful")) {
      await exec("systemctl reload nginx")
      console.log("  ✓ Nginx 已重载")
    } else {
      console.log("  ⚠ Nginx 测试:", nginxTest)
    }

    const apiStatus = await exec("systemctl is-active flashcard-api 2>&1")
    console.log(`\n部署完成！API 服务状态: ${apiStatus}`)
  } catch (err) {
    console.error("部署失败:", err.message)
  } finally {
    conn.end()
  }
})

conn.on("error", (err) => {
  console.error("SSH 连接失败:", err.message)
})

const connectOpts = {
  host: HOST,
  port: PORT,
  username: USERNAME,
  readyTimeout: 15000,
}

if (PRIVATE_KEY && existsSync(PRIVATE_KEY)) {
  connectOpts.privateKey = readFileSync(PRIVATE_KEY)
} else if (PASSWORD) {
  connectOpts.password = PASSWORD
} else {
  console.error("错误：请提供 DEPLOY_PASS 或 DEPLOY_KEY_PATH")
  process.exit(1)
}

conn.connect(connectOpts)
