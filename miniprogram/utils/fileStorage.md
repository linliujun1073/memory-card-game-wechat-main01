# 云端文件存储解决方案 - 使用文档

## 概述

本解决方案提供安全、高效的云端文件存储服务，支持图片和音频文件的上传、管理、版本控制和备份。

### 特性

- ✅ **多格式支持**: JPEG、PNG、WebP、GIF、MP3、WAV、FLAC、OGG、AAC
- ✅ **文件管理**: 上传、删除、查询、搜索
- ✅ **版本控制**: 支持文件版本创建、历史记录、版本恢复
- ✅ **元数据管理**: 自定义文件元数据、描述、标签
- ✅ **数据备份**: 本地备份与恢复
- ✅ **访问控制**: 基于云开发的权限管理
- ✅ **快速检索**: 关键词搜索、类型过滤、分页查询

## 安装与配置

### 1. 配置云开发环境

在 `app.js` 中配置云开发环境ID：

```javascript
this.globalData = {
  cloudEnvId: "cloud1-your-env-id",
  cloudInitialized: false,
  useLocalStorage: true
};
```

### 2. 创建数据库集合

在云开发控制台创建 `files` 集合，并设置权限为：
- **所有用户可读**
- **仅创建者可写**

### 3. 引入模块

```javascript
const fileStorage = require('../../utils/fileStorage');
```

## API 参考

### 1. 文件上传

**方法**: `uploadFile(options)`

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| filePath | string | 是 | 本地文件路径 |
| cloudPath | string | 否 | 云端路径（自动生成） |
| fileName | string | 否 | 文件名 |
| metadata | object | 否 | 自定义元数据 |

**返回**:

```javascript
{
  success: true,           // 是否成功
  fileID: "cloud://xxx",   // 文件ID
  downloadUrl: "https://xxx", // 下载链接
  metadata: {              // 文件元数据
    fileID,
    cloudPath,
    downloadUrl,
    fileName,
    type: "image|audio",
    ext: "png",
    size: 1024,            // 文件大小（字节）
    uploadTime: 1620000000000,
    version: 1
  }
}
```

**示例**:

```javascript
// 上传图片
const result = await fileStorage.uploadFile({
  filePath: tempFilePath,
  fileName: 'avatar.png',
  metadata: {
    description: '用户头像',
    tags: ['avatar', 'user']
  }
});

if (result.success) {
  console.log('上传成功:', result.downloadUrl);
} else {
  console.error('上传失败:', result.error);
}
```

### 2. 文件删除

**方法**: `deleteFile(fileID)`

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| fileID | string | 是 | 文件ID |

**返回**:

```javascript
{
  success: true,
  fileID: "cloud://xxx"
}
```

**示例**:

```javascript
const result = await fileStorage.deleteFile('cloud://xxx');
```

### 3. 获取文件列表

**方法**: `getFileList(options)`

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| type | string | 'all' | 文件类型：'image'、'audio'、'all' |
| limit | number | 20 | 返回数量 |
| offset | number | 0 | 偏移量（分页） |

**返回**:

```javascript
[
  {
    fileID: "cloud://xxx",
    downloadUrl: "https://xxx",
    fileName: "avatar.png",
    type: "image",
    size: 1024,
    uploadTime: 1620000000000
  }
]
```

**示例**:

```javascript
// 获取所有图片
const images = await fileStorage.getFileList({ type: 'image', limit: 10 });

// 分页获取
const page2 = await fileStorage.getFileList({ limit: 20, offset: 20 });
```

### 4. 获取文件详情

**方法**: `getFileDetail(fileID)`

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| fileID | string | 是 | 文件ID |

**返回**: 文件元数据对象或 null

**示例**:

```javascript
const file = await fileStorage.getFileDetail('cloud://xxx');
if (file) {
  console.log(file.downloadUrl);
}
```

### 5. 搜索文件

