/**
 * 数据存储工具 - 记忆翻牌游戏
 * 支持本地存储和云端同步
 */

const STORAGE_KEYS = {
  PLAYER_PROGRESS: 'memory_game_progress',
  GAME_SETTINGS: 'memory_game_settings',
  ACHIEVEMENTS: 'memory_game_achievements'
};

const DEFAULT_SETTINGS = {
  soundEnabled: true,
  musicEnabled: true,
  vibrationEnabled: true,
  difficulty: 'normal',
  autoSave: true,
  theme: 'green'
};

const ACHIEVEMENT_DEFINITIONS = {
  first_win: { id: 'first_win', name: '初次胜利', description: '完成第一次通关', icon: '🏆', unlocked: false },
  perfect_win: { id: 'perfect_win', name: '完美通关', description: '无错误配对通关', icon: '⭐', unlocked: false },
  all_levels: { id: 'all_levels', name: '全部通关', description: '通关所有关卡', icon: '👑', unlocked: false },
  high_score: { id: 'high_score', name: '高分达人', description: '获得10000分以上', icon: '💎', unlocked: false },
  five_wins: { id: 'five_wins', name: '连胜五次', description: '连续通关5次', icon: '🔥', unlocked: false }
};

function getLocalStorage(key) {
  try {
    const data = wx.getStorageSync(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('[Storage] 获取本地存储失败:', e);
    return null;
  }
}

function setLocalStorage(key, value) {
  try {
    wx.setStorageSync(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('[Storage] 设置本地存储失败:', e);
    return false;
  }
}

function getPlayerProgress() {
  const data = getLocalStorage(STORAGE_KEYS.PLAYER_PROGRESS);
  return data || { highestLevel: 0, highestScore: 0, totalWins: 0, totalGames: 0, currentStreak: 0, perfectGames: 0 };
}

function setPlayerProgress(progress) {
  return setLocalStorage(STORAGE_KEYS.PLAYER_PROGRESS, progress);
}

function updatePlayerProgress(isWin, level, score, mistakes) {
  const progress = getPlayerProgress();
  progress.totalGames++;
  if (isWin) {
    progress.totalWins++;
    progress.currentStreak++;
    if (level > progress.highestLevel) progress.highestLevel = level;
    if (score > progress.highestScore) progress.highestScore = score;
    if (mistakes === 0) progress.perfectGames++;
  } else {
    progress.currentStreak = 0;
  }
  return setPlayerProgress(progress);
}

function getGameSettings() {
  const data = getLocalStorage(STORAGE_KEYS.GAME_SETTINGS);
  return Object.assign({}, DEFAULT_SETTINGS, data);
}

function setGameSettings(settings) {
  return setLocalStorage(STORAGE_KEYS.GAME_SETTINGS, settings);
}

function resetGameSettings() {
  return setLocalStorage(STORAGE_KEYS.GAME_SETTINGS, DEFAULT_SETTINGS);
}

function getAchievements() {
  const data = getLocalStorage(STORAGE_KEYS.ACHIEVEMENTS);
  if (data) {
    return Object.values(ACHIEVEMENT_DEFINITIONS).map(a => ({
      ...a,
      unlocked: data[a.id]?.unlocked || false,
      unlockedTime: data[a.id]?.unlockedTime || null
    }));
  }
  return Object.values(ACHIEVEMENT_DEFINITIONS);
}

function setAchievement(id, unlocked) {
  const data = getLocalStorage(STORAGE_KEYS.ACHIEVEMENTS) || {};
  if (!data[id]) data[id] = {};
  data[id].unlocked = unlocked;
  if (unlocked && !data[id].unlockedTime) {
    data[id].unlockedTime = Date.now();
  }
  return setLocalStorage(STORAGE_KEYS.ACHIEVEMENTS, data);
}

function checkAndUnlockAchievements(gameData) {
  const { isWin, level, score, mistakes, totalWins } = gameData;
  const achievements = getAchievements();
  let unlocked = [];

  if (isWin && !achievements.find(a => a.id === 'first_win')?.unlocked) {
    setAchievement('first_win', true);
    unlocked.push('first_win');
  }
  if (isWin && mistakes === 0 && !achievements.find(a => a.id === 'perfect_win')?.unlocked) {
    setAchievement('perfect_win', true);
    unlocked.push('perfect_win');
  }
  if (score >= 10000 && !achievements.find(a => a.id === 'high_score')?.unlocked) {
    setAchievement('high_score', true);
    unlocked.push('high_score');
  }
  if (totalWins >= 5 && !achievements.find(a => a.id === 'five_wins')?.unlocked) {
    setAchievement('five_wins', true);
    unlocked.push('five_wins');
  }

  return unlocked;
}

function exportData() {
  const data = {
    progress: getPlayerProgress(),
    settings: getGameSettings(),
    achievements: getLocalStorage(STORAGE_KEYS.ACHIEVEMENTS),
    exportTime: Date.now()
  };
  return JSON.stringify(data, null, 2);
}

function importData(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (data.progress) setPlayerProgress(data.progress);
    if (data.settings) setGameSettings(data.settings);
    if (data.achievements) setLocalStorage(STORAGE_KEYS.ACHIEVEMENTS, data.achievements);
    return true;
  } catch (e) {
    console.error('[Storage] 导入数据失败:', e);
    return false;
  }
}

module.exports = {
  getPlayerProgress,
  setPlayerProgress,
  updatePlayerProgress,
  getGameSettings,
  setGameSettings,
  resetGameSettings,
  getAchievements,
  setAchievement,
  checkAndUnlockAchievements,
  exportData,
  importData
};