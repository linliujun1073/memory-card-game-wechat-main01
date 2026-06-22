/**
 * 难度分级系统 - 记忆翻牌游戏
 * 支持三种难度等级：简单、普通、困难
 */

// 难度配置
const DIFFICULTY_CONFIG = {
  easy: {
    key: 'easy',
    name: '简单',
    icon: '😊',
    color: '#4CAF50',
    description: '适合新手入门',
    levels: [
      { id: 1, pairs: 3, timeLimit: 45, baseScore: 100, timeBonus: 2 },
      { id: 2, pairs: 4, timeLimit: 50, baseScore: 150, timeBonus: 2 },
      { id: 3, pairs: 5, timeLimit: 55, baseScore: 200, timeBonus: 2 },
      { id: 4, pairs: 6, timeLimit: 60, baseScore: 250, timeBonus: 2 },
      { id: 5, pairs: 7, timeLimit: 65, baseScore: 300, timeBonus: 2 }
    ],
    totalLevels: 5
  },
  normal: {
    key: 'normal',
    name: '普通',
    icon: '🤔',
    color: '#FF9800',
    description: '适合一般玩家',
    levels: [
      { id: 1, pairs: 4, timeLimit: 40, baseScore: 150, timeBonus: 3 },
      { id: 2, pairs: 5, timeLimit: 45, baseScore: 200, timeBonus: 3 },
      { id: 3, pairs: 6, timeLimit: 50, baseScore: 250, timeBonus: 3 },
      { id: 4, pairs: 7, timeLimit: 55, baseScore: 300, timeBonus: 3 },
      { id: 5, pairs: 8, timeLimit: 60, baseScore: 350, timeBonus: 3 },
      { id: 6, pairs: 9, timeLimit: 65, baseScore: 400, timeBonus: 3 },
      { id: 7, pairs: 10, timeLimit: 70, baseScore: 450, timeBonus: 3 }
    ],
    totalLevels: 7
  },
  hard: {
    key: 'hard',
    name: '困难',
    icon: '😈',
    color: '#F44336',
    description: '适合高手挑战',
    levels: [
      { id: 1, pairs: 5, timeLimit: 35, baseScore: 200, timeBonus: 4 },
      { id: 2, pairs: 6, timeLimit: 40, baseScore: 250, timeBonus: 4 },
      { id: 3, pairs: 7, timeLimit: 45, baseScore: 300, timeBonus: 4 },
      { id: 4, pairs: 8, timeLimit: 50, baseScore: 350, timeBonus: 4 },
      { id: 5, pairs: 9, timeLimit: 55, baseScore: 400, timeBonus: 4 },
      { id: 6, pairs: 10, timeLimit: 60, baseScore: 450, timeBonus: 4 },
      { id: 7, pairs: 12, timeLimit: 70, baseScore: 500, timeBonus: 4 },
      { id: 8, pairs: 14, timeLimit: 80, baseScore: 550, timeBonus: 4 }
    ],
    totalLevels: 8
  }
};

// 难度存储键名
const DIFFICULTY_STORAGE_KEY = 'memory_game_difficulty';

/**
 * 获取所有难度列表
 */
function getDifficultyList() {
  return Object.values(DIFFICULTY_CONFIG).map(d => ({
    key: d.key,
    name: d.name,
    icon: d.icon,
    color: d.color,
    description: d.description,
    totalLevels: d.totalLevels
  }));
}

/**
 * 获取指定难度的配置
 */
function getDifficultyConfig(difficulty) {
  return DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.normal;
}

/**
 * 获取当前难度
 */
function getCurrentDifficulty() {
  try {
    const saved = wx.getStorageSync(DIFFICULTY_STORAGE_KEY);
    if (saved && DIFFICULTY_CONFIG[saved]) {
      return saved;
    }
  } catch (e) {
    console.error('[Difficulty] 获取当前难度失败:', e);
  }
  return 'normal';
}

/**
 * 保存当前难度
 */
function saveCurrentDifficulty(difficulty) {
  if (!DIFFICULTY_CONFIG[difficulty]) {
    console.error('[Difficulty] 无效的难度等级:', difficulty);
    return false;
  }
  try {
    wx.setStorageSync(DIFFICULTY_STORAGE_KEY, difficulty);
    return true;
  } catch (e) {
    console.error('[Difficulty] 保存难度失败:', e);
    return false;
  }
}

/**
 * 获取指定难度和关卡的配置
 */
function getLevelConfig(difficulty, levelId) {
  const config = getDifficultyConfig(difficulty);
  return config.levels.find(l => l.id === levelId) || config.levels[0];
}

module.exports = {
  getDifficultyList,
  getDifficultyConfig,
  getCurrentDifficulty,
  saveCurrentDifficulty,
  getLevelConfig,
  DIFFICULTY_CONFIG
};