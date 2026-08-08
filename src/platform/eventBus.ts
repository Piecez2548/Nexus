// Centralized Event Bus (PLT-002): a lightweight app-wide pub/sub so modules
// communicate through events instead of direct imports. Supports publish /
// subscribe, handler priority, async events (publish awaits async handlers),
// a bounded event history, and replay of history to a new subscriber. A
// throwing handler never breaks the others or the publisher.

export interface BusEvent<T = unknown> {
  type: string;
  payload?: T;
  at: number;
  priority?: number;
}

export type EventHandler<T = unknown> = (event: BusEvent<T>) => void | Promise<void>;

interface Subscription {
  handler: EventHandler;
  priority: number;
}

export interface EventBus {
  publish: <T>(type: string, payload?: T, options?: { priority?: number }) => Promise<void>;
  subscribe: <T>(type: string, handler: EventHandler<T>, options?: { priority?: number }) => () => void;
  replay: (type: string, handler: EventHandler) => void;
  history: (type?: string) => BusEvent[];
  clear: () => void;
}

const MAX_HISTORY = 500;

export function createEventBus(maxHistory: number = MAX_HISTORY): EventBus {
  const subscribers = new Map<string, Subscription[]>();
  let events: BusEvent[] = [];

  return {
    async publish(type, payload, options) {
      const event: BusEvent = { type, payload, at: Date.now(), priority: options?.priority };
      events.push(event);
      if (events.length > maxHistory) events = events.slice(events.length - maxHistory);

      // Deliver to exact-type subscribers and wildcard ("*") subscribers,
      // highest priority first.
      const handlers = [...(subscribers.get(type) ?? []), ...(subscribers.get("*") ?? [])].sort(
        (a, b) => b.priority - a.priority,
      );
      for (const { handler } of handlers) {
        try {
          await handler(event);
        } catch {
          // A failing handler must not break the bus.
        }
      }
    },

    subscribe(type, handler, options) {
      const list = subscribers.get(type) ?? [];
      const sub: Subscription = { handler: handler as EventHandler, priority: options?.priority ?? 0 };
      list.push(sub);
      subscribers.set(type, list);
      return () => {
        const current = subscribers.get(type);
        if (current) subscribers.set(type, current.filter((s) => s !== sub));
      };
    },

    replay(type, handler) {
      for (const event of events) {
        if (event.type === type) void handler(event);
      }
    },

    history(type) {
      return type ? events.filter((e) => e.type === type) : [...events];
    },

    clear() {
      events = [];
      subscribers.clear();
    },
  };
}

// App-wide singleton bus.
export const eventBus = createEventBus();
