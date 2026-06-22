// result.js - 游戏结果页面
const storageUtil = require('../../utils/storage');

Page({
  data: {
    isWin: false,
    level: 1,
    difficulty: 'normal',
    score: 0,
    mistakes: 0,
    timeLeft: 0,
    duration: 0,
    flips: 0,
    matches: 0,
    isNewRecord: false,
    unlockedAchievements: []
  },

  onLoad(options) {
    if (options.data) {
      try {
        const gameData = JSON.parse(decodeURIComponent(options.data));
        this.setData({
          isWin: gameData.isWin,
          level: gameData.level,
          difficulty: gameData.difficulty,
          score: gameData.score,
          mistakes: gameData.mistakes,
          timeLeft: gameData.timeLeft,
          duration: gameData.duration,
          flips: gameData.flips,
          matches: gameData.matches
        });

        const progress = storageUtil.getPlayerProgress();
        const isNewRecord = gameData.score >= progress.highestScore && gameData.isWin;
        this.setData({ isNewRecord });
      } catch (e) {
        console.error('[Result] 解析游戏数据失败:', e);
      }
    }
  },

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes + '分' + remainingSeconds + '秒';
  },

  getDifficultyLabel(difficulty) {
    const labels = { easy: '简单', normal: '普通', hard: '困难' };
    return labels[difficulty] || '普通';
  },

  onPlayAgain() {
    wx.redirectTo({
      url: '/pages/game/game?level=' + this.data.level + '&difficulty=' + this.data.difficulty
    });
  },

  onNextLevel() {
    wx.redirectTo({
      url: '/pages/game/game?level=' + (this.data.level + 1) + '&difficulty=' + this.data.difficulty
    });
  },

  onBackToLevelSelect() {
    wx.redirectTo({
      url: '/pages/level/level?difficulty=' + this.data.difficulty
    });
  },

  onBackToHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});