import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    // 调用测试脚本
    const scriptPath = resolve(process.cwd(), '../examples/test-siliconflow-integration.js');
    
    await execAsync(`node "${scriptPath}" "${apiKey}"`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'API密钥验证失败' },
      { status: 401 }
    );
  }
}