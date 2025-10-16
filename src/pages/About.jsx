import { useTranslation } from "react-i18next";

function About() {
  const { t } = useTranslation();

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-black uppercase tracking-[0.45em] text-slate-900 dark:text-white">
        {t("about")}
      </h1>
      <p className="max-w-3xl text-sm uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">
        Biography, manifestos, and press materials will live here. Frame the artist&apos;s journey across
        experimental mediums and the inspirations shaping each collection.
      </p>
    </section>
  );
}

export default About;
