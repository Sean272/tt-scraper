'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, message, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

interface ApiConfigProps {
  onChange?: (config: { apiKey: string; model: string }) => void;
}

export default function ApiConfig({ onChange }: ApiConfigProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const modelOptions = [
    { label: 'DeepSeek VL2（推荐）', value: 'deepseek-ai/deepseek-vl2' },
    { label: 'Qwen 2.5-VL-72B', value: 'Qwen/Qwen2.5-VL-72B-Instruct' },
    { label: 'Qwen 2.5-VL-32B', value: 'Qwen/Qwen2.5-VL-32B-Instruct' },
    { label: 'Qwen 2.5-VL-7B', value: 'Qwen/Qwen2.5-VL-7B-Instruct' },
  ];

  // 从localStorage加载配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('apiConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      form.setFieldsValue(config);
      onChange?.(config);
    }
  }, []);

  const handleSave = async (values: any) => {
    try {
      setLoading(true);
      
      // 如果提供了API密钥，测试它
      if (values.apiKey) {
        const response = await fetch('/api/test-api-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          throw new Error('API密钥验证失败');
        }
      }

      // 保存到localStorage
      localStorage.setItem('apiConfig', JSON.stringify(values));
      onChange?.(values);
      message.success('配置已保存');
    } catch (error) {
      if (values.apiKey) {
        message.error('API密钥验证失败，请检查后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-medium mb-4">
        API配置
        <Tooltip title="API密钥用于视频内容分析功能，不提供则仅支持基础数据采集">
          <InfoCircleOutlined className="ml-2 text-gray-400" />
        </Tooltip>
      </h3>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          model: 'deepseek-ai/deepseek-vl2',
        }}
      >
        <Form.Item
          name="apiKey"
          label={
            <span>
              API密钥
              <span className="text-gray-400 ml-1">(可选)</span>
            </span>
          }
        >
          <Input.Password placeholder="请输入API密钥（可选）" />
        </Form.Item>

        <Form.Item
          name="model"
          label="默认模型"
          rules={[{ required: true, message: '请选择默认模型' }]}
        >
          <Select options={modelOptions} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存配置
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}