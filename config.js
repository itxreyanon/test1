import dotenv from 'dotenv';
dotenv.config();

export const config = {
  username: process.env.IG_USERNAME,
  password: process.env.IG_PASSWORD,
  sessionFile: process.env.SESSION_FILE || './session.json',
  debug: process.env.DEBUG || false
};

// Validate required config
if (!config.username || !config.password) {
  console.error('❌ Missing required environment variables: IG_USERNAME and IG_PASSWORD');
  process.exit(1);
}
