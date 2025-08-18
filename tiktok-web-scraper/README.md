# TikTok 视频数据采集工具 - Web 界面

基于 Next.js 和 Ant Design 构建的 TikTok 视频数据采集工具 Web 界面。

## 功能特点

- 现代化的用户界面
- 实时数据查询和显示
- 文件上传支持
- 进度显示和错误处理
- 响应式设计

## 环境要求

- Node.js >= 16
- FFmpeg（用于视频帧分析）

## 安装

```bash
# 安装依赖
npm install
```

## 开发

```bash
# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 构建

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 功能模块

### 1. 视频信息查询
- 支持输入视频 ID 或 URL
- 支持批量上传 txt 文件
- 显示完整视频信息

### 2. 作者视频查询
- 支持按时间范围查询（天/周/月）
- 支持批量作者查询
- 实时显示查询进度

### 3. 作者粉丝查询
- 支持单个和批量查询
- 显示粉丝统计信息
- 导出数据功能

### 4. 视频帧分析
- 支持视频文件上传
- 显示分析进度
- 可视化分析结果

### 5. 批量视频处理
- 支持多个视频同时处理
- 显示处理进度
- 错误重试机制

## 技术栈

- Next.js 14
- React 18
- Ant Design 5
- Tailwind CSS
- Axios

## 项目结构

```
src/
  ├── app/              # Next.js App Router
  │   ├── api/         # API 路由
  │   └── ...         # 页面组件
  ├── components/      # React 组件
  ├── lib/            # 工具函数
  └── styles/         # 样式文件
```

## API 接口

### 视频信息
- POST `/api/single-video`
- POST `/api/batch-videos`

### 作者视频
- POST `/api/author-videos`
- POST `/api/batch-authors-videos`

### 作者粉丝
- POST `/api/author-followers`
- POST `/api/batch-authors-followers`

### 视频分析
- POST `/api/analyze-frames`
- POST `/api/batch-process`

## 环境检查

Web 界面会自动检查：

1. FFmpeg 是否安装
2. API 密钥是否有效（如果提供）
3. 存储权限是否正确

## 配置选项

在 `.env` 文件中配置：

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_MAX_UPLOAD_SIZE=100
```

## 更新日志

### 2025-08-18
- 修复作者视频查询显示问题
- 优化数据解析逻辑
- 改进错误处理和提示
- 支持跳过 CapCut 检测
- 添加更多调试信息

## 许可证

MIT