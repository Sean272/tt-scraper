'use client';

import { useState } from 'react';
import { Form, Input, Button, Upload, Table, message, Spin } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import axios from 'axios';

interface VideoData {
  id: string;
  description: string;
  author: string;
  likes: string;
  comments: string;
  shares: string;
  plays: string;
  createTime: string;
  videoUrl: string;
  isCapCut: string;
  capCutConfidence: string;
  sourcePlatform: string;
}

export default function VideoInfo() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VideoData[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const columns = [
    { title: '视频ID', dataIndex: 'id', key: 'id', render: (text: string) => text || '-' },
    { title: '描述', dataIndex: 'description', key: 'description', render: (text: string) => text || '-' },
    { title: '作者', dataIndex: 'author', key: 'author', render: (text: string) => text || '-' },
    { title: '点赞数', dataIndex: 'likes', key: 'likes', render: (text: string) => text || '-' },
    { title: '评论数', dataIndex: 'comments', key: 'comments', render: (text: string) => text || '-' },
    { title: '分享数', dataIndex: 'shares', key: 'shares', render: (text: string) => text || '-' },
    { title: '播放数', dataIndex: 'plays', key: 'plays', render: (text: string) => text || '-' },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime', render: (text: string) => text || '-' },
    { 
      title: 'CapCut投稿', 
      dataIndex: 'isCapCut', 
      key: 'isCapCut', 
      render: (text: string) => {
        if (text === '是') return <span style={{ color: '#52c41a' }}>✓ 是</span>;
        if (text === '否') return <span style={{ color: '#ff4d4f' }}>✗ 否</span>;
        return text || '-';
      }
    },
    { title: '来源平台', dataIndex: 'sourcePlatform', key: 'sourcePlatform', render: (text: string) => text || '-' },
  ];

  const onFinish = async (values: { videoId: string }) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/single-video', values);
      setData([response.data]);
      message.success('获取成功');
    } catch (error) {
      message.error('获取失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('请先上传文件');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj as File);
      const response = await axios.post('/api/batch-videos', formData);
      setData(response.data);
      message.success('获取成功');
    } catch (error) {
      message.error('获取失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">单个视频查询</h3>
        <Form onFinish={onFinish} layout="inline">
          <Form.Item
            name="videoId"
            rules={[{ required: true, message: '请输入视频ID' }]}
          >
            <Input placeholder="请输入视频ID" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              查询
            </Button>
          </Form.Item>
        </Form>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">批量视频查询</h3>
        <div className="flex items-center gap-4">
          <Upload
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>选择文件</Button>
          </Upload>
          <Button type="primary" onClick={handleUpload} loading={loading}>
            开始查询
          </Button>
        </div>
        <p className="text-gray-500 mt-2">
          支持上传txt文件，每行一个视频ID
        </p>
      </div>

      {loading && (
        <div className="flex justify-center my-4">
          <Spin tip="正在查询，请稍候..." />
        </div>
      )}

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: true }}
        className="mt-8"
      />
    </div>
  );
} 