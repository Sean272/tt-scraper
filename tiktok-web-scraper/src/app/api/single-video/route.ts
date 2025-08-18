import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { videoId } = await request.json();

    // 绝对路径
    const scriptPath = resolve(process.cwd(), '../examples/show-video-details.js');

    // 调用 Node.js 脚本并直接解析输出
    const { stdout } = await execAsync(
      `node "${scriptPath}" ${videoId}`
    );

    // 打印原始输出以便调试
    console.log('Raw output:', stdout);

    // 解析输出内容
    const lines = stdout.split('\n');
    const data: Record<string, string> = {
      id: videoId,
      description: '',
      author: '',
      likes: '0',
      comments: '0',
      shares: '-',  // 改为 '-' 作为默认值，表示数据不可用
      plays: '0',
      createTime: '',
      videoUrl: '',
      isCapCut: '否',
      capCutConfidence: '0',
      sourcePlatform: '',
    };

    let inSummarySection = false;

    // 从输出中提取信息
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳过空行
      if (!trimmedLine) continue;

      // 检查是否进入摘要部分
      if (trimmedLine === '=== 视频信息摘要 ===') {
        inSummarySection = true;
        continue;
      }

      // 如果不在摘要部分，跳过
      if (!inSummarySection) continue;

      // 如果遇到特效或贴纸信息，结束摘要部分
      if (trimmedLine.includes('该视频未使用特效') || trimmedLine.includes('该视频未使用贴纸')) {
        inSummarySection = false;
        continue;
      }

      // 提取数字的辅助函数
      const extractNumber = (str: string) => {
        const matches = str.match(/\d+/);
        return matches ? matches[0] : '0';
      };

      // 解析摘要部分的数据
      if (trimmedLine.startsWith('视频ID:')) {
        data.id = trimmedLine.split(':')[1]?.trim() || videoId;
      } else if (trimmedLine.startsWith('描述:')) {
        data.description = trimmedLine.split(':')[1]?.trim() || '';
      } else if (trimmedLine.startsWith('作者:')) {
        data.author = trimmedLine.split(':')[1]?.trim() || '';
      } else if (trimmedLine.startsWith('发布时间:')) {
        // 修复发布时间解析
        data.createTime = trimmedLine.split(':').slice(1).join(':').trim() || '';
      } else if (trimmedLine.startsWith('播放量:')) {
        data.plays = extractNumber(trimmedLine);
      } else if (trimmedLine.startsWith('点赞数:')) {
        data.likes = extractNumber(trimmedLine);
      } else if (trimmedLine.startsWith('评论数:')) {
        data.comments = extractNumber(trimmedLine);
      } else if (trimmedLine.startsWith('是否CapCut投稿:')) {
        data.isCapCut = trimmedLine.split(':')[1]?.trim() || '否';
      } else if (trimmedLine.startsWith('来源平台代码:')) {
        data.sourcePlatform = trimmedLine.split(':')[1]?.trim() || '';
      }
    }

    // 如果没有找到视频链接，生成一个
    if (!data.videoUrl && data.author) {
      // 修复作者名中的空格问题
      const safeAuthor = data.author.replace(/ /g, '_');
      data.videoUrl = `https://www.tiktok.com/@${safeAuthor}/video/${data.id}`;
    }

    // 打印解析后的数据以便调试
    console.log('Parsed data:', data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '获取视频数据失败' },
      { status: 500 }
    );
  }
}