import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const apiKey = formData.get('apiKey') as string;
    const model = formData.get('model') as string;

    if (!file || !apiKey) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 创建临时目录
    const tempDir = resolve(process.cwd(), '../examples/temp');
    const uploadsDir = resolve(tempDir, 'uploads');
    const framesDir = resolve(tempDir, 'frames');

    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir);
    }
    if (!existsSync(framesDir)) {
      await mkdir(framesDir);
    }

    // 保存上传的视频文件
    const videoPath = resolve(uploadsDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(videoPath, buffer);

    // 调用视频帧分析脚本
    const scriptPath = resolve(process.cwd(), '../examples/video-frame-analyzer.js');
    
    const { stdout } = await execAsync(
      `node "${scriptPath}" "${videoPath}" "${apiKey}" "${model}" --frames-dir="${framesDir}"`
    );

    // 解析输出文件
    const outputLines = stdout.trim().split('\n');
    const saveLine = outputLines.find(line => line.includes('分析报告已保存到:'));
    let outputPath = saveLine ? saveLine.split('分析报告已保存到:')[1].trim() : '';
    
    if (!outputPath) {
      return NextResponse.json(
        { error: '未找到分析报告' },
        { status: 404 }
      );
    }

    // 读取分析报告
    const reportContent = await readFile(outputPath, 'utf-8');
    const analysisResult = JSON.parse(reportContent);

    // 清理临时文件
    await execAsync(`rm -rf "${videoPath}"`);
    await execAsync(`rm -rf "${framesDir}/*"`);

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '视频帧分析失败' },
      { status: 500 }
    );
  }
}