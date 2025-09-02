import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUserVideos } from './user-videos-to-csv.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取命令行参数
const args = process.argv.slice(2);
const [authorFile, timeRange, timeUnit, ...otherArgs] = args;

// 检查是否跳过 CapCut 检查
const skipCapcutCheck = otherArgs.includes('--skip-capcut-check');

// 验证必需参数
if (!authorFile || !timeRange || !timeUnit) {
  console.error('使用方法: node batch-authors-videos.js <作者文件> <时间范围> <时间单位>');
  console.error('时间单位可以是: days, weeks, months');
  process.exit(1);
}

// 验证时间单位
if (!['days', 'weeks', 'months'].includes(timeUnit)) {
  console.error('无效的时间单位。请使用: days, weeks, months');
  process.exit(1);
}

// 读取作者列表
let authors;
try {
  const content = fs.readFileSync(authorFile, 'utf8');
  
  // 检测文件格式（CSV或纯文本）
  if (content.includes(',')) {
    console.log('检测到CSV格式...');
    authors = content.split('\n')
      .map(line => line.split(',')[0])
      .filter(author => author && author.trim());
  } else {
    console.log('检测到纯文本格式...');
    authors = content.split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }
} catch (error) {
  console.error('读取作者文件失败:', error);
  process.exit(1);
}

console.log(`找到 ${authors.length} 个作者，开始批量查询...`);

// 准备输出目录
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// 准备汇总的视频数据
let allVideosData = [];
let successAuthors = 0;
let failedAuthors = 0;
let totalVideos = 0;

// 批量处理作者
for (let i = 0; i < authors.length; i++) {
  const author = authors[i];
  try {
    console.log(`\n[${i + 1}/${authors.length}] 正在获取作者 ${author} 的视频...`);
    
    // 调用获取视频数据的函数，返回数据而不是保存文件
    const result = await getUserVideos(author, timeRange, timeUnit, skipCapcutCheck, true);
    
    if (result && result.videos && result.videos.length > 0) {
      console.log(`✓ 找到 ${result.videoCount} 个视频在指定时间范围内`);
      allVideosData.push(...result.videos);
      totalVideos += result.videoCount;
      successAuthors++;
      
      // 显示前3个视频的预览
      console.log('前3个视频预览:');
      result.videos.slice(0, 3).forEach((video, index) => {
        console.log(`  视频 ${index + 1}:`);
        console.log(`  - 描述: ${video.description}`);
        console.log(`  - 点赞数: ${video.likes}`);
        console.log(`  - 播放数: ${video.plays}`);
        console.log(`  - 创建时间: ${video.createTime}`);
      });
    } else {
      console.log('✗ 未找到视频');
      successAuthors++; // 即使没有找到视频，也算作成功处理
    }
  } catch (error) {
    console.error(`✗ 处理作者 ${author} 失败:`, error.message);
    failedAuthors++;
  }
  
  // 在处理作者之间添加延迟，避免请求过快
  if (i < authors.length - 1) {
    console.log('等待 2 秒后继续下一个作者...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// 生成汇总的CSV文件
if (allVideosData.length > 0) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const csvPath = path.join(outputDir, `batch_authors_videos_${timestamp.split('T')[0]}.csv`);
  
  // 准备CSV数据
  const csvData = [
    ['视频ID', '描述', '作者', '点赞数', '评论数', '分享数', '播放数', '创建时间', '视频链接', '是否CapCut投稿', '来源平台代码']
  ];
  
  allVideosData.forEach(video => {
    csvData.push([
      video.id,
      `"${video.description.replace(/"/g, '""')}"`, // 正确处理CSV中的引号和换行
      video.author,
      video.likes,
      video.comments,
      video.shares,
      video.plays,
      video.createTime,
      video.videoUrl,
      video.isCapCut,
      video.sourcePlatform
    ]);
  });
  
  // 将数据转换为CSV格式并保存
  const csvContent = csvData.map(row => row.join(',')).join('\n');
  const BOM = '\ufeff'; // 添加BOM标记以确保中文正确显示
  fs.writeFileSync(csvPath, BOM + csvContent, { encoding: 'utf8' });
  
  console.log('\n=== 批量查询完成 ===');
  console.log(`✓ 成功处理 ${successAuthors} 个作者`);
  console.log(`✗ 失败处理 ${failedAuthors} 个作者`);
  console.log(`📊 总计获取 ${totalVideos} 个视频信息`);
  console.log(`💾 数据已汇总保存到: ${csvPath}`);
  
  // 按作者统计视频数量
  const authorStats = {};
  allVideosData.forEach(video => {
    authorStats[video.author] = (authorStats[video.author] || 0) + 1;
  });
  
  console.log('\n各作者视频统计:');
  Object.entries(authorStats).forEach(([author, count]) => {
    console.log(`  ${author}: ${count} 个视频`);
  });
  
  // 打印CSV使用说明
  console.log('\n📋 如何正确打开CSV文件：');
  console.log('1. 使用Excel打开时，选择"数据" -> "从文本/CSV"');
  console.log('2. 在打开对话框中，确保"文件原始格式"选择为"UTF-8"');
  console.log('3. 点击"加载"即可正确显示中文内容');
  console.log('4. 如果仍有乱码，可以尝试用记事本打开查看原始数据');
} else {
  console.log('\n=== 批量查询完成 ===');
  console.log(`✓ 成功处理 ${successAuthors} 个作者`);
  console.log(`✗ 失败处理 ${failedAuthors} 个作者`);
  console.log('❌ 未找到任何视频，不生成CSV文件');
}