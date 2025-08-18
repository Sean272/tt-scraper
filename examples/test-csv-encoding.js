const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

async function testCsvEncoding() {
  console.log('🧪 测试CSV编码...');
  
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
    },
    {
      '视频ID': '7531685996',
      '描述': '这支舞蹈太震撼了！动作流畅，节奏感超强！',
      '作者': 'dance_user',
      '点赞数': '1234',
      '评论数': '56',
      '分享数': '78',
      '播放数': '9876',
      '创建时间': '2024-08-05 11:00:00',
      '视频链接': 'https://www.tiktok.com/@dance_user/video/7531685996',
      '是否CapCut投稿': '否',
      'CapCut置信度': '0',
      '来源平台代码': '10033',
      '内容主题': '舞蹈',
      '主题置信度': '0.92',
      '情感倾向': 'positive',
      '情感评分': '0.78',
      '关键词': '舞蹈|街舞|震撼|表演',
      '内容摘要': '展示了一段精彩的舞蹈表演',
      '语言': '中文',
      '内容类型': 'entertainment',
      '目标受众': '舞蹈爱好者|年轻人',
      '内容质量评分': '88',
      '分析方式': '硅基流动API'
    }
  ];
  
  // 创建输出目录
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 测试不同的编码方式
  const testCases = [
    {
      name: 'UTF-8 with BOM',
      config: {
        encoding: 'utf8',
        bom: true
      }
    },
    {
      name: 'UTF-8 without BOM',
      config: {
        encoding: 'utf8',
        bom: false
      }
    },
    {
      name: 'UTF-8 (default)',
      config: {}
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 测试: ${testCase.name}`);
    
    const outputPath = path.join(outputDir, `test_encoding_${testCase.name.replace(/\s+/g, '_').toLowerCase()}.csv`);
    
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: Object.keys(testData[0]).map(key => ({
        id: key,
        title: key
      })),
      ...testCase.config
    });
    
    try {
      await csvWriter.writeRecords(testData);
      console.log(`✅ 成功创建: ${outputPath}`);
      
      // 检查文件大小
      const stats = fs.statSync(outputPath);
      console.log(`   文件大小: ${stats.size} 字节`);
      
      // 读取文件前几个字节检查BOM
      const buffer = fs.readFileSync(outputPath);
      if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        console.log(`   ✅ 包含UTF-8 BOM标记`);
      } else {
        console.log(`   ❌ 不包含BOM标记`);
      }
      
    } catch (error) {
      console.error(`❌ 创建失败: ${error.message}`);
    }
  }
  
  console.log('\n📋 使用建议:');
  console.log('1. 使用UTF-8 with BOM可以确保Excel正确识别中文');
  console.log('2. 如果仍有乱码，请用记事本打开CSV文件，另存为时选择UTF-8编码');
  console.log('3. 或者使用Excel的"数据"→"从文本/CSV"功能，选择UTF-8编码');
  
  console.log('\n📁 测试文件已保存到 examples/output/ 目录');
}

// 如果直接运行此文件
if (require.main === module) {
  testCsvEncoding();
}

module.exports = { testCsvEncoding }; 