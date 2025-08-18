import { NextResponse } from 'next/server';
import { access, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { constants } from 'fs';

export async function GET() {
  try {
    const tempDir = resolve(process.cwd(), '../examples/temp');
    const downloadsDir = resolve(process.cwd(), '../examples/downloads');
    const outputDir = resolve(process.cwd(), '../examples/output');

    // 检查目录是否存在，不存在则创建
    for (const dir of [tempDir, downloadsDir, outputDir]) {
      try {
        await access(dir, constants.R_OK | constants.W_OK);
      } catch {
        await mkdir(dir, { recursive: true });
      }
    }

    // 测试写入权限
    const testFile = resolve(tempDir, '.test');
    await mkdir(testFile, { recursive: true });
    await access(testFile, constants.R_OK | constants.W_OK);

    return NextResponse.json({
      ok: true,
      message: '存储目录检查通过',
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: '存储目录权限不足',
    });
  }
}