// leaderboard.js - 排行榜页面（增强版）
let cloudUtil;
try {
  cloudUtil = require('../../utils/cloud');
} catch (e) {
  console.error('[Leaderboard] 加载云工具失败:', e);
  cloudUtil = null;
}

let syncManager;
try {
  syncManager = require('../../utils/syncManager');
} catch (e) {
  console.error('[Leaderboard] 加载同步管理器失败:', e);
  syncManager = null;
}

const difficultyUtil = require('../../utils/difficulty');

const DEBUG_MODE = true;

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

Page({
  data: {
    leaderboard: [],
    filteredLeaderboard: [],
    participants: [],
    participantCount: 0,
    showParticipants: false,
    difficultyList: [],
    currentDifficulty: 'all',
    currentPage: 1,
    pageSize: 5,
    totalPages: 1,
    totalItems: 0,
    filterLevel: 'all',
    filterStatus: 'all',
    searchKeyword: '',
    isSearching: false,
    loading: true,
    refreshing: false,
    hasMore: true,
    highestScore: 0,
    totalGames: 0,
    winCount: 0,
    cloudStatus: { initialized: false, useLocalStorage: true, envId: '' },
    pendingSyncCount: 0,
    syncing: false,
    showDebugPanel: false,
    diagnosticsResult: null,
    fetchingDiagnostics: false,
    isScrolling: false
  },

  onLoad() {
    const difficultyList = difficultyUtil.getDifficultyList();
    difficultyList.unshift({ key: 'all', name: '全部', icon: '📊', description: '所有难度的记录' });
    this.setData({ difficultyList });
    this.loadCloudStatus();
    this.loadData();
  },

  onShow() {
    if (!this.data.loading) {
      this.loadCloudStatus();
      this.loadData();
    }
  },

  loadCloudStatus() {
    if (cloudUtil && cloudUtil.getCloudStatus) {
      const status = cloudUtil.getCloudStatus();
      const pending = cloudUtil.getPendingSyncData ? cloudUtil.getPendingSyncData() : [];
      this.setData({ cloudStatus: status, pendingSyncCount: pending.length });
    }
  },

  loadData(page = 1) {
    if (!cloudUtil) {
      this.setData({ loading: false, refreshing: false, leaderboard: [], filteredLeaderboard: [] });
      return;
    }

    const tasks = [];
    const difficulty = this.data.currentDifficulty === 'all' ? null : this.data.currentDifficulty;
    
    if (cloudUtil.getRecentScores) {
      tasks.push(cloudUtil.getRecentScores(50, difficulty).then(list => ({ key: 'leaderboard', value: list || [] })));
    }
    if (cloudUtil.getHighestScore) {
      tasks.push(cloudUtil.getHighestScore(difficulty).then(v => ({ key: 'highestScore', value: v || 0 })));
    }
    if (cloudUtil.getParticipants) {
      tasks.push(cloudUtil.getParticipants('default', 20).then(list => ({ key: 'participants', value: list || [] })));
    }
    if (cloudUtil.getParticipantCount) {
      tasks.push(cloudUtil.getParticipantCount('default').then(v => ({ key: 'participantCount', value: v || 0 })));
    }

    if (tasks.length === 0) {
      this.setData({ loading: false, refreshing: false });
      return;
    }

    Promise.all(tasks)
      .then(results => {
        const update = { loading: false, refreshing: false };
        results.forEach(r => {
          update[r.key] = r.value;
          if (r.key === 'leaderboard') {
            update.totalItems = r.value.length;
            update.totalPages = Math.ceil(r.value.length / this.data.pageSize);
            update.hasMore = page < update.totalPages;
            update.winCount = r.value.filter(item => item.isWin).length;
          }
        });
        this.setData(update);
        this.applyFilters();
      })
      .catch(err => {
        console.error('[Leaderboard] 加载数据失败:', err);
        this.setData({ loading: false, refreshing: false });
        wx.showToast({ title: '加载失败', icon: 'error' });
      });
  },

  onSyncPending() {
    if (this.data.syncing || !syncManager) {
      wx.showToast({ title: '同步功能暂不可用', icon: 'none' });
      return;
    }
    this.setData({ syncing: true });
    syncManager.triggerSync(syncManager.SYNC_MODE.INCREMENTAL)
      .then(result => {
        this.setData({ syncing: false });
        if (result.success) {
          wx.showToast({ title: result.recordsSynced > 0 ? `同步成功！共同步 ${result.recordsSynced} 条数据` : '暂无新数据需要同步', icon: result.recordsSynced > 0 ? 'success' : 'none' });
          this.loadCloudStatus();
          this.loadData();
        } else {
          wx.showToast({ title: result.error || '同步失败', icon: 'error' });
        }
      })
      .catch((err) => {
        this.setData({ syncing: false });
        console.error('[Leaderboard] 同步异常:', err);
        wx.showToast({ title: '同步异常', icon: 'error' });
      });
  },

  onFullSync() {
    if (this.data.syncing || !syncManager) {
      wx.showToast({ title: '同步功能暂不可用', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '全量同步',
      content: '全量同步将会重新获取所有数据，确定继续吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ syncing: true });
          syncManager.triggerSync(syncManager.SYNC_MODE.FULL)
            .then(result => {
              this.setData({ syncing: false });
              if (result.success) {
                wx.showToast({ title: `全量同步成功！共同步 ${result.recordsSynced} 条数据`, icon: 'success' });
                this.loadCloudStatus();
                this.loadData();
              } else {
                wx.showToast({ title: result.error || '同步失败', icon: 'error' });
              }
            })
            .catch((err) => {
              this.setData({ syncing: false });
              console.error('[Leaderboard] 全量同步异常:', err);
              wx.showToast({ title: '同步异常', icon: 'error' });
            });
        }
      }
    });
  },

  applyFilters() {
    let list = [...this.data.leaderboard];
    if (this.data.filterLevel !== 'all') {
      list = list.filter(item => item.level === Number(this.data.filterLevel));
    }
    if (this.data.filterStatus !== 'all') {
      const isWin = this.data.filterStatus === 'win';
      list = list.filter(item => item.isWin === isWin);
    }
    if (this.data.searchKeyword.trim()) {
      const keyword = this.data.searchKeyword.toLowerCase();
      list = list.filter(item => {
        return (item.level && item.level.toString().includes(keyword)) ||
               (item.score && item.score.toString().includes(keyword)) ||
               (item.nickName && item.nickName.toLowerCase().includes(keyword));
      });
      this.setData({ isSearching: true });
    } else {
      this.setData({ isSearching: false });
    }
    const currentPage = 1;
    const totalPages = Math.max(1, Math.ceil(list.length / this.data.pageSize));
    const hasMore = currentPage < totalPages;
    this.setData({ filteredLeaderboard: list, displayList: list.slice(0, this.data.pageSize), totalItems: list.length, totalPages, hasMore, currentPage });
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.applyFilters();
  },

  onClearSearch() {
    this.setData({ searchKeyword: '', isSearching: false });
    this.applyFilters();
  },

  onLevelFilter(e) {
    this.setData({ filterLevel: e.currentTarget.dataset.level, currentPage: 1 });
    this.applyFilters();
  },

  onStatusFilter(e) {
    this.setData({ filterStatus: e.currentTarget.dataset.status, currentPage: 1 });
    this.applyFilters();
  },

  onDifficultyFilter(e) {
    const difficulty = e.currentTarget.dataset.difficulty;
    if (difficulty === this.data.currentDifficulty) return;
    this.setData({ currentDifficulty: difficulty, currentPage: 1, filterLevel: 'all', filterStatus: 'all', searchKeyword: '' });
    this.loadData(1);
  },

  onPrevPage() {
    if (this.data.currentPage > 1) {
      this.setData({ currentPage: this.data.currentPage - 1 });
      this.updatePageData();
    }
  },

  onNextPage() {
    const list = this.data.filteredLeaderboard.length > 0 ? this.data.filteredLeaderboard : this.data.leaderboard;
    const maxPage = Math.ceil(list.length / this.data.pageSize) || 1;
    if (this.data.currentPage < maxPage) {
      this.setData({ currentPage: this.data.currentPage + 1 });
      this.updatePageData();
    }
  },

  updatePageData() {
    const list = this.data.filteredLeaderboard.length > 0 ? this.data.filteredLeaderboard : this.data.leaderboard;
    const start = (this.data.currentPage - 1) * this.data.pageSize;
    const end = start + this.data.pageSize;
    const maxPage = Math.ceil(list.length / this.data.pageSize) || 1;
    this.setData({ displayList: list.slice(start, end), hasMore: this.data.currentPage < maxPage });
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true, currentPage: 1 });
    this.loadCloudStatus();
    this.loadData(1);
    setTimeout(() => { wx.stopPullDownRefresh(); }, 1000);
  },

  onScroll(e) {
    if (e.detail.scrollTop > 5) {
      this.setData({ isScrolling: true });
    }
  },

  onScrollUpper(e) {
    setTimeout(() => { this.setData({ isScrolling: false }); }, 300);
  },

  onReachBottom() {
    if (this.data.isScrolling || this.data.loading || !this.data.hasMore) return;
    const list = this.data.filteredLeaderboard.length > 0 ? this.data.filteredLeaderboard : this.data.leaderboard;
    const maxPage = Math.ceil(list.length / this.data.pageSize);
    if (this.data.currentPage < maxPage) {
      this.setData({ currentPage: this.data.currentPage + 1 });
      this.updatePageData();
    }
  },

  onGoHome() {
    wx.navigateBack();
  },

  onToggleDebugPanel() {
    this.setData({ showDebugPanel: !this.data.showDebugPanel });
    if (this.data.showDebugPanel && !this.data.diagnosticsResult) {
      this.runDiagnostics();
    }
  },

  runDiagnostics() {
    if (!cloudUtil || !cloudUtil.runSyncDiagnostics) {
      wx.showToast({ title: '诊断工具不可用', icon: 'none' });
      return;
    }
    this.setData({ fetchingDiagnostics: true });
    cloudUtil.runSyncDiagnostics()
      .then(result => {
        this.setData({ diagnosticsResult: result, fetchingDiagnostics: false });
        console.log('[Diagnostics] 诊断结果:', result);
      })
      .catch(err => {
        this.setData({ fetchingDiagnostics: false });
        console.error('[Diagnostics] 诊断失败:', err);
        wx.showToast({ title: '诊断失败', icon: 'error' });
      });
  },

  onFetchAllUsersData() {
    if (!cloudUtil || !cloudUtil.getAllUsersScores) {
      wx.showToast({ title: '功能暂不可用', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    cloudUtil.getAllUsersScores({ limit: 100, includeLocal: true })
      .then(result => {
        console.log('[Leaderboard] 所有用户数据:', result);
        this.setData({
          leaderboard: result.data,
          loading: false,
          totalItems: result.data.length,
          totalPages: Math.ceil(result.data.length / this.data.pageSize),
          hasMore: this.data.pageSize < result.data.length,
          winCount: result.data.filter(item => item.isWin).length
        });
        this.applyFilters();
        if (result.debugInfo) {
          wx.showModal({
            title: '数据获取结果',
            content: `\n📊 数据来源: ${result.source}\n📝 数据条数: ${result.data.length}\n🌐 云端记录: ${result.debugInfo.cloudDataCount || 0}\n📱 本地记录: ${result.debugInfo.localDataCount || 0}\n👥 不同用户数: ${result.debugInfo.uniqueUsers || 0}\n\n${result.error ? '❌ ' + result.error : '✅ 获取成功'}`,
            showCancel: false
          });
        }
      })
      .catch(err => {
        this.setData({ loading: false });
        console.error('[Leaderboard] 获取所有用户数据失败:', err);
        wx.showToast({ title: '获取失败', icon: 'error' });
      });
  },

  onCopyDiagnostics() {
    if (!this.data.diagnosticsResult) return;
    const info = this.data.diagnosticsResult;
    const text = `=== 数据同步诊断报告 ===\n\n[网络状态]\n类型: ${info.network.type || '未知'}\n已连接: ${info.network.isConnected ? '是' : '否'}\n\n[云开发状态]\n可用: ${info.cloud.available ? '是' : '否'}\n环境ID: ${info.cloud.envId || '未配置'}\n\n[数据库状态]\n已连接: ${info.database.connected ? '是' : '否'}\n查询成功: ${info.database.querySuccess ? '是' : '否'}\n总记录数: ${info.database.totalCount || 0}\n\n[权限状态]\n可读取: ${info.permissions.canRead ? '是' : '否'}\n\n[建议]\n${info.suggestions?.map((s, i) => `${i + 1}. ${s}`).join('\n') || '无'}`;
    wx.setClipboardData({
      data: text,
      success: () => { wx.showToast({ title: '已复制到剪贴板', icon: 'success' }); }
    });
  },

  onCheckPermissions() {
    wx.showModal({
      title: '权限设置说明',
      content: '为了能查看其他用户的数据，请确保在云开发控制台正确设置权限：\n\n1. 打开云开发控制台\n2. 进入「数据库」→「集合管理」\n3. 选择「scores」集合\n4. 点击「权限设置」\n5. 选择「所有用户可读，仅创建者可写」\n\n⚠️ 注意：如果设置为「仅创建者可读」，则无法看到其他用户的数据。',
      showCancel: false
    });
  },

  onRefreshDiagnostics() {
    this.runDiagnostics();
  },

  onToggleParticipants() {
    this.setData({ showParticipants: !this.data.showParticipants });
  }
});