const axios = require('axios');

async function selectVideoModel(apiKey) {
  console.log('🔍 视频分析模型选择工具');
  console.log('='.repeat(50));
  
  if (!apiKey) {
    console.error('❌ 请提供API密钥');
    console.log('使用方法: node select-video-model.js <API密钥>');
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
    console.log(`✅ 找到 ${models.length} 个可用模型`);
    
    // 2. 筛选支持视频分析的模型
    const videoModels = [
      'Qwen/Qwen2.5-VL-72B-Instruct',
      'Qwen/Qwen2.5-VL-32B-Instruct', 
      'Qwen/Qwen2.5-VL-7B-Instruct',
      'deepseek-ai/deepseek-vl2',
      'Qwen/Qwen2.5-VL-7B-Instruct',
      'Qwen/Qwen2.5-VL-32B-Instruct',
      'Qwen/Qwen2.5-VL-72B-Instruct'
    ];
    
    const availableVideoModels = models.filter(model => 
      videoModels.includes(model.id)
    );
    
    console.log('\n🎬 支持视频分析的模型:');
    if (availableVideoModels.length > 0) {
      availableVideoModels.forEach((model, index) => {
        console.log(`${index + 1}. ${model.id}`);
      });
    } else {
      console.log('❌ 未找到支持视频分析的模型');
    }
    
    // 3. 推荐模型
    console.log('\n💡 推荐模型选择:');
    console.log('1. 最高质量: Qwen/Qwen2.5-VL-72B-Instruct');
    console.log('2. 平衡性能: Qwen/Qwen2.5-VL-32B-Instruct');
    console.log('3. 快速响应: Qwen/Qwen2.5-VL-7B-Instruct');
    console.log('4. DeepSeek视觉: deepseek-ai/deepseek-vl2');
    
    // 4. 测试模型连接
    console.log('\n🧪 测试模型连接...');
    const testModels = [
      'Pro/deepseek-ai/DeepSeek-V3',
      'Pro/deepseek-ai/DeepSeek-R1',
      'Qwen/Qwen2.5-7B-Instruct',
      'Qwen/Qwen2.5-14B-Instruct'
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
    
    // 5. 使用建议
    console.log('\n📝 使用建议:');
    console.log('1. 如果有支持视频的模型，优先使用视频分析功能');
    console.log('2. 如果没有视频模型，可以使用文本分析模式');
    console.log('3. 修改 video-content-analyzer.js 中的模型配置');
    console.log('');
    console.log('🔧 修改方法:');
    console.log('在 video-content-analyzer.js 第11行修改 model 参数');
    console.log('例如: model: "Qwen/Qwen2.5-VL-32B-Instruct"');
    
  } catch (error) {
    console.error('❌ 获取模型列表失败:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  selectVideoModel(process.argv[2]);
}

module.exports = { selectVideoModel }; 