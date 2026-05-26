import express from "express"
import cors from "cors"
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import crypto from "crypto"
import nodemailer from "nodemailer"
import bcrypt from "bcrypt"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001
const DATA_DIR = join(__dirname, "data")
const USERS_FILE = join(DATA_DIR, "users.json")
const SESSIONS_FILE = join(DATA_DIR, "sessions.json")
const VERIFY_FILE = join(DATA_DIR, "verifications.json")
const EMAIL_LOG_FILE = join(DATA_DIR, "email.log")
const RATE_LIMIT_FILE = join(DATA_DIR, "rate_limits.json")
const LOGIN_RATE_LIMIT_FILE = join(DATA_DIR, "login_rate_limits.json")
const STUDY_SETS_FILE = join(DATA_DIR, "studysets.json")
const RESET_TOKENS_FILE = join(DATA_DIR, "reset_tokens.json")

const VERIFY_CODE_TTL = 10 * 60 * 1000
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000
const RATE_LIMIT_WINDOW = 60 * 1000
const LOGIN_RATE_LIMIT_WINDOW = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 5
const RESET_TOKEN_TTL = 30 * 60 * 1000

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean)

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
}

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

function readJSON(path, fallback = null) {
  try {
    if (!existsSync(path)) return fallback
    return JSON.parse(readFileSync(path, "utf-8"))
  } catch {
    return fallback
  }
}

function writeJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2))
}

function emailLog(message) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${message}\n`
  appendFileSync(EMAIL_LOG_FILE, line)
  console.log(`[EMAIL] ${message}`)
}

const BCRYPT_ROUNDS = 12

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex")
}

function generateVerificationCode() {
  return String(crypto.randomInt(100000, 999999))
}

function getToken(req) {
  const header = req.headers.authorization
  if (!header || !header.startsWith("Bearer ")) return null
  return header.slice(7)
}

function checkRateLimit(email) {
  const limits = readJSON(RATE_LIMIT_FILE, {})
  const entry = limits[email]
  if (entry && Date.now() - entry.lastSent < RATE_LIMIT_WINDOW) {
    const remaining = Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - entry.lastSent)) / 1000)
    return { blocked: true, remaining }
  }
  limits[email] = { lastSent: Date.now() }
  writeJSON(RATE_LIMIT_FILE, limits)
  return { blocked: false, remaining: 0 }
}

function checkLoginRateLimit(ip) {
  const limits = readJSON(LOGIN_RATE_LIMIT_FILE, {})
  const entry = limits[ip] || { attempts: 0, firstAttempt: Date.now() }

  if (Date.now() - entry.firstAttempt > LOGIN_RATE_LIMIT_WINDOW) {
    entry.attempts = 0
    entry.firstAttempt = Date.now()
  }

  if (entry.attempts >= LOGIN_MAX_ATTEMPTS) {
    const remaining = Math.ceil((LOGIN_RATE_LIMIT_WINDOW - (Date.now() - entry.firstAttempt)) / 60000)
    return { blocked: true, remaining }
  }

  return { blocked: false, attempts: entry.attempts }
}

function recordLoginAttempt(ip, success) {
  const limits = readJSON(LOGIN_RATE_LIMIT_FILE, {})
  const entry = limits[ip] || { attempts: 0, firstAttempt: Date.now() }

  if (success) {
    delete limits[ip]
  } else {
    if (Date.now() - entry.firstAttempt > LOGIN_RATE_LIMIT_WINDOW) {
      entry.attempts = 1
      entry.firstAttempt = Date.now()
    } else {
      entry.attempts += 1
    }
    limits[ip] = entry
  }

  writeJSON(LOGIN_RATE_LIMIT_FILE, limits)
}

function cleanupExpired() {
  const verifications = readJSON(VERIFY_FILE, {})
  const now = Date.now()
  let changed = false
  for (const key of Object.keys(verifications)) {
    if (now - verifications[key].createdAt > VERIFY_CODE_TTL) {
      delete verifications[key]
      changed = true
    }
  }
  if (changed) writeJSON(VERIFY_FILE, verifications)

  const sessions = readJSON(SESSIONS_FILE, {})
  let sessionChanged = false
  for (const token of Object.keys(sessions)) {
    if (now - sessions[token].createdAt > SESSION_TTL) {
      delete sessions[token]
      sessionChanged = true
    }
  }
  if (sessionChanged) writeJSON(SESSIONS_FILE, sessions)

  const resetTokens = readJSON(RESET_TOKENS_FILE, {})
  let resetChanged = false
  for (const token of Object.keys(resetTokens)) {
    if (now - resetTokens[token].createdAt > RESET_TOKEN_TTL) {
      delete resetTokens[token]
      resetChanged = true
    }
  }
  if (resetChanged) writeJSON(RESET_TOKENS_FILE, resetTokens)

  const loginLimits = readJSON(LOGIN_RATE_LIMIT_FILE, {})
  let loginChanged = false
  for (const ip of Object.keys(loginLimits)) {
    if (now - loginLimits[ip].firstAttempt > LOGIN_RATE_LIMIT_WINDOW) {
      delete loginLimits[ip]
      loginChanged = true
    }
  }
  if (loginChanged) writeJSON(LOGIN_RATE_LIMIT_FILE, loginLimits)
}

let transporter = null

function getTransporter() {
  if (transporter) return transporter
  if (SMTP_CONFIG.host && SMTP_CONFIG.auth.user) {
    transporter = nodemailer.createTransport(SMTP_CONFIG)
    emailLog(`SMTP configured: ${SMTP_CONFIG.host}:${SMTP_CONFIG.port} as ${SMTP_CONFIG.auth.user}`)
  } else {
    emailLog("No SMTP configured, running in DEV mode (codes logged to console)")
  }
  return transporter
}

async function sendVerificationEmail(to, code) {
  const transport = getTransporter()

  if (!transport) {
    emailLog(`DEV MODE - Code for ${to}: ${code}`)
    return { success: true, devMode: true }
  }

  try {
    const info = await transport.sendMail({
      from: `"FlashMind" <${SMTP_CONFIG.auth.user}>`,
      to,
      subject: "邮箱验证码 - FlashMind",
      html: `<div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif">
  <div style="background:linear-gradient(135deg,#4A6BFF,#FF8C42);padding:24px;border-radius:16px 16px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">FlashMind</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">邮箱验证</p>
  </div>
  <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px">
    <p style="color:#374151;font-size:15px;margin:0 0 24px">你好，你正在注册 FlashMind 账号。请使用以下验证码完成注册：</p>
    <div style="background:#f3f4f6;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
      <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1f2937;font-family:monospace">${code}</span>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin:0">验证码 ${Math.ceil(VERIFY_CODE_TTL / 60000)} 分钟内有效。如果这不是你的操作，请忽略此邮件。</p>
  </div>
