import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import Seo from "../components/Seo";

const mapAuthErrorToKey = (code) => {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-email":
    case "auth/user-disabled":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "auth.errors.invalidCredentials";
    case "auth/too-many-requests":
      return "auth.errors.tooManyRequests";
    default:
      return "auth.errors.unexpected";
  }
};

function Login() {
  const { t } = useTranslation();
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const errors = {};

    if (!form.email.trim()) {
      errors.email = t("auth.errors.required");
    }

    if (!form.password) {
      errors.password = t("auth.errors.required");
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validate();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    setSubmitError("");

    try {
      await login(form.email.trim(), form.password);
      const redirect = location.state?.from || "/dashboard";
      navigate(redirect, { replace: true });
    } catch (error) {
      console.error("Login failed", error);
      setSubmitError(t(mapAuthErrorToKey(error.code)));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-600 dark:text-slate-400">
          {t("auth.common.loading")}
        </p>
      </div>
    );
  }

  if (user) {
    const redirect = location.state?.from || "/dashboard";
    return <Navigate to={redirect} replace />;
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-10">
      <Seo
        titleKey="seo.login.title"
        descriptionKey="seo.login.description"
        keywordsKey="seo.login.keywords"
      />
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.45em] text-teal-400">{t("auth.login.tagline")}</p>
        <h1 className="text-3xl font-black uppercase tracking-[0.45em] text-slate-900 dark:text-white">
          {t("auth.login.title")}
        </h1>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300">
          {t("auth.login.description")}
        </p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200/70 bg-white/70 p-8 shadow-xl backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/70">
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">
            {t("auth.common.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300/60 bg-white/90 px-4 py-3 text-sm uppercase tracking-[0.25em] text-slate-900 outline-none transition focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {fieldErrors.email ? (
            <p className="text-xs uppercase tracking-[0.3em] text-rose-500">{fieldErrors.email}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300"
          >
            {t("auth.common.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300/60 bg-white/90 px-4 py-3 text-sm uppercase tracking-[0.25em] text-slate-900 outline-none transition focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {fieldErrors.password ? (
            <p className="text-xs uppercase tracking-[0.3em] text-rose-500">{fieldErrors.password}</p>
          ) : null}
        </div>
        {submitError ? (
          <div className="rounded-xl border border-rose-400/60 bg-rose-50/70 px-4 py-3 text-xs uppercase tracking-[0.3em] text-rose-600 dark:border-rose-500/60 dark:bg-rose-500/10 dark:text-rose-300">
            {submitError}
          </div>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-full bg-gradient-to-r from-teal-400 via-fuchsia-500 to-amber-400 px-6 py-3 text-sm font-bold uppercase tracking-[0.4em] text-slate-900 transition-transform duration-300 hover:scale-[1.02] focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
          disabled={submitting}
        >
          {submitting ? t("auth.common.loading") : t("auth.login.submit")}
        </button>
      </form>
      <p className="text-center text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
        {t("auth.login.noAccount")} {" "}
        <Link to="/register" className="font-semibold text-teal-400 hover:text-teal-300">
          {t("auth.common.goToRegister")}
        </Link>
      </p>
    </section>
  );
}

export default Login;
