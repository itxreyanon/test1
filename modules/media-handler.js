import { BaseModule } from './base-module.js';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

export default class MediaHandler extends BaseModule {
  constructor(bot, config) {
    super(bot, config);
    this.name = 'MediaHandler';
    this.description = 'Handle media messages and commands';
    
    this.mediaPath = config.mediaPath || './media';
    this.ensureMediaDirectory();

    this.registerCommand('sendphoto', this.sendPhotoCommand, {
      description: 'Send a photo from URL or file',
      usage: 'sendphoto <url_or_filename> [caption]'
    });

    this.registerCommand('meme', this.memeCommand, {
      description: 'Send a random meme',
      usage: 'meme'
    });
  }

  ensureMediaDirectory() {
    if (!fs.existsSync(this.mediaPath)) {
      fs.mkdirSync(this.mediaPath, { recursive: true });
    }
  }

  async onMessage(message) {
    // Handle media messages
    if (message.type === 'media') {
      this.log('info', `Received media message from @${message.senderUsername}`);
      // You can add media processing logic here
    }
  }

  async sendPhotoCommand(message, args) {
    if (args.length === 0) {
      await this.sendMessage(message.threadId, '❓ Please provide a URL or filename.');
      return;
    }

    const input = args[0];
    const caption = args.slice(1).join(' ');

    try {
      let photoBuffer;

      if (input.startsWith('http')) {
        // Download from URL
        const response = await fetch(input);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        photoBuffer = await response.buffer();
      } else {
        // Load from file
        const filePath = path.join(this.mediaPath, input);
        if (!fs.existsSync(filePath)) {
          await this.sendMessage(message.threadId, '❌ File not found.');
          return;
        }
        photoBuffer = fs.readFileSync(filePath);
      }

      await this.sendPhoto(message.threadId, photoBuffer, caption);
      this.log('info', `Sent photo to thread ${message.threadId}`);
    } catch (error) {
      this.log('error', 'Failed to send photo:', error);
      await this.sendMessage(message.threadId, '❌ Failed to send photo.');
    }
  }

  async memeCommand(message, args) {
    try {
      // Fetch a random meme from a meme API
      const response = await fetch('https://meme-api.herokuapp.com/gimme');
      const data = await response.json();

      if (data.url) {
        const memeResponse = await fetch(data.url);
        const memeBuffer = await memeResponse.buffer();
        
        await this.sendPhoto(message.threadId, memeBuffer, `${data.title}\n\n📱 r/${data.subreddit}`);
        this.log('info', `Sent meme to thread ${message.threadId}`);
      } else {
        await this.sendMessage(message.threadId, '❌ Failed to fetch meme.');
      }
    } catch (error) {
      this.log('error', 'Failed to fetch meme:', error);
      await this.sendMessage(message.threadId, '❌ Failed to fetch meme.');
    }
  }
}
