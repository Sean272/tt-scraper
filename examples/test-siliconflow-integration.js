const { SiliconFlowContentAnalyzer } = require('./batch-video-content-analysis-siliconflow');

async function testSiliconFlowIntegration() {
  console.log('🧪 开始测试硅基流动API集成...');
  
  // 请替换为您的实际API密钥
  const apiKey = process.argv[2] || 'your-siliconflow-api-key-here';
  
  if (apiKey === 'your-siliconflow-api-key-here') {
    console.error('❌ 请提供有效的硅基流动API密钥');
    console.log('使用方法: node test-siliconflow-integration.js <API密钥>');
    process.exit(1);
  }
  
  const analyzer = new SiliconFlowContentAnalyzer(apiKey);
  
  try {
    // 1. 测试API连接
    console.log('\n🔗 测试API连接...');
    const connectionTest = await analyzer.testConnection();
    if (connectionTest) {
      console.log('✅ API连接成功');
    } else {
      console.log('❌ API连接失败');
      return;
    }
    
    // 2. 获取可用模型
    console.log('\n📋 获取可用模型...');
    const models = await analyzer.getAvailableModels();
    console.log('可用模型:', models);
    
    // 3. 测试内容分析
    console.log('\n🤖 测试内容分析...');
    const testVideoData = {
      description: '今天做了一道超级好吃的红烧肉，肥而不腻，入口即化！配上白米饭简直是绝配！ #美食 #红烧肉 #家常菜 #下饭菜',
      hashtags: ['美食', '红烧肉', '家常菜', '下饭菜'],
      author: 'test_user',
      createTime: Date.now() / 1000
    };
    
    console.log('测试视频数据:', testVideoData);
    
    const analysisResult = await analyzer.analyzeContent(testVideoData);
    console.log('\n📊 分析结果:');
    console.log('主题:', analysisResult.topic);
    console.log('主题置信度:', analysisResult.topicConfidence);
    console.log('情感倾向:', analysisResult.sentiment);
    console.log('情感评分:', analysisResult.sentimentScore);
    console.log('关键词:', analysisResult.keywords);
    console.log('内容摘要:', analysisResult.summary);
    console.log('语言:', analysisResult.language);
    console.log('内容类型:', analysisResult.contentType);
    console.log('目标受众:', analysisResult.targetAudience);
    console.log('质量评分:', analysisResult.qualityScore);
    
    // 4. 测试不同主题的视频
    console.log('\n🎭 测试不同主题的视频...');
    
    const testCases = [
      {
        description: '这支舞蹈太震撼了！动作流畅，节奏感超强！ #舞蹈 #街舞 #震撼 #表演',
        hashtags: ['舞蹈', '街舞', '震撼', '表演'],
        author: 'dance_user',
        createTime: Date.now() / 1000
      },
      {
        description: '分享一个超实用的编程技巧，让你的代码更简洁高效！ #编程 #技巧 #学习 #开发',
        hashtags: ['编程', '技巧', '学习', '开发'],
        author: 'tech_user',
        createTime: Date.now() / 1000
      },
      {
        description: '今天去旅行了，风景太美了！分享给大家看看 #旅行 #风景 #美丽 #分享',
        hashtags: ['旅行', '风景', '美丽', '分享'],
        author: 'travel_user',
        createTime: Date.now() / 1000
      }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      console.log(`\n测试案例 ${i + 1}:`);
      console.log('描述:', testCases[i].description);
      
      const result = await analyzer.analyzeContent(testCases[i]);
      console.log('主题:', result.topic);
      console.log('情感:', result.sentiment);
      console.log('关键词:', result.keywords.slice(0, 3).join(', '));
      
      // 添加延迟避免API限制
      if (i < testCases.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n🎉 所有测试完成！硅基流动API集成正常工作');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testSiliconFlowIntegration();
}

module.exports = { testSiliconFlowIntegration }; 