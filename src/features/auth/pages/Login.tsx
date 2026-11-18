import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import Icon from "../../../components/ui/Icon"
import { ApiError } from "../../../plugins/axios"
import { login } from "../services/authService"
import type { AuthUser } from "../types/auth.type"
import companyLogo from "../../../assets/images/companyLogo.png"

interface LoginProps {
  onLogin: (token: string, user: AuthUser) => void
}

export default function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      const result = await login({ email, password })
      onLogin(result.token, result.user)
      navigate("/", { replace: true })
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to sign in"
      setError(requestError instanceof ApiError
        ? message
        : "We couldn’t reach the sign-in service. Check that the backend is running and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-showcase-glow" />
        <div className="login-brand"><img className="login-company-logo" src={companyLogo} alt="Luminix - Illuminating the Future" /></div>
        <div className="login-promise">
          <div className="login-kicker"><span /> THE SMARTER WAY TO WORK</div>
          <h1>Everything in<br />its <span>right place.</span></h1>
          <p>One calm, clear view of your company’s equipment — from the first request to its next life.</p>
        </div>
        <div className="login-art" aria-hidden="true">
          <div className="login-art-orbit orbit-outer" /><div className="login-art-orbit orbit-inner" />
          <div className="login-glass-card login-glass-main"><span className="glass-icon"><Icon name="laptop" size={25} /></span><span className="glass-main-copy"><small>DEVICE HEALTH</small><strong>All systems ready</strong></span><span className="glass-check"><Icon name="check" size={14} /></span><div className="glass-meter"><i /></div></div>
          <div className="login-glass-card login-glass-float"><span className="glass-avatar">JS</span><span><small>ASSIGNED TO</small><strong>Jordan Smith</strong></span></div>
          <span className="login-art-star star-one"><Icon name="sparkles" size={17} /></span><span className="login-art-star star-two"><Icon name="shield" size={17} /></span>
          <div className="login-art-base"><span /><i /></div>
        </div>
        <div className="login-trust"><span><Icon name="shield" size={14} /> Thoughtful by design</span><span>Inventory clarity for every team</span></div>
      </section>

      <section className="login-form-side">
        <div className="login-form-wrap">
          <div className="login-mobile-brand"><img className="login-company-logo" src={companyLogo} alt="Luminix - Illuminating the Future" /></div>
          <div className="login-heading"><span className="login-welcome-icon"><Icon name="sparkles" size={18} /></span><p>WELCOME BACK</p><h2>Sign in to your workspace</h2><span>Pick up right where your team left off.</span></div>
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="login-error" role="alert"><Icon name="activity" size={17} /><span>{error}</span></div>}
            <label className="login-field"><span>Work email</span><span className="login-input-wrap"><Icon name="users" size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" placeholder="you@company.com" /></span></label>
            <label className="login-field"><span>Password</span><span className="login-input-wrap"><Icon name="shield" size={17} /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" placeholder="Enter your password" /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></span></label>
            <button type="submit" className="login-submit" disabled={loading}>
              {loading
                ? <><span className="spinner spinner-light" /><span>Signing you in...</span></>
                : <><span>Sign in</span><Icon name="arrow-right" size={17} /></>}
            </button>
          </form>
          <div className="login-help"><span className="login-help-icon"><Icon name="shield" size={16} /></span><p><strong>Your workspace, kept secure.</strong><br />Access is managed by your organization’s administrator.</p></div>
          <div className="login-bottom"><span>© {new Date().getFullYear()} OrbitOps</span><span>Secure asset management</span></div>
        </div>
      </section>
    </main>
  )
}
