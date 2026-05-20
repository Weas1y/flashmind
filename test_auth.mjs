const BASE = "http://192.168.31.44/api/auth"
const headers = { "Content-Type": "application/json" }

async function test() {
  console.log("=== 1. 注册新用户 ===")
  const regRes = await fetch(`${BASE}/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      username: "testuser99",
      email: "test99@example.com",
      password: "Test12345"
    })
  })
  const regData = await regRes.json()
  console.log("注册结果:", JSON.stringify(regData))

  if (!regData.token) {
    console.log("注册失败")
    return
  }

  console.log("\n=== 2. 验证 Token (模拟换设备登录) ===")
  const authRes = await fetch(`${BASE}/me`, {
    headers: { "Authorization": `Bearer ${regData.token}` }
  })
  const authData = await authRes.json()
  console.log("验证结果:", JSON.stringify(authData))

  console.log("\n=== 3. 登出 ===")
  const logoutRes = await fetch(`${BASE}/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${regData.token}`
    }
  })
  console.log("登出:", JSON.stringify(await logoutRes.json()))

  console.log("\n=== 4. Token 失效后验证 ===")
  const invalidRes = await fetch(`${BASE}/me`, {
    headers: { "Authorization": `Bearer ${regData.token}` }
  })
  console.log("过期Token:", JSON.stringify(await invalidRes.json()))

  console.log("\n✓ 跨设备登录测试完成")
}

test().catch(e => console.error(e))