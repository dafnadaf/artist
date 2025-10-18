import { useTranslation } from "react-i18next";
import { motion as Motion } from "framer-motion";
import Seo from "../components/Seo";

function Home() {
  const { t } = useTranslation();

  return (
    <section className="space-y-8">
      <Seo
        titleKey="seo.home.title"
        descriptionKey="seo.home.description"
        keywordsKey="seo.home.keywords"
      />
      <Motion.h1
        className="text-4xl font-black uppercase tracking-[0.5em] text-slate-900 dark:text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {t("home")}
      </Motion.h1>
      <Motion.p
        className="max-w-2xl text-sm uppercase tracking-[0.4em] text-slate-600 dark:text-slate-300"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
      >
        {t("homePage.intro")}
      </Motion.p>
    </section>
  );
}

export default Home;
