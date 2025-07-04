'use client';

import React, { useState } from 'react';
import { Button, Upload, Table, message, Card, Tag, Avatar, Progress, Space, Typography, Divider, Input, Form } from 'antd';
import { UploadOutlined, DownloadOutlined, UserOutlined, HeartOutlined, TeamOutlined, VideoCameraOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import axios from 'axios';

const { Text, Title } = Typography;

interface AuthorData {
  username: string;
  nickname: string;
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
  verified: boolean;
  signature: string;
  avatarThumb: string;
  status: 'success' | 'error';
  error: string | null;
}

interface Summary {
  total: number;
  success: number;
  failed: number;
}

const AuthorFollowers: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AuthorData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [inputAuthors, setInputAuthors] = useState<string>('');
  const [form] = Form.useForm();

  // 格式化数字显示
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // 上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    accept: '.csv,.txt',
    beforeUpload: (file) => {
      setFileList([file]);
      return false; // 防止自动上传
    },
    onRemove: () => {
      setFileList([]);
      setData([]);
      setSummary(null);
    },
  };

  // 读取CSV文件内容
  const readFileContent = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // 简单解析CSV/TXT文件，提取第一列的作者名
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        const authors: string[] = [];
        
        lines.forEach((line, index) => {
          if (index === 0 && (line.includes(',') || line.includes('用户名') || line.includes('作者'))) {
            // 跳过表头
            return;
          }
          const parts = line.split(',');
          const author = parts[0].trim().replace(/"/g, '');
          if (author && !author.startsWith('#')) {
            authors.push(author);
          }
        });
        
        resolve(authors);
      };
      reader.onerror = reject;
      reader.readAsText(file, 'utf-8');
    });
  };

  // 提交文件查询
  const handleFileSubmit = async () => {
    if (fileList.length === 0) {
      message.error('请先上传包含作者列表的文件');
      return;
    }

    try {
      setLoading(true);
      message.info('正在解析文件...');

      const authors = await readFileContent(fileList[0].originFileObj as File);
      
      if (authors.length === 0) {
        message.error('文件中未找到有效的作者名称');
        return;
      }

      await queryAuthors(authors);
    } catch (error: any) {
      console.error('文件查询失败:', error);
      message.error(error.response?.data?.error || '文件查询失败');
    } finally {
      setLoading(false);
    }
  };

  // 提交直接输入查询
  const handleInputSubmit = async () => {
    if (!inputAuthors.trim()) {
      message.error('请输入作者用户名');
      return;
    }

    try {
      setLoading(true);
      
      // 解析输入的作者名（支持逗号、换行、空格分隔）
      const authors = inputAuthors
        .split(/[,\n\s]+/)
        .map(author => author.trim())
        .filter(author => author.length > 0);
      
      if (authors.length === 0) {
        message.error('请输入有效的作者用户名');
        return;
      }

      await queryAuthors(authors);
    } catch (error: any) {
      console.error('输入查询失败:', error);
      message.error(error.response?.data?.error || '输入查询失败');
    } finally {
      setLoading(false);
    }
  };

  // 共用的查询函数
  const queryAuthors = async (authors: string[]) => {
    message.info(`找到 ${authors.length} 个作者，开始查询粉丝信息...`);

    const response = await axios.post('/api/batch-authors-followers', {
      authors
    });

    if (response.data.success) {
      setData(response.data.data);
      setSummary(response.data.summary);
      message.success(`查询完成！成功 ${response.data.summary.success} 个，失败 ${response.data.summary.failed} 个`);
    } else {
      message.error(response.data.error || '查询失败');
    }
  };

  // 下载CSV
  const downloadCSV = () => {
    if (data.length === 0) return;

    const headers = [
      '作者用户名',
      '作者昵称', 
      '粉丝数量',
      '关注数量',
      '获赞数量',
      '视频数量',
      '是否认证',
      '个人简介',
      '查询状态',
      '错误信息'
    ];

    const csvContent = [
      '\ufeff' + headers.join(','),
      ...data.map(item => [
        `"${item.username}"`,
        `"${item.nickname}"`,
        item.followerCount,
        item.followingCount,
        item.heartCount,
        item.videoCount,
        item.verified ? '是' : '否',
        `"${item.signature.replace(/"/g, '""')}"`,
        item.status === 'success' ? '成功' : '失败',
        `"${item.error || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_authors_followers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // 表格列定义
  const columns = [
    {
      title: '作者信息',
      key: 'user',
      width: 200,
      render: (record: AuthorData) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar 
            src={record.avatarThumb} 
            icon={<UserOutlined />} 
            size={40}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {record.nickname || record.username}
              {record.verified && <Tag color="blue" style={{ marginLeft: 4 }}>认证</Tag>}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              @{record.username}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '粉丝数量',
      key: 'followers',
      width: 120,
      sorter: (a: AuthorData, b: AuthorData) => a.followerCount - b.followerCount,
      render: (record: AuthorData) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
            {formatNumber(record.followerCount)}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <TeamOutlined /> 粉丝
          </Text>
        </div>
      ),
    },
    {
      title: '关注数量',
      key: 'following',
      width: 120,
      render: (record: AuthorData) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14 }}>
            {formatNumber(record.followingCount)}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            关注
          </Text>
        </div>
      ),
    },
    {
      title: '获赞数量',
      key: 'hearts',
      width: 120,
      sorter: (a: AuthorData, b: AuthorData) => a.heartCount - b.heartCount,
      render: (record: AuthorData) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#ff4d4f' }}>
            {formatNumber(record.heartCount)}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <HeartOutlined /> 获赞
          </Text>
        </div>
      ),
    },
    {
      title: '视频数量',
      key: 'videos',
      width: 120,
      render: (record: AuthorData) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14 }}>
            {record.videoCount}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <VideoCameraOutlined /> 视频
          </Text>
        </div>
      ),
    },
    {
      title: '个人简介',
      dataIndex: 'signature',
      key: 'signature',
      ellipsis: true,
      width: 200,
      render: (text: string) => (
        <Text style={{ fontSize: 12 }} title={text}>
          {text || '-'}
        </Text>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (record: AuthorData) => (
        record.status === 'success' ? (
          <Tag color="success">成功</Tag>
        ) : (
          <Tag color="error" title={record.error || ''}>失败</Tag>
        )
      ),
    },
  ];

  return (
    <Card title="批量查询作者粉丝数量" style={{ margin: '24px 0' }}>
      {/* 方式一：直接输入查询 */}
      <Card 
        size="small" 
        title={<><UserOutlined style={{ marginRight: 8 }} />直接输入查询</>}
        style={{ marginBottom: 16 }}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            label="作者用户名" 
            extra="可输入多个作者名，用逗号、空格或换行分隔。例如：tiktok, dance, music"
          >
            <Input.TextArea
              value={inputAuthors}
              onChange={(e) => setInputAuthors(e.target.value)}
              placeholder="请输入作者用户名，例如：&#10;tiktok&#10;dance&#10;music"
              rows={4}
              disabled={loading}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          <Space>
            <Button 
              type="primary" 
              icon={<SearchOutlined />}
              onClick={handleInputSubmit} 
              loading={loading}
              disabled={!inputAuthors.trim()}
            >
              开始查询
            </Button>
            <Button 
              onClick={() => setInputAuthors('')}
              disabled={loading || !inputAuthors.trim()}
            >
              清空
            </Button>
          </Space>
        </Form>
      </Card>

      {/* 方式二：文件上传查询 */}
      <Card 
        size="small" 
        title={<><UploadOutlined style={{ marginRight: 8 }} />文件上传查询</>}
        style={{ marginBottom: 16 }}
      >
        <div style={{ marginBottom: 16 }}>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} disabled={loading}>
              上传作者列表文件 (CSV/TXT)
            </Button>
          </Upload>
          <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
            支持CSV或TXT格式，每行一个作者用户名，或第一列为作者用户名的CSV文件
          </div>
        </div>

        <Button 
          type="primary" 
          onClick={handleFileSubmit} 
          loading={loading}
          disabled={fileList.length === 0}
        >
          开始查询粉丝信息
        </Button>
      </Card>

      {/* 操作按钮 */}
      <Space style={{ marginBottom: 16 }}>
        <Button 
          icon={<DownloadOutlined />} 
          onClick={downloadCSV}
          disabled={data.length === 0}
          type="default"
        >
          下载CSV文件
        </Button>
        {data.length > 0 && (
          <Button 
            onClick={() => {
              setData([]);
              setSummary(null);
              setFileList([]);
              setInputAuthors('');
              form.resetFields();
            }}
            disabled={loading}
          >
            清空结果
          </Button>
        )}
      </Space>

      {summary && (
        <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f9f9f9' }}>
          <Title level={5} style={{ margin: 0, marginBottom: 8 }}>查询统计</Title>
          <Space size="large">
            <div>
              <Text strong>总计：</Text>
              <Text>{summary.total} 个作者</Text>
            </div>
            <div>
              <Text strong style={{ color: '#52c41a' }}>成功：</Text>
              <Text style={{ color: '#52c41a' }}>{summary.success} 个</Text>
            </div>
            <div>
              <Text strong style={{ color: '#ff4d4f' }}>失败：</Text>
              <Text style={{ color: '#ff4d4f' }}>{summary.failed} 个</Text>
            </div>
          </Space>
          {summary.total > 0 && (
            <div style={{ marginTop: 8 }}>
              <Progress 
                percent={Math.round((summary.success / summary.total) * 100)} 
                status={summary.failed > 0 ? 'active' : 'success'}
                size="small"
              />
            </div>
          )}
        </Card>
      )}

      {data.length > 0 && (
        <>
          <Divider />
          <Table
            columns={columns}
            dataSource={data}
            rowKey="username"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1000 }}
            size="small"
          />
        </>
      )}
    </Card>
  );
};

export default AuthorFollowers; 