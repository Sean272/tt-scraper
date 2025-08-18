const axios = require('axios');

async function findVideoModels() {
  console.log('🔍 查找支持视频处理的模型...');
  console.log('='.repeat(50));
  
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.error('❌ 请提供API密钥');
    console.log('使用方法: node find-video-models.js <API密钥>');
    process.exit(1);
  }
  
  const baseURL = 'https://api.siliconflow.cn/v1';
  
  try {
    // 1. 获取所有可用模型
    console.log('📋 获取所有可用模型...');
    const response = await axios.get(`${baseURL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const allModels = response.data.data;
    console.log(`✅ 找到 ${allModels.length} 个可用模型`);
    
    // 2. 筛选可能支持视频的模型
    const videoCandidateModels = allModels.filter(model => {
      const modelId = model.id.toLowerCase();
      return modelId.includes('vl') || 
             modelId.includes('vision') || 
             modelId.includes('video') ||
             modelId.includes('multimodal') ||
             modelId.includes('qwen2.5-vl') ||
             modelId.includes('deepseek-vl');
    });
    
    console.log(`\n🎬 可能支持视频的模型 (${videoCandidateModels.length}个):`);
    videoCandidateModels.forEach((model, index) => {
      console.log(`${index + 1}. ${model.id}`);
    });
    
    // 3. 测试每个候选模型
    console.log('\n🧪 测试视频支持...');
    const testResults = [];
    
    for (const model of videoCandidateModels) {
      console.log(`\n测试模型: ${model.id}`);
      console.log('-'.repeat(30));
      
      const result = {
        model: model.id,
        textSupport: false,
        imageSupport: false,
        videoSupport: false,
        error: null
      };
      
      try {
        // 测试文本支持
        const textResponse = await axios.post(
          `${baseURL}/chat/completions`,
          {
            model: model.id,
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
            timeout: 10000
          }
        );
        
        if (textResponse.data && textResponse.data.choices && textResponse.data.choices[0]) {
          console.log('✅ 文本支持: 成功');
          result.textSupport = true;
        }
        
        // 测试图片支持
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        const imageResponse = await axios.post(
          `${baseURL}/chat/completions`,
          {
            model: model.id,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: '请描述这张图片'
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
            timeout: 15000
          }
        );
        
        if (imageResponse.data && imageResponse.data.choices && imageResponse.data.choices[0]) {
          console.log('✅ 图片支持: 成功');
          result.imageSupport = true;
        }
        
        // 测试视频支持
        const videoResponse = await axios.post(
          `${baseURL}/chat/completions`,
          {
            model: model.id,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: '请分析这个视频内容'
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
            max_tokens: 150,
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
        
        if (videoResponse.data && videoResponse.data.choices && videoResponse.data.choices[0]) {
          console.log('✅ 视频支持: 成功');
          result.videoSupport = true;
        }
        
      } catch (error) {
        if (error.response) {
          console.log(`❌ 错误: ${error.response.data.message || error.response.statusText}`);
          result.error = error.response.data.message || error.response.statusText;
        } else {
          console.log(`❌ 网络错误: ${error.message}`);
          result.error = error.message;
        }
      }
      
      testResults.push(result);
      
      // 添加延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 4. 输出结果
    console.log('\n📊 测试结果总结:');
    console.log('='.repeat(50));
    
    const videoSupported = testResults.filter(r => r.videoSupport);
    const imageSupported = testResults.filter(r => r.imageSupport && !r.videoSupport);
    const textOnly = testResults.filter(r => r.textSupport && !r.imageSupport && !r.videoSupport);
    
    console.log('\n🎬 支持视频分析的模型:');
    if (videoSupported.length > 0) {
      videoSupported.forEach((model, index) => {
        console.log(`${index + 1}. ${model.model}`);
      });
    } else {
      console.log('❌ 未找到支持视频分析的模型');
    }
    
    console.log('\n🖼️  支持图片分析的模型:');
    if (imageSupported.length > 0) {
      imageSupported.forEach((model, index) => {
        console.log(`${index + 1}. ${model.model}`);
      });
    } else {
      console.log('❌ 未找到支持图片分析的模型');
    }
    
    console.log('\n📝 仅支持文本的模型:');
    if (textOnly.length > 0) {
      textOnly.forEach((model, index) => {
        console.log(`${index + 1}. ${model.model}`);
      });
    } else {
      console.log('❌ 未找到仅支持文本的模型');
    }
    
    // 5. 推荐使用
    console.log('\n💡 推荐使用:');
    if (videoSupported.length > 0) {
      console.log('🎯 最佳选择 - 支持视频分析的模型:');
      videoSupported.forEach((model, index) => {
        console.log(`   ${index + 1}. ${model.model}`);
      });
    } else if (imageSupported.length > 0) {
      console.log('🎯 次优选择 - 支持图片分析的模型:');
      imageSupported.forEach((model, index) => {
        console.log(`   ${index + 1}. ${model.model}`);
      });
      console.log('   注意: 这些模型可以将视频转换为图片帧进行分析');
    } else {
      console.log('⚠️  当前账户中没有找到支持视觉分析的模型');
      console.log('建议:');
      console.log('1. 联系硅基流动客服确认模型功能');
      console.log('2. 升级账户以访问更多模型');
      console.log('3. 使用文本分析模式');
    }
    
    // 6. 使用建议
    console.log('\n🔧 使用方法:');
    if (videoSupported.length > 0) {
      const bestModel = videoSupported[0].model;
      console.log(`node examples/video-content-analyzer.js examples/downloads <API密钥> ${bestModel}`);
    } else if (imageSupported.length > 0) {
      const bestModel = imageSupported[0].model;
      console.log(`node examples/video-content-analyzer.js examples/downloads <API密钥> ${bestModel}`);
    } else {
      console.log('node examples/video-content-analyzer.js examples/downloads <API密钥>');
    }
    
  } catch (error) {
    console.error('❌ 获取模型列表失败:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  findVideoModels();
}

module.exports = { findVideoModels }; 