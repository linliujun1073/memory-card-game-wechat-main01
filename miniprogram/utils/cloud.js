/**
 * 云数据库工具 - 记忆翻牌游戏（增强版）
 * 集合名: scores, player_progress
 * 支持云端存储 + 本地缓存备用方案
 */

const SCORES_COLLECTION = 'scores';
const PROGRESS_COLLECTION = 'player_progress';

const LOCAL_CACHE_KEYS = {
  SCORES: 'memory_game_local_scores',
  PENDING_SYNC: 'memory_game_pending_sync'
};

function getAppInstance() {
  try {
    return getApp();
  } catch (e) {
    return null;
  }
}

function isCloudAvailable() {
  const app = getAppInstance();
  if (app && app.globalData) {
    return app.globalData.cloudInitialized === true;
  }
  if (wx.cloud && typeof wx.cloud.database === 'function') {
    try {
      const db = wx.cloud.database();
      return db !== null;
    } catch (e) {
      return false;
    }
  }
  return false;
}

function getDB() {
  if (!isCloudAvailable()) {
    return null;
  }
  try {
    return wx.cloud.database();
  } catch (e) {
    console.error('[Cloud] 获取数据库实例失败:', e);
    return null;
  }
}

function getLocalScores() {
  try {
    const data = wx.getStorageSync(LOCAL_CACHE_KEYS.SCORES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('[Cloud] 获取本地缓存失败:', e);
    return [];
  }
}

function setLocalScores(scores) {
  try {
    wx.setStorageSync(LOCAL_CACHE_KEYS.SCORES, JSON.stringify(scores));
    return true;
  } catch (e) {
    console.error('[Cloud] 设置本地缓存失败:', e);
    return false;
  }
}

function addLocalScore(record) {
  const scores = getLocalScores();
  scores.push({
    ...record,
    createTime: Date.now(),
    _id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  });
  if (scores.length > 100) {
    scores.sort((a, b) => b.score - a.score);
    scores.splice(100);
  }
  return setLocalScores(scores);
}

function getPendingSyncData() {
  try {
    const data = wx.getStorageSync(LOCAL_CACHE_KEYS.PENDING_SYNC);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function addPendingSyncData(record) {
  const pending = getPendingSyncData();
  pending.push({
    ...record,
    createTime: Date.now()
  });
  try {
    wx.setStorageSync(LOCAL_CACHE_KEYS.PENDING_SYNC, JSON.stringify(pending));
    return true;
  } catch (e) {
    return false;
  }
}

function clearPendingSyncData() {
  try {
    wx.removeStorageSync(LOCAL_CACHE_KEYS.PENDING_SYNC);
    return true;
  } catch (e) {
    return false;
  }
}

function addScore(record) {
  const result = {
    success: false,
    savedTo: 'none',
    error: null
  };

  const currentUser = getCurrentUser();

  addLocalScore({
    level: record.level,
    difficulty: record.difficulty || 'normal',
    score: record.score,
    isWin: !!record.isWin,
    remainingTime: record.remainingTime || 0,
    nickName: currentUser?.nickName || record.nickName || '玩家'
  });

  if (!isCloudAvailable()) {
    result.success = true;
    result.savedTo = 'local';
    addPendingSyncData(record);
    return Promise.resolve(result);
  }

  const db = getDB();
  if (!db) {
    result.success = true;
    result.savedTo = 'local';
    addPendingSyncData(record);
    return Promise.resolve(result);
  }

  return new Promise((resolve) => {
    const user = getCurrentUser();
    const dataToSave = {
      level: record.level,
      difficulty: record.difficulty || 'normal',
      score: record.score,
      isWin: !!record.isWin,
      remainingTime: record.remainingTime || 0,
      createTime: Date.now(),
      nickName: user?.nickName || '玩家',
      avatarUrl: user?.avatarUrl || ''
    };

    db.collection(SCORES_COLLECTION)
      .add({ data: dataToSave })
      .then(res => {
        result.success = true;
        result.savedTo = 'cloud';
        result._id = res._id;
        resolve(result);
      })
      .catch(err => {
        result.success = true;
        result.savedTo = 'local';
        result.error = err.errMsg;
        addPendingSyncData(record);
        resolve(result);
      });
  });
}

function syncPendingData() {
  if (!isCloudAvailable()) {
    return Promise.resolve({ synced: 0, failed: 0 });
  }
  const pending = getPendingSyncData();
  if (pending.length === 0) {
    return Promise.resolve({ synced: 0, failed: 0 });
  }
  const db = getDB();
  if (!db) {
    return Promise.resolve({ synced: 0, failed: pending.length });
  }
  return new Promise((resolve) => {
    let synced = 0;
    let failed = 0;
    const remaining = [];
    pending.forEach((record) => {
      db.collection(SCORES_COLLECTION)
        .add({ data: { ...record, createTime: record.createTime || Date.now() } })
        .then(() => {
          synced++;
          if (synced + failed === pending.length) {
            clearPendingSyncData();
            if (remaining.length > 0) {
              wx.setStorageSync(LOCAL_CACHE_KEYS.PENDING_SYNC, JSON.stringify(remaining));
            }
            resolve({ synced, failed });
          }
        })
        .catch(() => {
          failed++;
          remaining.push(record);
          if (synced + failed === pending.length) {
            clearPendingSyncData();
            if (remaining.length > 0) {
              wx.setStorageSync(LOCAL_CACHE_KEYS.PENDING_SYNC, JSON.stringify(remaining));
            }
            resolve({ synced, failed });
          }
        });
    });
  });
}

function getHighestScore(difficulty = null) {
  if (isCloudAvailable()) {
    const db = getDB();
    if (db) {
      return new Promise((resolve) => {
        const whereClause = difficulty ? { difficulty } : {};
        db.collection(SCORES_COLLECTION)
          .where(whereClause)
          .orderBy('score', 'desc')
          .limit(1)
          .get()
          .then(res => {
            if (res.data && res.data.length > 0) {
              const cloudScore = res.data[0].score || 0;
              const localScores = getLocalScores().filter(s => !difficulty || s.difficulty === difficulty);
              const localMax = localScores.length > 0 ? Math.max(...localScores.map(s => s.score)) : 0;
              resolve(Math.max(cloudScore, localMax));
            } else {
              const localScores = getLocalScores().filter(s => !difficulty || s.difficulty === difficulty);
              const localMax = localScores.length > 0 ? Math.max(...localScores.map(s => s.score)) : 0;
              resolve(localMax);
            }
          })
          .catch(() => {
            const localScores = getLocalScores().filter(s => !difficulty || s.difficulty === difficulty);
            const localMax = localScores.length > 0 ? Math.max(...localScores.map(s => s.score)) : 0;
            resolve(localMax);
          });
      });
    }
  }
  const localScores = getLocalScores().filter(s => !difficulty || s.difficulty === difficulty);
  const localMax = localScores.length > 0 ? Math.max(...localScores.map(s => s.score)) : 0;
  return Promise.resolve(localMax);
}

function getRecentScores(limit = 50, difficulty = null) {
  const mergeData = (cloudData, localData) => {
    let merged = [...cloudData, ...localData];
    if (difficulty) {
      merged = merged.filter(item => item.difficulty === difficulty);
    }
    const uniqueMap = new Map();
    merged.forEach(item => {
      const key = `${item.createTime}_${item.score}_${item.level}_${item.difficulty || 'normal'}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });
    const sorted = Array.from(uniqueMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return sorted.map((item, idx) => ({
      rank: idx + 1,
      level: item.level,
      difficulty: item.difficulty || 'normal',
      score: item.score,
      remainingTime: item.remainingTime || 0,
      isWin: item.isWin,
      createTime: item.createTime,
      createTimeText: formatTime(item.createTime),
      rankText: getRankText(idx + 1),
      originalRank: idx + 1,
      hasOpenid: !!item._openid,
      nickName: item.nickName || '玩家',
      avatarUrl: item.avatarUrl || ''
    }));
  };

  if (!isCloudAvailable()) {
    return Promise.resolve(mergeData([], getLocalScores()));
  }
  const db = getDB();
  if (!db) {
    return Promise.resolve(mergeData([], getLocalScores()));
  }
  return new Promise((resolve) => {
    db.collection(SCORES_COLLECTION)
      .orderBy('score', 'desc')
      .limit(limit)
      .get()
      .then(res => {
        resolve(mergeData(res.data || [], getLocalScores()));
      })
      .catch(err => {
        console.error('[Cloud] 获取排行榜失败:', err);
        resolve(mergeData([], getLocalScores()));
      });
  });
}

function getAllUsersScores(options = {}) {
  const { limit = 50, includeLocal = true } = options;
  return new Promise((resolve) => {
    const debugInfo = { cloudAvailable: isCloudAvailable(), timestamp: Date.now(), queryLimit: limit };
    wx.getNetworkType({
      success: (networkRes) => {
        debugInfo.networkType = networkRes.networkType;
        if (!isCloudAvailable()) {
          resolve({ data: getLocalScores().slice(0, limit), source: 'local', error: '云开发未初始化', debugInfo });
          return;
        }
        const db = getDB();
        if (!db) {
          resolve({ data: getLocalScores().slice(0, limit), source: 'local', error: '数据库连接失败', debugInfo });
          return;
        }
        db.collection(SCORES_COLLECTION)
          .orderBy('score', 'desc')
          .limit(limit)
          .get()
          .then(res => {
            let finalData = res.data || [];
            if (includeLocal) {
              const merged = [...finalData, ...getLocalScores()];
              const uniqueMap = new Map();
              merged.forEach(item => {
                const key = `${item.createTime}_${item.score}_${item.level}`;
                if (!uniqueMap.has(key)) uniqueMap.set(key, item);
              });
              finalData = Array.from(uniqueMap.values()).sort((a, b) => b.score - a.score).slice(0, limit);
            }
            const processedData = finalData.map((item, idx) => ({
              rank: idx + 1,
              level: item.level,
              difficulty: item.difficulty || 'normal',
              score: item.score,
              remainingTime: item.remainingTime || 0,
              isWin: item.isWin,
              createTime: item.createTime,
              createTimeText: formatTime(item.createTime),
              rankText: getRankText(idx + 1),
              originalRank: idx + 1,
              hasOpenid: !!item._openid,
              nickName: item.nickName || '玩家',
              avatarUrl: item.avatarUrl || ''
            }));
            resolve({ data: processedData, source: 'cloud+local', error: null, debugInfo });
          })
          .catch(err => {
            resolve({ data: getLocalScores().slice(0, limit), source: 'local', error: err.message, debugInfo });
          });
      },
      fail: () => {
        resolve({ data: getLocalScores().slice(0, limit), source: 'local', error: '无法获取网络状态', debugInfo });
      }
    });
  });
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getRankText(rank) {
  const texts = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return texts[rank] || `第${rank}名`;
}

function getLevelProgress(difficulty = null) {
  if (isCloudAvailable()) {
    const db = getDB();
    if (db) {
      return new Promise((resolve) => {
        const whereClause = { isWin: true };
        if (difficulty) whereClause.difficulty = difficulty;
        db.collection(SCORES_COLLECTION)
          .where(whereClause)
          .orderBy('level', 'desc')
          .limit(1)
          .get()
          .then(res => {
            if (res.data && res.data.length > 0) {
              const cloudLevel = res.data[0].level || 0;
              const localScores = getLocalScores().filter(s => s.isWin && (!difficulty || s.difficulty === difficulty));
              const localMaxLevel = localScores.length > 0 ? Math.max(...localScores.map(s => s.level)) : 0;
              resolve(Math.max(cloudLevel, localMaxLevel));
            } else {
              const localScores = getLocalScores().filter(s => s.isWin && (!difficulty || s.difficulty === difficulty));
              const localMaxLevel = localScores.length > 0 ? Math.max(...localScores.map(s => s.level)) : 0;
              resolve(localMaxLevel);
            }
          })
          .catch(() => {
            const localScores = getLocalScores().filter(s => s.isWin && (!difficulty || s.difficulty === difficulty));
            resolve(localScores.length > 0 ? Math.max(...localScores.map(s => s.level)) : 0);
          });
      });
    }
  }
  const localScores = getLocalScores().filter(s => s.isWin && (!difficulty || s.difficulty === difficulty));
  return Promise.resolve(localScores.length > 0 ? Math.max(...localScores.map(s => s.level)) : 0);
}

function getLevelConfig(levelId) {
  const cfg = { 1: { pairs: 4, time: 60 }, 2: { pairs: 6, time: 90 }, 3: { pairs: 8, time: 120 } };
  return cfg[levelId] || cfg[1];
}

function syncProgress(data) {
  if (!isCloudAvailable()) return Promise.resolve(false);
  const db = getDB();
  if (!db) return Promise.resolve(false);
  return new Promise((resolve) => {
    db.collection(PROGRESS_COLLECTION)
      .where({ _openid: 'self' })
      .get()
      .then(res => {
        const progressData = {
          highestLevel: data.highestLevel || 0,
          highestScore: data.highestScore || 0,
          totalWins: data.totalWins || 0,
          totalGames: data.totalGames || 0,
          achievements: data.achievements || {},
          updateTime: Date.now()
        };
        if (res.data && res.data.length > 0) {
          db.collection(PROGRESS_COLLECTION).doc(res.data[0]._id).set({ data: progressData }).then(() => resolve(true)).catch(() => resolve(false));
        } else {
          db.collection(PROGRESS_COLLECTION).add({ data: progressData }).then(() => resolve(true)).catch(() => resolve(false));
        }
      })
      .catch(() => resolve(false));
  });
}

function getProgress() {
  if (!isCloudAvailable()) return Promise.resolve(null);
  const db = getDB();
  if (!db) return Promise.resolve(null);
  return new Promise((resolve) => {
    db.collection(PROGRESS_COLLECTION)
      .where({ _openid: 'self' })
      .get()
      .then(res => resolve(res.data && res.data.length > 0 ? res.data[0] : null))
      .catch(() => resolve(null));
  });
}

function getCloudStatus() {
  const app = getAppInstance();
  return { initialized: isCloudAvailable(), useLocalStorage: !isCloudAvailable(), envId: app?.globalData?.cloudEnvId || '' };
}

function uploadFile(filePath, cloudPath) {
  return new Promise((resolve) => {
    if (!isCloudAvailable()) { resolve({ success: false, error: '云开发不可用' }); return; }
    wx.cloud.uploadFile({
      cloudPath: cloudPath || `game_screenshots/${Date.now()}.png`,
      filePath: filePath,
      success: (res) => resolve({ success: true, fileID: res.fileID }),
      fail: (err) => resolve({ success: false, error: err.errMsg })
    });
  });
}

function downloadFile(fileID) {
  return new Promise((resolve) => {
    if (!isCloudAvailable()) { resolve({ success: false, error: '云开发不可用' }); return; }
    wx.cloud.downloadFile({
      fileID: fileID,
      success: (res) => resolve({ success: true, tempFilePath: res.tempFilePath }),
      fail: (err) => resolve({ success: false, error: err.errMsg })
    });
  });
}

function deleteFile(fileID) {
  return new Promise((resolve) => {
    if (!isCloudAvailable()) { resolve({ success: false, error: '云开发不可用' }); return; }
    wx.cloud.deleteFile({ fileList: [fileID], success: (res) => resolve({ success: res.fileList[0].status === 0 }), fail: (err) => resolve({ success: false, error: err.errMsg }) });
  });
}

function saveGameScreenshot(filePath, gameInfo = {}) {
  return new Promise((resolve) => {
    if (!filePath) { resolve({ success: false, error: '文件路径为空' }); return; }
    const timestamp = Date.now();
    const cloudPath = `game_screenshots/${timestamp}_level${gameInfo.level || 1}.png`;
    uploadFile(filePath, cloudPath).then(uploadResult => {
      if (!uploadResult.success) { resolve(uploadResult); return; }
      const db = getDB();
      if (db) {
        db.collection('screenshots').add({ data: { fileID: uploadResult.fileID, level: gameInfo.level || 1, score: gameInfo.score || 0, isWin: gameInfo.isWin || false, createTime: timestamp, gameInfo } })
          .then(() => resolve({ success: true, fileID: uploadResult.fileID }))
          .catch(() => resolve({ success: true, fileID: uploadResult.fileID, error: '截图记录保存失败' }));
      } else {
        resolve({ success: true, fileID: uploadResult.fileID });
      }
    });
  });
}

function getScreenshots(limit = 20) {
  return new Promise((resolve) => {
    if (!isCloudAvailable()) { resolve([]); return; }
    const db = getDB();
    if (!db) { resolve([]); return; }
    db.collection('screenshots').orderBy('createTime', 'desc').limit(limit).get().then(res => resolve(res.data || [])).catch(() => resolve([]));
  });
}

function getUserInfo() {
  return new Promise((resolve) => {
    const app = getAppInstance();
    if (app && app.globalData.userInfo) { resolve({ ...app.globalData.userInfo, success: true }); return; }
    wx.getUserProfile({
      desc: '用于识别用户身份和保存游戏记录',
      success: (res) => {
        const userInfo = res.userInfo || {};
        const userData = { nickName: userInfo.nickName || '玩家', avatarUrl: userInfo.avatarUrl || '', openid: '', success: true };
        if (isCloudAvailable()) {
          const db = getDB();
          if (db) {
            db.collection('scores').limit(0).get()
              .then(() => { userData.openid = 'cloud_user'; if (app) app.globalData.userInfo = userData; resolve(userData); })
              .catch(() => { userData.openid = 'local_user'; if (app) app.globalData.userInfo = userData; resolve(userData); });
          } else { userData.openid = 'local_user'; if (app) app.globalData.userInfo = userData; resolve(userData); }
        } else { userData.openid = 'local_user'; if (app) app.globalData.userInfo = userData; resolve(userData); }
      },
      fail: (err) => {
        const defaultUser = { nickName: '玩家', avatarUrl: '', openid: 'local_user', success: false, error: err.errMsg };
        if (app) app.globalData.userInfo = defaultUser;
        resolve(defaultUser);
      }
    });
  });
}

function getCurrentUser() {
  const app = getAppInstance();
  return app?.globalData?.userInfo || null;
}

function setUserInfo(userInfo) {
  const app = getAppInstance();
  if (app) app.globalData.userInfo = userInfo;
}

function runSyncDiagnostics() {
  return new Promise((resolve) => {
    const diagnostics = { timestamp: Date.now(), network: {}, cloud: {}, database: {}, permissions: {}, suggestions: [] };
    wx.getNetworkType({
      success: (res) => {
        diagnostics.network.type = res.networkType;
        diagnostics.network.isConnected = res.networkType !== 'none';
        diagnostics.cloud.available = isCloudAvailable();
        const db = getDB();
        diagnostics.database.connected = db !== null;
        if (!db) { diagnostics.suggestions.push('无法连接到数据库'); resolve(diagnostics); return; }
        db.collection(SCORES_COLLECTION).limit(1).get()
          .then(res => {
            diagnostics.database.querySuccess = true;
            if (res.data && res.data.length > 0) diagnostics.permissions.canRead = true;
            db.collection(SCORES_COLLECTION).count()
              .then(countRes => { diagnostics.database.totalCount = countRes.total || 0; resolve(diagnostics); })
              .catch(() => resolve(diagnostics));
          })
          .catch(err => { diagnostics.database.queryError = err.errMsg; resolve(diagnostics); });
      },
      fail: () => resolve(diagnostics)
    });
  });
}

module.exports = {
  addScore, getHighestScore, getRecentScores, getLevelProgress, getLevelConfig,
  syncProgress, getProgress, getLocalScores, addLocalScore, syncPendingData, getPendingSyncData,
  isCloudAvailable, getCloudStatus, getAllUsersScores, runSyncDiagnostics,
  getUserInfo, getCurrentUser, setUserInfo, uploadFile, downloadFile, deleteFile,
  saveGameScreenshot, getScreenshots
};