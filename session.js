import { promises as fs } from 'fs';
import { config } from './config.js';

export class SessionManager {
  constructor(ig) {
    this.ig = ig;
    this.sessionFile = config.sessionFile;
  }

  async saveSession() {
    try {
      const state = await this.ig.exportState();
      await fs.writeFile(this.sessionFile, state, 'utf8');
      console.log('✅ Session saved successfully');
    } catch (error) {
      console.error('❌ Failed to save session:', error.message);
    }
  }

  async loadSession() {
    try {
      const data = await fs.readFile(this.sessionFile, 'utf8');
      await this.ig.importState(data);
      console.log('✅ Session loaded successfully');
      return true;
    } catch (error) {
      console.log('ℹ️ No existing session found, will create new one');
      return false;
    }
  }

  async login() {
    const sessionLoaded = await this.loadSession();
    
    if (!sessionLoaded) {
      console.log('🔐 Logging in with credentials...');
      try {
        await this.ig.account.login(config.username, config.password);
        console.log('✅ Login successful');
        await this.saveSession();
      } catch (error) {
        console.error('❌ Login failed:', error.message);
        throw error;
      }
    } else {
      console.log('✅ Using existing session');
    }

    // Set up auto-save on requests
    this.ig.request.end$.subscribe(() => this.saveSession());
  }

  async logout() {
    try {
      await this.ig.account.logout();
      await fs.unlink(this.sessionFile);
      console.log('✅ Logged out and session cleared');
    } catch (error) {
      console.error('❌ Logout error:', error.message);
    }
  }
}
