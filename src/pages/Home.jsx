import { useTranslation } from "react-i18next";

function Home() {
  const { t } = useTranslation();

  return (
    <section className="space-y-8">
      <h1 className="text-4xl font-black uppercase tracking-[0.5em] text-slate-900 dark:text-white">
        {t("home")}
      </h1>
      <p className="max-w-2xl text-sm uppercase tracking-[0.4em] text-slate-600 dark:text-slate-300">
        Avant-garde visions unfolding in immersive digital canvases. Explore a world of daring colors,
        architectural rhythms, and expressive abstraction shaped for the modern collector.
      </p>
    </section>
  );
}

export default Home;
