# Task Plan — 记忆翻牌小游戏（第二次课验收）

## 目标
满足课要求"方向一：轻量小游戏"四项必做 + 加分项；只做必要修改，不重构。

## 现状摘要
- 5 个页面: `index` / `level` / `game` / `result` / `example` — 已超 2 页底线
- 主循环: index → level → game → result → 重玩/下一关 — 已贯通
- 计分: `levelId*1000 + remainingTime*10`，**仅在 gameOver 一次性计算**，过程中无变化 ❌
- 云数据库: 工具模块已封装，**集合名 = `gameRecord`**，与课要求 `scores` 不符 ❌
- 数据模型: 单一 `_openid:'default'` 文档承载最高分/进度，不符合 `scores` 集合语义 ❌
- 重新开始按钮: 已存在（modal 内 + 暂停菜单）✓
- 最高分展示: result 页有 `highestScore` 字段 ✓
- 游戏说明: index 用 `showModal` 弹窗，未独立成页 ⚠️

## 必做项验收对照
| # | 课要求 | 现状 | 行动 |
|---|---|---|---|
| 1 | 主循环: 开始→进行→结束 | ✓ | 无 |
| 2 | 计分系统: 过程有变化 | ❌ | 配对 +100，错配 -10；时间奖励按剩余秒数在 gameOver 结算 |
| 3 | 数据上云: 写入 `scores` 集合 | ❌ | 改集合名 `gameRecord` → `scores`；每局 add 一条记录；保留最高分聚合查询 |
| 4 | ≥2 页面 | ✓ (5 个) | 无 |

## 加分项对照
| # | 加分项 | 现状 | 行动 |
|---|---|---|---|
| 1 | 重新开始按钮 | ✓ | 无 |
| 2 | 简单排行榜 | ⚠️ 只有最高分一个数字 | result 页加"最近 N 局"列表 |
| 3 | 游戏说明/规则页 | ⚠️ modal | 升级为独立页 `pages/rules` |

## 修改文件清单（最小）
- `miniprogram/utils/cloud.js` — 改集合名、调整数据模型
- `miniprogram/pages/game/game.js` — 配对过程加分/扣分
- `miniprogram/pages/result/result.js` + `.wxml` + `.wxss` — 加排行榜列表
- `miniprogram/pages/rules/rules.*` — 新增（仅 4 个文件，可选）
- `miniprogram/app.json` — 注册新页面

## 不动
- `index` / `level` 页面（已满足）
- `example` 页面（模板自带的 example，保留无害）
- 全局样式（已简洁）

## 阶段
- [x] 探索项目
- [x] 差距分析
- [ ] 应用 planning 写出 findings & progress
- [ ] 应用 frontend-design-direction & ui-ux-pro-max 校验视觉/交互
- [ ] 实施 utils/cloud.js 改动
- [ ] 实施 game.js 计分改动
- [ ] 实施 result 排行榜（可选）
- [ ] 实施 rules 页（可选）
- [ ] TRAE-security-review 复审 diff