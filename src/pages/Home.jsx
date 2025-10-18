import { useTranslation } from "react-i18next";
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
      <h1 className="text-4xl font-black uppercase tracking-[0.5em] text-slate-900 dark:text-white">
        {t("home")}
      </h1>
      <p className="max-w-2xl text-sm uppercase tracking-[0.4em] text-slate-600 dark:text-slate-300">
        {t("homePage.intro")}
      </p>
    </section>
  );
}

export default Home;
