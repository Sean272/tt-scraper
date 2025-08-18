'use client';

import { useState } from 'react';
import { Form, Input, Button, Upload, Select, message, Spin } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import axios from 'axios';

export default function BatchAuthors() {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const handleUpload = async (values: { timeRange: number; timeUnit: string }) => {
    if (fileList.length === 0) {
      message.error('请先上传文件');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj as File);
      formData.append('timeRange', values.timeRange.toString());
      formData.append('timeUnit', values.timeUnit);
      const response = await axios.post('/api/batch-authors-videos', formData);
      // 预览数据和文件名
      setFileName(response.data.fileName);
      message.success('获取成功，请点击下载');
    } catch (error) {
      message.error('获取失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Form onFinish={handleUpload} layout="vertical">
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
          <Button type="primary" htmlType="submit" loading={loading}>
            开始查询
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
          href={`/api/batch-authors-videos?file=${encodeURIComponent(fileName)}`}
          download
          className="mt-4"
        >
          下载结果文件
        </Button>
      )}
    </div>
  );
} 