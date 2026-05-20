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
    console.log("=== 1. 检查 SMTP 配置 ===")
    let result = await exec("cat /etc/systemd/system/flashcard-api.service | grep -i smtp 2>&1 || echo 'NO SMTP ENV VARS'")
    console.log("SMTP env vars:", result || "(none)")

    console.log("\n=== 2. 查看最近邮件日志 ===")
    result = await exec("tail -15 /opt/flashcard-api/data/email.log 2>&1 || echo 'No log file'")
    console.log(result)

    console.log("\n=== 3. 检查 API 服务状态 ===")
    result = await exec("systemctl is-active flashcard-api 2>&1")
    console.log("API service:", result)

    console.log("\n=== 4. 检查 nodemailer 安装 ===")
    result = await exec("cd /opt/flashcard-api && node -e \"try{require('nodemailer');console.log('OK')}catch(e){console.log('MISSING')}\" 2>&1")
    console.log("nodemailer:", result)

    console.log("\n=== 5. 当前验证码数据 ===")
    result = await exec("cat /opt/flashcard-api/data/verifications.json 2>&1 || echo 'No verifications'")
    console.log(result)
  } catch (err) {
    console.error(err.message)
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