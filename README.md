# TikTok 视频数据采集工具

一个简单的 TikTok 视频数据采集工具，支持命令行和 Web 界面。

## 功能特点

- 单个视频信息查询
- 批量视频信息查询
- 作者视频查询（支持天/周/月时间范围）
- 作者粉丝查询
- 视频帧分析
- 批量视频处理
- CapCut 投稿检测
- Web 界面支持

## 环境要求

- Node.js >= 16
- FFmpeg（用于视频帧分析）

### FFmpeg 安装

#### macOS
```bash
brew install ffmpeg
```

#### Windows
1. 下载 FFmpeg: https://www.ffmpeg.org/download.html
2. 解压并添加到系统环境变量

#### Linux
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

## 安装

```bash
# 克隆仓库
git clone [repository-url]
cd tt-scraper-main

# 安装依赖
npm install

# 安装 Web 界面依赖
cd tiktok-web-scraper
npm install
```

## 使用方法

### 命令行工具

#### 单个视频查询
```bash
node examples/show-video-details.js [视频ID]
```

#### 批量视频查询
```bash
node examples/batch-video-details.js [视频ID列表文件]
```

#### 作者视频查询
```bash
node examples/user-videos-to-csv.js [作者用户名] [时间范围] [时间单位]

# 示例：获取最近3天的视频
node examples/user-videos-to-csv.js username 3 days

# 示例：获取最近2周的视频
node examples/user-videos-to-csv.js username 2 weeks

# 示例：获取最近1个月的视频
node examples/user-videos-to-csv.js username 1 months
```

#### 作者粉丝查询
```bash
node examples/batch-authors-followers.js [作者列表文件]
```

#### 视频帧分析
```bash
node examples/video-frame-analyzer.js [视频文件或ID]
```

### Web 界面

```bash
cd tiktok-web-scraper
npm run dev
```

访问 http://localhost:3000 使用 Web 界面。

## Web 界面功能

1. **视频信息查询**
   - 支持单个视频查询
   - 支持批量视频查询（上传txt文件）
   - 显示视频基本信息（点赞、评论、播放等）

2. **作者视频查询**
   - 支持按时间范围查询（天/周/月）
   - 支持批量作者查询
   - 显示视频列表和统计信息

3. **作者粉丝查询**
   - 支持单个作者查询
   - 支持批量作者查询
   - 显示粉丝统计信息

4. **视频帧分析**
   - 支持视频文件上传
   - 提取关键帧并分析
   - 显示分析结果和总结

5. **批量视频处理**
   - 支持批量下载
   - 支持批量分析
   - 显示处理进度和结果

## 数据输出

所有数据都会保存在 `examples/output` 目录下：

- 视频信息：`video_details_[timestamp].csv`
- 作者视频：`[username]_videos.csv`
- 作者粉丝：`authors_followers_[timestamp].csv`
- 视频分析：`video_analysis_[video_id]_[timestamp].json`

## 注意事项

1. 请合理使用，避免频繁请求
2. 建议使用代理以避免 IP 限制
3. 部分功能需要 API 密钥（可选）
4. 视频帧分析需要安装 FFmpeg

## 更新日志

### 2025-08-18
- 修复作者视频查询的时间范围问题
- 优化 Web 界面显示效果
- 改进数据解析逻辑
- 添加更多错误处理
- 支持跳过 CapCut 检测以提高速度

## 许可证

MIT