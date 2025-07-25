import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'INFO';
    this.enableFile = options.enableFile || false;
    this.logFile = options.logFile || 'bot.log';
    this.enableConsole = options.enableConsole !== false;
    
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      TRACE: 4
    };

    this.colors = {
      ERROR: chalk.red,
      WARN: chalk.yellow,
      INFO: chalk.blue,
      DEBUG: chalk.green,
      TRACE: chalk.gray
    };

    this.emojis = {
      ERROR: '❌',
      WARN: '⚠️',
      INFO: 'ℹ️',
      DEBUG: '🐛',
      TRACE: '🔍'
    };

    if (this.enableFile) {
      this.ensureLogDirectory();
    }
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const emoji = this.emojis[level];
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] ${emoji} [${level}] ${message}${formattedArgs}`;
  }

  log(level, message, ...args) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, ...args);

    if (this.enableConsole) {
      const coloredMessage = this.colors[level](formattedMessage);
      console.log(coloredMessage);
    }

    if (this.enableFile) {
      fs.appendFileSync(this.logFile, formattedMessage + '\n');
    }
  }

  error(message, ...args) { this.log('ERROR', message, ...args); }
  warn(message, ...args) { this.log('WARN', message, ...args); }
  info(message, ...args) { this.log('INFO', message, ...args); }
  debug(message, ...args) { this.log('DEBUG', message, ...args); }
  trace(message, ...args) { this.log('TRACE', message, ...args); }
}
