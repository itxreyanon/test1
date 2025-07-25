import { promises as fs } from 'fs';

import { CookieJar, Cookie } from 'tough-cookie';
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



  async loadCookiesFromJson(path = './cookies.json') {
    const raw = fs.readFileSync(path, 'utf-8');
    const cookies = JSON.parse(raw);

    for (const cookie of cookies) {
      const toughCookie = new tough.Cookie({
        key: cookie.name,
        value: cookie.value,
        domain: cookie.domain.replace(/^\./, ''),
        path: cookie.path || '/',
        secure: cookie.secure !== false,
        httpOnly: cookie.httpOnly !== false,
      });

      await this.ig.state.cookieJar.setCookie(
        toughCookie.toString(),
        `https://${toughCookie.domain}${toughCookie.path}`
      );
    }

    this.log('INFO', `🍪 Loaded ${cookies.length} cookies from file`);
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
      await this.ig.simulate.preLoginFlow();
      await this.ig.account.login(config.username, config.password);
      await this.ig.simulate.postLoginFlow();
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
