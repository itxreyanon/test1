import { GraphQLSubscriptions, SkywalkerSubscriptions } from 'instagram_mqtt';

export class RealtimeHandler {
  constructor(ig) {
    this.ig = ig;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    console.log('🔄 Connecting to Instagram realtime...');
    
    try {
      // Set up event listeners before connecting
      this.setupEventListeners();

      // Get initial data for message sync
      const directInbox = await this.ig.feed.directInbox().request();

      // Connect with subscriptions
      await this.ig.realtime.connect({
        graphQlSubs: [
          GraphQLSubscriptions.getAppPresenceSubscription(),
          GraphQLSubscriptions.getDirectStatusSubscription(),
          GraphQLSubscriptions.getDirectTypingSubscription(this.ig.state.cookieUserId),
          GraphQLSubscriptions.getClientConfigUpdateSubscription(),
        ],
        skywalkerSubs: [
          SkywalkerSubscriptions.directSub(this.ig.state.cookieUserId),
        ],
        irisData: directInbox,
        enableTrace: false,
        autoReconnect: true
      });

      this.isConnected = true;
      console.log('✅ Realtime connection established');
    } catch (error) {
      console.error('❌ Realtime connection failed:', error.message);
      throw error;
    }
  }

  setupEventListeners() {
    // Direct messages
    this.ig.realtime.on('message', (data) => {
      console.log('📨 New message:', {
        threadId: data.message.thread_id,
        userId: data.message.user_id,
        text: data.message.text || 'Media/Other',
        timestamp: new Date(parseInt(data.message.timestamp) / 1000)
      });
    });

    // Thread updates (user joined/left, etc.)
    this.ig.realtime.on('threadUpdate', (data) => {
      console.log('🔄 Thread update:', {
        threadId: data.meta.thread_id,
        operation: data.meta.op,
        path: data.meta.path
      });
    });

    // Typing indicators
    this.ig.realtime.on('direct', (data) => {
      if (data.op === 'replace' && data.path.includes('activity_status')) {
        console.log('⌨️ Typing indicator:', {
          userId: data.value.sender_id,
          isTyping: data.value.activity_status === 1
        });
      }
    });

    // App presence (online/offline status)
    this.ig.realtime.on('appPresence', (data) => {
      console.log('👤 Presence update:', {
        userId: data.presence_event.user_id,
        isActive: data.presence_event.is_active,
        lastActivity: new Date(parseInt(data.presence_event.last_activity_at_ms))
      });
    });

    // Client config updates
    this.ig.realtime.on('clientConfigUpdate', (data) => {
      console.log('⚙️ Config update:', data.client_config_update_event.client_config_name);
    });

    // Error handling
    this.ig.realtime.on('error', (error) => {
      console.error('❌ Realtime error:', error.message);
      this.isConnected = false;
    });

    this.ig.realtime.on('close', () => {
      console.log('🔌 Realtime connection closed');
      this.isConnected = false;
    });
  }

  async disconnect() {
    if (!this.isConnected) return;
    
    try {
      await this.ig.realtime.disconnect();
      this.isConnected = false;
      console.log('✅ Realtime disconnected');
    } catch (error) {
      console.error('❌ Realtime disconnect error:', error.message);
    }
  }

  // Send a direct message
  async sendMessage(threadId, text) {
    if (!this.isConnected) {
      throw new Error('Realtime not connected');
    }

    try {
      await this.ig.realtime.direct.sendText({ threadId, text });
      console.log('✅ Message sent to thread:', threadId);
    } catch (error) {
      console.error('❌ Failed to send message:', error.message);
      throw error;
    }
  }

  // Send typing indicator
  async sendTyping(threadId, isActive = true) {
    if (!this.isConnected) return;

    try {
      await this.ig.realtime.direct.indicateActivity({ threadId, isActive });
    } catch (error) {
      console.error('❌ Failed to send typing indicator:', error.message);
    }
  }

  // Mark message as seen
  async markSeen(threadId, itemId) {
    if (!this.isConnected) return;

    try {
      await this.ig.realtime.direct.markAsSeen({ threadId, itemId });
    } catch (error) {
      console.error('❌ Failed to mark as seen:', error.message);
    }
  }
}
