import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { collection, onSnapshot } from "firebase/firestore";
import ChatBox from "../components/ChatBox";
import { useAuth } from "../context/AuthContext";
import { db } from "../services/firebase";

function AdminChats() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedUid, setSelectedUid] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = profile?.role === "admin";

  useEffect(() => {
    if (!isAdmin) {
      setChats([]);
      setLoadingChats(false);
      return undefined;
    }

    setLoadingChats(true);

    const unsubscribe = onSnapshot(
      collection(db, "chats"),
      (snapshot) => {
        const mapped = snapshot.docs
          .map((docSnapshot) => {
            const data = docSnapshot.data();
            return {
              id: docSnapshot.id,
              lastMessage: data.lastMessage || "",
              lastSender: data.lastSender || null,
              updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
            };
          })
          .sort((a, b) => {
            const timeA = a.updatedAt ? a.updatedAt.getTime() : 0;
            const timeB = b.updatedAt ? b.updatedAt.getTime() : 0;
            return timeB - timeA;
          });

        setChats(mapped);
        setLoadingChats(false);
        setError(null);
      },
      (snapshotError) => {
        console.error("Failed to load chats", snapshotError);
        setError("list");
        setLoadingChats(false);
      },
    );

    return () => unsubscribe();
  }, [isAdmin]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = inputValue.trim();

    if (!trimmed) {
      return;
    }

    setSelectedUid(trimmed);
    setInputValue("");
  };

  if (!isAdmin) {
    return (
      <section className="space-y-6">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.45em] text-teal-400">{t("chat.admin.title")}</p>
          <h1 className="text-3xl font-black uppercase tracking-[0.45em] text-slate-900 dark:text-white">{t("chat.admin.accessDeniedHeading")}</h1>
        </header>
        <p className="text-sm uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">{t("chat.admin.notAuthorized")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-10">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.45em] text-teal-400">{t("chat.admin.title")}</p>
        <h1 className="text-3xl font-black uppercase tracking-[0.45em] text-slate-900 dark:text-white">{t("chat.admin.heading")}</h1>
        <p className="max-w-3xl text-sm uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">{t("chat.admin.description")}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)]">
        <aside className="space-y-6 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-xl backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/80">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="admin-chat-select" className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">
                {t("chat.admin.manualLabel")}
              </label>
              <div className="flex gap-2">
                <input
                  id="admin-chat-select"
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder={t("chat.admin.manualPlaceholder")}
                  className="flex-1 rounded-full border border-slate-300/70 bg-transparent px-4 py-2 text-xs uppercase tracking-[0.35em] text-slate-800 outline-none transition focus:border-teal-400 dark:border-slate-700 dark:text-slate-100"
                />
                <button
                  type="submit"
                  className="rounded-full bg-gradient-to-r from-teal-400 via-fuchsia-500 to-amber-400 px-5 py-2 text-xs font-bold uppercase tracking-[0.4em] text-slate-900 shadow-lg shadow-teal-400/30"
                >
                  {t("chat.admin.manualSubmit")}
                </button>
              </div>
            </div>
            <p className="text-[0.7rem] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{t("chat.admin.refreshHint")}</p>
          </form>

          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">{t("chat.admin.listHeading")}</h2>
            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-2">
              {loadingChats ? (
                <p className="text-[0.7rem] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{t("chat.admin.loading")}</p>
              ) : chats.length === 0 ? (
                <p className="text-[0.7rem] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{t("chat.admin.empty")}</p>
              ) : (
                chats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => setSelectedUid(chat.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selectedUid === chat.id
                        ? "border-teal-400 bg-teal-400/20 text-slate-900 dark:text-slate-100"
                        : "border-slate-300/60 bg-white/60 text-slate-700 hover:border-teal-400 hover:text-teal-500 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[0.7rem] uppercase tracking-[0.35em]">
                      <span className="truncate">{chat.id}</span>
                      {chat.updatedAt ? (
                        <span>{chat.updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      ) : null}
                    </div>
                    {chat.lastMessage ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
                        {t("chat.admin.lastMessageFrom", {
                          sender: chat.lastSender
                            ? t(`chat.roles.${chat.lastSender}`, {
                                defaultValue: chat.lastSender === "admin" ? "Admin" : "Collector",
                              })
                            : t("chat.admin.unknownSender"),
                        })}
                      </p>
                    ) : null}
                  </button>
                ))
              )}
              {error ? (
                <p className="text-[0.7rem] uppercase tracking-[0.35em] text-red-500">{t(`chat.errors.${error}`)}</p>
              ) : null}
            </div>
          </div>
        </aside>
        <div className="min-h-[420px] rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-xl backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/80">
          {selectedUid ? (
            <>
              <div className="mb-4 space-y-1">
                <p className="text-xs uppercase tracking-[0.35em] text-teal-400">{t("chat.admin.activeChatLabel")}</p>
                <h2 className="text-lg font-semibold uppercase tracking-[0.4em] text-slate-900 dark:text-white">{selectedUid}</h2>
              </div>
              <ChatBox chatId={selectedUid} senderRole="admin" key={selectedUid} />
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <p className="max-w-sm text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{t("chat.admin.selectPrompt")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminChats;