**方法**: `searchFiles(keyword, options)`

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| options.type | string | 'all' | 文件类型过滤 |

**返回**: 匹配的文件数组

**示例**:

```javascript
// 搜索包含 'avatar' 的文件
const results = fileStorage.searchFiles('avatar');

// 搜索音频文件中包含 'music' 的
const audioResults = fileStorage.searchFiles('music', { type: 'audio' });
```

### 6. 更新文件元数据

**方法**: `updateFileMetadata(fileID, updates)`

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| fileID | string | 是 | 文件ID |
| updates | object | 是 | 更新内容 |

**返回**:

```javascript
{
  success: true,
  metadata: { /* 更新后的元数据 */ }
}
```

**示例**:

```javascript
const result = await fileStorage.updateFileMetadata('cloud://xxx', {
  description: '更新后的描述',
  tags: ['new', 'tags']
});
```

### 7. 创建文件版本

**方法**: `createVersion(fileID, filePath)`

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| fileID | string | 是 | 原文件ID |
| filePath | string | 是 | 新版本文件路径 |

**返回**:

```javascript
{
  success: true,
  newFileID: "cloud://xxx",
  version: 2,
  versions: [ /* 所有版本记录 */ ]
}
```

**示例**:

```javascript
const result = await fileStorage.createVersion('cloud://original', newFilePath);
```

### 8. 获取版本历史

**方法**: `getFileVersions(fileID)`

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| fileID | string | 是 | 文件ID |

**返回**: 版本记录数组

**示例**:

```javascript
const versions = fileStorage.getFileVersions('cloud://xxx');
```

### 9. 恢复版本

**方法**: `restoreVersion(originalFileID, version)`

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| originalFileID | string | 是 | 原始文件ID |
| version | number | 是 | 版本号 |

**返回**:

```javascript
{
  success: true,
  restoredVersion: 2,
  fileID: "cloud://xxx"
}
```

**示例**:

```javascript
const result = await fileStorage.restoreVersion('cloud://xxx', 2);
```

### 10. 获取存储统计

**方法**: `getStorageStats()`

**返回**:

```javascript
{
  totalFiles: 10,          // 总文件数
  totalSize: 1024000,      // 总大小（字节）
  imageCount: 8,           // 图片数量
  audioCount: 2,           // 音频数量
  lastUploadTime: 1620000000000  // 最后上传时间
}
```

**示例**:

```javascript
const stats = fileStorage.getStorageStats();
console.log(`总文件数: ${stats.totalFiles}`);
```

### 11. 备份到本地

**方法**: `backupToLocal()`

**返回**:

```javascript
{
  success: true,
  data: "{...}",  // 备份数据JSON字符串
  size: 10240     // 数据大小（字节）
}
```

**示例**:

```javascript
const backup = fileStorage.backupToLocal();
// 保存到剪贴板或文件
wx.setClipboardData({ data: backup.data });
```

### 12. 从备份恢复

**方法**: `restoreFromBackup(backupData)`

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| backupData | string | 是 | 备份数据JSON字符串 |

**返回**:

```javascript
{
  success: true,
  restoredFiles: 10,        // 恢复的文件数
  backupTime: 1620000000000 // 备份时间
}
```

**示例**:

```javascript
wx.getClipboardData({
  success: (res) => {
    const result = fileStorage.restoreFromBackup(res.data);
    if (result.success) {
      console.log(`恢复了 ${result.restoredFiles} 个文件`);
    }
  }
});
```

### 13. 获取存储状态

**方法**: `getStorageStatus()`

**返回**:

```javascript
{
  cloudEnabled: true,           // 云存储是否启用
  localFiles: 10,              // 本地缓存文件数
  uploadHistoryCount: 50,       // 上传历史记录数
  hasPendingUploads: false      // 是否有待上传文件
}
```

## 常量定义

### FILE_TYPE

```javascript
{
  IMAGE: 'image',
  AUDIO: 'audio',
  ALL: 'all'
}
```

