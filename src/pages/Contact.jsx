import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";

function Contact() {
  const { t } = useTranslation();

  return (
    <section className="space-y-6">
      <Seo
        titleKey="seo.contact.title"
        descriptionKey="seo.contact.description"
        keywordsKey="seo.contact.keywords"
      />
      <h1 className="text-3xl font-black uppercase tracking-[0.45em] text-slate-900 dark:text-white">
        {t("contact")}
      </h1>
      <p className="max-w-3xl text-sm uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">
        {t("contactPage.description")}
      </p>
    </section>
  );
}

export default Contact;
