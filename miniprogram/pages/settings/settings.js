// settings.js - 设置页面
const storageUtil = require('../../utils/storage');
const syncManager = require('../../utils/syncManager');
const difficultyUtil = require('../../utils/difficulty');

Page({
  data: {
    settings: {},
    achievements: {},
    progress: {},
    difficultyList: [],
    currentDifficulty: 'normal',
    syncStatus: 'idle',
    syncInfo: {},
    syncHistory: [],
    syncConfig: {},
    pendingCount: 0,
    showHistory: false
  },

  onLoad() {
    this.loadData();
    this.loadSyncInfo();
  },

  loadData() {
    const settings = storageUtil.getGameSettings();
    const achievements = storageUtil.getAchievements();
    const progress = storageUtil.getPlayerProgress();
    const difficultyList = difficultyUtil.getDifficultyList();
    const currentDifficulty = difficultyUtil.getCurrentDifficulty();

    this.setData({
      settings,
      achievements,
      progress,
      difficultyList,
      currentDifficulty
    });
  },

  loadSyncInfo() {
    const status = syncManager.getStatus();
    const history = syncManager.getHistory();
    const config = syncManager.getConfig();

    this.setData({
      syncInfo: status,
      syncHistory: history,
      syncConfig: config,
      pendingCount: status.pendingChangesCount
    });
  },

  onSoundToggle(e) {
    const value = e.detail.value;
    const settings = { ...this.data.settings, soundEnabled: value };
    storageUtil.setGameSettings(settings);
    this.setData({ settings });
    this.showToast(value ? '音效已开启' : '音效已关闭');
  },

  onVibrationToggle(e) {
    const value = e.detail.value;
    const settings = { ...this.data.settings, vibrationEnabled: value };
    storageUtil.setGameSettings(settings);
    this.setData({ settings });
    this.showToast(value ? '震动已开启' : '震动已关闭');
  },

  onDifficultyChange(e) {
    const difficulty = e.currentTarget.dataset.difficulty;
    if (!difficulty) return;

    difficultyUtil.saveCurrentDifficulty(difficulty);

    const settings = { ...this.data.settings, difficulty };
    storageUtil.setGameSettings(settings);

    this.setData({
      settings,
      currentDifficulty: difficulty
    });

    const labels = { easy: '简单', normal: '普通', hard: '困难' };
    this.showToast('难度已设置为: ' + labels[difficulty]);
  },

  onResetSettings() {
    wx.showModal({
      title: '重置设置',
      content: '确定要将所有设置恢复为默认值吗？',
      success: (res) => {
        if (res.confirm) {
          storageUtil.resetGameSettings();
          this.loadData();
          this.showToast('设置已重置');
        }
      }
    });
  },

  onManualSync() {
    if (this.data.syncStatus === 'syncing') return;

    this.setData({ syncStatus: 'syncing' });

    syncManager.triggerSync(syncManager.SYNC_MODE.INCREMENTAL)
      .then(result => {
        this.setData({ syncStatus: 'idle' });

        if (result.success) {
          this.showToast('同步成功！同步了 ' + result.recordsSynced + ' 条数据');
          this.loadSyncInfo();
          this.loadData();
        } else {
          this.showToast(result.error || '同步失败');
        }
      })
      .catch(e => {
        this.setData({ syncStatus: 'idle' });
        this.showToast('同步异常');
      });
  },

  onFullSync() {
    if (this.data.syncStatus === 'syncing') return;

    wx.showModal({
      title: '全量同步',
      content: '全量同步将会重新获取所有数据，确定继续吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ syncStatus: 'syncing' });

          syncManager.triggerSync(syncManager.SYNC_MODE.FULL)
            .then(result => {
              this.setData({ syncStatus: 'idle' });

              if (result.success) {
                this.showToast('全量同步成功！同步了 ' + result.recordsSynced + ' 条数据');
                this.loadSyncInfo();
                this.loadData();
              } else {
                this.showToast(result.error || '同步失败');
              }
            })
            .catch(e => {
              this.setData({ syncStatus: 'idle' });
              this.showToast('同步异常');
            });
        }
      }
    });
  },

  onAutoSyncToggle(e) {
    const value = e.detail.value;

    if (value) {
      syncManager.resumeAutoSync();
      this.showToast('自动同步已开启');
    } else {
      syncManager.pauseAutoSync();
      this.showToast('自动同步已关闭');
    }

    this.loadSyncInfo();
  },

  onSyncIntervalChange(e) {
    const values = ['5', '15', '30', '60'];
    const index = e.detail.value;
    const minutes = parseInt(values[index]);

    syncManager.setSyncInterval(minutes);
    this.loadSyncInfo();

    this.showToast('同步间隔已设置为 ' + minutes + ' 分钟');
  },

  onConflictStrategyChange(e) {
    const strategies = [
      { value: 'timestamp_first', label: '时间戳优先' },
      { value: 'local_first', label: '本地优先' },
      { value: 'remote_first', label: '云端优先' },
      { value: 'version_first', label: '版本号优先' }
    ];

    const index = e.detail.value;
    const strategy = strategies[index];

    syncManager.setConflictStrategy(strategy.value);
    this.loadSyncInfo();

    this.showToast('冲突策略已设置为: ' + strategy.label);
  },

  onToggleHistory() {
    this.setData({ showHistory: !this.data.showHistory });
  },

  onClearHistory() {
    wx.showModal({
      title: '清空历史',
      content: '确定要清空同步历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ syncHistory: [] });
          this.showToast('历史已清空');
        }
      }
    });
  },

  onExportData() {
    const data = storageUtil.exportData();
    wx.setClipboardData({
      data: data,
      success: () => {
        this.showToast('数据已复制到剪贴板');
      }
    });
  },

  onImportData() {
    wx.showModal({
      title: '导入数据',
      content: '请先将备份数据复制到剪贴板，然后点击确定',
      success: (res) => {
        if (res.confirm) {
          wx.getClipboardData({
            success: (clipboardRes) => {
              const success = storageUtil.importData(clipboardRes.data);
              if (success) {
                this.loadData();
                this.showToast('导入成功');
              } else {
                this.showToast('导入失败，数据格式错误');
              }
            },
            fail: () => {
              this.showToast('读取剪贴板失败');
            }
          });
        }
      }
    });
  },

  onClearData() {
    wx.showModal({
      title: '清除数据',
      content: '确定要清除所有游戏数据吗？此操作不可恢复！',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync();
            this.loadData();
            this.loadSyncInfo();
            this.showToast('数据已清除');
          } catch (e) {
            this.showToast('清除失败');
          }
        }
      }
    });
  },

  formatTime(timestamp) {
    if (!timestamp) return '从未';

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
  },

  getStatusText(status) {
    const statusMap = {
      idle: '空闲',
      syncing: '同步中',
      completed: '已完成',
      failed: '失败',
      pending: '待同步'
    };

    return statusMap[status] || status;
  },

  getStatusColor(status) {
    const colorMap = {
      idle: '#8F959E',
      syncing: '#FF9800',
      completed: '#4CAF50',
      failed: '#F44336',
      pending: '#FFC107'
    };

    return colorMap[status] || '#8F959E';
  },

  showToast(title) {
    wx.showToast({ title, icon: 'none', duration: 1500 });
  },

  goBack() {
    wx.navigateBack();
  }
});