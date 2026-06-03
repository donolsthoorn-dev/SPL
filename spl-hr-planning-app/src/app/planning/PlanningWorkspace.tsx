"use client";

import { useLayoutEffect, useRef, useState } from "react";

const MESSAGE_TYPE = "spl-planning-app";

type Props = {
  iframeSrc: string;
};

function finishLoading(
  setLoading: (value: boolean) => void,
  fallbackTimer: { current: ReturnType<typeof setTimeout> | null },
) {
  setLoading(false);
  if (fallbackTimer.current) {
    clearTimeout(fallbackTimer.current);
    fallbackTimer.current = null;
  }
}

export function PlanningWorkspace({ iframeSrc }: Props) {
  const [loading, setLoading] = useState(true);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useLayoutEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const d = event.data;
      if (!d || d.type !== MESSAGE_TYPE) return;
      if (d.phase === "ready" || d.phase === "error") {
        finishLoading(setLoading, fallbackTimer);
      }
    };

    window.addEventListener("message", onMessage);
    fallbackTimer.current = setTimeout(() => finishLoading(setLoading, fallbackTimer), 25_000);

    return () => {
      window.removeEventListener("message", onMessage);
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    };
  }, []);

  const requestIframeStatus = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: MESSAGE_TYPE, phase: "parent-ready" },
        window.location.origin,
      );
    } catch {
      /* iframe nog niet bereikbaar */
    }
  };

  return (
    <div className="planning-frame-wrap">
      {loading ? (
        <div className="planning-loading-overlay" role="status" aria-live="polite">
          <div className="planning-loading-card">
            <div className="planning-loading-spinner" aria-hidden />
            <p className="planning-loading-title">Planning laden…</p>
            <p className="planning-loading-text">
              Er wordt verbinding gemaakt met de database. Locaties, medewerkers en de gekozen week
              verschijnen zo in de planner.
            </p>
          </div>
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        className="planning-frame"
        title="SPL weekplanning"
        src={iframeSrc}
        onLoad={requestIframeStatus}
      />
    </div>
  );
}
