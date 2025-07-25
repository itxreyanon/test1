import { promises as fs } from 'fs';
import { config } from './config.js';

export class SessionManager {
  constructor(ig) {
    this.ig = ig;
    this.sessionFile = config.sessionFile;
    this.cookiesFile = config.cookiesFile; // e.g., 'cookies.json'
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
    } catch {
      return false;
    }
  }

  async loadCookies() {
    try {
      const cookieData = await fs.readFile(this.cookiesFile, 'utf8');
      const parsed = JSON.parse(cookieData);

      await this.ig.state.deserialize(parsed);
      console.log('✅ Loaded session from cookies');
      return true;
    } catch (error) {
      console.log('ℹ️ No valid cookies found, will try credentials next');
      return false;
    }
  }

async login() {
  const sessionLoaded = await this.loadSession();

  if (sessionLoaded) {
    console.log('✅ Using existing session');
  } else if (await this.loadCookies()) {
    console.log('✅ Using cookies to restore session');
    await this.saveSession();
  } else {
    console.log('🔐 Logging in with credentials...');
    try {
      await this.ig.simulate.preLoginFlow(); // ← Add this
      await this.ig.account.login(config.username, config.password);
      await this.ig.simulate.postLoginFlow(); // ← And this
      console.log('✅ Login successful');
      await this.saveSession();
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  }

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
