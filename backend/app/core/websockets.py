import json
from typing import List, Dict, Any
from fastapi import WebSocket


class ConnectionManager:
    """
    Manages active WebSocket connections for real-time territory conquest events.
    """

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        """
        Broadcasts a JSON message to all active WebSocket clients.
        """
        payload = json.dumps(message)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)


# Global singleton instance for broadcasting territory events
ws_manager = ConnectionManager()
