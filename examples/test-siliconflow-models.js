const axios = require('axios');

async function testSiliconFlowModels() {
  console.log('🔍 测试硅基流动API可用模型...');
  
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.error('❌ 请提供API密钥');
    console.log('使用方法: node test-siliconflow-models.js <API密钥>');
    process.exit(1);
  }
  
  const baseURL = 'https://api.siliconflow.cn/v1';
  
  try {
    // 1. 获取所有可用模型
    console.log('\n📋 获取可用模型列表...');
    const response = await axios.get(`${baseURL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const models = response.data.data;
    console.log(`✅ 找到 ${models.length} 个可用模型:`);
    
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.id} (${model.object})`);
    });
    
    // 2. 测试常用模型
    console.log('\n🧪 测试常用模型...');
    const testModels = [
      'Pro/deepseek-ai/DeepSeek-V3',
      'Pro/deepseek-ai/DeepSeek-R1'
    ];
    
    for (const modelName of testModels) {
      try {
        console.log(`\n测试模型: ${modelName}`);
        
        const testResponse = await axios.post(
          `${baseURL}/chat/completions`,
          {
            model: modelName,
            messages: [
              {
                role: 'user',
                content: '你好，请简单回复"测试成功"'
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
            timeout: 10000
          }
        );
        
        if (testResponse.data && testResponse.data.choices && testResponse.data.choices[0]) {
          console.log(`✅ ${modelName} - 可用`);
          console.log(`   回复: ${testResponse.data.choices[0].message.content}`);
        } else {
          console.log(`❌ ${modelName} - 响应格式异常`);
        }
        
      } catch (error) {
        if (error.response) {
          console.log(`❌ ${modelName} - 错误: ${error.response.data.message || error.response.statusText}`);
        } else {
          console.log(`❌ ${modelName} - 网络错误: ${error.message}`);
        }
      }
      
      // 添加延迟避免API限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 3. 推荐配置
    console.log('\n📝 推荐配置:');
    console.log('默认模型: Pro/deepseek-ai/DeepSeek-V3');
    console.log('高性能模型: Pro/deepseek-ai/DeepSeek-R1');
    
  } catch (error) {
    console.error('❌ 获取模型列表失败:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testSiliconFlowModels();
}

module.exports = { testSiliconFlowModels }; 