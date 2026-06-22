// app.js - 应用入口
const syncManager = require('./utils/syncManager');

App({
  globalData: {
    userInfo: null,
    cloudInitialized: false,
    cloudEnvId: '',
    systemInfo: null
  },

  onLaunch(options) {
    console.log('[App] 小程序启动', options);

    this.initSystemInfo();
    this.initCloud();
    this.initAutoSync();
  },

  onShow(options) {
    console.log('[App] 小程序显示', options);
  },

  onHide() {
    console.log('[App] 小程序隐藏');
  },

  initSystemInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = systemInfo;
      console.log('[App] 系统信息:', systemInfo);
    } catch (e) {
      console.error('[App] 获取系统信息失败:', e);
    }
  },

  initCloud() {
    if (wx.cloud) {
      try {
        wx.cloud.init({
          env: this.globalData.cloudEnvId || 'cloud1-xxx',
          traceUser: true
        });
        this.globalData.cloudInitialized = true;
        console.log('[App] 云开发初始化成功');
      } catch (e) {
        console.error('[App] 云开发初始化失败:', e);
        this.globalData.cloudInitialized = false;
      }
    } else {
      console.warn('[App] 当前版本不支持云开发');
      this.globalData.cloudInitialized = false;
    }
  },

  initAutoSync() {
    syncManager.startAutoSync();
  },

  getCloudStatus() {
    return {
      initialized: this.globalData.cloudInitialized,
      useLocalStorage: !this.globalData.cloudInitialized,
      envId: this.globalData.cloudEnvId
    };
  },

  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
  },

  getUserInfo() {
    return this.globalData.userInfo;
  }
});