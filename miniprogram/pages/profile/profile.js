// profile.js - 个人中心页面
const storageUtil = require('../../utils/storage');
const cloudUtil = require('../../utils/cloud');

Page({
  data: {
    userInfo: null,
    progress: {},
    achievements: [],
    highestScore: 0,
    loading: true
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const userInfo = cloudUtil && cloudUtil.getCurrentUser ? cloudUtil.getCurrentUser() : null;
    const progress = storageUtil.getPlayerProgress();
    const achievements = storageUtil.getAchievements();

    this.setData({
      userInfo,
      progress,
      achievements,
      loading: false
    });

    if (cloudUtil && cloudUtil.getHighestScore) {
      cloudUtil.getHighestScore()
        .then(score => {
          this.setData({ highestScore: score || progress.highestScore });
        })
        .catch(err => {
          console.error('[Profile] 获取最高分失败:', err);
        });
    }
  },

  onBack() {
    wx.navigateBack();
  }
});