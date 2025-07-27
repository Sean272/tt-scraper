import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile } from 'fs/promises';
import { join, resolve, basename } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  if (!file) {
    return NextResponse.json({ error: '缺少文件参数' }, { status: 400 });
  }
  const outputDir = resolve(process.cwd(), '../examples/output');
  const filePath = join(outputDir, file);
  try {
    const csvContent = await readFile(filePath);
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${file}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      );
    }

    // 保存上传的文件到临时目录
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempFilePath = join(tmpdir(), 'video-ids.txt');
    await writeFile(tempFilePath, buffer);

    // 绝对路径
    const scriptPath = resolve(process.cwd(), '../examples/batch-video-details.js');
    const outputDir = resolve(process.cwd(), '../examples/output');

    // 调用 Node.js 脚本
    const { stdout } = await execAsync(
      `node "${scriptPath}" ${tempFilePath}`
    );

    // 解析输出文件路径，只取包含"数据已保存到:"的那一行
    const outputLines = stdout.trim().split('\n');
    const saveLine = outputLines.find(line => line.includes('数据已保存到:'));
    let outputPath = saveLine ? saveLine.split('数据已保存到:')[1].trim() : '';
    if (outputPath && !outputPath.startsWith('/')) {
      outputPath = join(outputDir, outputPath);
    }
    if (!outputPath) {
      return NextResponse.json(
        { error: '未找到输出文件路径' },
        { status: 404 }
      );
    }
    try {
      // 读取 CSV 文件内容
      const fileContent = await readFile(outputPath, 'utf-8');
      // 解析 CSV 内容
      const rows = fileContent.trim().split('\n');
      const headers = rows[0].split(',');
      // 字段映射
      const fieldMap: Record<string, string> = {
        '视频ID': 'id',
        '描述': 'description',
        '作者': 'author',
        '点赞数': 'likes',
        '评论数': 'comments',
        '分享数': 'shares',
        '播放数': 'plays',
        '创建时间': 'createTime',
        '视频链接': 'videoUrl',
        '是否CapCut投稿': 'isCapCut',
        'CapCut置信度': 'capCutConfidence',
        '来源平台代码': 'sourcePlatform',
      };
      const data = rows.slice(1).map(row => {
        const values = row.split(',');
        return headers.reduce((obj, header, index) => {
          const key = fieldMap[header] || header;
          obj[key] = values[index];
          return obj;
        }, {} as Record<string, string>);
      });
      // 返回JSON和文件名
      return NextResponse.json({ data, fileName: basename(outputPath) });
    } catch (readError) {
      console.error('Error reading file:', readError);
      throw new Error('无法读取输出文件');
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '获取视频数据失败' },
      { status: 500 }
    );
  }
} 