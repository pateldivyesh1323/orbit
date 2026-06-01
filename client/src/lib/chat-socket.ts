"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getApiUrl } from "@/lib/api";

export type ChatSocketStatus = "connecting" | "open" | "closed";

type ChatSocketHandlers = {
  onChunk: (text: string) => void;
  onDone: (content: string) => void;
  onError: (message: string) => void;
  onTool?: (name: string, ok: boolean) => void;
  onNudge?: (content: string, createdAt: string) => void;
};

const RECONNECT_DELAY_MS = 1500;

function toWsUrl(path: string): string {
  return getApiUrl(path).replace(/^http/i, "ws");
}

/**
 * Persistent, auto-reconnecting WebSocket to the chat endpoint. Authenticates
 * with the JWT on connect and dispatches server events to the handlers. The
 * handlers are read from a ref, so callers can pass fresh closures each render
 * without reconnecting.
 */
export function useChatSocket(
  token: string | null,
  handlers: ChatSocketHandlers,
) {
  const [status, setStatus] = useState<ChatSocketStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);

  const connect = useCallback(() => {
    if (!token) return;
    setStatus("connecting");

    const ws = new WebSocket(toWsUrl("/ws/chat"));
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", token }));
    };

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      const h = handlersRef.current;
      switch (msg.type) {
        case "ready":
          setStatus("open");
          break;
        case "chunk":
          h.onChunk(String(msg.text ?? ""));
          break;
        case "tool":
          h.onTool?.(String(msg.name ?? ""), Boolean(msg.ok));
          break;
        case "done":
          h.onDone(String(msg.content ?? ""));
          break;
        case "error":
          h.onError(String(msg.message ?? "Something went wrong"));
          break;
        case "nudge":
          h.onNudge?.(
            String(msg.content ?? ""),
            String(msg.created_at ?? new Date().toISOString()),
          );
          break;
        default:
          break;
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      setStatus("closed");
      if (!intentionalCloseRef.current) {
        reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token]);

  useEffect(() => {
    intentionalCloseRef.current = false;
    connect();
    return () => {
      intentionalCloseRef.current = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback(
    (content: string): boolean => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN && status === "open") {
        ws.send(JSON.stringify({ type: "message", content }));
        return true;
      }
      return false;
    },
    [status],
  );

  return { status, send };
}
