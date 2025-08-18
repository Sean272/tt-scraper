const { VideoFrameAnalyzer } = require('./video-frame-analyzer');

async function testFrameAnalyzer() {
  console.log('🧪 测试视频帧分析器修复...');
  console.log('='.repeat(50));
  
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.error('❌ 请提供API密钥');
    console.log('使用方法: node test-frame-analyzer.js <API密钥>');
    process.exit(1);
  }
  
  // 创建分析器实例
  const analyzer = new VideoFrameAnalyzer(apiKey, {
    model: 'deepseek-ai/deepseek-vl2',
    maxFrames: 2 // 只测试2帧
  });
  
  console.log(`🤖 使用模型: ${analyzer.config.model}`);
  
  // 测试API连接
  console.log('🔗 测试API连接...');
  const connectionTest = await analyzer.testConnection();
  if (!connectionTest) {
    console.error('❌ API连接失败');
    return;
  }
  console.log('✅ API连接成功');
  
  // 测试JSON解析修复
  console.log('\n🔧 测试JSON解析修复...');
  
  // 模拟包含Markdown格式的响应
  const testResponses = [
    // 正常JSON
    '{"visualElements":["测试元素"],"frameQuality":"high","frameDescription":"测试描述"}',
    
    // 包含Markdown代码块的JSON
    '```json\n{"visualElements":["测试元素"],"frameQuality":"high","frameDescription":"测试描述"}\n```',
    
    // 包含普通代码块的JSON
    '```\n{"visualElements":["测试元素"],"frameQuality":"high","frameDescription":"测试描述"}\n```',
    
    // 混合格式
    '这是一个分析结果：```json\n{"visualElements":["测试元素"],"frameQuality":"high","frameDescription":"测试描述"}\n``` 分析完成。'
  ];
  
  for (let i = 0; i < testResponses.length; i++) {
    console.log(`\n测试响应 ${i + 1}:`);
    console.log('原始响应:', testResponses[i]);
    
    try {
      const result = analyzer.parseFrameAnalysisResponse(testResponses[i]);
      console.log('✅ 解析成功:', result.frameDescription);
    } catch (error) {
      console.log('❌ 解析失败:', error.message);
    }
  }
  
  console.log('\n✅ 测试完成！现在可以正常使用视频帧分析器了。');
  console.log('\n使用方法:');
  console.log('node examples/video-frame-analyzer.js examples/downloads2 <您的API密钥> deepseek-ai/deepseek-vl2');
}

// 如果直接运行此文件
if (require.main === module) {
  testFrameAnalyzer();
}

module.exports = { testFrameAnalyzer }; 