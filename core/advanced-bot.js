import { IgApiClient } from 'instagram-private-api';
import { withRealtime, withFbns, withFbnsAndRealtime } from 'instagram_mqtt';
import { GraphQLSubscriptions, SkywalkerSubscriptions } = require('instagram_mqtt/dist/realtime/subscriptions')
import { Logger } from './logger.js';
import { SessionManager } from './session-manager.js';
import { EventManager } from './event-manager.js';
import { RealtimeHandler } from './realtime-handler.js';
import { PushHandler } from './push-handler.js';
import { ModuleManager } from './module-manager.js';
import { MessageHandler } from './message-handler.js';
import { config } from '../config.js';

export class AdvancedInstagramBot extends EventManager {
  constructor(options = {}) {
    super();
    
    // Core components
    this.config = { ...config, ...options };
    this.logger = new Logger({
      logLevel: this.config.bot.logLevel,
      enableFile: this.config.bot.enableLogging,
      logFile: '.logs/bot.log'
    });
    
    this.sessionManager = new SessionManager(this.config.instagram.sessionPath);
    
    // Instagram client with realtime and push support
    this.ig = withFbnsAndRealtime(new IgApiClient());
    
    // Handlers
    this.realtimeHandler = new RealtimeHandler(this.ig, this.logger);
    this.pushHandler = new PushHandler(this.ig, this.logger);
    this.moduleManager = new ModuleManager(this, this.logger);
    this.messageHandler = new MessageHandler(this, this.moduleManager, this.logger);
    
    // Bot state
    this.isRunning = false;
    this.isConnected = false;
    this.user = null;
    this.startTime = null;
    this.lastMessageCheck = new Date(Date.now() - 60000);
    this.messageHandlers = [];
    this.commandHandlers = new Map();
    this.middleware = [];
    
    // Statistics
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      commandsExecuted: 0,
      errors: 0,
      uptime: 0
    };

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Handle process signals
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception:', error);
      this.stats.errors++;
    });
    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled rejection:', reason);
      this.stats.errors++;
    });

    // Internal event handlers
    this.on('message', (message) => {
      this.stats.messagesReceived++;
      this.messageHandler.handleMessage(message);
    });

    this.on('messageSent', () => {
      this.stats.messagesSent++;
    });

    this.on('commandExecuted', () => {
      this.stats.commandsExecuted++;
    });

    this.on('error', (error) => {
      this.logger.error('Bot error:', error);
      this.stats.errors++;
    });
  }

  async initialize() {
    try {
      this.logger.info('🚀 Initializing Advanced Instagram Bot...');
      
      // Generate device
      this.ig.state.generateDevice(this.config.instagram.username);
      
      // Try to login with saved session first
      let loginSuccess = false;
      
      if (await this.sessionManager.loadCookies(this.ig)) {
        try {
          this.user = await this.ig.account.currentUser();
          loginSuccess = true;
          this.logger.info('✅ Logged in using saved session');
        } catch (error) {
          this.logger.warn('⚠️ Saved session invalid, attempting fresh login');
        }
      }

      // Fresh login if session login failed
      if (!loginSuccess) {
        if (!this.config.instagram.allowFreshLogin) {
          throw new Error('Fresh login disabled and session login failed');
        }
        
        if (!this.config.instagram.password) {
          throw new Error('Password required for fresh login');
        }

        await this.ig.account.login(
          this.config.instagram.username,
          this.config.instagram.password
        );
        
        this.user = await this.ig.account.currentUser();
        await this.sessionManager.saveCookies(this.ig.state.cookieJar);
        this.logger.info('✅ Fresh login successful');
      }

      // Initialize handlers
      await this.realtimeHandler.initialize();
      await this.pushHandler.initialize();
      
      // Load modules
      await this.moduleManager.loadModules();
      
      // Connect realtime and push
      await this.realtimeHandler.connect();
      await this.pushHandler.connect();
      
      this.isConnected = true;
      this.isRunning = true;
      this.startTime = new Date();
      
      this.logger.info(`✅ Bot initialized as @${this.user.username} (ID: ${this.user.pk})`);
      this.emit('ready');
      
      // Start heartbeat
      this.startHeartbeat();
      
      return true;
    } catch (error) {
      this.logger.error('❌ Failed to initialize bot:', error);
      throw error;
    }
  }

  startHeartbeat() {
    setInterval(() => {
      if (this.isRunning) {
        this.stats.uptime = Date.now() - this.startTime.getTime();
        this.logger.debug(`💓 Heartbeat - Uptime: ${Math.floor(this.stats.uptime / 1000)}s`);
        this.emit('heartbeat', this.stats);
      }
    }, this.config.bot.heartbeatInterval);
  }

  // Message handling
  onMessage(handler) {
    if (typeof handler === 'function') {
      this.messageHandlers.push(handler);
      this.logger.debug(`📝 Added message handler (total: ${this.messageHandlers.length})`);
    }
  }

  // Command system
  registerCommand(name, handler, options = {}) {
    this.commandHandlers.set(name, {
      handler,
      description: options.description || 'No description',
      usage: options.usage || name,
      adminOnly: options.adminOnly || false,
      cooldown: options.cooldown || 0,
      lastUsed: new Map()
    });
    this.logger.debug(`🔧 Registered command: ${name}`);
  }

  // Middleware system
  use(middleware) {
    if (typeof middleware === 'function') {
      this.middleware.push(middleware);
      this.logger.debug(`🔌 Added middleware (total: ${this.middleware.length})`);
    }
  }

  // Message sending with enhanced features
  async sendMessage(threadId, content, options = {}) {
    try {
      const result = await this.ig.entity.directThread(threadId).broadcastText(content);
      this.emit('messageSent', { threadId, content, result });
      this.logger.info(`📤 Sent message to ${threadId}: ${content.substring(0, 50)}...`);
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  async sendPhoto(threadId, photo, caption = '') {
    try {
      const result = await this.ig.entity.directThread(threadId).broadcastPhoto({
        file: photo,
        caption
      });
      this.emit('messageSent', { threadId, type: 'photo', caption });
      this.logger.info(`📸 Sent photo to ${threadId}`);
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to send photo:', error);
      throw error;
    }
  }

  async sendVoice(threadId, voiceBuffer) {
    try {
      const result = await this.ig.entity.directThread(threadId).broadcastVoice({
        file: voiceBuffer
      });
      this.emit('messageSent', { threadId, type: 'voice' });
      this.logger.info(`🎤 Sent voice message to ${threadId}`);
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to send voice:', error);
      throw error;
    }
  }

  // User management
  async getUser(userId) {
    try {
      return await this.ig.user.info(userId);
    } catch (error) {
      this.logger.error(`❌ Failed to get user ${userId}:`, error);
      throw error;
    }
  }

  async getUserByUsername(username) {
    try {
      const userId = await this.ig.user.getIdByUsername(username);
      return await this.getUser(userId);
    } catch (error) {
      this.logger.error(`❌ Failed to get user by username ${username}:`, error);
      throw error;
    }
  }

  // Thread management
  async getThread(threadId) {
    try {
      return await this.ig.feed.directThread({ thread_id: threadId }).request();
    } catch (error) {
      this.logger.error(`❌ Failed to get thread ${threadId}:`, error);
      throw error;
    }
  }

  async getInbox() {
    try {
      return await this.ig.feed.directInbox().items();
    } catch (error) {
      this.logger.error('❌ Failed to get inbox:', error);
      throw error;
    }
  }

  // Utility methods
  isAdmin(userId) {
    return this.config.bot.adminUsers.includes(userId.toString());
  }

  getStats() {
    return {
      ...this.stats,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      isRunning: this.isRunning,
      isConnected: this.isConnected,
      user: this.user ? {
        username: this.user.username,
        id: this.user.pk,
        fullName: this.user.full_name
      } : null,
      modules: this.moduleManager.getLoadedModules(),
      events: this.getEventStats()
    };
  }

  async gracefulShutdown() {
    this.logger.info('👋 Initiating graceful shutdown...');
    
    try {
      this.isRunning = false;
      
      // Save session
      await this.sessionManager.saveCookies(this.ig.state.cookieJar);
      
      // Disconnect handlers
      await this.realtimeHandler.disconnect();
      await this.pushHandler.disconnect();
      
      // Unload modules
      await this.moduleManager.unloadModules();
      
      this.logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}
