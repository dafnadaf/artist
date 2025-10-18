import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../context/AuthContext";
import Seo from "../components/Seo";
import PageLoader from "../components/PageLoader";

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
  const { register: registerUser, user, loading } = useAuth();
  const navigate = useNavigate();
  const registerSchema = useMemo(
    () =>
      z
        .object({
          name: z.string({ required_error: t("auth.errors.required") }).min(1, t("auth.errors.required")),
          email: z
            .string({ required_error: t("auth.errors.required") })
            .min(1, t("auth.errors.required"))
            .email(t("auth.errors.invalidEmail")),
          password: z
            .string({ required_error: t("auth.errors.required") })
            .min(6, t("auth.errors.passwordLength")),
          confirmPassword: z.string({ required_error: t("auth.errors.required") }).min(1, t("auth.errors.required")),
        })
        .refine((values) => values.password === values.confirmPassword, {
          message: t("auth.errors.passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [t],
  );

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const [submitError, setSubmitError] = useState("");

  const onSubmit = async (values) => {
    setSubmitError("");

    try {
      await registerUser({
        email: values.email.trim(),
        password: values.password,
        name: values.name.trim(),
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Registration failed", error);
      setSubmitError(t(mapRegisterErrorToKey(error.code)));
    }
  };

  if (loading) {
    return <PageLoader labelKey="auth.common.loading" />;
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
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 rounded-3xl border border-slate-200/70 bg-white/70 p-8 shadow-xl backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/70"
      >
        <div className="space-y-2">
          <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">
            {t("auth.common.name")}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            {...registerField("name", {
              onChange: () => setSubmitError(""),
            })}
            className="w-full rounded-xl border border-slate-300/60 bg-white/90 px-4 py-3 text-sm uppercase tracking-[0.25em] text-slate-900 outline-none transition focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {errors.name ? (
            <p className="text-xs uppercase tracking-[0.3em] text-rose-500">{errors.name.message}</p>
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
            autoComplete="new-password"
            {...registerField("password", {
              onChange: () => setSubmitError(""),
            })}
            className="w-full rounded-xl border border-slate-300/60 bg-white/90 px-4 py-3 text-sm uppercase tracking-[0.25em] text-slate-900 outline-none transition focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {errors.password ? (
            <p className="text-xs uppercase tracking-[0.3em] text-rose-500">{errors.password.message}</p>
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
            {...registerField("confirmPassword", {
              onChange: () => setSubmitError(""),
            })}
            className="w-full rounded-xl border border-slate-300/60 bg-white/90 px-4 py-3 text-sm uppercase tracking-[0.25em] text-slate-900 outline-none transition focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {errors.confirmPassword ? (
            <p className="text-xs uppercase tracking-[0.3em] text-rose-500">{errors.confirmPassword.message}</p>
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
          {isSubmitting ? t("auth.common.loading") : t("auth.register.submit")}
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
