import { useTranslation } from "react-i18next";

function Contact() {
  const { t } = useTranslation();

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-black uppercase tracking-[0.45em] text-slate-900 dark:text-white">
        {t("contact")}
      </h1>
      <p className="max-w-3xl text-sm uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">
        Contact forms, studio visits, and collaboration inquiries will be anchored here. Connect with the
        atelier to commission bespoke art or to schedule an immersive viewing.
      </p>
    </section>
  );
}

export default Contact;