</div>`,
    })
    emailLog(`Sent to ${to} - MessageID: ${info.messageId}`)
    return { success: true, devMode: false }
  } catch (err) {
    emailLog(`FAILED to send to ${to}: ${err.message}`)
    return { success: false, error: err.message }
  }
}

async function sendResetEmail(to, resetToken) {
  const transport = getTransporter()

  if (!transport) {
    emailLog(`DEV MODE - Reset token for ${to}: ${resetToken}`)
    return { success: true, devMode: true }
  }

  try {
    const baseUrl = process.env.APP_URL || "http://localhost:5173"
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`
    const info = await transport.sendMail({
      from: `"FlashMind" <${SMTP_CONFIG.auth.user}>`,
      to,
      subject: "密码重置 - FlashMind",
      html: `<div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif">
  <div style="background:linear-gradient(135deg,#4A6BFF,#FF8C42);padding:24px;border-radius:16px 16px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">FlashMind</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">密码重置</p>
  </div>
  <div style="background:#fff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px">
    <p style="color:#374151;font-size:15px;margin:0 0 24px">你正在重置 FlashMind 账号密码，请点击以下按钮完成重置：</p>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${resetLink}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#4A6BFF,#FF8C42);color:#fff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:600">重置密码</a>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin:0">链接 ${Math.ceil(RESET_TOKEN_TTL / 60000)} 分钟内有效。如果这不是你的操作，请忽略此邮件。</p>
  </div>
</div>`,
    })
    emailLog(`Reset email sent to ${to} - MessageID: ${info.messageId}`)
    return { success: true, devMode: false }
  } catch (err) {
    emailLog(`FAILED to send reset to ${to}: ${err.message}`)
    return { success: false, error: err.message }
  }
}

const corsOptions = {
  origin: ALLOWED_ORIGINS.length > 0
    ? ALLOWED_ORIGINS
    : (origin, callback) => {
        callback(null, true)
      },
  credentials: true,
}

const app = express()
app.use(cors(corsOptions))
app.use(express.json())

setInterval(cleanupExpired, 5 * 60 * 1000)

