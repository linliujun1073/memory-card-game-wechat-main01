# 记忆翻牌游戏微信小程序

A memory card matching game for WeChat Mini Program.

## 功能特性

- 多种难度等级：简单、普通、困难
- 云端数据同步
- 排行榜功能
- 成就系统
- 游戏数据本地存储

## 项目结构

```
miniprogram/
├── pages/
│   ├── index/      # 首页
│   ├── level/      # 关卡选择
│   ├── game/       # 游戏页面
│   ├── result/    # 结果页面
│   ├── leaderboard/# 排行榜
│   ├── profile/    # 个人中心
│   └── settings/   # 设置页面
├── utils/
│   ├── cloud.js         # 云数据库工具
│   ├── difficulty.js    # 难度配置
│   ├── storage.js      # 本地存储
│   ├── syncManager.js   # 同步管理
│   └── fileStorage.js   # 文件存储
└── app.js          # 应用入口

## 使用说明

1. 克隆项目到本地
2. 使用微信开发者工具打开项目
3. 配置云开发环境
4. 编译运行

## 许可证

MIT License