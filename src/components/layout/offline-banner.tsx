"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Online-only app: warn when the browser reports no network. */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950">
      <WifiOff className="h-4 w-4 shrink-0" />
      No internet — reconnect to use the app
    </div>
  );
}
