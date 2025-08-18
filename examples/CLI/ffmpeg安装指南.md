# FFmpeg 安装指南

## 概述

视频帧分析器需要 FFmpeg 来提取视频帧。本指南将帮助您在不同操作系统上安装 FFmpeg。

## macOS 安装

### 使用 Homebrew（推荐）

```bash
# 安装 Homebrew（如果还没有安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 FFmpeg
brew install ffmpeg
```

### 验证安装

```bash
ffmpeg -version
```

## Ubuntu/Debian 安装

### 使用 apt

```bash
# 更新包列表
sudo apt update

# 安装 FFmpeg
sudo apt install ffmpeg
```

### 验证安装

```bash
ffmpeg -version
```

## CentOS/RHEL 安装

### 使用 yum

```bash
# 安装 EPEL 仓库
sudo yum install epel-release

# 安装 FFmpeg
sudo yum install ffmpeg ffmpeg-devel
```

### 验证安装

```bash
ffmpeg -version
```

## Windows 安装

### 方法1：使用 Chocolatey

```powershell
# 安装 Chocolatey（如果还没有安装）
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装 FFmpeg
choco install ffmpeg
```

### 方法2：手动安装

1. 访问 [FFmpeg 官网](https://ffmpeg.org/download.html)
2. 下载 Windows 版本
3. 解压到 `C:\ffmpeg`
4. 将 `C:\ffmpeg\bin` 添加到系统 PATH

### 验证安装

```cmd
ffmpeg -version
```

## 测试 FFmpeg 功能

### 基本测试

```bash
# 测试 FFmpeg 是否正常工作
ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=1 -f null -
```

### 视频帧提取测试

```bash
# 创建一个测试视频
ffmpeg -f lavfi -i testsrc=duration=5:size=320x240:rate=1 test_video.mp4

# 提取帧
ffmpeg -i test_video.mp4 -ss 1 -vframes 1 test_frame.jpg

# 检查是否成功提取
ls test_frame.jpg
```

## 常见问题

### Q: 安装后仍然提示找不到 ffmpeg
A: 请确保 FFmpeg 已添加到系统 PATH 中。

### Q: 权限错误
A: 在 Linux/macOS 上，可能需要使用 `sudo` 来安装。

### Q: 版本过旧
A: 某些系统可能提供较旧的 FFmpeg 版本。建议从官网下载最新版本。

## 使用视频帧分析器

安装 FFmpeg 后，您就可以使用视频帧分析器了：

```bash
# 测试视频帧分析
node examples/video-frame-analyzer.js examples/downloads <您的API密钥>

# 使用指定模型
node examples/video-frame-analyzer.js examples/downloads <您的API密钥> deepseek-ai/deepseek-vl2
```

## 故障排除

### 1. 检查 FFmpeg 安装
```bash
which ffmpeg
ffmpeg -version
```

### 2. 检查视频文件
```bash
# 检查视频文件信息
ffmpeg -i your_video.mp4
```

### 3. 测试帧提取
```bash
# 手动测试帧提取
ffmpeg -i your_video.mp4 -ss 1 -vframes 1 test_frame.jpg
```

### 4. 查看错误日志
如果视频帧分析器失败，请检查：
- FFmpeg 是否正确安装
- 视频文件是否损坏
- 是否有足够的磁盘空间
- 是否有写入权限

## 性能优化

### 1. 调整帧提取参数
在 `video-frame-analyzer.js` 中可以调整：
- `frameInterval`: 帧提取间隔
- `maxFrames`: 最大帧数

### 2. 使用更快的模型
- 对于大批量处理，使用较小的模型
- 对于高质量分析，使用较大的模型

### 3. 并行处理
可以修改代码以支持并行处理多个视频，但需要注意 API 限制。 