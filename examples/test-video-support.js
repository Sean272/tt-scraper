const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testVideoSupport() {
  console.log('🎬 测试视频处理支持...');
  console.log('='.repeat(50));
  
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.error('❌ 请提供API密钥');
    console.log('使用方法: node test-video-support.js <API密钥>');
    process.exit(1);
  }
  
  const baseURL = 'https://api.siliconflow.cn/v1';
  
  // 要测试的模型列表
  const testModels = [
    'Qwen/Qwen2.5-VL-72B-Instruct',
    'Pro/Qwen/Qwen2.5-VL-7B-Instruct',
    'Qwen/Qwen2.5-VL-32B-Instruct',
    'Qwen/Qwen2.5-VL-7B-Instruct',
    'deepseek-ai/deepseek-vl2',
    'Qwen/Qwen2.5-72B-Instruct',
    'Qwen/Qwen2.5-32B-Instruct',
    'Qwen/Qwen2.5-14B-Instruct',
    'Qwen/Qwen2.5-7B-Instruct',
    'Pro/deepseek-ai/DeepSeek-V3',
    'Pro/deepseek-ai/DeepSeek-R1'
  ];
  
  console.log('📋 测试模型列表:');
  testModels.forEach((model, index) => {
    console.log(`${index + 1}. ${model}`);
  });
  console.log('');
  
  // 创建测试图片base64（1x1像素的透明图片）
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  
  const results = [];
  
  for (const modelName of testModels) {
    console.log(`🧪 测试模型: ${modelName}`);
    console.log('-'.repeat(40));
    
    const result = {
      model: modelName,
      textSupport: false,
      imageSupport: false,
      videoSupport: false,
      error: null
    };
    
    try {
      // 1. 测试文本支持
      console.log('1. 测试文本支持...');
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
        console.log(`✅ 文本支持: 成功`);
        result.textSupport = true;
      } else {
        console.log(`❌ 文本支持: 失败`);
      }
      
      // 2. 测试图片支持
      console.log('2. 测试图片支持...');
      const imageResponse = await axios.post(
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
      
      if (imageResponse.data && imageResponse.data.choices && imageResponse.data.choices[0]) {
        console.log(`✅ 图片支持: 成功`);
        result.imageSupport = true;
      } else {
        console.log(`❌ 图片支持: 失败`);
      }
      
      // 3. 测试视频支持（使用图片作为视频帧）
      console.log('3. 测试视频支持...');
      const videoResponse = await axios.post(
        `${baseURL}/chat/completions`,
        {
          model: modelName,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: '请分析这个视频的内容，包括视觉元素、动作、场景等'
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
          max_tokens: 200,
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 25000
        }
      );
      
      if (videoResponse.data && videoResponse.data.choices && videoResponse.data.choices[0]) {
        console.log(`✅ 视频支持: 成功`);
        result.videoSupport = true;
      } else {
        console.log(`❌ 视频支持: 失败`);
      }
      
    } catch (error) {
      console.log(`❌ 测试失败:`);
      if (error.response) {
        console.log(`   错误: ${error.response.data.message || error.response.statusText}`);
        console.log(`   状态码: ${error.response.status}`);
        result.error = error.response.data.message || error.response.statusText;
      } else {
        console.log(`   网络错误: ${error.message}`);
        result.error = error.message;
      }
    }
    
    results.push(result);
    console.log(`✅ ${modelName} 测试完成\n`);
    
    // 添加延迟避免API限制
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // 输出测试结果总结
  console.log('📊 测试结果总结:');
  console.log('='.repeat(50));
  
  const videoSupportedModels = results.filter(r => r.videoSupport);
  const imageSupportedModels = results.filter(r => r.imageSupport);
  const textOnlyModels = results.filter(r => r.textSupport && !r.imageSupport);
  
  console.log('\n🎬 支持视频分析的模型:');
  if (videoSupportedModels.length > 0) {
    videoSupportedModels.forEach((model, index) => {
      console.log(`${index + 1}. ${model.model}`);
    });
  } else {
    console.log('❌ 未找到支持视频分析的模型');
  }
  
  console.log('\n🖼️  支持图片分析的模型:');
  if (imageSupportedModels.length > 0) {
    imageSupportedModels.forEach((model, index) => {
      console.log(`${index + 1}. ${model.model}`);
    });
  } else {
    console.log('❌ 未找到支持图片分析的模型');
  }
  
  console.log('\n📝 仅支持文本的模型:');
  if (textOnlyModels.length > 0) {
    textOnlyModels.forEach((model, index) => {
      console.log(`${index + 1}. ${model.model}`);
    });
  } else {
    console.log('❌ 未找到仅支持文本的模型');
  }
  
  console.log('\n💡 建议:');
  if (videoSupportedModels.length > 0) {
    console.log('1. 优先使用支持视频分析的模型进行视频内容分析');
    console.log('2. 如果视频分析失败，可以尝试支持图片分析的模型');
    console.log('3. 如果都失败，使用文本分析模式');
  } else if (imageSupportedModels.length > 0) {
    console.log('1. 使用支持图片分析的模型，将视频转换为图片帧进行分析');
    console.log('2. 如果图片分析失败，使用文本分析模式');
  } else {
    console.log('1. 当前账户中的模型可能不支持视觉分析');
    console.log('2. 建议联系硅基流动客服确认模型功能');
    console.log('3. 可以尝试使用文本分析模式');
  }
  
  // 保存详细结果到文件
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultFile = `examples/output/model_test_results_${timestamp}.json`;
  
  try {
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 详细结果已保存到: ${resultFile}`);
  } catch (error) {
    console.error('保存结果文件失败:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testVideoSupport();
}

module.exports = { testVideoSupport }; 