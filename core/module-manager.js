import fs from 'fs';
import path from 'path';

export class ModuleManager {
  constructor(bot, logger) {
    this.bot = bot;
    this.logger = logger;
    this.modules = new Map();
    this.moduleConfigs = new Map();
    this.modulesPath = bot.config.modules.modulesPath || './modules';
  }

  async loadModules() {
    try {
      this.logger.info('📦 Loading modules...');
      
      if (!fs.existsSync(this.modulesPath)) {
        fs.mkdirSync(this.modulesPath, { recursive: true });
        this.logger.warn(`📁 Created modules directory: ${this.modulesPath}`);
        return;
      }

      const moduleFiles = fs.readdirSync(this.modulesPath)
        .filter(file => file.endsWith('.js') && !file.startsWith('_'));

      for (const file of moduleFiles) {
        await this.loadModule(file);
      }

      this.logger.info(`✅ Loaded ${this.modules.size} modules`);
    } catch (error) {
      this.logger.error('❌ Failed to load modules:', error);
    }
  }

  async loadModule(filename) {
    try {
      const modulePath = path.join(this.modulesPath, filename);
      const moduleName = path.basename(filename, '.js');

      // Check if module is enabled
      const enabledModules = this.bot.config.modules.enabledModules;
      if (enabledModules.length > 0 && !enabledModules.includes(moduleName)) {
        this.logger.debug(`⏭️ Skipping disabled module: ${moduleName}`);
        return;
      }

      // Dynamic import
      const moduleExports = await import(path.resolve(modulePath));
      const ModuleClass = moduleExports.default || moduleExports[moduleName];

      if (!ModuleClass) {
        this.logger.warn(`⚠️ No default export found in module: ${moduleName}`);
        return;
      }

      // Load module config if exists
      const configPath = path.join(this.modulesPath, `${moduleName}.config.js`);
      let moduleConfig = {};
      if (fs.existsSync(configPath)) {
        const configExports = await import(path.resolve(configPath));
        moduleConfig = configExports.default || configExports.config || {};
      }

      // Instantiate module
      const moduleInstance = new ModuleClass(this.bot, moduleConfig);
      
      // Initialize module
      if (typeof moduleInstance.initialize === 'function') {
        await moduleInstance.initialize();
      }

      this.modules.set(moduleName, moduleInstance);
      this.moduleConfigs.set(moduleName, moduleConfig);
      
      this.logger.info(`✅ Loaded module: ${moduleName}`);
    } catch (error) {
      this.logger.error(`❌ Failed to load module ${filename}:`, error);
    }
  }

  async unloadModule(moduleName) {
    try {
      const module = this.modules.get(moduleName);
      if (!module) {
        this.logger.warn(`⚠️ Module not found: ${moduleName}`);
        return false;
      }

      // Call cleanup if available
      if (typeof module.cleanup === 'function') {
        await module.cleanup();
      }

      this.modules.delete(moduleName);
      this.moduleConfigs.delete(moduleName);
      
      this.logger.info(`🗑️ Unloaded module: ${moduleName}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to unload module ${moduleName}:`, error);
      return false;
    }
  }

  async reloadModule(moduleName) {
    try {
      await this.unloadModule(moduleName);
      await this.loadModule(`${moduleName}.js`);
      this.logger.info(`🔄 Reloaded module: ${moduleName}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to reload module ${moduleName}:`, error);
      return false;
    }
  }

  async unloadModules() {
    this.logger.info('🗑️ Unloading all modules...');
    
    for (const [moduleName] of this.modules) {
      await this.unloadModule(moduleName);
    }
  }

  getModule(moduleName) {
    return this.modules.get(moduleName);
  }

  getLoadedModules() {
    return Array.from(this.modules.keys());
  }

  getModuleConfig(moduleName) {
    return this.moduleConfigs.get(moduleName);
  }

  isModuleLoaded(moduleName) {
    return this.modules.has(moduleName);
  }

  async executeModuleMethod(moduleName, methodName, ...args) {
    try {
      const module = this.modules.get(moduleName);
      if (!module) {
        throw new Error(`Module not found: ${moduleName}`);
      }

      if (typeof module[methodName] !== 'function') {
        throw new Error(`Method ${methodName} not found in module ${moduleName}`);
      }

      return await module[methodName](...args);
    } catch (error) {
      this.logger.error(`❌ Failed to execute ${moduleName}.${methodName}:`, error);
      throw error;
    }
  }
}
