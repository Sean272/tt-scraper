import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    await execAsync('ffmpeg -version');
    return NextResponse.json({
      installed: true,
      message: 'FFmpeg已安装',
    });
  } catch (error) {
    return NextResponse.json({
      installed: false,
      message: 'FFmpeg未安装，请先安装FFmpeg',
    });
  }
}