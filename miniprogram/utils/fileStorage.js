// fileStorage.js - 文件存储工具

const FILE_STORAGE_KEY = 'memory_game_file_cache';

function saveFile(key, data) {
  try {
    const cache = getCache();
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    wx.setStorageSync(FILE_STORAGE_KEY, JSON.stringify(cache));
    return true;
  } catch (e) {
    console.error('[FileStorage] 保存文件失败:', e);
    return false;
  }
}

function getFile(key) {
  try {
    const cache = getCache();
    if (cache[key]) {
      return cache[key].data;
    }
    return null;
  } catch (e) {
    console.error('[FileStorage] 获取文件失败:', e);
    return null;
  }
}

function removeFile(key) {
  try {
    const cache = getCache();
    if (cache[key]) {
      delete cache[key];
      wx.setStorageSync(FILE_STORAGE_KEY, JSON.stringify(cache));
    }
    return true;
  } catch (e) {
    console.error('[FileStorage] 删除文件失败:', e);
    return false;
  }
}

function clearCache() {
  try {
    wx.removeStorageSync(FILE_STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('[FileStorage] 清除缓存失败:', e);
    return false;
  }
}

function getCache() {
  try {
    const data = wx.getStorageSync(FILE_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function getCacheSize() {
  try {
    const cache = getCache();
    let size = 0;
    for (const key in cache) {
      const item = cache[key];
      if (item.data) {
        size += JSON.stringify(item.data).length;
      }
    }
    return size;
  } catch (e) {
    return 0;
  }
}

module.exports = {
  saveFile,
  getFile,
  removeFile,
  clearCache,
  getCacheSize
};