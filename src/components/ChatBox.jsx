import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";
import ChatMessage from "./ChatMessage";

function ChatBox({ chatId, senderRole }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setErrorKey(null);

    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc"),
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const normalized = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            text: data.text,
            sender: data.sender,
            timestamp: data.timestamp ? data.timestamp.toDate() : null,
          };
        });

        setMessages(normalized);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to subscribe to messages", error);
        setErrorKey("subscription");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const hasMessages = messages.length > 0;

  const statusLabel = useMemo(() => {
    if (!chatId) {
      return t("chat.noChat");
    }

    if (loading) {
      return t("chat.loading");
    }

    if (errorKey) {
      return t(`chat.errors.${errorKey}`);
    }

    if (!hasMessages) {
      return t("chat.empty");
    }

    return "";
  }, [chatId, errorKey, hasMessages, loading, t]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!chatId) {
      return;
    }

    const trimmed = inputValue.trim();

    if (!trimmed) {
      return;
    }

    try {
      setSending(true);
      setErrorKey(null);
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: trimmed,
        sender: senderRole,
        timestamp: serverTimestamp(),
      });

      await setDoc(
        doc(db, "chats", chatId),
        {
          lastMessage: trimmed,
          lastSender: senderRole,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setInputValue("");
    } catch (error) {
      console.error("Failed to send message", error);
      setErrorKey("send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 space-y-3 overflow-y-auto rounded-3xl border border-slate-200/70 bg-white/60 p-6 shadow-inner dark:border-slate-800/70 dark:bg-slate-900/60">
        {hasMessages ? (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              text={message.text}
              sender={message.sender}
              timestamp={message.timestamp}
              isOwn={message.sender === senderRole}
            />
          ))
        ) : (
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{statusLabel}</p>
        )}
        <span ref={endRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-3 rounded-full border border-slate-200/70 bg-white/80 p-2 pl-6 shadow-lg dark:border-slate-800/80 dark:bg-slate-950/70">
        <label htmlFor={`chat-input-${chatId || "empty"}`} className="sr-only">
          {t("chat.inputPlaceholder")}
        </label>
        <input
          id={`chat-input-${chatId || "empty"}`}
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={t("chat.inputPlaceholder")}
          disabled={!chatId || sending}
          className="flex-1 bg-transparent text-sm uppercase tracking-[0.3em] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!chatId || sending || !inputValue.trim()}
          className="rounded-full bg-gradient-to-r from-teal-400 via-fuchsia-500 to-amber-400 px-5 py-2 text-xs font-bold uppercase tracking-[0.4em] text-slate-900 shadow-lg shadow-teal-400/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? t("chat.sending") : t("chat.send")}
        </button>
      </form>
      {statusLabel && hasMessages && (
        <p className="text-center text-[0.7rem] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{statusLabel}</p>
      )}
    </div>
  );
}

ChatBox.propTypes = {
  chatId: PropTypes.string,
  senderRole: PropTypes.oneOf(["user", "admin"]).isRequired,
};

ChatBox.defaultProps = {
  chatId: "",
};

export default ChatBox;
