const axios = require('axios');

async function testVideoModels() {
  console.log('🔍 测试视频分析模型...');
  console.log('='.repeat(50));
  
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.error('❌ 请提供API密钥');
    console.log('使用方法: node test-video-models.js <API密钥>');
    process.exit(1);
  }
  
  const baseURL = 'https://api.siliconflow.cn/v1';
  
  // 要测试的模型
  const testModels = [
    'Qwen/Qwen2.5-VL-72B-Instruct',
    'Pro/Qwen/Qwen2.5-VL-7B-Instruct'
  ];
  
  console.log('📋 测试模型列表:');
  testModels.forEach((model, index) => {
    console.log(`${index + 1}. ${model}`);
  });
  console.log('');
  
  for (const modelName of testModels) {
    console.log(`🧪 测试模型: ${modelName}`);
    console.log('-'.repeat(40));
    
    try {
      // 1. 测试模型是否可用
      console.log('1. 检查模型可用性...');
      const modelsResponse = await axios.get(`${baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      const availableModels = modelsResponse.data.data.map(model => model.id);
      const isAvailable = availableModels.includes(modelName);
      
      if (isAvailable) {
        console.log(`✅ ${modelName} - 可用`);
      } else {
        console.log(`❌ ${modelName} - 不可用`);
        console.log('可用模型:', availableModels);
        continue;
      }
      
      // 2. 测试文本对话功能
      console.log('2. 测试文本对话功能...');
      const textResponse = await axios.post(
        `${baseURL}/chat/completions`,
        {
          model: modelName,
          messages: [
            {
              role: 'user',
              content: '请简单回复"文本测试成功"'
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
      
      if (textResponse.data && textResponse.data.choices && textResponse.data.choices[0]) {
        console.log(`✅ 文本对话测试成功`);
        console.log(`   回复: ${textResponse.data.choices[0].message.content}`);
      } else {
        console.log(`❌ 文本对话测试失败`);
      }
      
      // 3. 测试视觉理解功能（如果有示例图片）
      console.log('3. 测试视觉理解功能...');
      
      // 创建一个简单的测试图片base64（1x1像素的透明图片）
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      const visionResponse = await axios.post(
        `${baseURL}/chat/completions`,
        {
          model: modelName,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '请描述这张图片的内容'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${testImageBase64}`
                  }
                }
              ]
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
          timeout: 20000
        }
      );
      
      if (visionResponse.data && visionResponse.data.choices && visionResponse.data.choices[0]) {
        console.log(`✅ 视觉理解测试成功`);
        console.log(`   回复: ${visionResponse.data.choices[0].message.content}`);
      } else {
        console.log(`❌ 视觉理解测试失败`);
      }
      
      console.log(`✅ ${modelName} 测试完成\n`);
      
    } catch (error) {
      console.log(`❌ ${modelName} 测试失败:`);
      if (error.response) {
        console.log(`   错误: ${error.response.data.message || error.response.statusText}`);
        console.log(`   状态码: ${error.response.status}`);
      } else {
        console.log(`   网络错误: ${error.message}`);
      }
      console.log('');
    }
    
    // 添加延迟避免API限制
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('📝 测试总结:');
  console.log('1. 如果模型可用且文本对话成功，说明基础功能正常');
  console.log('2. 如果视觉理解测试成功，说明支持视频分析功能');
  console.log('3. 建议在 video-content-analyzer.js 中使用测试成功的模型');
  console.log('');
  console.log('🔧 使用方法:');
  console.log('node examples/video-content-analyzer.js <下载目录> <API密钥> <模型名称>');
}

// 如果直接运行此文件
if (require.main === module) {
  testVideoModels();
}

module.exports = { testVideoModels }; 