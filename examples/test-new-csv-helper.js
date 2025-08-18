const { createUtf8CsvWriter, validateCsvEncoding, createTestCsv } = require('./utils/csv-helper');
const path = require('path');
const fs = require('fs'); // Added missing import for fs

async function testNewCsvHelper() {
  console.log('🧪 测试新的CSV辅助工具...');
  
  // 测试数据
  const testData = [
    {
      '视频ID': '7531687066',
      '描述': '今天做了一道超级好吃的红烧肉，肥而不腻，入口即化！',
      '作者': 'test_user',
      '点赞数': '499',
      '评论数': '21',
      '分享数': '21',
      '播放数': '4877',
      '创建时间': '2024-08-05 10:30:00',
      '视频链接': 'https://www.tiktok.com/@test_user/video/7531687066',
      '是否CapCut投稿': '是',
      'CapCut置信度': '0.9',
      '来源平台代码': '72',
      '内容主题': '美食',
      '主题置信度': '0.95',
      '情感倾向': 'positive',
      '情感评分': '0.85',
      '关键词': '红烧肉|美食|家常菜|下饭菜',
      '内容摘要': '分享了一道美味的红烧肉制作过程',
      '语言': '中文',
      '内容类型': 'entertainment',
      '目标受众': '美食爱好者|家庭主妇',
      '内容质量评分': '85',
      '分析方式': '硅基流动API'
    }
  ];
  
  // 创建输出目录
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'test_new_csv_helper.csv');
  
  try {
    // 使用新的CSV辅助工具创建文件
    await createTestCsv(outputPath, testData);
    
    console.log('\n📋 验证结果:');
    const validation = validateCsvEncoding(outputPath);
    if (validation.success) {
      console.log(`✅ 编码验证成功`);
      console.log(`   编码类型: ${validation.encoding}`);
      console.log(`   包含BOM: ${validation.hasBom ? '是' : '否'}`);
      console.log(`   包含中文: ${validation.hasChinese ? '是' : '否'}`);
      console.log(`   文件大小: ${validation.fileSize} 字节`);
    } else {
      console.log(`❌ 编码验证失败: ${validation.error}`);
    }
    
    // 显示文件内容
    console.log('\n📄 文件内容预览:');
    const content = require('fs').readFileSync(outputPath, 'utf8');
    console.log(content.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testNewCsvHelper();
}

module.exports = { testNewCsvHelper }; 