import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth.js";
import "./AuthPage.css";

const authText = {
  en: {
    signIn: "Sign in",
    signUp: "Create account",
    email: "Email",
    password: "Password",
    name: "Name",
    submitLogin: "Sign in",
    submitSignup: "Create account",
    toggleSignup: "Need an account? Sign up",
    toggleLogin: "Already have an account? Sign in",
    privacyTitle: "Your data, your account",
    privacyBody: "Each user gets a private ledger stored on the server. Sign in from any device to access your transactions.",
    loading: "Checking session…",
    language: "العربية",
    themeDark: "Dark",
    themeLight: "Light",
  },
  ar: {
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    name: "الاسم",
    submitLogin: "دخول",
    submitSignup: "إنشاء حساب",
    toggleSignup: "ليس لديك حساب؟ سجّل الآن",
    toggleLogin: "لديك حساب؟ سجّل الدخول",
    privacyTitle: "بياناتك، حسابك",
    privacyBody: "كل مستخدم له سجل خاص على الخادم. سجّل الدخول من أي جهاز للوصول إلى معاملاتك.",
    loading: "جاري التحقق من الجلسة…",
    language: "English",
    themeDark: "داكن",
    themeLight: "فاتح",
  },
};

function getSavedTheme() {
  const v = localStorage.getItem("finance_theme");
  if (v === "dark" || v === "light") return v;
  return "light";
}

export default function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState("en");
  const [theme, setTheme] = useState(() => getSavedTheme());

  const t = authText[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("finance_theme", theme);
  }, [theme]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await signup({ email, password, name });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`auth-page ${dir}`} dir={dir}>
      <div className="auth-shell">
        <div className="auth-hero">
          <h1>FlowSpend</h1>
          <p className="auth-hero-sub">{t.privacyTitle}</p>
          <p className="auth-hero-body">{t.privacyBody}</p>
        </div>

        <div className="auth-card">
          <div className="auth-card-head">
            <h2>{mode === "login" ? t.signIn : t.signUp}</h2>
            <div className="auth-card-actions">
              <button
                type="button"
                className="theme-btn"
                onClick={() => setTheme(isDark ? "light" : "dark")}
              >
                {isDark ? t.themeLight : t.themeDark}
              </button>
              <button type="button" className="lang-btn" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
                {t.language}
              </button>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label>
                <span>{t.name}</span>
                <input
                  type="text"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
            ) : null}

            <label>
              <span>{t.email}</span>
              <input
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              <span>{t.password}</span>
              <input
                type="password"
                value={password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {error ? <p className="error-message">{error}</p> : null}

            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? "…" : mode === "login" ? t.submitLogin : t.submitSignup}
            </button>
          </form>

          <button
            type="button"
            className="auth-toggle"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
          >
            {mode === "login" ? t.toggleSignup : t.toggleLogin}
          </button>
        </div>
      </div>
    </div>
  );
}
