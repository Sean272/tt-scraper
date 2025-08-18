import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { writeFile } from 'fs/promises';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '请上传文件' },
        { status: 400 }
      );
    }

    // 创建临时目录
    const tempDir = resolve(process.cwd(), '../examples/temp');
    await execAsync(`mkdir -p "${tempDir}"`);

    // 保存上传的文件
    const tempFile = resolve(tempDir, `${Date.now()}-authors.txt`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFile, buffer);

    // 调用脚本
    const scriptPath = resolve(process.cwd(), '../examples/batch-authors-videos.js');
    const { stdout } = await execAsync(
      `node "${scriptPath}" "${tempFile}" 1 weeks`  // 默认查询最近一周的数据
    );

    // 解析输出内容
    const lines = stdout.split('\n');
    const data: Record<string, any>[] = [];

    let currentVideo: Record<string, any> = {};
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        // 映射字段名
        switch (key.trim().toLowerCase()) {
          case 'video id':
          case 'videoid':
          case '视频id':
            if (currentVideo.id) {
              data.push(currentVideo);
              currentVideo = {};
            }
            currentVideo.id = value;
            break;
          case 'description':
          case '描述':
            currentVideo.description = value;
            break;
          case 'author':
          case '作者':
            currentVideo.author = value;
            break;
          case 'likes':
          case '点赞数':
            currentVideo.likes = value;
            break;
          case 'comments':
          case '评论数':
            currentVideo.comments = value;
            break;
          case 'shares':
          case '分享数':
            currentVideo.shares = value;
            break;
          case 'plays':
          case '播放数':
            currentVideo.plays = value;
            break;
          case 'create time':
          case 'createtime':
          case '创建时间':
            currentVideo.createTime = value;
            break;
          case 'video url':
          case 'videourl':
          case '视频链接':
            currentVideo.videoUrl = value;
            break;
          case 'is capcut':
          case 'iscapcut':
          case 'capcut投稿':
            currentVideo.isCapCut = value;
            break;
          case 'capcut confidence':
          case 'capcutconfidence':
          case 'capcut置信度':
            currentVideo.capCutConfidence = value;
            break;
          case 'source platform':
          case 'sourceplatform':
          case '来源平台':
            currentVideo.sourcePlatform = value;
            break;
        }
      }
    });

    // 添加最后一个视频
    if (currentVideo.id) {
      data.push(currentVideo);
    }

    // 清理临时文件
    await execAsync(`rm -f "${tempFile}"`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '获取作者视频数据失败' },
      { status: 500 }
    );
  }
}