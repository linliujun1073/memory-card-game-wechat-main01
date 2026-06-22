// level.js - 关卡选择页面
const cloudUtil = require('../../utils/cloud');
const difficultyUtil = require('../../utils/difficulty');

Page({
  data: {
    levels: [],
    loading: true,
    levelProgress: 0,
    difficultyList: [],
    currentDifficulty: 'normal',
    currentDifficultyConfig: null
  },

  onLoad(options) {
    const difficulty = options.difficulty || difficultyUtil.getCurrentDifficulty();
    const difficultyConfig = difficultyUtil.getDifficultyConfig(difficulty);
    this.setData({
      difficultyList: difficultyUtil.getDifficultyList(),
      currentDifficulty: difficulty,
      currentDifficultyConfig: difficultyConfig
    });
    this.loadProgress();
  },

  onShow() {
    this.loadProgress();
  },

  onUnload() {},

  loadProgress() {
    const difficulty = this.data.currentDifficulty;
    const difficultyConfig = this.data.currentDifficultyConfig;
    const totalLevels = difficultyConfig ? difficultyConfig.totalLevels : 5;

    const levels = difficultyConfig ? difficultyConfig.levels.map((level, index) => ({
      id: index + 1,
      pairs: level.pairs,
      time: level.timeLimit,
      baseScore: level.baseScore,
      unlocked: true,
      passed: false
    })) : [];

    if (cloudUtil && cloudUtil.getLevelProgress) {
      cloudUtil.getLevelProgress(difficulty)
        .then(levelProgress => {
          const updatedLevels = levels.map((level, index) => ({
            ...level,
            unlocked: index === 0 || index <= levelProgress,
            passed: index < levelProgress
          }));
          this.setData({ levelProgress, levels: updatedLevels, loading: false });
        })
        .catch(err => {
          console.error('[Level] 加载进度失败:', err);
          this.setData({ levels, loading: false });
        });
    } else {
      this.setData({ levels, loading: false });
    }
  },

  onSelectDifficulty(e) {
    const difficulty = e.currentTarget.dataset.difficulty;
    if (!difficulty || difficulty === this.data.currentDifficulty) return;

    difficultyUtil.saveCurrentDifficulty(difficulty);
    const difficultyConfig = difficultyUtil.getDifficultyConfig(difficulty);

    this.setData({
      currentDifficulty: difficulty,
      currentDifficultyConfig: difficultyConfig,
      loading: true,
      currentPage: 1
    });

    this.loadProgress();
  },

  onSelectLevel(e) {
    const levelId = e.currentTarget.dataset.levelId;
    const level = this.data.levels.find(l => l.id === levelId);

    if (!level || !level.unlocked) {
      wx.showToast({ title: '该关卡未解锁', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/game/game?level=${levelId}&difficulty=${this.data.currentDifficulty}`
    });
  },

  onGoBack() {
    wx.navigateBack();
  }
});