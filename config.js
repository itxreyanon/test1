export const config = {
  instagram: {
    username: process.env.INSTAGRAM_USERNAME,
    password: process.env.INSTAGRAM_PASSWORD,
    allowFreshLogin: process.env.ALLOW_FRESH_LOGIN !== 'false',
    sessionPath: '.session',
    cookiesPath: '.cookies.json'
  },
  bot: {
    prefix: process.env.BOT_PREFIX || '.',
    adminUsers: (process.env.ADMIN_USERS || '').split(',').filter(Boolean),
    enableLogging: process.env.ENABLE_LOGGING !== 'false',
    logLevel: process.env.LOG_LEVEL || 'INFO',
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL) || 300000,
    messageTimeout: parseInt(process.env.MESSAGE_TIMEOUT) || 30000
  },
  realtime: {
    autoReconnect: process.env.REALTIME_AUTO_RECONNECT !== 'false',
    enableTrace: process.env.REALTIME_ENABLE_TRACE === 'true',
    useIrisData: process.env.USE_IRIS_DATA !== 'false',
    reconnectDelay: parseInt(process.env.RECONNECT_DELAY) || 5000
  },
  push: {
    autoReconnect: process.env.PUSH_AUTO_RECONNECT !== 'false',
    enableTrace: process.env.PUSH_ENABLE_TRACE === 'true'
  },
  modules: {
    autoLoad: process.env.AUTO_LOAD_MODULES !== 'false',
    modulesPath: './src/modules',
    enabledModules: (process.env.ENABLED_MODULES || '').split(',').filter(Boolean)
  }
};
