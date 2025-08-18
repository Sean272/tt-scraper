'use client';

import { useState } from 'react';
import { Form, Input, Button, Upload, message, Spin, Card, Progress, Image, Tabs, Select } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import axios from 'axios';

const { Option } = Select;

interface FrameAnalysis {
  frame: string;  // base64 encoded image
  analysis: {
    summary: string;
    details: Record<string, any>;
  };
}

interface AnalysisResult {
  frames: FrameAnalysis[];
  summary: string;
}

export default function VideoFrameAnalysis() {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleAnalyze = async () => {
    if (fileList.length === 0) {
      message.error('请先上传视频文件');
      return;
    }

    try {
      setLoading(true);
      setProgress(0);
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj as File);

      const response = await axios.post('/api/analyze-frames', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        }
      });

      if (response.data.frames?.length > 0) {
        setResult(response.data);
        message.success('分析完成');
      } else {
        message.warning('未能提取到有效帧');
      }
    } catch (error) {
      console.error('Error:', error);
      message.error('分析失败，请重试');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const renderFrameAnalysis = (frame: FrameAnalysis, index: number) => (
    <Card key={index} className="mb-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/3">
          <Image
            src={`data:image/jpeg;base64,${frame.frame}`}
            alt={`Frame ${index + 1}`}
            className="rounded"
          />
        </div>
        <div className="w-full md:w-2/3">
          <h4 className="text-lg font-medium mb-2">帧 {index + 1} 分析结果</h4>
          <p className="whitespace-pre-wrap">{frame.analysis.summary}</p>
          {frame.analysis.details && (
            <div className="mt-4">
              <h5 className="font-medium mb-2">详细信息：</h5>
              <pre className="bg-gray-50 p-4 rounded overflow-auto">
                {JSON.stringify(frame.analysis.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const renderSummary = () => (
    <Card>
      <h3 className="text-xl font-medium mb-4">整体分析总结</h3>
      <p className="whitespace-pre-wrap">{result?.summary}</p>
    </Card>
  );

  return (
    <div className="p-4">
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">视频帧分析</h3>
        <div className="flex items-center gap-4">
          <Upload
            accept="video/*"
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>选择视频</Button>
          </Upload>
          <Button type="primary" onClick={handleAnalyze} loading={loading}>
            开始分析
          </Button>
        </div>
        <p className="text-gray-500 mt-2">
          支持上传视频文件，系统将提取关键帧并进行分析
        </p>
      </div>

      {loading && (
        <div className="mb-8">
          <Progress percent={progress} status="active" />
          <div className="flex justify-center mt-4">
            <Spin tip="正在分析，请稍候..." />
          </div>
        </div>
      )}

      {result && (
        <Tabs defaultActiveKey="frames">
          <Tabs.TabPane tab="帧分析" key="frames">
            <div className="space-y-4">
              {result.frames.map((frame, index) => renderFrameAnalysis(frame, index))}
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab="总结" key="summary">
            {renderSummary()}
          </Tabs.TabPane>
        </Tabs>
      )}
    </div>
  );
}