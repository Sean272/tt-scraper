import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';

const execAsync = promisify(exec);

interface VideoData {
  id?: string;
  description?: string;
  author?: string;
  likes?: string;
  comments?: string;
  plays?: string;
  createTime?: string;
  videoUrl?: string;
}

export async function POST(request: Request) {
  try {
    const { author, timeRange: originalTimeRange, timeUnit } = await request.json();

    // 打印请求参数
    console.log('Request params:', { author, originalTimeRange, timeUnit });

    // 绝对路径
    const scriptPath = resolve(process.cwd(), '../examples/user-videos-to-csv.js');

    // 转换时间单位
    let unitArg: string;
    let adjustedTimeRange: number;

    switch (timeUnit) {
      case 'days':
        unitArg = 'days';
        adjustedTimeRange = parseInt(originalTimeRange);
        break;
      case 'weeks':
        unitArg = 'weeks';
        adjustedTimeRange = parseInt(originalTimeRange);
        break;
      case 'months':
        unitArg = 'months';
        adjustedTimeRange = parseInt(originalTimeRange);
        break;
      default:
        throw new Error('不支持的时间单位');
    }

    // 打印转换后的参数
    console.log('Adjusted params:', { adjustedTimeRange, unitArg });

    // 创建临时作者文件
    const tempAuthorFile = resolve(process.cwd(), '../examples/temp', `${Date.now()}-author.txt`);
    await execAsync(`mkdir -p "${resolve(process.cwd(), '../examples/temp')}" && echo "${author}" > "${tempAuthorFile}"`);

    // 打印命令
    const cmd = `node "${scriptPath}" "${author}" ${adjustedTimeRange} ${unitArg} --skip-capcut-check`;
    console.log('Executing command:', cmd);

    // 调用 Node.js 脚本
    const { stdout, stderr } = await execAsync(cmd);

    // 打印原始输出
    console.log('Raw stdout:', stdout);
    if (stderr) console.error('Raw stderr:', stderr);

    // 解析输出内容
    const lines = stdout.split('\n');
    const videos: VideoData[] = [];
    let currentVideo: VideoData = {};
    let inPreviewSection = false;
    let videoCount = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳过空行
      if (!trimmedLine) continue;

      // 检查是否找到了视频数量
      const countMatch = trimmedLine.match(/找到 (\d+) 个视频在指定时间范围内/);
      if (countMatch) {
        videoCount = parseInt(countMatch[1]);
        if (videoCount === 0) {
          return NextResponse.json([]);
        }
        continue;
      }

      // 检查是否进入预览部分
      if (trimmedLine === '前3个视频预览:') {
        inPreviewSection = true;
        continue;
      }

      // 检查是否是新视频的开始
      if (trimmedLine.match(/^视频 \d+:$/)) {
        if (Object.keys(currentVideo).length > 0) {
          videos.push(currentVideo);
        }
        currentVideo = {
          author: author
        };
        continue;
      }

      // 如果在预览部分，解析视频信息
      if (inPreviewSection) {
        const descMatch = trimmedLine.match(/^- 描述: (.+)$/);
        const likesMatch = trimmedLine.match(/^- 点赞数: (\d+)$/);
        const playsMatch = trimmedLine.match(/^- 播放数: (\d+)$/);
        const timeMatch = trimmedLine.match(/^- 创建时间: (.+)$/);

        if (descMatch) {
          currentVideo.description = descMatch[1];
        } else if (likesMatch) {
          currentVideo.likes = likesMatch[1];
        } else if (playsMatch) {
          currentVideo.plays = playsMatch[1];
        } else if (timeMatch) {
          currentVideo.createTime = timeMatch[1];
          // 生成视频ID（使用时间戳的最后10位作为ID）
          const timestamp = new Date(timeMatch[1]).getTime();
          currentVideo.id = timestamp.toString().slice(-10);
          // 生成视频URL
          currentVideo.videoUrl = `https://www.tiktok.com/@${author}/video/${currentVideo.id}`;
        }
      }
    }

    // 添加最后一个视频
    if (Object.keys(currentVideo).length > 0) {
      videos.push(currentVideo);
    }

    // 打印解析后的数据
    console.log('Parsed data:', videos);

    // 清理临时文件
    await execAsync(`rm -f "${tempAuthorFile}"`);

    return NextResponse.json(videos);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '获取作者视频数据失败' },
      { status: 500 }
    );
  }
}