const axios = require('axios');

async function testModelFix() {
  console.log('🔧 测试模型修复...');
  console.log('='.repeat(40));
  
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.error('❌ 请提供API密钥');
    console.log('使用方法: node test-model-fix.js <API密钥>');
    process.exit(1);
  }
  
  const baseURL = 'https://api.siliconflow.cn/v1';
  
  // 测试模型
  const testModel = 'Qwen/Qwen2.5-VL-72B-Instruct';
  
  console.log(`🧪 测试模型: ${testModel}`);
  console.log('-'.repeat(30));
  
  try {
    // 1. 测试基础连接
    console.log('1. 测试基础连接...');
    const response = await axios.post(
      `${baseURL}/chat/completions`,
      {
        model: testModel,
        messages: [
          {
            role: 'user',
            content: '请简单回复"测试成功"'
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    
    if (response.data && response.data.choices && response.data.choices[0]) {
      console.log(`✅ 基础连接测试成功`);
      console.log(`   回复: ${response.data.choices[0].message.content}`);
    } else {
      console.log(`❌ 基础连接测试失败`);
    }
    
    // 2. 测试JSON格式请求（不使用response_format）
    console.log('\n2. 测试JSON格式请求...');
    const jsonResponse = await axios.post(
      `${baseURL}/chat/completions`,
      {
        model: testModel,
        messages: [
          {
            role: 'system',
            content: '请严格按照JSON格式返回结果'
          },
          {
            role: 'user',
            content: '请返回一个简单的JSON格式：{"test": "success", "message": "测试成功"}'
          }
        ],
        max_tokens: 100,
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    
    if (jsonResponse.data && jsonResponse.data.choices && jsonResponse.data.choices[0]) {
      console.log(`✅ JSON格式请求测试成功`);
      console.log(`   回复: ${jsonResponse.data.choices[0].message.content}`);
      
      // 尝试解析JSON
      try {
        const jsonMatch = jsonResponse.data.choices[0].message.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log(`✅ JSON解析成功:`, parsed);
        } else {
          console.log(`⚠️  响应中未找到JSON格式`);
        }
      } catch (parseError) {
        console.log(`❌ JSON解析失败:`, parseError.message);
      }
    } else {
      console.log(`❌ JSON格式请求测试失败`);
    }
    
    console.log('\n✅ 模型修复测试完成');
    console.log('现在可以使用 video-content-analyzer.js 进行分析了');
    
  } catch (error) {
    console.log(`❌ 测试失败:`);
    if (error.response) {
      console.log(`   错误: ${error.response.data.message || error.response.statusText}`);
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   错误代码: ${error.response.data.code || '未知'}`);
    } else {
      console.log(`   网络错误: ${error.message}`);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testModelFix();
}

module.exports = { testModelFix }; 