### SUPPORTED_FORMATS

```javascript
{
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  audio: ['mp3', 'wav', 'flac', 'ogg', 'aac']
}
```

### SIZE_LIMITS

```javascript
{
  image: 5 * 1024 * 1024,  // 5MB
  audio: 10 * 1024 * 1024  // 10MB
}
```

## 错误码说明

| 错误码 | 说明 |
|-------|------|
| INVALID_FORMAT | 不支持的文件格式 |
| FILE_TOO_LARGE | 文件大小超过限制 |
| STORAGE_UNAVAILABLE | 云存储不可用 |
| UPLOAD_FAILED | 上传失败 |

## 最佳实践

### 1. 文件上传流程

```javascript
// 1. 选择文件
wx.chooseImage({
  success: async (res) => {
    const tempFilePath = res.tempFilePaths[0];
    
    // 2. 上传文件
    const result = await fileStorage.uploadFile({
      filePath: tempFilePath,
      fileName: 'game_screenshot.png',
      metadata: {
        scene: 'level_1',
        score: 1000
      }
    });
    
    // 3. 处理结果
    if (result.success) {
      // 保存文件ID到游戏记录
      saveGameRecord({ screenshot: result.fileID });
    }
  }
});
```

### 2. 文件管理界面

```javascript
// 获取文件列表并显示
async function loadFiles() {
  const status = fileStorage.getStorageStatus();
  const stats = fileStorage.getStorageStats();
  
  // 更新UI
  setData({
    cloudEnabled: status.cloudEnabled,
    totalFiles: stats.totalFiles,
    totalSize: (stats.totalSize / 1024 / 1024).toFixed(2) + ' MB'
  });
  
  // 获取图片列表
  const images = await fileStorage.getFileList({ type: 'image' });
  setData({ images });
}
```

### 3. 版本控制工作流

```javascript
// 创建新版本
async function updateFile(originalFileID, newFilePath) {
  const result = await fileStorage.createVersion(originalFileID, newFilePath);
  
  if (result.success) {
    // 显示版本历史
    const versions = fileStorage.getFileVersions(originalFileID);
    showVersionHistory(versions);
  }
}

// 恢复到历史版本
async function revertToVersion(fileID, version) {
  const result = await fileStorage.restoreVersion(fileID, version);
  
  if (result.success) {
    wx.showToast({ title: '版本恢复成功' });
  }
}
```

### 4. 数据备份策略

```javascript
// 定期备份
function scheduleBackup() {
  setInterval(() => {
    const backup = fileStorage.backupToLocal();
    
    // 可以上传到云端存储或发送给用户
    console.log('备份完成，大小:', backup.size);
  }, 24 * 60 * 60 * 1000); // 每天备份
}

// 用户主动备份
function manualBackup() {
  const backup = fileStorage.backupToLocal();
  
  wx.showModal({
    title: '备份完成',
    content: `已备份 ${fileStorage.getStorageStats().totalFiles} 个文件，数据大小 ${backup.size} 字节`,
    showCancel: false
  });
  
  // 复制到剪贴板
  wx.setClipboardData({ data: backup.data });
}
```

## 安全注意事项

1. **文件大小限制**: 图片最大5MB，音频最大10MB
2. **格式验证**: 仅支持白名单内的文件格式
3. **权限控制**: 依赖云开发数据库权限设置
4. **数据加密**: 敏感数据应在上传前加密
5. **备份管理**: 定期备份并妥善保管

## 性能优化建议

1. **懒加载**: 分页获取文件列表，避免一次性加载大量数据
2. **缓存策略**: 本地缓存元数据，减少云端请求
3. **文件压缩**: 上传前对图片进行压缩处理
4. **异步操作**: 使用 Promise.all 并行处理多个文件操作

## 更新日志

### v1.0.0
- 初始版本
- 支持图片和音频上传
- 实现文件管理功能
- 添加版本控制
- 实现数据备份与恢复