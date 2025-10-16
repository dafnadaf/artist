import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const baseNavItems = [
  { path: "/", key: "home" },
  { path: "/catalog", key: "catalog" },
  { path: "/about", key: "about" },
  { path: "/contact", key: "contact" },
  { path: "/dashboard", key: "dashboard", requiresAuth: true },
  { path: "/dashboard/orders", key: "myOrders", requiresAuth: true },
  { path: "/admin/chats", key: "adminChats", requiresAuth: true, requiresAdmin: true },
  { path: "/admin/orders", key: "adminOrders", requiresAuth: true, requiresAdmin: true },
  { path: "/admin/works", key: "adminWorks", requiresAuth: true, requiresAdmin: true },
  { path: "/cart", key: "cart" },
];

const linkClasses = ({ isActive }) =>
  `group relative inline-flex items-center justify-center px-3 py-1 text-sm font-semibold uppercase tracking-[0.3em] transition-all duration-300 ${
    isActive
      ? "text-teal-400"
      : "text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
  }`;

function Navbar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { items } = useCart();
  const { user, profile, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const navItems = useMemo(
    () =>
      baseNavItems.filter((item) => {
        if (item.requiresAuth && !user) {
          return false;
        }

        if (item.requiresAdmin && profile?.role !== "admin") {
          return false;
        }

        return true;
      }),
    [profile?.role, user],
  );

  const identityLabel = useMemo(() => {
    if (profile?.name) {
      return profile.name;
    }

    if (user?.displayName) {
      return user.displayName;
    }

    return user?.email || "";
  }, [profile?.name, user?.displayName, user?.email]);

  const handleToggleMenu = () => setOpen((prev) => !prev);

  const handleNavigate = () => setOpen(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <NavLink
          to="/"
          onClick={handleNavigate}
          className="flex items-center gap-2 text-lg font-black uppercase tracking-[0.5em] text-slate-900 transition-colors hover:text-teal-500 dark:text-slate-100"
        >
          <span className="h-3 w-3 bg-gradient-to-br from-teal-400 via-fuchsia-500 to-amber-400 shadow-lg"></span>
          AvantArt
        </NavLink>
        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={linkClasses} onClick={handleNavigate}>
              <span className="flex items-center gap-2">
                {t(item.key)}
                {item.key === "cart" && itemCount > 0 ? (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-teal-400 px-2 text-[0.65rem] font-black leading-none text-slate-900">
                    {itemCount}
                  </span>
                ) : null}
              </span>
              <span className="absolute inset-x-0 bottom-0 h-0.5 scale-x-0 transform bg-gradient-to-r from-teal-400 via-fuchsia-500 to-amber-400 transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          <ThemeToggle />
          <LanguageSwitcher />
          {user ? (
            <>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">
                {identityLabel ? t("auth.common.signedInAs", { name: identityLabel }) : t("auth.common.account")}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-full border border-slate-300/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-800 transition hover:border-teal-400 hover:text-teal-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-100 dark:hover:border-teal-500"
              >
                {t("auth.common.logout")}
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-700 transition hover:text-teal-500 dark:text-slate-200"
              >
                {t("auth.nav.login")}
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-full bg-gradient-to-r from-teal-400 via-fuchsia-500 to-amber-400 px-4 py-2 text-xs font-bold uppercase tracking-[0.4em] text-slate-900 shadow-lg shadow-teal-400/30"
              >
                {t("auth.nav.register")}
              </NavLink>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleToggleMenu}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/70 bg-white text-slate-800 transition hover:border-teal-400 hover:text-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-500 lg:hidden"
          aria-label="Toggle navigation"
        >
          <span className="sr-only">Toggle navigation</span>
          <div className="space-y-1.5">
            <span
              className={`block h-0.5 w-6 transform rounded-full bg-current transition duration-300 ${open ? "translate-y-1.5 rotate-45" : ""}`}
            />
            <span
              className={`block h-0.5 w-6 transform rounded-full bg-current transition duration-300 ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-0.5 w-6 transform rounded-full bg-current transition duration-300 ${open ? "-translate-y-1.5 -rotate-45" : ""}`}
            />
          </div>
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-200/60 bg-white/90 px-6 py-4 shadow-lg dark:border-slate-800/80 dark:bg-slate-950/90 lg:hidden">
          <nav className="flex flex-col gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between gap-4 text-base font-semibold uppercase tracking-[0.4em] ${
                    isActive
                      ? "text-teal-400"
                      : "text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                  }`
                }
                onClick={handleNavigate}
              >
                <span>{t(item.key)}</span>
                {item.key === "cart" && itemCount > 0 ? (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-teal-400 px-2 text-[0.65rem] font-black leading-none text-slate-900">
                    {itemCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
          <div className="mt-6 space-y-4">
            {user ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">
                  {identityLabel ? t("auth.common.signedInAs", { name: identityLabel }) : t("auth.common.account")}
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full rounded-full border border-slate-300/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-800 transition hover:border-teal-400 hover:text-teal-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-100 dark:hover:border-teal-500"
                >
                  {t("auth.common.logout")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <NavLink
                  to="/login"
                  className="rounded-full border border-slate-300/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-800 transition hover:border-teal-400 hover:text-teal-500 dark:border-slate-700 dark:text-slate-100 dark:hover:border-teal-500"
                  onClick={handleNavigate}
                >
                  {t("auth.nav.login")}
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-full bg-gradient-to-r from-teal-400 via-fuchsia-500 to-amber-400 px-4 py-3 text-xs font-bold uppercase tracking-[0.4em] text-slate-900 shadow-lg shadow-teal-400/30"
                  onClick={handleNavigate}
                >
                  {t("auth.nav.register")}
                </NavLink>
              </div>
            )}
            <div className="flex items-center justify-between">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
