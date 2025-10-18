import { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../context/AuthContext";
import Seo from "../components/Seo";
import PageLoader from "../components/PageLoader";

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

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z
          .string({ required_error: t("auth.errors.required") })
          .min(1, t("auth.errors.required"))
          .email(t("auth.errors.invalidEmail")),
        password: z.string({ required_error: t("auth.errors.required") }).min(1, t("auth.errors.required")),
      }),
    [t],
  );

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  const [submitError, setSubmitError] = useState("");

  const onSubmit = async (values) => {
    setSubmitError("");

    try {
      await login(values.email.trim(), values.password);
      const redirect = location.state?.from || "/dashboard";
      navigate(redirect, { replace: true });
    } catch (error) {
      console.error("Login failed", error);
      setSubmitError(t(mapAuthErrorToKey(error.code)));
    }
  };

  if (loading) {
    return <PageLoader labelKey="auth.common.loading" />;
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
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 rounded-3xl border border-slate-200/70 bg-white/70 p-8 shadow-xl backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/70"
      >
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">
            {t("auth.common.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            {...registerField("email", {
              onChange: () => setSubmitError(""),
            })}
            className="w-full rounded-xl border border-slate-300/60 bg-white/90 px-4 py-3 text-sm uppercase tracking-[0.25em] text-slate-900 outline-none transition focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {errors.email ? (
            <p className="text-xs uppercase tracking-[0.3em] text-rose-500">{errors.email.message}</p>
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
            {...registerField("password", {
              onChange: () => setSubmitError(""),
            })}
            className="w-full rounded-xl border border-slate-300/60 bg-white/90 px-4 py-3 text-sm uppercase tracking-[0.25em] text-slate-900 outline-none transition focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {errors.password ? (
            <p className="text-xs uppercase tracking-[0.3em] text-rose-500">{errors.password.message}</p>
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
          disabled={isSubmitting}
        >
          {isSubmitting ? t("auth.common.loading") : t("auth.login.submit")}
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
