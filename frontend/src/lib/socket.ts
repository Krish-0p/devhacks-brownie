/* ── WebSocket Singleton ── */

type MessageHandler = (data: Record<string, unknown>) => void;

const MAX_RECONNECTS = 5;

class SocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectAttempts = 0;
  private intentionalClose = false;
  private _socketId: string | null = null;
  private _onStatusChange: ((status: 'connected' | 'connecting' | 'disconnected') => void) | null = null;

  get socketId() { return this._socketId; }

  setStatusHandler(handler: (status: 'connected' | 'connecting' | 'disconnected') => void) {
    this._onStatusChange = handler;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.intentionalClose = false;
    this._onStatusChange?.('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this._onStatusChange?.('connected');
    };

    this.ws.onclose = (e) => {
      this._onStatusChange?.('disconnected');

      if (e.code === 4001) {
        // Auth expired — handled by the session expired callback via auth store
        return;
      }

      if (!this.intentionalClose && this.reconnectAttempts < MAX_RECONNECTS) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, ...data } = msg;
        if (type === 'connected') {
          this._socketId = data.socketId as string;
        }
        const typeHandlers = this.handlers.get(type);
        if (typeHandlers) {
          typeHandlers.forEach(h => h(data));
        }
      } catch {
        // ignore malformed messages
      }
    };
  }

  disconnect() {
    this.intentionalClose = true;
    this.ws?.close();
    this.ws = null;
    this._socketId = null;
  }

  send(type: string, data: Record<string, unknown> = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  off(type: string, handler: MessageHandler) {
    this.handlers.get(type)?.delete(handler);
  }
}

export const socket = new SocketClient();
