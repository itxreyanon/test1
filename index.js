import { AdvancedInstagramBot } from './core/advanced-bot.js';
import { config } from './config.js';

async function main() {
  try {
    console.log('🚀 Starting Advanced Instagram Bot...');
    
    // Create bot instance
    const bot = new AdvancedInstagramBot(config);
    
    // Set up event listeners
    bot.on('ready', () => {
      console.log('✅ Bot is ready and running!');
    });

    bot.on('message', (message) => {
      console.log(`📨 Message from @${message.senderUsername}: ${message.text}`);
    });

    bot.on('error', (error) => {
      console.error('❌ Bot error:', error.message);
    });

    // Initialize and start the bot
    await bot.initialize();
    
    console.log('🎉 Advanced Instagram Bot is now fully operational!');
    console.log(`📊 Type ${config.bot.prefix}help to see available commands`);
    
  } catch (error) {
    console.error('💥 Failed to start bot:', error.message);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the bot
main();
