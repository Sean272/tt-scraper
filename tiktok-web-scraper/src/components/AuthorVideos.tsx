'use client';

import { useState } from 'react';
import { Form, Input, Button, Upload, Select, Table, message, Spin } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
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
}

export default function AuthorVideos() {
  // 单个作者
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [singleData, setSingleData] = useState<VideoData[]>([]);
  const [singleFileName, setSingleFileName] = useState<string>('');
  // 批量作者
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [batchFileName, setBatchFileName] = useState<string>('');

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

  // 单个作者查询
  const onFinishSingle = async (values: { username: string; count?: number }) => {
    try {
      setLoadingSingle(true);
      const response = await axios.post('/api/user-videos', values);
      setSingleData(response.data.data);
      setSingleFileName(response.data.fileName);
      message.success('获取成功');
    } catch (error) {
      message.error('获取失败，请重试');
    } finally {
      setLoadingSingle(false);
    }
  };

  // 批量作者查询
  const handleBatchUpload = async (values: { timeRange: number; timeUnit: string }) => {
    if (fileList.length === 0) {
      message.error('请先上传文件');
      return;
    }
    try {
      setLoadingBatch(true);
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj as File);
      formData.append('timeRange', values.timeRange.toString());
      formData.append('timeUnit', values.timeUnit);
      const response = await axios.post('/api/batch-authors-videos', formData);
      setBatchFileName(response.data.fileName);
      message.success('获取成功，请点击下载');
    } catch (error) {
      message.error('获取失败，请重试');
    } finally {
      setLoadingBatch(false);
    }
  };

  return (
    <div className="p-4">
      {/* 单个作者视频查询 */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">单个作者视频查询</h3>
        <Form onFinish={onFinishSingle} layout="inline">
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
            <Button type="primary" htmlType="submit" loading={loadingSingle}>
              查询
            </Button>
          </Form.Item>
        </Form>
        {loadingSingle && (
          <div className="flex justify-center my-4">
            <Spin tip="正在查询，请稍候..." />
          </div>
        )}
        {singleFileName && (
          <Button
            type="primary"
            href={`/api/user-videos?file=${encodeURIComponent(singleFileName)}`}
            download
            className="mt-4"
          >
            下载结果文件
          </Button>
        )}
        <Table
          columns={columns}
          dataSource={singleData}
          rowKey="id"
          loading={loadingSingle}
          scroll={{ x: true }}
          className="mt-8"
        />
      </div>

      {/* 批量作者视频查询 */}
      <div>
        <h3 className="text-lg font-medium mb-4">批量作者视频查询</h3>
        <Form onFinish={handleBatchUpload} layout="vertical">
          <Form.Item
            label="上传作者列表文件"
            required
            tooltip="支持txt或csv文件，每行一个作者名"
          >
            <Upload
              beforeUpload={() => false}
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            label="时间范围"
            name="timeRange"
            rules={[{ required: true, message: '请输入时间范围' }]}
          >
            <Input type="number" placeholder="请输入数字" />
          </Form.Item>

          <Form.Item
            label="时间单位"
            name="timeUnit"
            rules={[{ required: true, message: '请选择时间单位' }]}
          >
            <Select>
              <Select.Option value="weeks">周</Select.Option>
              <Select.Option value="months">月</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loadingBatch}>
              开始查询
            </Button>
          </Form.Item>
        </Form>
        {loadingBatch && (
          <div className="flex justify-center my-4">
            <Spin tip="正在查询，请稍候..." />
          </div>
        )}
        {batchFileName && (
          <Button
            type="primary"
            href={`/api/batch-authors-videos?file=${encodeURIComponent(batchFileName)}`}
            download
            className="mt-4"
          >
            下载结果文件
          </Button>
        )}
      </div>
    </div>
  );
} 