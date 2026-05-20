import { Client } from "ssh2"
import { readFileSync, writeFileSync } from "fs"

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

const serviceOverrideContent = `[Service]
Environment=SMTP_HOST=smtp.qq.com
Environment=SMTP_PORT=587
Environment=SMTP_USER=2321861244@qq.com
Environment=SMTP_PASS=__AUTH_CODE__
`

console.log("=== 当前你需要先获取QQ邮箱授权码 ===\n")
console.log("步骤:")
console.log("1. 登录 https://mail.qq.com")
console.log("2. 设置 → 账户 → POP3/SMTP服务 → 开启")
console.log("3. 按提示发送短信获取16位授权码")
console.log("4. 将授权码填入下方的 SMTP_PASS\n")
console.log("当前覆盖配置已写入，但 SMTP_PASS 需要替换为你的真实授权码")
console.log("修改后请运行: systemctl daemon-reload && systemctl restart flashcard-api\n")

writeFileSync("./smtp_override.conf", serviceOverrideContent)
console.log("已生成模板文件: smtp_override.conf")
console.log("编辑后可通过 SSH 上传到: /etc/systemd/system/flashcard-api.service.d/override.conf")