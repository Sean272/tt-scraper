'use client';

import { useState } from 'react';
import { Form, Input, Button, Upload, Select, message, Spin, Table, Alert } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import axios from 'axios';

const { Option } = Select;

interface VideoData {
  id: string;
  description: string;
  author: string;
  likes: string;
  comments: string;
  plays: string;
  createTime: string;
  videoUrl?: string;
}

export default function AuthorVideos() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VideoData[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [searchParams, setSearchParams] = useState<{author: string; timeRange: string; timeUnit: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const columns = [
    { 
      title: '视频ID', 
      dataIndex: 'id', 
      key: 'id',
      render: (text: string, record: VideoData) => {
        const url = record.videoUrl || `https://www.tiktok.com/@${record.author}/video/${text}`;
        return (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {text}
          </a>
        );
      }
    },
    { 
      title: '描述', 
      dataIndex: 'description', 
      key: 'description',
      render: (text: string) => text || '-'
    },
    { 
      title: '作者', 
      dataIndex: 'author', 
      key: 'author',
      render: (text: string) => text || '-'
    },
    { 
      title: '点赞数', 
      dataIndex: 'likes', 
      key: 'likes',
      render: (text: string) => text === '0' ? '-' : text
    },
    { 
      title: '评论数', 
      dataIndex: 'comments', 
      key: 'comments',
      render: (text: string) => text === '0' ? '-' : text
    },
    { 
      title: '播放数', 
      dataIndex: 'plays', 
      key: 'plays',
      render: (text: string) => text === '0' ? '-' : text
    },
    { 
      title: '创建时间', 
      dataIndex: 'createTime', 
      key: 'createTime',
      render: (text: string) => text || '-'
    }
  ];

  const onFinish = async (values: { author: string; timeRange: string; timeUnit: string }) => {
    try {
      setLoading(true);
      setError(null);
      setSearchParams(values);
      console.log('Sending request:', values);

      const response = await axios.post('/api/author-videos', values);
      console.log('Response data:', response.data);

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      if (Array.isArray(response.data)) {
        if (response.data.length > 0) {
          setData(response.data);
          message.success(`获取成功，共 ${response.data.length} 条数据`);
        } else {
          setData([]);
          message.info(`未找到 ${values.author} 在过去 ${values.timeRange} ${values.timeUnit === 'days' ? '天' : values.timeUnit === 'weeks' ? '周' : '月'}内的视频`);
        }
      } else {
        throw new Error('返回数据格式错误');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || '获取失败，请重试');
      message.error('获取失败，请重试');
      setData([]);
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
      setError(null);
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj as File);
      const response = await axios.post('/api/batch-authors-videos', formData);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      if (Array.isArray(response.data)) {
        if (response.data.length > 0) {
          setData(response.data);
          message.success(`获取成功，共 ${response.data.length} 条数据`);
        } else {
          setData([]);
          message.info('未找到任何视频数据');
        }
      } else {
        throw new Error('返回数据格式错误');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || '获取失败，请重试');
      message.error('获取失败，请重试');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">单个作者查询</h3>
        <Form onFinish={onFinish} layout="inline">
          <Form.Item
            name="author"
            rules={[{ required: true, message: '请输入作者用户名' }]}
          >
            <Input placeholder="请输入作者用户名" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="timeRange"
            rules={[{ required: true, message: '请输入时间范围' }]}
          >
            <Input type="number" placeholder="时间范围" style={{ width: 100 }} />
          </Form.Item>
          <Form.Item
            name="timeUnit"
            rules={[{ required: true, message: '请选择时间单位' }]}
            initialValue="days"
          >
            <Select style={{ width: 100 }}>
              <Option value="days">天</Option>
              <Option value="weeks">周</Option>
              <Option value="months">月</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              查询
            </Button>
          </Form.Item>
        </Form>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">批量作者查询</h3>
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
          支持上传txt文件，每行一个作者用户名
        </p>
      </div>

      {loading && (
        <div className="flex justify-center my-4">
          <Spin tip="正在查询，请稍候..." />
        </div>
      )}

      {error && (
        <Alert
          className="my-4"
          type="error"
          showIcon
          message="查询出错"
          description={error}
        />
      )}

      {!loading && !error && searchParams && data.length === 0 && (
        <Alert
          className="my-4"
          type="info"
          showIcon
          message={`未找到 ${searchParams.author} 在过去 ${searchParams.timeRange} ${searchParams.timeUnit === 'days' ? '天' : searchParams.timeUnit === 'weeks' ? '周' : '月'}内的视频`}
        />
      )}

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: true }}
        className="mt-8"
        locale={{
          emptyText: '暂无数据'
        }}
      />
    </div>
  );
}