#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { SiliconFlowContentAnalyzer } = require('./batch-video-content-analysis-siliconflow');

console.log('🚀 硅基流动API集成 - 快速开始');
console.log('='.repeat(50));

async function quickStart() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法: node quick-start-siliconflow.js <API密钥>');
    console.log('');
    console.log('示例:');
    console.log('  node quick-start-siliconflow.js sk-xxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('');
    console.log('这个脚本将：');
    console.log('1. 测试API连接');
    console.log('2. 获取可用模型');
    console.log('3. 进行示例内容分析');
    console.log('4. 创建测试CSV文件');
    process.exit(1);
  }
  
  const apiKey = args[0];
  
  try {
    console.log('🔗 步骤1: 测试API连接...');
    const analyzer = new SiliconFlowContentAnalyzer(apiKey);
    
    const connectionTest = await analyzer.testConnection();
    if (!connectionTest) {
      console.error('❌ API连接失败，请检查密钥和网络连接');
      process.exit(1);
    }
    console.log('✅ API连接成功');
    
    console.log('\n📋 步骤2: 获取可用模型...');
    const models = await analyzer.getAvailableModels();
    console.log('可用模型:', models);
    
    console.log('\n🤖 步骤3: 进行示例内容分析...');
    const testCases = [
      {
        description: '今天做了一道超级好吃的红烧肉，肥而不腻，入口即化！配上白米饭简直是绝配！ #美食 #红烧肉 #家常菜',
        hashtags: ['美食', '红烧肉', '家常菜'],
        author: 'test_user',
        createTime: Date.now() / 1000
      },
      {
        description: '这支舞蹈太震撼了！动作流畅，节奏感超强！ #舞蹈 #街舞 #震撼',
        hashtags: ['舞蹈', '街舞', '震撼'],
        author: 'dance_user',
        createTime: Date.now() / 1000
      }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      console.log(`\n分析示例 ${i + 1}:`);
      console.log('描述:', testCases[i].description);
      
      const result = await analyzer.analyzeContent(testCases[i]);
      console.log('主题:', result.topic);
      console.log('情感:', result.sentiment);
      console.log('关键词:', result.keywords.slice(0, 3).join(', '));
      console.log('摘要:', result.summary);
      
      if (i < testCases.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n📝 步骤4: 创建测试CSV文件...');
    const testCsvContent = `video_id
7529241930178252037
7530472638058155271
7530473621936934151`;
    
    const testCsvPath = path.join(__dirname, 'test-siliconflow-quick.csv');
    fs.writeFileSync(testCsvPath, testCsvContent);
    console.log(`✅ 测试CSV文件已创建: ${testCsvPath}`);
    
    console.log('\n📋 步骤5: 生成使用说明...');
    const instructions = `
# 硅基流动API集成测试完成！

## 下一步操作：

### 1. 运行批量分析
\`\`\`bash
node examples/batch-video-content-analysis-siliconflow.js test-siliconflow-quick.csv ${apiKey}
\`\`\`

### 2. 使用您自己的数据
创建包含视频ID的CSV文件，格式如下：
\`\`\`csv
video_id
您的视频ID1
您的视频ID2
您的视频ID3
\`\`\`

### 3. 查看详细文档
- 使用指南: examples/CLI/硅基流动API集成使用指南.md
- 测试脚本: examples/test-siliconflow-integration.js

### 4. 输出文件位置
- CSV数据文件: examples/output/
- 分析报告: examples/output/

## 注意事项：
- 确保API密钥有效且有足够余额
- 大批量处理时建议分批进行
- 监控API使用量和费用

🎉 硅基流动API集成已准备就绪！
`;
    
    const instructionsPath = path.join(__dirname, 'siliconflow-setup-complete.txt');
    fs.writeFileSync(instructionsPath, instructions);
    console.log(`✅ 使用说明已保存: ${instructionsPath}`);
    
    console.log('\n🎉 快速开始完成！');
    console.log('请查看生成的使用说明文件获取下一步操作指南。');
    
  } catch (error) {
    console.error('❌ 快速开始过程中发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  quickStart();
}

module.exports = { quickStart }; 