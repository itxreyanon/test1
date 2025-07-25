import { IgApiClient } from 'instagram-private-api';
import { withFbnsAndRealtime } from 'instagram_mqtt';
import { SessionManager } from './session-manager.js';
import { RealtimeHandler } from './realtime-handler.js';
import { PushHandler } from './push-handler.js';
import { BotFeatures } from './bot-features.js';
import { config } from './config.js';

class InstagramBot {
  constructor() {
    // Create Instagram client with MQTT support
    this.ig = withFbnsAndRealtime(new IgApiClient());
    
    // Generate device for the account
    this.ig.state.generateDevice(config.username);
    
    // Initialize handlers
    this.sessionManager = new SessionManager(this.ig);
    this.realtimeHandler = new RealtimeHandler(this.ig);
    this.pushHandler = new PushHandler(this.ig);
    this.botFeatures = new BotFeatures(this.ig, this.realtimeHandler);
    
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Bot is already running');
      return;
    }

    try {
      console.log('🚀 Starting Instagram Bot...');
      
      // Step 1: Login and manage session
      await this.sessionManager.login();
      
      // Step 2: Connect to realtime
      await this.realtimeHandler.connect();
      
      // Step 3: Connect to push notifications
      await this.pushHandler.connect();
      
      // Step 4: Setup bot features
      await this.setupBotFeatures();
      
      this.isRunning = true;
      console.log('✅ Instagram Bot is now running!');
      
      // Show account stats
      await this.botFeatures.getAccountStats();
      
      // Set presence to online
      await this.botFeatures.updatePresence(true);
      
    } catch (error) {
      console.error('❌ Failed to start bot:', error.message);
      await this.stop();
    }
  }

  async setupBotFeatures() {
    console.log('🔧 Setting up bot features...');
    
    // Enable auto-reply
    await this.botFeatures.setupAutoReply();
    
    // Auto-like posts every 30 minutes
    setInterval(async () => {
      await this.botFeatures.autoLikePosts(3);
    }, 30 * 60 * 1000);
    
    console.log('✅ Bot features configured');
  }

  async stop() {
    if (!this.isRunning) {
      console.log('⚠️ Bot is not running');
      return;
    }

    console.log('🛑 Stopping Instagram Bot...');
    
    try {
      // Set presence to offline
      await this.botFeatures.updatePresence(false);
      
      // Disconnect from services
      await this.realtimeHandler.disconnect();
      await this.pushHandler.disconnect();
      
      this.isRunning = false;
      console.log('✅ Instagram Bot stopped');
    } catch (error) {
      console.error('❌ Error stopping bot:', error.message);
    }
  }

  // Manual commands for testing
  async sendTestMessage(threadId, message) {
    if (!this.isRunning) {
      console.log('⚠️ Bot is not running');
      return;
    }
    
    await this.realtimeHandler.sendMessage(threadId, message);
  }

  async likeRecentPosts(count = 5) {
    if (!this.isRunning) {
      console.log('⚠️ Bot is not running');
      return;
    }
    
    await this.botFeatures.autoLikePosts(count);
  }
}

// Create and start the bot
const bot = new InstagramBot();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await bot.stop();
  process.exit(0);
});

// Start the bot
bot.start().catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});

// Export for manual control if needed
export default bot;
