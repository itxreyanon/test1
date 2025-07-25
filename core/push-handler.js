export class PushHandler {
  constructor(ig, logger) {
    this.ig = ig;
    this.logger = logger;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  async initialize() {
    this.logger.info('🔄 Initializing push handler...');
    this.setupEventListeners();
  }

  async connect() {
    if (this.isConnected) return;

    this.logger.info('🔄 Connecting to Instagram push notifications...');
    
    try {

      // Connect to FBNS
      await this.ig.fbns.connect({
        enableTrace: false,
        autoReconnect: true
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.info('✅ Push notifications connected');
    } catch (error) {
      this.logger.error('❌ Push connection failed:', error.message);
      await this.handleReconnect();
      throw error;
    }
  }

  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('❌ Max push reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.logger.warn(`🔄 Attempting push reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.logger.error('❌ Push reconnection failed:', error.message);
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }
  setupEventListeners() {
    // Authentication successful
    this.ig.fbns.on('auth', (auth) => {
      this.logger.info('🔐 FBNS authenticated');
    });

    // Push notifications
    this.ig.fbns.on('push', (notification) => {
      this.logger.debug('🔔 Push notification:', {
        title: notification.title,
        message: notification.message,
        collapseKey: notification.collapseKey,
        actionPath: notification.actionPath
      });

      // Handle specific notification types
      this.handleNotification(notification);
    });

    // Specific notification types
    this.ig.fbns.on('direct_v2_message', (notification) => {
      this.logger.debug('📨 Direct message notification:', notification.actionParams);
    });

    this.ig.fbns.on('post', (notification) => {
      this.logger.debug('📷 Post notification:', notification.actionParams);
    });

    this.ig.fbns.on('like', (notification) => {
      this.logger.debug('❤️ Like notification:', notification.actionParams);
    });

    this.ig.fbns.on('comment', (notification) => {
      this.logger.debug('💬 Comment notification:', notification.actionParams);
    });

    // Error handling
    this.ig.fbns.on('error', (error) => {
      this.logger.error('❌ Push error:', error.message);
      this.isConnected = false;
      this.handleReconnect();
    });

    this.ig.fbns.on('warning', (warning) => {
      this.logger.warn('⚠️ Push warning:', warning.message);
    });
  }

  handleNotification(notification) {
    // Custom notification handling logic
    switch (notification.collapseKey) {
      case 'direct_v2_message':
        this.logger.debug('📨 Handling direct message notification');
        break;
      case 'post':
        this.logger.debug('📷 Handling post notification');
        break;
      case 'like':
        this.logger.debug('❤️ Handling like notification');
        break;
      case 'comment':
        this.logger.debug('💬 Handling comment notification');
        break;
      default:
        this.logger.debug('🔔 Unhandled notification type:', notification.collapseKey);
    }
  }

  async disconnect() {
    if (!this.isConnected) return;
    
    try {
      await this.ig.fbns.disconnect();
      this.isConnected = false;
      this.logger.info('✅ Push notifications disconnected');
    } catch (error) {
      this.logger.error('❌ Push disconnect error:', error.message);
    }
  }
}
