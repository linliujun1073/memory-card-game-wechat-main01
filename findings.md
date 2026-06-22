# Findings — 关键技术发现

## 1. 云数据库集合命名
- 课要求: `scores` 集合
- 现状: `GAME_RECORD_COLLECTION = 'gameRecord'` (`miniprogram/utils/cloud.js:6`)
- 风险: 不改会被验收认定为"未写入 scores 集合"
- 行动: 改为 `scores`，并把单文档 upsert 改为每局 add 一条记录

## 2. 计分逻辑应在过程中变化
- 现状: `score = levelId*1000 + remainingTime*10` 一次性计算 (`game.js:148`)
- 课要求: "游戏过程中有分数变化"
- 行动: 配对成功 +100；错配 -10（不让总分为负，min 0）；保留 gameOver 时的时间奖励系数

## 3. scores 集合的数据模型
- 选项 A: 改名为 `scores`，仍用单文档 + 最高分字段（最简，作业可用）
- 选项 B: 每局 add 一条文档，再聚合最高分（更符合 scores 集合语义）
- 选择: **B**，原因:
  - 字面符合"scores 集合 = 多条分数记录"
  - 自然衍生排行榜（最近 N 局）
  - 不破坏现有最高分查询路径（增加 `getHighestScore` 聚合函数）
- 数据结构: `{ _openid, level, score, isWin, remainingTime, createTime }`

## 4. WeChat 云开发环境 ID
- `app.js:11` `env: ""` — 留空
- 行动: 不改，由用户在开发者工具云开发面板填入（属于用户配置）

## 5. envList.js
- 现状: 空数组
- 行动: 不改（同 4，属于用户配置）

## 设计方向（来自 frontend-design-direction）
- Purpose: 训练短时记忆的小游戏
- Audience: 微信用户，碎片时间、3-5 分钟一局
- Tone: 轻量、活泼、清晰
- Memorable detail: 配对成功的微震动 + 卡片翻转 3D 过渡
- Constraints: 微信小程序、rpx 适配、不引外部依赖
- 反模式: 避免紫色渐变 / blob 装饰 / 卡片嵌套卡片 / 模板化 hero 文案

## UI/UX 原则（来自 ui-ux-pro-max）
- 风格: Flat Design / 轻拟物（卡片正面 emoji）
- 配色: 已在用 绿色 #4CAF50（导航栏）+ 中性灰 #F5F5F5 + 白卡片 — 协调，不改
- 排版: 系统字体栈，28rpx 正文，已合理
- 可加: 配对成功时高亮颜色变化（已有 `.matched` 类，需确认 wxss 风格统一）