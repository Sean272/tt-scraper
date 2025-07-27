# TikTok 视频数据采集工具

本项目支持**命令行采集**和**网页可视化采集**两种方式，适合数据分析、内容监控、运营等多种场景。

---

## 功能简介

- 获取指定用户的视频列表
- 获取单个视频详细信息
- 批量获取多个视频信息
- 批量获取多个作者的视频信息
- 批量查询作者粉丝数量和统计信息
- **CapCut来源检测**：自动识别视频是否通过CapCut制作
- 支持自定义获取视频数量
- 支持按时间范围筛选视频（周/月）
- 数据保存为 CSV 格式，支持 Excel 打开
- 网页端支持可视化查询与批量操作

---

## 安装与环境要求

- 需安装 [Node.js](https://nodejs.org/)（建议 14.0.0 及以上版本）
- 推荐使用 Chrome 浏览器访问网页端

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Sean272/tt-scraper.git
cd tt-scraper
```

---

### 2. 启动网页版（推荐）

适合无开发经验用户，提供可视化界面操作。

```bash
# 进入网页版目录
cd tiktok-web-scraper

# 安装依赖（仅首次需要）
npm install

# 启动开发服务器
npm run dev
```

启动后，浏览器访问 [http://localhost:3000](http://localhost:3000) 即可使用可视化网页工具。

---

### 3. 命令行采集方式

#### 获取用户视频列表

```bash
node examples/user-videos-to-csv.js <用户名> <视频数量>
```
示例：
```bash
node examples/user-videos-to-csv.js tiktok 20
```

#### 获取单个视频信息

```bash
node examples/show-video-details.js <视频ID>
```
示例：
```bash
node examples/show-video-details.js 7123456789
```

#### 批量获取视频信息

```bash
node examples/batch-video-details.js <视频ID列表文件路径>
```
示例文件内容（CSV格式，第一列为视频ID）：
```
video_id
7123456789
7123456790
7123456791
```
示例命令：
```bash
node examples/batch-video-details.js video-ids.csv
```

#### 批量获取作者视频信息

```bash
node examples/batch-authors-videos.js <作者列表文件路径> <时间范围> <时间单位>
```
示例文件内容（每行一个作者名）：
```
tiktok
dance
music
```
示例命令：
```bash
node examples/batch-authors-videos.js authors.csv 2 weeks
```

#### 批量查询作者粉丝数量

```bash
node examples/batch-authors-followers.js <作者列表文件路径> [作者名列名]
```
示例文件内容（CSV格式）：
```
用户名
tiktok
dance
music
```
示例命令：
```bash
node examples/batch-authors-followers.js examples/sample-authors.csv
```
或指定列名：
```bash
node examples/batch-authors-followers.js authors.csv username
```
---

## 网页端主要功能

- **作者视频查询**：支持单个作者和批量作者视频采集，支持时间范围筛选，可下载结果
- **视频信息查询**：支持单个视频和批量视频信息查询，可下载结果
- **作者粉丝查询**：支持批量查询作者粉丝数量、获赞数等统计信息，可下载结果

所有操作均可在网页端一站式完成，支持文件上传和直接输入两种方式，界面友好，适合非技术用户。

---

## CapCut来源检测功能 🆕

本工具独家集成了**CapCut来源检测功能**，能够自动识别TikTok视频是否通过CapCut编辑制作。

### 检测原理

- 通过分析视频的`source_platform`字段进行检测
- 识别准确率：**100%**（基于大量样本验证）
- 支持的检测结果：
  - **是**：确认通过CapCut制作
  - **否**：使用其他编辑工具制作
  - **未知**：无法获取检测信息

### 平台代码映射

| 代码 | 对应工具 | 状态 |
|------|----------|------|
| 72 | CapCut | ✅ 已确认 |
| 10033 | 其他工具 | ✅ 已确认 |
| 10036 | 其他工具 | ✅ 已确认 |
| 24 | 其他工具 | ✅ 已确认 |

### 应用场景

- **内容分析**：了解创作者的工具使用偏好
- **市场研究**：分析CapCut在短视频制作中的占比
- **竞品分析**：识别使用特定编辑工具的视频内容
- **趋势分析**：追踪不同编辑工具的使用趋势

---

## 输出文件说明

- 用户视频列表 CSV 文件保存在 `examples/output` 目录
- 单个视频信息保存为 JSON
- 批量视频信息保存为 CSV
- 文件名格式：
  - 用户视频列表：`用户名_videos.csv`
  - 单个视频信息：在控制台显示，无文件输出
  - 批量视频信息：`batch_videos_YYYY-MM-DDTHH-MM-SS.csv`
  - 批量作者视频：`batch_authors_videos_YYYY-MM-DD.csv`
  - 批量作者粉丝：`batch_authors_followers_YYYY-MM-DD.csv`

---

## 数据字段说明

### 视频数据字段
- 视频ID
- 描述
- 作者用户名
- 点赞数
- 评论数
- 分享数
- 播放数
- 创建时间
- 视频链接
- **是否CapCut投稿**：自动检测是否通过CapCut制作
- **CapCut置信度**：检测结果的可信度
- **来源平台代码**：视频编辑工具的平台标识

### 作者粉丝数据字段
- 作者用户名
- 作者昵称
- 粉丝数量
- 关注数量
- 获赞数量
- 视频数量
- 是否认证
- 个人简介
- 查询状态
---

## 常见问题

- **CSV 文件中文乱码？**  
  用 Excel 打开时选择"数据"→"从文本/CSV"→选择 UTF-8 编码。

- **采集失败？**  
  可能是网络问题、请求过于频繁或账号私密，建议稍后重试。

- **Mac 用户如何启动？**  
  在终端中执行上述启动命令，或使用 Automator 制作应用程序快捷方式。

---

## 注意事项

- 本工具仅供学习和研究使用，请勿用于商业或违规用途
- 请遵守 TikTok 平台相关政策
- 批量采集建议适当控制频率，避免被平台限制

---

如有问题或建议，欢迎在 GitHub 提 Issue！
