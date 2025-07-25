import { BaseModule } from './base-module.js';

export default class CoreCommands extends BaseModule {
  constructor(bot, config) {
    super(bot, config);
    this.name = 'CoreCommands';
    this.description = 'Essential bot commands';
    
    this.registerCommand('help', this.helpCommand, {
      description: 'Show available commands',
      usage: 'help [command]'
    });

    this.registerCommand('ping', this.pingCommand, {
      description: 'Check bot responsiveness',
      usage: 'ping'
    });

    this.registerCommand('stats', this.statsCommand, {
      description: 'Show bot statistics',
      usage: 'stats'
    });

    this.registerCommand('modules', this.modulesCommand, {
      description: 'List loaded modules',
      usage: 'modules',
      adminOnly: true
    });

    this.registerCommand('reload', this.reloadCommand, {
      description: 'Reload a module',
      usage: 'reload <module>',
      adminOnly: true
    });

    this.registerCommand('shutdown', this.shutdownCommand, {
      description: 'Shutdown the bot',
      usage: 'shutdown',
      adminOnly: true
    });
  }

  async helpCommand(message, args) {
    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      const command = this.bot.commandHandlers.get(commandName);
      
      if (!command) {
        await this.sendMessage(message.threadId, `❓ Command '${commandName}' not found.`);
        return;
      }

      const helpText = `
📖 **${commandName}**
${command.description}

**Usage:** \`${this.bot.config.bot.prefix}${command.usage}\`
${command.adminOnly ? '🔒 Admin only' : ''}
${command.cooldown > 0 ? `⏰ Cooldown: ${command.cooldown / 1000}s` : ''}
      `.trim();

      await this.sendMessage(message.threadId, helpText);
    } else {
      const commands = Array.from(this.bot.commandHandlers.keys());
      const helpText = `
🤖 **Available Commands**

${commands.map(cmd => `• \`${this.bot.config.bot.prefix}${cmd}\``).join('\n')}

Use \`${this.bot.config.bot.prefix}help <command>\` for detailed info.
      `.trim();

      await this.sendMessage(message.threadId, helpText);
    }
  }

  async pingCommand(message, args) {
    const start = Date.now();
    const response = await this.sendMessage(message.threadId, '🏓 Pong!');
    const latency = Date.now() - start;
    
    await this.bot.sendMessage(message.threadId, `🏓 Pong! Latency: ${latency}ms`);
  }

  async statsCommand(message, args) {
    const stats = this.bot.getStats();
    const uptime = Math.floor(stats.uptime / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    const statsText = `
📊 **Bot Statistics**

👤 **User:** @${stats.user?.username || 'Unknown'}
⏰ **Uptime:** ${hours}h ${minutes}m ${seconds}s
📨 **Messages Received:** ${stats.messagesReceived}
📤 **Messages Sent:** ${stats.messagesSent}
🔧 **Commands Executed:** ${stats.commandsExecuted}
❌ **Errors:** ${stats.errors}
📦 **Modules:** ${stats.modules.length}
🔌 **Connected:** ${stats.isConnected ? '✅' : '❌'}
    `.trim();

    await this.sendMessage(message.threadId, statsText);
  }

  async modulesCommand(message, args) {
    const modules = this.bot.moduleManager.getLoadedModules();
    
    if (modules.length === 0) {
      await this.sendMessage(message.threadId, '📦 No modules loaded.');
      return;
    }

    const modulesList = modules.map(name => {
      const module = this.bot.moduleManager.getModule(name);
      return `• **${name}** - ${module.description || 'No description'}`;
    }).join('\n');

    await this.sendMessage(message.threadId, `📦 **Loaded Modules (${modules.length})**\n\n${modulesList}`);
  }

  async reloadCommand(message, args) {
    if (args.length === 0) {
      await this.sendMessage(message.threadId, '❓ Please specify a module to reload.');
      return;
    }

    const moduleName = args[0];
    
    try {
      const success = await this.bot.moduleManager.reloadModule(moduleName);
      if (success) {
        await this.sendMessage(message.threadId, `✅ Module '${moduleName}' reloaded successfully.`);
      } else {
        await this.sendMessage(message.threadId, `❌ Failed to reload module '${moduleName}'.`);
      }
    } catch (error) {
      await this.sendMessage(message.threadId, `❌ Error reloading module: ${error.message}`);
    }
  }

  async shutdownCommand(message, args) {
    await this.sendMessage(message.threadId, '👋 Shutting down bot...');
    setTimeout(() => {
      this.bot.gracefulShutdown();
    }, 1000);
  }
}
