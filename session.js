import { promises as fs } from 'fs';
import tough from 'tough-cookie';

import { config } from './config.js';

export class SessionManager {
  constructor(ig) {
    this.ig = ig;
    this.sessionFile = config.sessionFile || '.session/session.json';
    this.cookiesFile = config.cookiesFile || '.session/cookies.json';
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




 async login() {
  try {
    const username = config.username;

    if (!username) {
      throw new Error('❌ INSTAGRAM USERNAME is missing from config or environment.');
    }

    this.ig.state.generateDevice(username);

    // Load cookies from file
    await this.loadCookiesFromJson('./cookies.json');

    try {
      await this.ig.account.currentUser(); // test session validity
      console.info('✅ Logged in using saved cookies');
      this.startMessageListener();
    } catch (err) {
      console.error('❌ Invalid or expired cookies:', err.message);
      throw err;
    }
  } catch (error) {
    console.error('❌ Failed to initialize bot:', error.message);
    throw error;
  }

  this.ig.request.end$.subscribe(() => this.saveSession());
}
async loadCookiesFromJson(path = './cookies.json') {
  try {
    const raw = fs.readFileSync(path, 'utf-8');
    const cookies = JSON.parse(raw);

    for (const cookie of cookies) {
      const toughCookie = new tough.Cookie({
        key: cookie.name,
        value: cookie.value,
        domain: cookie.domain.replace(/^\./, ''),
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
      });

      await this.ig.state.cookieJar.setCookie(
        toughCookie.toString(),
        `https://${cookie.domain}${cookie.path}`
      );
    }

    console.info('🍪 Loaded Instagram cookies from file');
  } catch (error) {
    console.error('❌ Failed to load cookies:', error.message);
    throw error;
  }
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
