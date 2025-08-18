'use client';

import { useState } from 'react';
import { Form, Input, Button, Table, message, Spin } from 'antd';
import axios from 'axios';

interface VideoData {
  id: string;
  description: string;
  author: string;
  likes: number;
  comments: number;
  shares: number;
  plays: number;
  createTime: string;
  videoUrl: string;
  isCapCut: string;
  capCutConfidence: string;
  sourcePlatform: string;
}

export default function UserVideos() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VideoData[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const columns = [
    { title: '视频ID', dataIndex: 'id', key: 'id' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '作者', dataIndex: 'author', key: 'author' },
    { title: '点赞数', dataIndex: 'likes', key: 'likes' },
    { title: '评论数', dataIndex: 'comments', key: 'comments' },
    { title: '分享数', dataIndex: 'shares', key: 'shares' },
    { title: '播放数', dataIndex: 'plays', key: 'plays' },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime' },
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
    { title: '来源平台', dataIndex: 'sourcePlatform', key: 'sourcePlatform' },
    {
      title: '视频链接',
      dataIndex: 'videoUrl',
      key: 'videoUrl',
      render: (text: string) => (
        <a href={text} target="_blank" rel="noopener noreferrer">
          查看视频
        </a>
      ),
    },
  ];

  const onFinish = async (values: { username: string; count?: number }) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/user-videos', values);
      setData(response.data.data);
      setFileName(response.data.fileName);
      message.success('获取成功');
    } catch (error) {
      message.error('获取失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Form onFinish={onFinish} layout="inline" className="mb-4">
        <Form.Item
          name="username"
          rules={[{ required: true, message: '请输入作者用户名' }]}
        >
          <Input placeholder="请输入作者用户名" />
        </Form.Item>
        <Form.Item name="count">
          <Input type="number" placeholder="视频数量（可选）" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            查询
          </Button>
        </Form.Item>
      </Form>

      {loading && (
        <div className="flex justify-center my-4">
          <Spin tip="正在查询，请稍候..." />
        </div>
      )}

      {fileName && (
        <Button
          type="primary"
          href={`/api/user-videos?file=${encodeURIComponent(fileName)}`}
          download
          className="mt-4"
        >
          下载结果文件
        </Button>
      )}

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: true }}
      />
    </div>
  );
} 