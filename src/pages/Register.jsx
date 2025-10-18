import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import Seo from "../components/Seo";

const mapRegisterErrorToKey = (code) => {
  switch (code) {
    case "auth/email-already-in-use":
      return "auth.errors.emailInUse";
    case "auth/weak-password":
      return "auth.errors.passwordLength";
    case "auth/too-many-requests":
      return "auth.errors.tooManyRequests";
    default:
      return "auth.errors.unexpected";
  }
};

function Register() {
  const { t } = useTranslation();
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
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

    if (!form.name.trim()) {
      errors.name = t("auth.errors.required");
    }

    if (!form.email.trim()) {
      errors.email = t("auth.errors.required");
    }

    if (!form.password) {
      errors.password = t("auth.errors.required");
    } else if (form.password.length < 6) {
      errors.password = t("auth.errors.passwordLength");
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = t("auth.errors.required");
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = t("auth.errors.passwordMismatch");
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
      await register({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Registration failed", error);
      setSubmitError(t(mapRegisterErrorToKey(error.code)));
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
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-10">
      <Seo
        titleKey="seo.register.title"
        descriptionKey="seo.register.description"
        keywordsKey="seo.register.keywords"
      />
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.45em] text-teal-400">{t("auth.register.tagline")}</p>
        <h1 className="text-3xl font-black uppercase tracking-[0.45em] text-slate-900 dark:text-white">
          {t("auth.register.title")}
        </h1>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300">
          {t("auth.register.description")}
        </p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200/70 bg-white/70 p-8 shadow-xl backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/70">
        <div className="space-y-2">
          <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">
            {t("auth.common.name")}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300/60 bg-white/90 px-4 py-3 text-sm uppercase tracking-[0.25em] text-slate-900 outline-none transition focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {fieldErrors.name ? (
            <p className="text-xs uppercase tracking-[0.3em] text-rose-500">{fieldErrors.name}</p>
          ) : null}
        </div>
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
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300/60 bg-white/90 px-4 py-3 text-sm uppercase tracking-[0.25em] text-slate-900 outline-none transition focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {fieldErrors.password ? (
            <p className="text-xs uppercase tracking-[0.3em] text-rose-500">{fieldErrors.password}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300"
          >
            {t("auth.common.confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300/60 bg-white/90 px-4 py-3 text-sm uppercase tracking-[0.25em] text-slate-900 outline-none transition focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {fieldErrors.confirmPassword ? (
            <p className="text-xs uppercase tracking-[0.3em] text-rose-500">{fieldErrors.confirmPassword}</p>
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
          {submitting ? t("auth.common.loading") : t("auth.register.submit")}
        </button>
      </form>
      <p className="text-center text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
        {t("auth.register.haveAccount")} {" "}
        <Link to="/login" className="font-semibold text-teal-400 hover:text-teal-300">
          {t("auth.common.goToLogin")}
        </Link>
      </p>
    </section>
  );
}

export default Register;
