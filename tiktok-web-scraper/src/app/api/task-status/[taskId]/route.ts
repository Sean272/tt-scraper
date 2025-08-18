import { NextResponse } from 'next/server';

// 从batch-process.ts中导入tasks
declare const tasks: Map<string, any>;

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const taskId = params.taskId;
  const task = tasks.get(taskId);

  if (!task) {
    return NextResponse.json(
      { error: '任务不存在' },
      { status: 404 }
    );
  }

  return NextResponse.json(task);
}