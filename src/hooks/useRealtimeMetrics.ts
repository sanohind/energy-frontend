import { useEffect, useRef, useState } from "react";

export type ConnectionStatus = "connecting" | "live" | "disconnected";

export interface MeterData{
  id: string;
  voltage: number | null;
  current: number | null;
  power: number | null;
}

export interface RealtimeMetrics {
  timestamp: string | null;
  meters: MeterData[];
  average:{
    voltage: number | null;
    current: number | null;
    power: number | null;
  };
}

/*interface WsPayload {
  voltage?: number;
  current?: number;
  power?: number;
}*/

const RECONNECT_MS = 3000;

function parseMetric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function useRealtimeMetrics() {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    timestamp: null,
    meters: [],
    average: {
      voltage: null,
      current: null,
      power: null,
    },
  });
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || "ws://10.1.120.189:8765";
    shouldReconnectRef.current = true;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      clearReconnectTimer();
      setStatus("connecting");

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus("live");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          const parsedMeters: MeterData[] = [];
          let totalVoltage = 0, totalCurrent = 0, totalPower = 0;
          let countVoltage = 0, countCurrent = 0, countPower = 0;

          for (const [key, value] of Object.entries(payload)) {
            if (key === "timestamp") continue;

            const meterValue = value as Record<string, unknown>;
            const v = parseMetric(meterValue?.voltage);
            const c = parseMetric(meterValue?.current);
            const p = parseMetric(meterValue?.power);

            parsedMeters.push({ id: key, voltage: v, current: c, power: p });
            if (v !== null) {
              totalVoltage += v;
              countVoltage++;
            }
            if (c !== null) {
              totalCurrent += c;
              countCurrent++;
            }
            if (p !== null) {
              totalPower += p;
              countPower++;
            }
          }

          setMetrics({
            timestamp: payload.timestamp,
            meters: parsedMeters,
            average: {
              voltage: countVoltage > 0 ? Number((totalVoltage / countVoltage).toFixed(2)) : null,
              current: countCurrent > 0 ? Number((totalCurrent / countCurrent).toFixed(2)) : null,
              power: countPower > 0 ? Number((totalPower / countPower).toFixed(2)) : null,
            }
          });
          setStatus("live");
        } catch {
          // Ignore non-JSON frames from the existing gateway.
        }
      };

      ws.onerror = () => {
        setStatus("disconnected");
      };

      ws.onclose = () => {
        setStatus("disconnected");
        socketRef.current = null;
        if (!shouldReconnectRef.current) {
          return;
        }
        reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_MS);
      };
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  return { metrics, status };
}
