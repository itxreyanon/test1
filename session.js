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


async loadCookies() {
  try {
    const rawCookies = JSON.parse(await fs.readFile(this.cookiesFile, 'utf8'));

    const jar = new CookieJar();
    for (const c of rawCookies) {
      const cookie = new Cookie({
        key: c.name,
        value: c.value,
        domain: c.domain.replace(/^\./, ''), // Remove leading dot if present
        path: c.path || '/',
        secure: true,
        httpOnly: c.httpOnly || false,
        expires: c.expires ? new Date(c.expires * 1000) : 'Infinity'
      });
      await jar.setCookie(cookie.toString(), `https://${cookie.domain}`);
    }

    this.ig.state.cookieJar = jar;
    await this.ig.state.deserialize(await this.ig.state.serialize()); // ensure internal state matches jar

    const dsUserId = await this.ig.state.extractCookie('ds_user_id');
    if (!dsUserId) throw new Error('ds_user_id cookie not found');

    console.log('✅ Loaded session from browser cookies');
    return true;
  } catch (error) {
    console.error('❌ Failed to load browser cookies:', error.message);
    return false;
  }
}

async login() {
  const sessionLoaded = await this.loadSession();

  if (sessionLoaded) {
    console.log('✅ Using existing session');
  } else if (await this.loadCookies()) {
    console.log('✅ Using browser cookies to restore session');
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
