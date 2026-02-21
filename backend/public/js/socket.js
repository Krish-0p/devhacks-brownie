// ============================================
// WebSocket Client
// ============================================

const Socket = (() => {
    let ws = null;
    let socketId = null;
    const handlers = {};
    let reconnectAttempts = 0;
    const MAX_RECONNECTS = 5;
    let intentionalClose = false;

    function connect() {
        intentionalClose = false;
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${location.host}/ws`;

        ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('[WS] Connected');
            reconnectAttempts = 0;
            UI.setConnectionStatus('connected');
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type && handlers[msg.type]) {
                    handlers[msg.type].forEach(fn => fn(msg));
                }
            } catch (e) {
                console.error('[WS] Parse error:', e);
            }
        };

        ws.onclose = (event) => {
            console.log('[WS] Disconnected', event.code, event.reason);
            UI.setConnectionStatus('error');

            // 4001 = auth failed
            if (event.code === 4001) {
                App.onSessionExpired();
                return;
            }

            if (!intentionalClose) {
                attemptReconnect();
            }
        };

        ws.onerror = (err) => {
            console.error('[WS] Error:', err);
        };
    }

    function disconnect() {
        intentionalClose = true;
        if (ws) {
            ws.close();
            ws = null;
        }
        socketId = null;
        UI.setConnectionStatus('error');
    }

    function attemptReconnect() {
        if (reconnectAttempts >= MAX_RECONNECTS) {
            UI.showToast('Connection lost. Please refresh the page.');
            return;
        }
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
        setTimeout(connect, delay);
    }

    function send(type, data = {}) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type, ...data }));
        }
    }

    function on(type, callback) {
        if (!handlers[type]) handlers[type] = [];
        handlers[type].push(callback);
    }

    function getSocketId() {
        return socketId;
    }

    function setSocketId(id) {
        socketId = id;
    }

    return { connect, disconnect, send, on, getSocketId, setSocketId };
})();
