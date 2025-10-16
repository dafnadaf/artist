import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AdminWorkList from "../components/AdminWorkList";
import WorkForm from "../components/WorkForm";
import normalizeWork from "../utils/normalizeWork";
import {
  createWork,
  deleteWork,
  fetchWorks,
  updateWork,
} from "../services/worksApi";

const DEFAULT_CATEGORIES = ["painting", "print", "sculpture", "digital", "installation", "mixedMedia"];

function AdminPanel() {
  const { t, i18n } = useTranslation();
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("list");
  const [selectedWork, setSelectedWork] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadWorks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchWorks();
      setWorks(data);
    } catch (loadError) {
      console.error("Failed to load works", loadError);
      setError(t("adminWorksPage.errors.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadWorks();
  }, [loadWorks]);

  useEffect(() => {
    if (!feedback) {
      return undefined;
    }

    const timeout = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const categories = useMemo(() => {
    const fromWorks = works.map((work) => work.category).filter(Boolean);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...fromWorks]));
  }, [works]);

  const handleCreateClick = () => {
    setSelectedWork(null);
    setMode("create");
  };

  const handleEdit = (work) => {
    setSelectedWork(normalizeWork(work));
    setMode("edit");
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError("");

    try {
      if (mode === "edit" && selectedWork) {
        const updated = await updateWork(selectedWork.id, payload);
        setWorks((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
        showFeedback("success", t("adminWorksPage.notifications.updateSuccess"));
      } else {
        const created = await createWork(payload);
        setWorks((previous) => [created, ...previous]);
        showFeedback("success", t("adminWorksPage.notifications.createSuccess"));
      }
      setMode("list");
      setSelectedWork(null);
    } catch (submitError) {
      console.error("Failed to submit work", submitError);
      showFeedback("error", t("adminWorksPage.notifications.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (work) => {
    const confirmed = window.confirm(t("adminWorksPage.list.confirmDelete", { title: work.title?.[i18n.language] ?? "" }));

    if (!confirmed) {
      return;
    }

    try {
      await deleteWork(work.id);
      setWorks((previous) => previous.filter((item) => item.id !== work.id));
      showFeedback("success", t("adminWorksPage.notifications.deleteSuccess"));
    } catch (deleteError) {
      console.error("Failed to delete work", deleteError);
      showFeedback("error", t("adminWorksPage.notifications.error"));
    }
  };

  const handleCancel = () => {
    setMode("list");
    setSelectedWork(null);
  };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.4em] text-teal-400">
          {t("adminWorksPage.tagline")}
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-4xl font-black uppercase tracking-[0.25em] text-slate-900 dark:text-slate-100">
            {t("adminWorksPage.title")}
          </h1>
          {mode === "list" ? (
            <button
              type="button"
              onClick={handleCreateClick}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-400/60 bg-teal-400/10 px-6 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-teal-400 transition hover:bg-teal-400/20 dark:bg-teal-400/20 dark:text-teal-200 dark:hover:bg-teal-400/30"
            >
              {t("adminWorksPage.actions.add")}
            </button>
          ) : null}
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {t("adminWorksPage.description")}
        </p>
      </header>

      {feedback ? (
        <div
          className={`rounded-full border px-5 py-3 text-xs font-semibold uppercase tracking-[0.35em] ${
            feedback.type === "success"
              ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400"
              : "border-rose-400/60 bg-rose-400/10 text-rose-400"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-400/60 bg-rose-400/10 p-6 text-sm font-semibold uppercase tracking-[0.3em] text-rose-400">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            {t("adminWorksPage.loading")}
          </p>
        </div>
      ) : null}

      {!loading && mode === "list" ? (
        <AdminWorkList works={works} onEdit={handleEdit} onDelete={handleDelete} />
      ) : null}

      {!loading && mode !== "list" ? (
        <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-8 shadow-xl dark:border-slate-800/60 dark:bg-slate-900/60">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            {mode === "edit" ? t("adminWorksPage.form.editHeading") : t("adminWorksPage.form.createHeading")}
          </h2>
          <WorkForm
            initialData={mode === "edit" ? selectedWork : null}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitting={submitting}
            categoryOptions={categories}
          />
        </div>
      ) : null}
    </div>
  );
}

export default AdminPanel;
