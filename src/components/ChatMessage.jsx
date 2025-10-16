import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

function ChatMessage({ text, sender, timestamp, isOwn }) {
  const { t } = useTranslation();
  const timeLabel = timestamp
    ? timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const senderLabel = t(`chat.roles.${sender}`, {
    defaultValue: sender === "admin" ? "Admin" : "Collector",
  });

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm shadow-lg transition-all duration-300 ${
          isOwn
            ? "rounded-br-md bg-gradient-to-br from-teal-400 via-fuchsia-500 to-amber-400 text-slate-900"
            : "rounded-bl-md bg-slate-800/80 text-slate-100"
        }`}
      >
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] opacity-70">
          <span>{senderLabel}</span>
          {timeLabel ? <span>{timeLabel}</span> : null}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-[0.95rem] leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

ChatMessage.propTypes = {
  text: PropTypes.string.isRequired,
  sender: PropTypes.oneOf(["user", "admin"]).isRequired,
  timestamp: PropTypes.instanceOf(Date),
  isOwn: PropTypes.bool,
};

ChatMessage.defaultProps = {
  timestamp: null,
  isOwn: false,
};

export default ChatMessage;