app.post("/api/auth/send-verification", async (req, res) => {
  const { email } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: "请输入有效的邮箱地址" })
  }

  const users = readJSON(USERS_FILE, [])
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ success: false, error: "该邮箱已被注册" })
  }

  const rateLimit = checkRateLimit(email.toLowerCase())
  if (rateLimit.blocked) {
    return res.status(429).json({
      success: false,
      error: `发送过于频繁，请 ${rateLimit.remaining} 秒后再试`,
      retryAfter: rateLimit.remaining,
    })
  }

  const code = generateVerificationCode()
  const verifications = readJSON(VERIFY_FILE, {})
  verifications[email.toLowerCase()] = {
    code,
    createdAt: Date.now(),
  }
  writeJSON(VERIFY_FILE, verifications)

  emailLog(`Generated code for ${email}`)

  const result = await sendVerificationEmail(email, code)

  if (result.success) {
    res.json({
      success: true,
      message: result.devMode
        ? "验证码已生成（开发模式，请查看服务器日志）"
        : "验证码已发送到你的邮箱，请查收",
      devMode: result.devMode,
    })
  } else {
    delete verifications[email.toLowerCase()]
    writeJSON(VERIFY_FILE, verifications)
    res.status(500).json({
      success: false,
      error: "邮件发送失败，请稍后重试。如持续失败请联系管理员。",
    })
  }
})

app.post("/api/auth/register", async (req, res) => {
  const { username, email, password, code } = req.body

  if (!username || !email || !password || !code) {
    return res.status(400).json({ success: false, error: "请填写所有字段" })
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ success: false, error: "用户名长度需在2-20个字符之间" })
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: "密码至少需要6个字符" })
  }

  const emailLower = email.toLowerCase()
  const verifications = readJSON(VERIFY_FILE, {})
  const stored = verifications[emailLower]

  if (!stored) {
    return res.status(400).json({ success: false, error: "请先获取验证码" })
  }
  if (Date.now() - stored.createdAt > VERIFY_CODE_TTL) {
    delete verifications[emailLower]
    writeJSON(VERIFY_FILE, verifications)
    return res.status(400).json({ success: false, error: "验证码已过期，请重新获取" })
  }
  if (stored.code !== String(code).trim()) {
    return res.status(400).json({ success: false, error: "验证码错误，请检查后重试" })
  }

  delete verifications[emailLower]
  writeJSON(VERIFY_FILE, verifications)

  const users = readJSON(USERS_FILE, [])
  const usernameLower = username.toLowerCase()

  if (users.some((u) => u.username.toLowerCase() === usernameLower)) {
    return res.status(409).json({ success: false, error: "该用户名已被注册" })
  }
  if (users.some((u) => u.email.toLowerCase() === emailLower)) {
    return res.status(409).json({ success: false, error: "该邮箱已被注册" })
  }

  const newUser = {
    id: crypto.randomUUID(),
    username,
    email,
    passwordHash: await hashPassword(password),
    emailVerified: true,
    createdAt: new Date().toISOString(),
  }

  users.push(newUser)
  writeJSON(USERS_FILE, users)

  const token = generateToken()
  const sessions = readJSON(SESSIONS_FILE, {})
  sessions[token] = { id: newUser.id, username, email, createdAt: Date.now() }
  writeJSON(SESSIONS_FILE, sessions)

  emailLog(`User registered: ${username} (${email})`)

  res.json({
    success: true,
    user: { id: newUser.id, username, email },
    token,
  })
})

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ success: false, error: "请输入用户名和密码" })
  }

  const clientIp = req.ip || req.connection.remoteAddress || "unknown"
  const loginLimit = checkLoginRateLimit(clientIp)
  if (loginLimit.blocked) {
    return res.status(429).json({
      success: false,
      error: `登录尝试过多，请 ${loginLimit.remaining} 分钟后再试`,
    })
  }

  const users = readJSON(USERS_FILE, [])
  const inputLower = username.toLowerCase()
  const found = users.find(
    (u) => u.username.toLowerCase() === inputLower || u.email.toLowerCase() === inputLower
  )

  if (!found) {
    recordLoginAttempt(clientIp, false)
    return res.status(401).json({ success: false, error: "账号不存在，请检查输入或先注册" })
  }
  if (!(await verifyPassword(password, found.passwordHash))) {
    recordLoginAttempt(clientIp, false)
    return res.status(401).json({ success: false, error: "密码错误，请重试" })
  }

  recordLoginAttempt(clientIp, true)

  const token = generateToken()
  const sessions = readJSON(SESSIONS_FILE, {})
  sessions[token] = { id: found.id, username: found.username, email: found.email, createdAt: Date.now() }
  writeJSON(SESSIONS_FILE, sessions)

  res.json({
    success: true,
    user: { id: found.id, username: found.username, email: found.email },
    token,
  })
})

app.get("/api/auth/me", (req, res) => {
  const token = getToken(req)
  if (!token) {
    return res.status(401).json({ success: false, error: "未登录" })
  }

  const sessions = readJSON(SESSIONS_FILE, {})
  const session = sessions[token]
  if (!session) {
    return res.status(401).json({ success: false, error: "登录已过期" })
  }
  if (Date.now() - session.createdAt > SESSION_TTL) {
    delete sessions[token]
    writeJSON(SESSIONS_FILE, sessions)
    return res.status(401).json({ success: false, error: "登录已过期" })
  }

  res.json({ success: true, user: { id: session.id, username: session.username, email: session.email } })
})

