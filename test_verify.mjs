const BASE = "http://192.168.31.44/api/auth"

async function test() {
  const testEmail = "verify_test_" + Date.now() + "@example.com"

  console.log("=== 1. 发送验证码 ===")
  const sendRes = await fetch(`${BASE}/send-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail })
  })
  const sendData = await sendRes.json()
  console.log("发送结果:", JSON.stringify(sendData))

  if (!sendData.success) {
    console.log("发送失败，退出测试")
    return
  }

  console.log("\n=== 2. 错误验证码注册（应失败）===")
  const wrongRes = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "baduser_" + Date.now(),
      email: testEmail,
      password: "Test123456",
      code: "000000"
    })
  })
  console.log("错误验证码:", JSON.stringify(await wrongRes.json()))

  console.log("\n=== 3. 无验证码注册（应失败）===")
  const noCodeRes = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "anotheruser",
      email: "another@example.com",
      password: "Test123456",
    })
  })
  console.log("无验证码:", JSON.stringify(await noCodeRes.json()))

  console.log("\n=== 4. 重复发送验证码（应触发限流）===")
  const rateRes = await fetch(`${BASE}/send-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail })
  })
  console.log("重复发送:", JSON.stringify(await rateRes.json()))

  console.log("\n✓ 邮箱验证测试完成")
}

test().catch(e => console.error(e))