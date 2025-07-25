import { EventEmitter } from 'events';

export class EventManager extends EventEmitter {
  constructor() {
    super();
    this.eventHistory = [];
    this.maxHistorySize = 1000;
    this.eventStats = new Map();
  }

  emit(eventName, ...args) {
    // Track event statistics
    const stats = this.eventStats.get(eventName) || { count: 0, lastEmitted: null };
    stats.count++;
    stats.lastEmitted = new Date();
    this.eventStats.set(eventName, stats);

    // Store in history
    this.eventHistory.push({
      event: eventName,
      timestamp: new Date(),
      args: args.length
    });

    // Maintain history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    return super.emit(eventName, ...args);
  }

  getEventStats() {
    return Object.fromEntries(this.eventStats);
  }

  getRecentEvents(limit = 10) {
    return this.eventHistory.slice(-limit);
  }

  clearHistory() {
    this.eventHistory = [];
    this.eventStats.clear();
  }

  // Middleware system for events
  use(eventName, middleware) {
    const originalListeners = this.listeners(eventName);
    this.removeAllListeners(eventName);

    this.on(eventName, async (...args) => {
      try {
        const result = await middleware(...args);
        if (result !== false) {
          for (const listener of originalListeners) {
            await listener(...args);
          }
        }
      } catch (error) {
        console.error(`Middleware error for ${eventName}:`, error);
      }
    });
  }
}
