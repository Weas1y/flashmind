import { Client } from "ssh2"

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
  try {
    console.log("=== 1. 创建 systemd override 配置 ===")
    await exec(`mkdir -p /etc/systemd/system/flashcard-api.service.d`)
    await exec(`cat > /etc/systemd/system/flashcard-api.service.d/override.conf << 'EOF'
[Service]
Environment=SMTP_HOST=smtp.qq.com
Environment=SMTP_PORT=587
Environment=SMTP_USER=2321861244@qq.com
Environment=SMTP_PASS=lnwtaoakatlheceg
EOF`)
    console.log("✅ 配置已写入")

    console.log("\n=== 2. 重载并重启服务 ===")
    let result = await exec("systemctl daemon-reload 2>&1")
    console.log("daemon-reload:", result || "OK")
    
    result = await exec("systemctl restart flashcard-api 2>&1")
    console.log("restart:", result || "OK")

    await new Promise(r => setTimeout(r, 2000))

    console.log("\n=== 3. 验证服务状态 ===")
    result = await exec("systemctl is-active flashcard-api 2>&1")
    console.log("状态:", result)

    console.log("\n=== 4. 验证 SMTP 配置加载 ===")
    result = await exec("tail -5 /opt/flashcard-api/data/email.log 2>&1")
    console.log("最新日志:", result)

    console.log("\n=== 5. 发送测试验证码 ===")
    result = await exec(`curl -s -X POST http://127.0.0.1:3001/api/auth/send-verification \
      -H "Content-Type: application/json" \
      -d '{"email":"2321861244@qq.com"}' 2>&1`)
    console.log("发送结果:", result)

    await new Promise(r => setTimeout(r, 3000))

    console.log("\n=== 6. 查看发送后日志 ===")
    result = await exec("tail -5 /opt/flashcard-api/data/email.log 2>&1")
    console.log("日志:", result)

    console.log("\n🎉 配置完成！")
  } catch (err) {
    console.error("失败:", err.message)
  } finally {
    conn.end()
  }
})

conn.on("error", (err) => console.error("SSH error:", err.message))

conn.connect({
  host: "192.168.31.44",
  port: 22,
  username: "root",
  password: "Wxr.2003",
  readyTimeout: 10000,
})