export class MessageHandler {
  constructor(bot, moduleManager, logger) {
    this.bot = bot;
    this.moduleManager = moduleManager;
    this.logger = logger;
    this.commandCooldowns = new Map();
  }

  async handleMessage(message) {
    try {
      // Apply middleware
      for (const middleware of this.bot.middleware) {
        const result = await middleware(message);
        if (result === false) {
          this.logger.debug('🚫 Message blocked by middleware');
          return;
        }
      }

      // Check if it's a command
      if (message.text.startsWith(this.bot.config.bot.prefix)) {
        await this.handleCommand(message);
      } else {
        // Regular message handling
        await this.handleRegularMessage(message);
      }

      // Emit message event for modules
      this.bot.emit('message', message);
    } catch (error) {
      this.logger.error('❌ Error handling message:', error);
      this.bot.emit('error', error);
    }
  }

  async handleCommand(message) {
    try {
      const args = message.text.slice(this.bot.config.bot.prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      const command = this.bot.commandHandlers.get(commandName);
      if (!command) {
        this.logger.debug(`❓ Unknown command: ${commandName}`);
        return;
      }

      // Check admin permissions
      if (command.adminOnly && !this.bot.isAdmin(message.sender)) {
        await this.bot.sendMessage(message.threadId, '❌ This command requires admin privileges.');
        return;
      }

      // Check cooldown
      if (command.cooldown > 0) {
        const cooldownKey = `${commandName}_${message.sender}`;
        const lastUsed = command.lastUsed.get(cooldownKey) || 0;
        const timeLeft = (lastUsed + command.cooldown) - Date.now();

        if (timeLeft > 0) {
          await this.bot.sendMessage(
            message.threadId,
            `⏰ Command on cooldown. Try again in ${Math.ceil(timeLeft / 1000)} seconds.`
          );
          return;
        }

        command.lastUsed.set(cooldownKey, Date.now());
      }

      // Execute command
      await command.handler(message, args);
      this.bot.emit('commandExecuted', { command: commandName, user: message.sender });
      
      this.logger.info(`🔧 Executed command: ${commandName} by @${message.senderUsername}`);
    } catch (error) {
      this.logger.error(`❌ Command execution error:`, error);
      await this.bot.sendMessage(message.threadId, '❌ An error occurred while executing the command.');
    }
  }

  async handleRegularMessage(message) {
    // Execute custom message handlers
    for (const handler of this.bot.messageHandlers) {
      try {
        await handler(message);
      } catch (error) {
        this.logger.error('❌ Message handler error:', error);
      }
    }

    // Let modules handle the message
    for (const [moduleName, module] of this.moduleManager.modules) {
      try {
        if (typeof module.onMessage === 'function') {
          await module.onMessage(message);
        }
      } catch (error) {
        this.logger.error(`❌ Module ${moduleName} message handler error:`, error);
      }
    }
  }
}
