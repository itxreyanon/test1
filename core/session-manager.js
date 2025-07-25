import fs from 'fs';
import path from 'path';
import tough from 'tough-cookie';

export class SessionManager {
  constructor(sessionPath = '.session') {
    this.sessionPath = sessionPath;
    this.cookiesPath = path.join(sessionPath, 'cookies.json');
    this.statePath = path.join(sessionPath, 'state.json');
    this.ensureSessionDirectory();
  }

  ensureSessionDirectory() {
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
  }

  async saveCookies(cookieJar) {
    try {
      const cookies = [];
      const store = cookieJar.store;
      
      for (const domain of Object.keys(store.idx)) {
        for (const path of Object.keys(store.idx[domain])) {
          for (const key of Object.keys(store.idx[domain][path])) {
            const cookie = store.idx[domain][path][key];
            cookies.push({
              name: cookie.key,
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path,
              secure: cookie.secure,
              httpOnly: cookie.httpOnly,
              expires: cookie.expires
            });
          }
        }
      }

      fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save cookies:', error.message);
      return false;
    }
  }

  async loadCookies(ig) {
    try {
      if (!fs.existsSync(this.cookiesPath)) {
        return false;
      }

      const raw = fs.readFileSync(this.cookiesPath, 'utf-8');
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

        await ig.state.cookieJar.setCookie(
          toughCookie.toString(),
          `https://${toughCookie.domain}${toughCookie.path}`
        );
      }

      return true;
    } catch (error) {
      console.error('Failed to load cookies:', error.message);
      return false;
    }
  }

  saveState(state) {
    try {
      fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save state:', error.message);
      return false;
    }
  }

  loadState() {
    try {
      if (!fs.existsSync(this.statePath)) {
        return null;
      }
      const raw = fs.readFileSync(this.statePath, 'utf-8');
      return JSON.parse(raw);
    } catch (error) {
      console.error('Failed to load state:', error.message);
      return null;
    }
  }

  clearSession() {
    try {
      if (fs.existsSync(this.cookiesPath)) {
        fs.unlinkSync(this.cookiesPath);
      }
      if (fs.existsSync(this.statePath)) {
        fs.unlinkSync(this.statePath);
      }
      return true;
    } catch (error) {
      console.error('Failed to clear session:', error.message);
      return false;
    }
  }
}
