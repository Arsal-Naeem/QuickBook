import { useEffect, useState } from "react";
import {
  LuCheck,
  LuRefreshCw,
  LuUnplug,
  LuLogOut,
  LuLoader,
} from "react-icons/lu";

export default function QBOConnectionStatus({ onError }) {
  const [qboStatus, setQboStatus] = useState("loading"); // 'loading', 'connected', 'not_connected', 'needs_reconnect'
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/qbo/status");
        const data = await res.json();
        setQboStatus(data.status || "not_connected");
      } catch (err) {
        setQboStatus("not_connected");
      }
    };
    fetchStatus();
  }, []);

  const resetConnection = () => {
    window.location.href = "http://localhost:8000/qbo/authUri";
  };

  const handleRefreshTokens = async () => {
    setIsRefreshing(true);
    if (onError) onError("");

    try {
      const response = await fetch("/api/qbo/refresh", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        setQboStatus("connected");
      } else {
        setQboStatus("needs_reconnect");
        resetConnection();
      }
    } catch (error) {
      if (onError)
        onError("Failed to communicate with the server to refresh tokens.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusConfig = () => {
    switch (qboStatus) {
      case "connected":
        return {
          title: "Connected",
          desc: "Your QuickBooks connection is active.",
          colorClass:
            "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
          icon: null,
        };
      case "needs_reconnect":
        return {
          title: "Needs Reconnection",
          desc: "Your session expired or was revoked. Please sign in again.",
          colorClass: "text-rose-400 bg-rose-400/10 border-rose-400/30",
          icon: <LuUnplug className="h-4 w-4" />,
        };
      case "not_connected":
        return {
          title: "Not Connected",
          desc: "You have not connected a QuickBooks account yet.",
          colorClass: "text-amber-400 bg-amber-400/10 border-amber-400/30",
          icon: <LuUnplug className="h-4 w-4" />,
        };
      case "loading":
      default:
        return {
          title: "Checking Status...",
          desc: "Verifying your QuickBooks connection.",
          colorClass: "text-slate-400 bg-slate-400/10 border-slate-400/30",
          icon: <LuLoader className="h-4 w-4 animate-spin" />,
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <section
      className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-3xl border px-6 py-5 shadow-lg backdrop-blur-sm transition-all ${statusConfig.colorClass}`}
    >
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          {qboStatus === "connected" && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          )}
          {statusConfig.icon}
          {statusConfig.title}
        </h2>
        <p className="mt-1 text-sm opacity-80">{statusConfig.desc}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        {qboStatus === "connected" && (
          <button
            type="button"
            onClick={handleRefreshTokens}
            disabled={isRefreshing}
            className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-black/20 hover:bg-black/40 px-5 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50"
          >
            <LuRefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : "group-hover:rotate-180 transition-transform"}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh Tokens"}
          </button>
        )}
        <button
          type="button"
          onClick={resetConnection}
          className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-200"
        >
          <LuLogOut className="h-4 w-4" />
          {qboStatus === "connected" ? "Reset Connection" : "Sign In to QB"}
        </button>
      </div>
    </section>
  );
}
