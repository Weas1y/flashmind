import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Sparkles, AlertCircle, Eye, EyeOff, Check, ArrowRight, Mail, Clock, ShieldCheck } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"

type Mode = "login" | "register" | "forgot"

interface FormErrors {
  username?: string
  email?: string
  password?: string
  verifyCode?: string
}

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: "", color: "" }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  if (score <= 1) return { level: 1, label: "弱", color: "bg-red-500" }
  if (score <= 2) return { level: 2, label: "弱", color: "bg-orange-400" }
  if (score <= 3) return { level: 3, label: "中", color: "bg-yellow-500" }
  if (score <= 4) return { level: 4, label: "强", color: "bg-green-400" }
  return { level: 5, label: "很强", color: "bg-green-500" }
}

export default function LoginPage() {
  const { login, register, resetPassword, sendVerification } = useAuth()
  const navigate = useNavigate()
  const verifyInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<Mode>("login")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")

  const [verificationSent, setVerificationSent] = useState(false)
  const [verifyCode, setVerifyCode] = useState("")
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [devModeNotice, setDevModeNotice] = useState("")

  const strength = getPasswordStrength(password)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  useEffect(() => {
    if (verificationSent && verifyInputRef.current) {
      verifyInputRef.current.focus()
    }
  }, [verificationSent])

  function validate(): boolean {
    const errs: FormErrors = {}
    if (mode === "register") {
      if (!username.trim() || username.trim().length < 2) {
        errs.username = "用户名至少2个字符"
      }
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errs.email = "请输入有效的邮箱地址"
      }
      if (!password) {
        errs.password = "请输入密码"
      } else if (password.length < 6) {
        errs.password = "密码至少6个字符"
      }
      if (verificationSent && !verifyCode.trim()) {
        errs.verifyCode = "请输入验证码"
      }
    }
    if (mode !== "forgot") {
      if (mode === "login" && !username.trim()) {
        errs.username = "请输入用户名或邮箱"
      }
      if (mode === "login" && !password) {
        errs.password = "请输入密码"
      }
    } else {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errs.email = "请输入有效的邮箱地址"
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSendCode(e: React.MouseEvent) {
    e.preventDefault()
    setServerError("")
    setSuccessMsg("")
    setDevModeNotice("")

    const errs: FormErrors = {}
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "请输入有效的邮箱地址"
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSendingCode(true)
    try {
      const result = await sendVerification(email.trim())
      if (result.success) {
        setVerificationSent(true)
        setSuccessMsg(result.message || "验证码已发送")
        if (result.devMode) {
          setDevModeNotice("开发模式：请查看服务器日志获取验证码")
        }
        setCountdown(60)
        setVerifyCode("")
        setErrors({})
      } else {
        setServerError(result.error || "发送失败")
        if (result.retryAfter) {
          setCountdown(result.retryAfter)
        }
      }
    } finally {
      setSendingCode(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError("")
    setSuccessMsg("")
    if (!validate()) return

    setLoading(true)
    try {
      if (mode === "login") {
        const result = await login(username.trim(), password, remember)
        if (result.success) {
          navigate("/", { replace: true })
        } else {
          setServerError(result.error || "登录失败")
        }
      } else if (mode === "register") {
        const result = await register(username.trim(), email.trim(), password, verifyCode.trim())
        if (result.success) {
          navigate("/", { replace: true })
        } else {
          setServerError(result.error || "注册失败")
        }
      } else {
        const result = await resetPassword(email.trim())
        if (result.success) {
          setSuccessMsg("密码重置链接已发送到你的邮箱（演示模式）")
        } else {
          setServerError(result.error || "发送失败")
        }
      }
    } finally {
      setLoading(false)
    }
  }

  function switchMode(newMode: Mode) {
    setMode(newMode)
    setErrors({})
    setServerError("")
    setSuccessMsg("")
    setPassword("")
    setVerificationSent(false)
    setVerifyCode("")
    setCountdown(0)
    setDevModeNotice("")
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 font-display mb-2">
            {mode === "login" ? "欢迎回来" : mode === "register" ? "创建账号" : "重置密码"}
          </h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm">
            {mode === "login"
              ? "登录你的 FlashMind 账号继续学习"
              : mode === "register"
              ? "注册一个新账号开始学习之旅"
              : "输入邮箱地址接收密码重置链接"}
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  用户名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErrors((prev) => ({ ...prev, username: undefined })) }}
                  placeholder="输入用户名"
                  className={`input-field ${errors.username ? "!border-red-300 !ring-red-200" : ""}`}
                  autoComplete="username"
                />
                {errors.username && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.username}
                  </p>
                )}
              </div>
            )}

            {(mode === "login" || mode === "forgot") && (
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  {mode === "forgot" ? "邮箱" : "用户名 / 邮箱"}
                </label>
                <input
                  type={mode === "forgot" ? "email" : "text"}
                  value={mode === "forgot" ? email : username}
                  onChange={(e) => {
                    if (mode === "forgot") {
                      setEmail(e.target.value)
                      setErrors((prev) => ({ ...prev, email: undefined }))
                    } else {
                      setUsername(e.target.value)
                      setErrors((prev) => ({ ...prev, username: undefined }))
                    }
                  }}
                  placeholder={mode === "forgot" ? "输入注册邮箱" : "输入用户名或邮箱"}
                  className={`input-field ${(errors.username || errors.email) ? "!border-red-300 !ring-red-200" : ""}`}
                  autoComplete={mode === "forgot" ? "email" : "username"}
                />
                {(errors.username || errors.email) && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.username || errors.email}
                  </p>
                )}
              </div>
            )}

            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  邮箱
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })) }}
                  placeholder="example@email.com"
                  className={`input-field ${errors.email ? "!border-red-300 !ring-red-200" : ""}`}
                  autoComplete="email"
                  disabled={verificationSent}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.email}
                  </p>
                )}
              </div>
            )}

            {mode !== "forgot" && (
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: undefined })) }}
                    placeholder={mode === "register" ? "至少6位字符" : "输入密码"}
                    className={`input-field pr-10 ${errors.password ? "!border-red-300 !ring-red-200" : ""}`}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.password}
                  </p>
                )}
                {mode === "register" && password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strength.color} rounded-full transition-all duration-300`}
                          style={{ width: `${strength.level * 20}%` }}
                        />
                      </div>
                      <span className="text-xs text-surface-400 dark:text-surface-500 min-w-[28px]">{strength.label}</span>
                    </div>
                    <p className="text-xs text-surface-400 dark:text-surface-500">
                      {strength.level <= 2 && "密码太弱，建议使用大小写字母、数字和符号组合"}
                      {strength.level === 3 && "密码强度一般，可以添加特殊字符增强"}
                      {strength.level >= 4 && "密码强度不错！"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {mode === "register" && verificationSent && (
              <div className="bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700 rounded-xl p-4 animate-float-up">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-brand-500" />
                  <span className="text-sm font-medium text-brand-700 dark:text-brand-300">邮箱验证</span>
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
                  验证码已发送至 <span className="font-medium text-surface-700 dark:text-surface-300">{email}</span>
                </p>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  验证码
                </label>
                <input
                  ref={verifyInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                    setVerifyCode(val)
                    setErrors((prev) => ({ ...prev, verifyCode: undefined }))
                  }}
                  placeholder="输入6位验证码"
                  className={`input-field text-center text-lg tracking-[0.3em] ${errors.verifyCode ? "!border-red-300 !ring-red-200" : ""}`}
                  autoComplete="one-time-code"
                />
                {errors.verifyCode && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.verifyCode}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  {devModeNotice && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {devModeNotice}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendingCode || countdown > 0}
                    className="text-xs text-brand-500 dark:text-brand-400 hover:text-brand-600 font-medium disabled:text-surface-300 dark:disabled:text-surface-600 ml-auto"
                  >
                    {sendingCode ? (
                      <span className="flex items-center gap-1">发送中...</span>
                    ) : countdown > 0 ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {countdown}s 后重发
                      </span>
                    ) : (
                      "重新发送"
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-surface-300 text-brand-500 dark:text-brand-400 focus:ring-brand-300"
                  />
                  <span className="text-sm text-surface-500 dark:text-surface-400">记住我</span>
                </label>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-sm text-brand-500 dark:text-brand-400 hover:text-brand-600 font-medium"
                >
                  忘记密码？
                </button>
              </div>
            )}

            {serverError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {serverError}
              </div>
            )}

            {successMsg && !verificationSent && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 text-green-600 text-sm">
                <Check className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}

            {mode === "register" && !verificationSent ? (
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {sendingCode ? (
                  "发送中..."
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    发送验证码
                  </>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading
                  ? "处理中..."
                  : mode === "login"
                  ? "登录"
                  : mode === "register"
                  ? "注册"
                  : "发送重置链接"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            )}
          </form>

          <div className="mt-6 text-center">
            {mode === "login" && (
              <p className="text-sm text-surface-500 dark:text-surface-400">
                还没有账号？{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="text-brand-500 dark:text-brand-400 hover:text-brand-600 font-medium"
                >
                  立即注册
                </button>
              </p>
            )}
            {mode === "register" && (
              <p className="text-sm text-surface-500 dark:text-surface-400">
                已有账号？{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-brand-500 dark:text-brand-400 hover:text-brand-600 font-medium"
                >
                  立即登录
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-sm text-brand-500 dark:text-brand-400 hover:text-brand-600 font-medium"
              >
                返回登录
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-surface-400 dark:text-surface-500 mt-6">
          登录即表示你同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  )
}