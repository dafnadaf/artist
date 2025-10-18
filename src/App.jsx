import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ThemeContext from "./context/ThemeContext";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import Footer from "./components/Footer";
import PageLoader from "./components/PageLoader";

const Home = lazy(() => import("./pages/Home"));
const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const AdminChats = lazy(() => import("./pages/AdminChats"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const WorkDetails = lazy(() => import("./pages/WorkDetails"));
const CartPage = lazy(() => import("./pages/CartPage"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ArView = lazy(() => import("./pages/ArView"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ServerError = lazy(() => import("./pages/ServerError"));

const THEME_STORAGE_KEY = "artist-theme";

const getInitialTheme = () => {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const location = useLocation();
  const isArRoute = location.pathname.startsWith("/ar-view");
  const { i18n } = useTranslation();

  useEffect(() => {
    const root = window.document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      setTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const lang = i18n.resolvedLanguage || i18n.language || "en";
    document.documentElement.setAttribute("lang", lang);
  }, [i18n.language, i18n.resolvedLanguage]);

  const contextValue = useMemo(
    () => ({
      theme,
      toggleTheme: () =>
        setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <AuthProvider>
        <CartProvider>
          {isArRoute ? (
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/ar-view/:id" element={<ArView />} />
                <Route path="*" element={<ArView />} />
              </Routes>
            </Suspense>
          ) : (
            <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900 transition-colors duration-500 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
              <Navbar />
              <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/catalog" element={<CatalogPage />} />
                    <Route path="/catalog/:id" element={<WorkDetails />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route
                      path="/dashboard"
                      element=
                        {
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        }
                    />
                    <Route
                      path="/dashboard/orders"
                      element=
                        {
                          <ProtectedRoute>
                            <OrderHistory />
                          </ProtectedRoute>
                        }
                    />
                    <Route
                      path="/admin/chats"
                      element=
                        {
                          <ProtectedRoute requireAdmin>
                            <AdminChats />
                          </ProtectedRoute>
                        }
                    />
                    <Route
                      path="/admin/orders"
                      element=
                        {
                          <ProtectedRoute requireAdmin>
                            <AdminOrders />
                          </ProtectedRoute>
                        }
                    />
                    <Route
                      path="/admin/works"
                      element=
                        {
                          <ProtectedRoute requireAdmin>
                            <AdminPanel />
                          </ProtectedRoute>
                        }
                    />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/500" element={<ServerError />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
            </div>
          )}
        </CartProvider>
      </AuthProvider>
    </ThemeContext.Provider>
  );
}

export default App;
