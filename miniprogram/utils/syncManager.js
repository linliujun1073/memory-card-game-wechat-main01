// syncManager.js - 数据同步管理器

const SYNC_CONFIG_KEY = 'memory_game_sync_config';
const SYNC_HISTORY_KEY = 'memory_game_sync_history';

const SYNC_MODE = {
  INCREMENTAL: 'incremental',
  FULL: 'full'
};

const DEFAULT_CONFIG = {
  enableAutoSync: true,
  syncInterval: 15,
  conflictStrategy: 'timestamp_first',
  lastSyncTime: null,
  pendingChangesCount: 0
};

let autoSyncTimer = null;
let isSyncing = false;

function getConfig() {
  try {
    const data = wx.getStorageSync(SYNC_CONFIG_KEY);
    return data ? { ...DEFAULT_CONFIG, ...data } : DEFAULT_CONFIG;
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

function setConfig(config) {
  try {
    wx.setStorageSync(SYNC_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    return false;
  }
}

function getHistory() {
  try {
    const data = wx.getStorageSync(SYNC_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function addHistoryRecord(record) {
  const history = getHistory();
  history.unshift(record);
  if (history.length > 50) {
    history.splice(50);
  }
  try {
    wx.setStorageSync(SYNC_HISTORY_KEY, JSON.stringify(history));
    return true;
  } catch (e) {
    return false;
  }
}

function clearHistory() {
  try {
    wx.removeStorageSync(SYNC_HISTORY_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

function getStatus() {
  const config = getConfig();
  return {
    isSyncing: isSyncing,
    lastSyncTime: config.lastSyncTime,
    pendingChangesCount: config.pendingChangesCount,
    autoSyncEnabled: config.enableAutoSync
  };
}

function triggerSync(mode) {
  return new Promise((resolve) => {
    if (isSyncing) {
      resolve({ success: false, error: '同步正在进行中' });
      return;
    }

    isSyncing = true;
    const startTime = Date.now();

    setTimeout(() => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      const config = getConfig();
      config.lastSyncTime = endTime;
      setConfig(config);

      const record = {
        startTime,
        endTime,
        duration,
        mode,
        success: true,
        recordsSynced: 0
      };
      addHistoryRecord(record);

      isSyncing = false;
      resolve({
        success: true,
        recordsSynced: record.recordsSynced,
        duration
      });
    }, 1000);
  });
}

function startAutoSync() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
  }

  const config = getConfig();
  if (!config.enableAutoSync) return;

  autoSyncTimer = setInterval(() => {
    triggerSync(SYNC_MODE.INCREMENTAL);
  }, config.syncInterval * 60 * 1000);
}

function stopAutoSync() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
}

function pauseAutoSync() {
  const config = getConfig();
  config.enableAutoSync = false;
  setConfig(config);
  stopAutoSync();
}

function resumeAutoSync() {
  const config = getConfig();
  config.enableAutoSync = true;
  setConfig(config);
  startAutoSync();
}

function setSyncInterval(minutes) {
  const config = getConfig();
  config.syncInterval = minutes;
  setConfig(config);

  if (config.enableAutoSync) {
    startAutoSync();
  }
}

function setConflictStrategy(strategy) {
  const config = getConfig();
  config.conflictStrategy = strategy;
  setConfig(config);
}

function updatePendingCount(count) {
  const config = getConfig();
  config.pendingChangesCount = count;
  setConfig(config);
}

module.exports = {
  SYNC_MODE,
  getConfig,
  setConfig,
  getHistory,
  clearHistory,
  getStatus,
  triggerSync,
  startAutoSync,
  stopAutoSync,
  pauseAutoSync,
  resumeAutoSync,
  setSyncInterval,
  setConflictStrategy,
  updatePendingCount
};