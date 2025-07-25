import { GraphQLSubscriptions, SkywalkerSubscriptions } from 'instagram_mqtt/dist/realtime/subscriptions/index.js';

export class RealtimeHandler {
  constructor(ig, logger) {
    this.ig = ig;
    this.logger = logger;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  async initialize() {
    this.logger.info('🔄 Initializing realtime handler...');
    this.setupEventListeners();
  }

  async connect() {
  if (this.isConnected) return;

  this.logger.info('🔄 Connecting to Instagram realtime...');

  try {

    const connectionOptions = {
      graphQlSubs: [
        GraphQLSubscriptions.getAppPresenceSubscription(),
        GraphQLSubscriptions.getDirectStatusSubscription(),
        GraphQLSubscriptions.getDirectTypingSubscription(this.ig.state.cookieUserId),
        GraphQLSubscriptions.getClientConfigUpdateSubscription(),
      ],
      skywalkerSubs: [
        SkywalkerSubscriptions.directSub(this.ig.state.cookieUserId),
      ],
      enableTrace: false,
      autoReconnect: true
    };

    this.logger.info('📥 Fetching irisData from inbox...');
      const directInbox = await this.ig.feed.directInbox().request();
      connectionOptions.irisData = directInbox;

    await this.ig.realtime.connect(connectionOptions);

    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.logger.info('✅ Realtime connection established');
  } catch (error) {
    this.logger.error('❌ Realtime connection failed:', error.message);
    await this.handleReconnect();
    throw error;
  }
}

  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.logger.warn(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.logger.error('❌ Reconnection failed:', error.message);
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }
  setupEventListeners() {
    // Direct messages
    this.ig.realtime.on('message', (data) => {
      this.logger.debug('📨 New message:', {
        threadId: data.message.thread_id,
        userId: data.message.user_id,
        text: data.message.text || 'Media/Other',
        timestamp: new Date(parseInt(data.message.timestamp) / 1000)
      });
    });

    // Thread updates (user joined/left, etc.)
    this.ig.realtime.on('threadUpdate', (data) => {
      this.logger.debug('🔄 Thread update:', {
        threadId: data.meta.thread_id,
        operation: data.meta.op,
        path: data.meta.path
      });
    });

    // Typing indicators
    this.ig.realtime.on('direct', (data) => {
      if (data.op === 'replace' && data.path.includes('activity_status')) {
        this.logger.debug('⌨️ Typing indicator:', {
          userId: data.value.sender_id,
          isTyping: data.value.activity_status === 1
        });
      }
    });

    // App presence (online/offline status)
    this.ig.realtime.on('appPresence', (data) => {
      this.logger.debug('👤 Presence update:', {
        userId: data.presence_event.user_id,
        isActive: data.presence_event.is_active,
        lastActivity: new Date(parseInt(data.presence_event.last_activity_at_ms))
      });
    });

    // Client config updates
    this.ig.realtime.on('clientConfigUpdate', (data) => {
      this.logger.debug('⚙️ Config update:', data.client_config_update_event.client_config_name);
    });

    // Error handling
    this.ig.realtime.on('error', (error) => {
      this.logger.error('❌ Realtime error:', error.message);
      this.isConnected = false;
      this.handleReconnect();
    });

    this.ig.realtime.on('close', () => {
      this.logger.warn('🔌 Realtime connection closed');
      this.isConnected = false;
      this.handleReconnect();
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
      this.logger.info('✅ Message sent to thread:', threadId);
    } catch (error) {
      this.logger.error('❌ Failed to send message:', error.message);
      throw error;
    }
  }

  // Send typing indicator
  async sendTyping(threadId, isActive = true) {
    if (!this.isConnected) return;

    try {
      await this.ig.realtime.direct.indicateActivity({ threadId, isActive });
    } catch (error) {
      this.logger.error('❌ Failed to send typing indicator:', error.message);
    }
  }

  // Mark message as seen
  async markSeen(threadId, itemId) {
    if (!this.isConnected) return;

    try {
      await this.ig.realtime.direct.markAsSeen({ threadId, itemId });
    } catch (error) {
      this.logger.error('❌ Failed to mark as seen:', error.message);
    }
  }
}
