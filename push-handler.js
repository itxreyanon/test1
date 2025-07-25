export class PushHandler {
  constructor(ig) {
    this.ig = ig;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    console.log('🔄 Connecting to Instagram push notifications...');
    
    try {
      // Set up event listeners before connecting
      this.setupEventListeners();

      // Connect to FBNS
      await this.ig.fbns.connect({
        enableTrace: false,
        autoReconnect: true
      });

      this.isConnected = true;
      console.log('✅ Push notifications connected');
    } catch (error) {
      console.error('❌ Push connection failed:', error.message);
      throw error;
    }
  }

  setupEventListeners() {
    // Authentication successful
    this.ig.fbns.on('auth', (auth) => {
      console.log('🔐 FBNS authenticated');
    });

    // Push notifications
    this.ig.fbns.on('push', (notification) => {
      console.log('🔔 Push notification:', {
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
      console.log('📨 Direct message notification:', notification.actionParams);
    });

    this.ig.fbns.on('post', (notification) => {
      console.log('📷 Post notification:', notification.actionParams);
    });

    this.ig.fbns.on('like', (notification) => {
      console.log('❤️ Like notification:', notification.actionParams);
    });

    this.ig.fbns.on('comment', (notification) => {
      console.log('💬 Comment notification:', notification.actionParams);
    });

    // Error handling
    this.ig.fbns.on('error', (error) => {
      console.error('❌ Push error:', error.message);
      this.isConnected = false;
    });

    this.ig.fbns.on('warning', (warning) => {
      console.warn('⚠️ Push warning:', warning.message);
    });
  }

  handleNotification(notification) {
    // Custom notification handling logic
    switch (notification.collapseKey) {
      case 'direct_v2_message':
        console.log('📨 Handling direct message notification');
        break;
      case 'post':
        console.log('📷 Handling post notification');
        break;
      case 'like':
        console.log('❤️ Handling like notification');
        break;
      case 'comment':
        console.log('💬 Handling comment notification');
        break;
      default:
        console.log('🔔 Unhandled notification type:', notification.collapseKey);
    }
  }

  async disconnect() {
    if (!this.isConnected) return;
    
    try {
      await this.ig.fbns.disconnect();
      this.isConnected = false;
      console.log('✅ Push notifications disconnected');
    } catch (error) {
      console.error('❌ Push disconnect error:', error.message);
    }
  }
}