app.post("/api/auth/logout", (req, res) => {
  const token = getToken(req)
  if (token) {
    const sessions = readJSON(SESSIONS_FILE, {})
    delete sessions[token]
    writeJSON(SESSIONS_FILE, sessions)
  }
  res.json({ success: true })
})

app.post("/api/auth/reset-password", async (req, res) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ success: false, error: "请输入邮箱" })
  }

  const users = readJSON(USERS_FILE, [])
  const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!found) {
    return res.status(404).json({ success: false, error: "该邮箱未注册" })
  }

  const resetToken = generateToken()
  const resetTokens = readJSON(RESET_TOKENS_FILE, {})
  resetTokens[resetToken] = {
    userId: found.id,
    email: found.email,
    createdAt: Date.now(),
  }
  writeJSON(RESET_TOKENS_FILE, resetTokens)

  const result = await sendResetEmail(found.email, resetToken)

  if (result.success) {
    res.json({
      success: true,
      message: result.devMode
        ? "重置链接已生成（开发模式，请查看服务器日志）"
        : "重置链接已发送到你的邮箱",
    })
  } else {
    delete resetTokens[resetToken]
    writeJSON(RESET_TOKENS_FILE, resetTokens)
    res.status(500).json({ success: false, error: "邮件发送失败，请稍后重试" })
  }
})

app.post("/api/auth/confirm-reset", async (req, res) => {
  const { token, newPassword } = req.body
  if (!token || !newPassword) {
    return res.status(400).json({ success: false, error: "参数不完整" })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: "密码至少需要6个字符" })
  }

  const resetTokens = readJSON(RESET_TOKENS_FILE, {})
  const resetEntry = resetTokens[token]

  if (!resetEntry) {
    return res.status(400).json({ success: false, error: "重置链接无效或已使用" })
  }
  if (Date.now() - resetEntry.createdAt > RESET_TOKEN_TTL) {
    delete resetTokens[token]
    writeJSON(RESET_TOKENS_FILE, resetTokens)
    return res.status(400).json({ success: false, error: "重置链接已过期" })
  }

  const users = readJSON(USERS_FILE, [])
  const userIndex = users.findIndex((u) => u.id === resetEntry.userId)
  if (userIndex === -1) {
    return res.status(404).json({ success: false, error: "用户不存在" })
  }

  users[userIndex].passwordHash = await hashPassword(newPassword)
  writeJSON(USERS_FILE, users)

  delete resetTokens[token]
  writeJSON(RESET_TOKENS_FILE, resetTokens)

  const sessions = readJSON(SESSIONS_FILE, {})
  for (const sessToken of Object.keys(sessions)) {
    if (sessions[sessToken].id === resetEntry.userId) {
      delete sessions[sessToken]
    }
  }
  writeJSON(SESSIONS_FILE, sessions)

  emailLog(`Password reset for user: ${resetEntry.email}`)

  res.json({ success: true, message: "密码重置成功" })
})

function requireAuth(req, res, next) {
  const token = getToken(req)
  if (!token) return res.status(401).json({ success: false, error: "未登录" })
  const sessions = readJSON(SESSIONS_FILE, {})
  const session = sessions[token]
  if (!session) return res.status(401).json({ success: false, error: "登录已过期" })
  if (Date.now() - session.createdAt > SESSION_TTL) {
    delete sessions[token]
    writeJSON(SESSIONS_FILE, sessions)
    return res.status(401).json({ success: false, error: "登录已过期" })
  }
  req.user = session
  next()
}

app.get("/api/studysets", requireAuth, (req, res) => {
  const allSets = readJSON(STUDY_SETS_FILE, [])
  const userSets = allSets.filter((s) => s.userId === req.user.id)
  res.json({ success: true, studySets: userSets })
})

app.put("/api/studysets", requireAuth, (req, res) => {
  const { studySets } = req.body
  if (!Array.isArray(studySets)) {
    return res.status(400).json({ success: false, error: "数据格式错误" })
  }
  const allSets = readJSON(STUDY_SETS_FILE, [])
  const others = allSets.filter((s) => s.userId !== req.user.id)
  const userSets = studySets.map((s) => ({ ...s, userId: req.user.id }))
  const merged = [...others, ...userSets]
  writeJSON(STUDY_SETS_FILE, merged)
  res.json({ success: true })
})

app.listen(PORT, () => {
  cleanupExpired()
  getTransporter()
  console.log(`Auth API server running on port ${PORT}`)
})
