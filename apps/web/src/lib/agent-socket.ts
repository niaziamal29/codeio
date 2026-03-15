/**
 * WebSocket client for real-time agent communication.
 *
 * Handles connection, reconnection with exponential backoff,
 * message queuing during disconnects, and event dispatching.
 */

export type AgentEvent =
  | { type: "status"; status: "running" | "paused" | "complete" | "error" }
  | { type: "step"; description: string }
  | { type: "message"; role: "agent" | "system"; content: string }
  | { type: "checkpoint"; data: {
      id: string;
      summary: string;
      screenshotUrl?: string;
      qaStatus: "pending" | "passed" | "failed";
      gitCommitSha: string;
    }}
  | { type: "file_update"; path: string; content: string }
  | { type: "terminal_output"; data: string }
  | { type: "error"; message: string }
  | { type: "pong" };

type EventHandler = (event: AgentEvent) => void;

export class AgentSocket {
  private ws: WebSocket | null = null;
  private handlers: Set<EventHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private sessionId: string;
  private messageQueue: string[] = [];
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  connect(authToken?: string) {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000")
      .replace("http", "ws");

    const url = authToken
      ? `${wsUrl}/ws/sessions/${this.sessionId}?token=${authToken}`
      : `${wsUrl}/ws/sessions/${this.sessionId}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log(`[AgentSocket] Connected to session ${this.sessionId}`);
      this.reconnectAttempts = 0;

      // Flush queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        if (msg) this.ws?.send(msg);
      }

      // Start heartbeat
      this.heartbeatInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed: AgentEvent = JSON.parse(event.data);
        if (parsed.type === "pong") return; // Heartbeat response
        this.handlers.forEach((handler) => handler(parsed));
      } catch (err) {
        console.error("[AgentSocket] Failed to parse message:", err);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[AgentSocket] Disconnected (code: ${event.code})`);
      this.stopHeartbeat();

      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        console.log(`[AgentSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(authToken), delay);
      }
    };

    this.ws.onerror = (error) => {
      console.error("[AgentSocket] Error:", error);
    };
  }

  onEvent(handler: EventHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(message: object) {
    const serialized = JSON.stringify(message);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(serialized);
    } else {
      this.messageQueue.push(serialized);
    }
  }

  disconnect() {
    this.maxReconnectAttempts = 0;
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
    this.handlers.clear();
    this.messageQueue = [];
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
