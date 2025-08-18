import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

// 任务状态存储
const tasks = new Map();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const enableDownload = formData.get('enableDownload') === 'true';
    const enableAnalysis = formData.get('enableAnalysis') === 'true';
    const apiKey = formData.get('apiKey') as string;
    const model = formData.get('model') as string;

    // 创建临时目录
    const tempDir = resolve(process.cwd(), '../examples/temp');
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // 保存上传的文件
    const filePath = resolve(tempDir, `${Date.now()}-${file.name}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // 读取文件内容获取视频ID列表
    const content = buffer.toString('utf-8');
    const videoIds = content.trim().split('\n').map(line => line.trim());

    // 为每个视频创建任务
    const taskIds = videoIds.map(videoId => {
      const taskId = uuidv4();
      tasks.set(taskId, {
        id: videoId,
        status: 'pending',
        progress: 0,
      });
      return taskId;
    });

    // 启动后台处理
    taskIds.forEach(taskId => {
      processVideo(taskId, tasks.get(taskId).id, {
        enableDownload,
        enableAnalysis,
        apiKey,
        model,
      });
    });

    return NextResponse.json({ taskIds });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '批量处理失败' },
      { status: 500 }
    );
  }
}

async function processVideo(taskId: string, videoId: string, options: any) {
  const task = tasks.get(taskId);
  if (!task) return;

  try {
    // 下载视频
    if (options.enableDownload) {
      task.status = 'downloading';
      tasks.set(taskId, task);

      const scriptPath = resolve(process.cwd(), '../examples/batch-video-details-with-download.js');
      await execAsync(
        `node "${scriptPath}" "${videoId}" --download`
      );
      task.progress = 50;
    }

    // 分析视频
    if (options.enableAnalysis) {
      task.status = 'analyzing';
      tasks.set(taskId, task);

      const scriptPath = resolve(process.cwd(), '../examples/video-frame-analyzer.js');
      const downloadsDir = resolve(process.cwd(), '../examples/downloads');
      await execAsync(
        `node "${scriptPath}" "${downloadsDir}" "${options.apiKey}" "${options.model}"`
      );
      task.progress = 100;
    }

    task.status = 'completed';
    tasks.set(taskId, task);
  } catch (error) {
    console.error(`Error processing video ${videoId}:`, error);
    task.status = 'failed';
    task.error = error.message;
    tasks.set(taskId, task);
  }
}