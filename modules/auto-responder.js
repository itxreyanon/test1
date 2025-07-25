import { BaseModule } from './base-module.js';

export default class AutoResponder extends BaseModule {
  constructor(bot, config) {
    super(bot, config);
    this.name = 'AutoResponder';
    this.description = 'Automatic message responses';
    
    // Default responses
    this.responses = config.responses || [
      {
        trigger: /hello|hi|hey/i,
        response: 'Hello! 👋 How can I help you?',
        probability: 0.8
      },
      {
        trigger: /how are you/i,
        response: 'I\'m doing great! Thanks for asking. 😊',
        probability: 0.9
      },
      {
        trigger: /thank you|thanks/i,
        response: 'You\'re welcome! 😊',
        probability: 0.7
      }
    ];

    this.registerCommand('addresponse', this.addResponseCommand, {
      description: 'Add an auto-response',
      usage: 'addresponse <trigger> | <response>',
      adminOnly: true
    });

    this.registerCommand('listresponses', this.listResponsesCommand, {
      description: 'List all auto-responses',
      usage: 'listresponses',
      adminOnly: true
    });
  }

  async onMessage(message) {
    // Skip if it's a command
    if (message.text.startsWith(this.bot.config.bot.prefix)) {
      return;
    }

    for (const response of this.responses) {
      if (response.trigger.test(message.text)) {
        // Check probability
        if (Math.random() < response.probability) {
          await this.sendMessage(message.threadId, response.response);
          this.log('info', `Auto-responded to message from @${message.senderUsername}`);
          break; // Only send one response
        }
      }
    }
  }

  async addResponseCommand(message, args) {
    const input = args.join(' ');
    const parts = input.split('|').map(part => part.trim());

    if (parts.length !== 2) {
      await this.sendMessage(message.threadId, '❓ Usage: addresponse <trigger> | <response>');
      return;
    }

    const [trigger, response] = parts;

    try {
      const regex = new RegExp(trigger, 'i');
      this.responses.push({
        trigger: regex,
        response: response,
        probability: 0.8
      });

      await this.sendMessage(message.threadId, '✅ Auto-response added successfully!');
      this.log('info', `Added auto-response: ${trigger} -> ${response}`);
    } catch (error) {
      await this.sendMessage(message.threadId, '❌ Invalid regex pattern.');
    }
  }

  async listResponsesCommand(message, args) {
    if (this.responses.length === 0) {
      await this.sendMessage(message.threadId, '📝 No auto-responses configured.');
      return;
    }

    const responsesList = this.responses.map((resp, index) => 
      `${index + 1}. **${resp.trigger.source}** → "${resp.response}" (${Math.round(resp.probability * 100)}%)`
    ).join('\n');

    await this.sendMessage(message.threadId, `📝 **Auto-Responses (${this.responses.length})**\n\n${responsesList}`);
  }
}
