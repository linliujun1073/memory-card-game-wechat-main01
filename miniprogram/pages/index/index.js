// index.js - 首页
const cloudUtil = require('../../utils/cloud');
const storageUtil = require('../../utils/storage');

Page({
  data: {
    userInfo: null,
    progress: {},
    highestScore: 0,
    cloudStatus: {},
    loading: true
  },

  onLoad() {
    this.checkUserAuth();
  },

  onShow() {
    this.loadUserData();
    this.loadCloudStatus();
  },

  checkUserAuth() {
    if (cloudUtil && cloudUtil.getUserInfo) {
      cloudUtil.getUserInfo()
        .then(userInfo => {
          this.setData({ userInfo });
          if (userInfo.success && cloudUtil.setUserInfo) {
            cloudUtil.setUserInfo(userInfo);
          }
        })
        .catch(err => {
          console.error('[Index] 获取用户信息失败:', err);
        });
    }
  },

  loadUserData() {
    const progress = storageUtil.getPlayerProgress();
    this.setData({ progress, loading: false });

    if (cloudUtil && cloudUtil.getHighestScore) {
      cloudUtil.getHighestScore()
        .then(score => {
          this.setData({ highestScore: score || progress.highestScore });
        })
        .catch(err => {
          console.error('[Index] 获取最高分失败:', err);
        });
    }
  },

  loadCloudStatus() {
    if (cloudUtil && cloudUtil.getCloudStatus) {
      const cloudStatus = cloudUtil.getCloudStatus();
      this.setData({ cloudStatus });
    }
  },

  onGetUserInfo(e) {
    if (e.detail.userInfo) {
      const userInfo = {
        nickName: e.detail.userInfo.nickName,
        avatarUrl: e.detail.userInfo.avatarUrl,
        success: true
      };
      this.setData({ userInfo });
      if (cloudUtil && cloudUtil.setUserInfo) {
        cloudUtil.setUserInfo(userInfo);
      }
    }
  },

  onStartGame() {
    wx.navigateTo({
      url: '/pages/level/level'
    });
  },

  onViewLeaderboard() {
    wx.navigateTo({
      url: '/pages/leaderboard/leaderboard'
    });
  },

  onViewProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },

  onOpenSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  }
});