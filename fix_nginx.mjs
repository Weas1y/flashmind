import { Client } from "ssh2"

const HOST = "192.168.31.44"
const PORT = 22
const USERNAME = "root"
const PASSWORD = "Wxr.2003"

const conn = new Client()

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

conn.on("ready", async () => {
  console.log("SSH 连接成功\n")

  try {
    console.log("=== 检查 Nginx 配置 ===")
    let result = await exec("ls -la /etc/nginx/sites-enabled/ 2>&1")
    console.log(result)

    console.log("\n=== 检查 API 服务 ===")
    result = await exec("systemctl status flashcard-api --no-pager -l 2>&1")
    console.log(result)

    console.log("\n=== 修复: 确保 sites-available 有配置并创建 symlink ===")
    const nginxConfig = `server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html/flashcard;

    index index.html;

    server_name _;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}`

    await exec(`cat > /etc/nginx/sites-available/flashcard << 'NGINXEOF'
${nginxConfig}
NGINXEOF`)

    console.log("已写入 sites-available/flashcard")

    result = await exec("rm -f /etc/nginx/sites-enabled/default && ln -sf /etc/nginx/sites-available/flashcard /etc/nginx/sites-enabled/flashcard 2>&1")
    console.log("Symlink 结果:", result || "OK")

    result = await exec("ls -la /etc/nginx/sites-enabled/ 2>&1")
    console.log("sites-enabled:", result)

    console.log("\n=== 测试 Nginx ===")
    result = await exec("nginx -t 2>&1")
    console.log(result)

    if (result.includes("successful")) {
      result = await exec("systemctl reload nginx 2>&1")
      console.log("Nginx reload:", result || "OK")
    }

    console.log("\n=== 检查 API 服务 ===")
    result = await exec("curl -s http://127.0.0.1:3001/api/auth/me 2>&1")
    console.log("Direct API:", result || "no output")

    result = await exec("curl -s http://127.0.0.1:80/api/auth/me 2>&1")
    console.log("Via Nginx:", result || "no output")

    result = await exec("systemctl is-active flashcard-api 2>&1")
    console.log("\nAPI 服务状态:", result)
  } catch (err) {
    console.error("失败:", err.message)
  } finally {
    conn.end()
  }
})

conn.on("error", (err) => {
  console.error("SSH 连接失败:", err.message)
})

conn.connect({
  host: HOST,
  port: PORT,
  username: USERNAME,
  password: PASSWORD,
  readyTimeout: 15000,
})