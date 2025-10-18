import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const SOCIAL_ICONS = {
  instagram: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  ),
  behance: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <path d="M4 7.25h4.25a2.75 2.75 0 0 1 0 5.5H4z" />
      <path d="M8.25 12.75A2.75 2.75 0 0 1 8.25 18H4v-5.25z" />
      <path d="M13.75 13.75c0-2.75 3.75-2.74 3.75 0" />
      <path d="M13.75 13.75V18h3.75" />
      <path d="M13.25 7.25h4.5" />
    </svg>
  ),
  dribbble: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M4.5 14.5c3.5-1.25 7.5-1 11.25 1.75" />
      <path d="M7 6.75c3 .75 5.75 3.25 7.5 7.25" />
      <path d="M14 4.5c1.75 3 2.5 6.25 2.75 10.5" />
    </svg>
  ),
};

function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const socials = useMemo(
    () => [
      {
        id: "instagram",
        href: "https://instagram.com/avantart.studio",
        label: t("footer.social.instagram"),
      },
      {
        id: "behance",
        href: "https://www.behance.net/avantart-studio",
        label: t("footer.social.behance"),
      },
      {
        id: "dribbble",
        href: "https://dribbble.com/avantart",
        label: t("footer.social.dribbble"),
      },
    ],
    [t],
  );

  return (
    <footer className="mt-auto border-t border-slate-200/60 bg-white/70 text-slate-700 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-950/70 dark:text-slate-300">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-400">{t("footer.crafted")}</p>
          <p className="text-2xl font-black uppercase tracking-[0.4em] text-slate-900 dark:text-slate-100">
            {t("footer.artist")}
          </p>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t("footer.signature")}</p>
        </div>
        <div className="flex flex-col items-start gap-4 md:items-end">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            {t("footer.follow")}
          </p>
          <div className="flex items-center gap-4">
            {socials.map((social) => {
              const Icon = SOCIAL_ICONS[social.id];

              return (
                <a
                  key={social.id}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.label}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300/60 bg-white/60 text-slate-700 transition hover:border-teal-400 hover:text-teal-400 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-teal-400 dark:hover:text-teal-300"
                >
                  {Icon ? <Icon className="h-5 w-5" /> : null}
                </a>
              );
            })}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200/60 bg-white/60 px-6 py-5 text-center text-[0.65rem] uppercase tracking-[0.3em] text-slate-500 dark:border-slate-800/60 dark:bg-slate-950/60 dark:text-slate-500">
        {t("footer.rights", { year: currentYear })}
      </div>
    </footer>
  );
}

export default Footer;
