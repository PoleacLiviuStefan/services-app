// File: components/ScheduleMeeting.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Script from "next/script";
import Head from "next/head";

interface ScheduleMeetingProps {
  providerId: string;
  locale?: string;
}

export default function ScheduleMeeting({
  providerId,
  locale = "ro",
}: ScheduleMeetingProps) {
  const [schedulingUrl, setSchedulingUrl] = useState<string>("");
  const [scriptReady, setScriptReady] = useState(false);

  // 1) Fetch scheduling_url pe baza providerId
  useEffect(() => {
    if (!providerId) return;

    fetch(`/api/calendly/user?providerId=${providerId}`)
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || `Status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setSchedulingUrl(data.scheduling_url);
      })
      .catch((err) => {
        console.error("[Calendly] fetch error:", err);
      });
  }, [providerId]);

  // 2) Ascultăm mesajele postMessage din widget
  const onCalendlyMessage = useCallback(
    (e: MessageEvent) => {
      if (!e.data) return;
      try {
        const msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (
          msg.event === "calendly.event_scheduled" &&
          msg.payload?.event?.uri
        ) {
          const scheduledEventUri: string = msg.payload.event.uri;
          // Trimitem la backend providerId și scheduledEventUri
          fetch("/api/calendly/event-scheduled", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ providerId, scheduledEventUri }),
          })
            .then((r) =>
              r.json().then((j) => ({ status: r.status, body: j }))
            )
            .then(({ status, body }) => {
              if (status >= 400) {
                console.error("[Calendly] backend error:", status, body);
              } else {
                console.log(
                  "[Calendly] backend saved ConsultingSession:",
                  body.data
                );
              }
            })
            .catch((err) =>
              console.error(
                "[Calendly] fetch error to /event-scheduled:",
                err
              )
            );
        }
      } catch {
        // Mesaj nevalid JSON din iframe, ignorăm
      }
    },
    [providerId]
  );

  useEffect(() => {
    window.addEventListener("message", onCalendlyMessage);
    return () => {
      window.removeEventListener("message", onCalendlyMessage);
    };
  }, [onCalendlyMessage]);

  // 3) Inițializăm widget-ul când avem și scriptReady, și schedulingUrl
  useEffect(() => {
    if (!scriptReady || !schedulingUrl) return;

    const params = new URLSearchParams({
      locale,
    }).toString();

    const fullUrl = `${schedulingUrl}?${params}`;
    try {
      ;(window as any).Calendly.initInlineWidget({
        url: fullUrl,
        parentElement: document.getElementById("calendly-inline")!,
      });
    } catch (e) {
      console.error("[Calendly] initInlineWidget error:", e);
    }
  }, [scriptReady, schedulingUrl, locale]);

  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://assets.calendly.com/assets/external/widget.css"
        />
      </Head>

      <div
        style={{
          width: "100%",
          height: "700px",
          border: "2px dashed red",
          position: "relative",
        }}
      >
        {!schedulingUrl && (
          <p style={{ padding: 16 }}>Loading schedulingUrl…</p>
        )}
        {schedulingUrl && !scriptReady && (
          <p style={{ padding: 16 }}>Waiting for Calendly script…</p>
        )}
        <div id="calendly-inline" style={{ width: "100%", height: "100%" }} />
      </div>

      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("[Calendly] widget.js loaded");
          setScriptReady(true);
        }}
        onError={(e) =>
          console.error("[Calendly] widget.js failed to load", e)
        }
      />
    </>
  );
}
