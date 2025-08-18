const { VideoContentAnalyzer } = require('./video-content-analyzer');
const fs = require('fs');
const path = require('path');

async function testVideoAnalyzer() {
  console.log('🧪 测试视频内容分析功能...');
  
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.error('❌ 请提供API密钥');
    console.log('使用方法: node test-video-analyzer.js <API密钥>');
    process.exit(1);
  }
  
  const analyzer = new VideoContentAnalyzer(apiKey);
  
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
    
    // 3. 查找测试视频文件
    console.log('\n📹 查找测试视频文件...');
    const downloadsDir = path.join(__dirname, 'downloads');
    
    if (!fs.existsSync(downloadsDir)) {
      console.log('❌ 下载目录不存在，跳过视频分析测试');
      return;
    }
    
    const videoFiles = [];
    const files = fs.readdirSync(downloadsDir);
    for (const file of files) {
      if (file.endsWith('.mp4')) {
        const videoPath = path.join(downloadsDir, file);
        const videoId = path.parse(file).name;
        videoFiles.push({ videoPath, videoId });
      }
    }
    
    if (videoFiles.length === 0) {
      console.log('❌ 未找到视频文件，跳过视频分析测试');
      return;
    }
    
    console.log(`找到 ${videoFiles.length} 个视频文件`);
    
    // 4. 测试视频分析（只测试前2个视频）
    console.log('\n🎬 测试视频内容分析...');
    const testVideos = videoFiles.slice(0, 2);
    
    for (let i = 0; i < testVideos.length; i++) {
      const { videoPath, videoId } = testVideos[i];
      console.log(`\n测试视频 ${i + 1}: ${videoId}`);
      console.log(`文件路径: ${videoPath}`);
      
      try {
        const analysisResult = await analyzer.analyzeVideoContent(videoPath, {
          videoId,
          description: '测试视频',
          hashtags: ['测试'],
          author: 'test_user',
          createTime: Date.now() / 1000
        });
        
        console.log('\n📊 分析结果:');
        console.log('主题:', analysisResult.topic);
        console.log('主题置信度:', analysisResult.topicConfidence);
        console.log('情感倾向:', analysisResult.sentiment);
        console.log('情感评分:', analysisResult.sentimentScore);
        console.log('视觉质量:', analysisResult.visualQuality);
        console.log('互动潜力:', analysisResult.engagementPotential);
        console.log('视觉元素:', analysisResult.visualElements.slice(0, 3).join(', '));
        console.log('动作:', analysisResult.actions.slice(0, 3).join(', '));
        console.log('场景:', analysisResult.scenes.slice(0, 3).join(', '));
        console.log('人物:', analysisResult.people.slice(0, 3).join(', '));
        console.log('物体:', analysisResult.objects.slice(0, 3).join(', '));
        console.log('关键词:', analysisResult.keywords.slice(0, 3).join(', '));
        console.log('内容摘要:', analysisResult.summary);
        console.log('内容总结:', analysisResult.contentSummary);
        console.log('目标受众:', analysisResult.targetAudience.join(', '));
        console.log('内容质量评分:', analysisResult.qualityScore);
        
        // 添加延迟避免API限制
        if (i < testVideos.length - 1) {
          console.log('\n⏳ 等待 5 秒后测试下一个视频...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        console.error(`❌ 分析视频 ${videoId} 失败:`, error.message);
      }
    }
    
    console.log('\n🎉 视频分析测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testVideoAnalyzer();
}

module.exports = { testVideoAnalyzer }; 