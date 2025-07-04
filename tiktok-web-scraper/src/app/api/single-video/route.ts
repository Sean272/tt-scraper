import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve, join } from 'path';
import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { videoId } = await request.json();

    // 绝对路径
    const scriptPath = resolve(process.cwd(), '../examples/show-video-details.js');
    const outputDir = resolve(process.cwd(), '../examples/output');

    // 调用 Node.js 脚本
    const { stdout } = await execAsync(
      `node "${scriptPath}" ${videoId}`
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
      // 用csv-parse解析CSV
      const records = parse(fileContent, { columns: true, skip_empty_lines: true });
      // 字段映射（增强，支持常见变体和去除空格/引号）
      const fieldMap: Record<string, string> = {
        '视频ID': 'id',
        '视频id': 'id',
        'id': 'id',
        '描述': 'description',
        '作者': 'author',
        '作者用户名': 'author',
        '点赞数': 'likes',
        '评论数': 'comments',
        '分享数': 'shares',
        '播放数': 'plays',
        '播放量': 'plays',
        '创建时间': 'createTime',
        '视频链接': 'videoUrl',
        '链接': 'videoUrl',
        '视频地址': 'videoUrl',
      };
      const clean = (s: string) => s.replace(/^"|"$/g, '').replace(/\r|\n/g, '').trim();
      const data = records.map((row: Record<string, string>) => {
        const obj: Record<string, string> = {};
        for (const key in row) {
          const cleanKey = clean(key);
          const mappedKey = fieldMap[cleanKey] || cleanKey;
          obj[mappedKey] = clean(row[key]);
        }
        return obj;
      });
      // 返回单个视频对象（如果有）
      return NextResponse.json(data[0] || {});
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