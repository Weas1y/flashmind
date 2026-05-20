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
const STUDY_SETS_FILE = join(DATA_DIR, "studysets.json")

const VERIFY_CODE_TTL = 10 * 60 * 1000
const RATE_LIMIT_WINDOW = 60 * 1000

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

const app = express()
app.use(cors())
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
    id: email,
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
  sessions[token] = { id: email, username, email, createdAt: Date.now() }
  writeJSON(SESSIONS_FILE, sessions)

  emailLog(`User registered: ${username} (${email})`)

  res.json({
    success: true,
    user: { id: email, username, email },
    token,
  })
})

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ success: false, error: "请输入用户名和密码" })
  }

  const users = readJSON(USERS_FILE, [])
  const inputLower = username.toLowerCase()
  const found = users.find(
    (u) => u.username.toLowerCase() === inputLower || u.email.toLowerCase() === inputLower
  )

  if (!found) {
    return res.status(401).json({ success: false, error: "账号不存在，请检查输入或先注册" })
  }
  if (!(await verifyPassword(password, found.passwordHash))) {
    return res.status(401).json({ success: false, error: "密码错误，请重试" })
  }

  const token = generateToken()
  const sessions = readJSON(SESSIONS_FILE, {})
  sessions[token] = { id: found.email, username: found.username, email: found.email, createdAt: Date.now() }
  writeJSON(SESSIONS_FILE, sessions)

  res.json({
    success: true,
    user: { id: found.email, username: found.username, email: found.email },
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

app.post("/api/auth/reset-password", (req, res) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ success: false, error: "请输入邮箱" })
  }

  const users = readJSON(USERS_FILE, [])
  const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!found) {
    return res.status(404).json({ success: false, error: "该邮箱未注册" })
  }

  res.json({ success: true })
})

// ========== 学习集 API ==========

function requireAuth(req, res, next) {
  const token = getToken(req)
  if (!token) return res.status(401).json({ success: false, error: "未登录" })
  const sessions = readJSON(SESSIONS_FILE, {})
  const session = sessions[token]
  if (!session) return res.status(401).json({ success: false, error: "登录已过期" })
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