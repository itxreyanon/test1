export const config = {
  // Set either credentials or cookie path (or both)
  username: 'vemahik1679',        // Leave null if using only cookies
  password: 'zzzz',        // Leave null if using only cookies

  sessionFile: './session.json',              // Serialized session file (auto-saved)
  cookiesFile: './cookies.json',              // Optional: Cookie-based login fallback
  useIrisData: false.
  debug: true                                 // Enable debug logging
};

// Validation logic
if ((!config.username || !config.password) && !config.cookiesFile) {
  console.error('❌ You must provide either username/password or cookiesFile in config.js');
  process.exit(1);
}
