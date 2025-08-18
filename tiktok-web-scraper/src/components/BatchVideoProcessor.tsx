'use client';

import { useState } from 'react';
import { Form, Upload, Button, Table, message, Progress, Space, Switch } from 'antd';
import { UploadOutlined, DownloadOutlined, LineChartOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import axios from 'axios';

interface VideoTask {
  id: string;
  status: 'pending' | 'downloading' | 'analyzing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  localPath?: string;
  error?: string;
  analysisResult?: any;
}

export default function BatchVideoProcessor() {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [enableDownload, setEnableDownload] = useState(true);
  const [enableAnalysis, setEnableAnalysis] = useState(true);

  const columns = [
    { 
      title: '视频ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          pending: { text: '等待处理', color: '#999' },
          downloading: { text: '下载中', color: '#1890ff' },
          analyzing: { text: '分析中', color: '#722ed1' },
          completed: { text: '已完成', color: '#52c41a' },
          failed: { text: '失败', color: '#f5222d' },
        };
        const { text, color } = statusMap[status as keyof typeof statusMap];
        return <span style={{ color }}>{text}</span>;
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => <Progress percent={progress} size="small" />,
    },
    {
      title: '操作',
      key: 'action',
      render: (text: string, record: VideoTask) => (
        <Space>
          {record.downloadUrl && (
            <Button 
              type="link" 
              icon={<DownloadOutlined />}
              onClick={() => window.open(record.downloadUrl)}
            >
              下载
            </Button>
          )}
          {record.analysisResult && (
            <Button
              type="link"
              icon={<LineChartOutlined />}
              onClick={() => showAnalysisResult(record)}
            >
              查看分析
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleProcess = async () => {
    if (fileList.length === 0) {
      message.error('请先上传文件');
      return;
    }

    if (!enableDownload && !enableAnalysis) {
      message.error('请至少启用一项功能');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj as File);
      formData.append('enableDownload', String(enableDownload));
      formData.append('enableAnalysis', String(enableAnalysis));

      // 获取API配置
      const apiConfig = localStorage.getItem('apiConfig');
      if (apiConfig) {
        const { apiKey, model } = JSON.parse(apiConfig);
        formData.append('apiKey', apiKey);
        formData.append('model', model);
      }

      const response = await axios.post('/api/batch-process', formData);
      const taskIds = response.data.taskIds;

      // 初始化任务列表
      setTasks(taskIds.map((id: string) => ({
        id,
        status: 'pending',
        progress: 0,
      })));

      // 开始轮询任务状态
      taskIds.forEach((id: string) => {
        pollTaskStatus(id);
      });

      message.success('批量处理已开始');
    } catch (error) {
      message.error('处理失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    try {
      const response = await axios.get(`/api/task-status/${taskId}`);
      const taskStatus = response.data;

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...taskStatus } : task
      ));

      if (taskStatus.status !== 'completed' && taskStatus.status !== 'failed') {
        setTimeout(() => pollTaskStatus(taskId), 2000);
      }
    } catch (error) {
      console.error('Error polling task status:', error);
    }
  };

  const showAnalysisResult = (task: VideoTask) => {
    // TODO: 实现分析结果展示对话框
  };

  return (
    <div className="p-4">
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">批量视频处理</h3>
        <div className="flex items-center gap-4 mb-4">
          <Upload
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>选择文件</Button>
          </Upload>
          <Switch
            checked={enableDownload}
            onChange={setEnableDownload}
            checkedChildren="下载"
            unCheckedChildren="下载"
          />
          <Switch
            checked={enableAnalysis}
            onChange={setEnableAnalysis}
            checkedChildren="分析"
            unCheckedChildren="分析"
          />
          <Button 
            type="primary"
            onClick={handleProcess}
            loading={loading}
            disabled={fileList.length === 0}
          >
            开始处理
          </Button>
        </div>
        <p className="text-gray-500">
          支持上传txt文件，每行一个视频ID
        </p>
      </div>

      <Table
        columns={columns}
        dataSource={tasks}
        rowKey="id"
        pagination={false}
      />
    </div>
  );
}