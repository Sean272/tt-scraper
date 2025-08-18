'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Steps, message } from 'antd';
import { CheckCircleOutlined, LoadingOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface CheckResult {
  status: 'waiting' | 'process' | 'finish' | 'error';
  title: string;
  description: string;
}

export default function EnvironmentCheck() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([
    {
      status: 'waiting',
      title: 'FFmpeg检查',
      description: '检查FFmpeg是否已安装',
    },
    {
      status: 'waiting',
      title: 'API密钥检查',
      description: '验证API密钥配置',
    },
    {
      status: 'waiting',
      title: '存储目录检查',
      description: '检查临时文件存储目录权限',
    },
  ]);

  const checkEnvironment = async () => {
    setChecking(true);
    
    try {
      // 检查FFmpeg
      setResults(prev => prev.map((result, index) => 
        index === 0 ? { ...result, status: 'process' } : result
      ));
      
      const ffmpegResponse = await fetch('/api/check-ffmpeg');
      const ffmpegResult = await ffmpegResponse.json();
      
      setResults(prev => prev.map((result, index) => 
        index === 0 ? {
          ...result,
          status: ffmpegResult.installed ? 'finish' : 'error',
          description: ffmpegResult.message,
        } : result
      ));

      if (!ffmpegResult.installed) {
        throw new Error('FFmpeg未安装');
      }

      // 检查API密钥
      setResults(prev => prev.map((result, index) => 
        index === 1 ? { ...result, status: 'process' } : result
      ));

      const apiConfig = localStorage.getItem('apiConfig');
      if (!apiConfig) {
        throw new Error('API密钥未配置');
      }

      const { apiKey } = JSON.parse(apiConfig);
      const apiResponse = await fetch('/api/test-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      if (!apiResponse.ok) {
        throw new Error('API密钥验证失败');
      }

      setResults(prev => prev.map((result, index) => 
        index === 1 ? {
          ...result,
          status: 'finish',
          description: 'API密钥配置正确',
        } : result
      ));

      // 检查存储目录
      setResults(prev => prev.map((result, index) => 
        index === 2 ? { ...result, status: 'process' } : result
      ));

      const storageResponse = await fetch('/api/check-storage');
      const storageResult = await storageResponse.json();

      setResults(prev => prev.map((result, index) => 
        index === 2 ? {
          ...result,
          status: storageResult.ok ? 'finish' : 'error',
          description: storageResult.message,
        } : result
      ));

      if (!storageResult.ok) {
        throw new Error('存储目录检查失败');
      }

      message.success('环境检查完成，所有检查项均通过');
    } catch (error) {
      message.error('环境检查失败：' + error.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">环境检查</h3>
        <Button
          type="primary"
          onClick={checkEnvironment}
          loading={checking}
        >
          开始检查
        </Button>
      </div>

      <Steps
        direction="vertical"
        items={results.map(result => ({
          status: result.status,
          title: result.title,
          description: result.description,
          icon: result.status === 'process' ? <LoadingOutlined /> :
                result.status === 'finish' ? <CheckCircleOutlined /> :
                result.status === 'error' ? <CloseCircleOutlined /> : undefined,
        }))}
      />

      {results.some(result => result.status === 'error') && (
        <Alert
          className="mt-4"
          type="error"
          message="环境检查失败"
          description={
            <div>
              <p>请按照以下步骤解决问题：</p>
              <ol className="list-decimal ml-4">
                {!results[0].status && (
                  <li>
                    安装FFmpeg：
                    <pre className="bg-gray-100 p-2 rounded mt-1">
                      # macOS
                      brew install ffmpeg

                      # Ubuntu
                      sudo apt install ffmpeg

                      # Windows
                      choco install ffmpeg
                    </pre>
                  </li>
                )}
                {!results[1].status && (
                  <li>
                    配置API密钥：
                    <p className="mt-1">请在左侧边栏的API配置中设置有效的API密钥</p>
                  </li>
                )}
                {!results[2].status && (
                  <li>
                    检查存储目录权限：
                    <p className="mt-1">请确保应用程序对临时文件目录具有读写权限</p>
                  </li>
                )}
              </ol>
            </div>
          }
        />
      )}
    </div>
  );
}