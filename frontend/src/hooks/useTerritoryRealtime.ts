import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { TerritoryGeoJSONCollection } from '../types';

interface RealtimeTerritoryEvent {
  event: 'territory_claimed' | 'zone_defended' | 'zone_lost';
  zone_name: string;
  area_km2: number;
  owner_username: string;
  owner_color: string;
  coordinates?: number[][];
}

export function useTerritoryRealtime(
  onTerritoryClaimed?: (event: RealtimeTerritoryEvent) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const wsUrl = ((import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8000/api/v1') + '/territories/ws';

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (message) => {
          try {
            const data: RealtimeTerritoryEvent = JSON.parse(message.data);
            if (data.event === 'territory_claimed') {
              toast.success(
                `Sector claimed by ${data.owner_username}: +${data.area_km2.toFixed(3)} km² (${data.zone_name})`,
                {
                  duration: 5000,
                  style: {
                    borderLeft: `4px solid ${data.owner_color || '#B8492E'}`,
                  },
                }
              );
              if (onTerritoryClaimed) {
                onTerritoryClaimed(data);
              }
            }
          } catch (e) {
            // Ignore unparsed non-json heartbeats
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Auto reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [onTerritoryClaimed]);

  return { isConnected };
}
