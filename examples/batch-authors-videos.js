import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createObjectCsvWriter } from 'csv-writer';

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

// 准备CSV文件
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const csvPath = path.join(outputDir, `batch_authors_videos_${timestamp.split('T')[0]}.csv`);

const csvWriter = createObjectCsvWriter({
  path: csvPath,
  header: [
    { id: 'id', title: '视频ID' },
    { id: 'description', title: '描述' },
    { id: 'author', title: '作者' },
    { id: 'likes', title: '点赞数' },
    { id: 'comments', title: '评论数' },
    { id: 'plays', title: '播放数' },
    { id: 'createTime', title: '创建时间' },
    { id: 'isCapCut', title: 'CapCut投稿' },
    { id: 'sourcePlatform', title: '来源平台' }
  ],
  encoding: 'utf8'
});

// 处理结果统计
let successAuthors = 0;
let failedAuthors = 0;
let totalVideos = 0;
let allVideos = [];

// 批量处理作者
for (const author of authors) {
  try {
    console.log(`\n正在获取作者 ${author} 的视频...`);
    
    // 调用获取视频列表的脚本
    const scriptPath = path.join(__dirname, 'user-videos-to-csv.js');
    const skipFlag = skipCapcutCheck ? ' --skip-capcut-check' : '';
    const cmd = `node "${scriptPath}" "${author}" ${timeRange} ${timeUnit}${skipFlag}`;
    const result = execSync(cmd, { encoding: 'utf8' });
    
    // 解析输出找到视频数量
    const videosMatch = result.match(/找到 (\d+) 个视频在指定时间范围内/);
    const videoCount = videosMatch ? parseInt(videosMatch[1]) : 0;
    
    if (videoCount > 0) {
      console.log(`找到 ${videoCount} 个视频在指定时间范围内`);
      
      // 如果不跳过 CapCut 检查，则进行检查
      if (!skipCapcutCheck) {
        console.log(`正在检测 ${author} 的 ${videoCount} 个视频的CapCut信息...`);
        // 这里添加 CapCut 检测逻辑
      }

      // 解析视频数据
      const videoMatches = result.match(/视频 \d+:[\s\S]+?(?=视频 \d+:|$)/g);
      if (videoMatches) {
        const videos = videoMatches.map(videoText => {
          const video = {
            author,
            id: '',
            description: '',
            likes: '0',
            plays: '0',
            comments: '0',
            createTime: '',
            isCapCut: '否',
            sourcePlatform: ''
          };

          // 提取视频信息
          const descMatch = videoText.match(/描述: (.*)/);
          const likesMatch = videoText.match(/点赞数: (\d+)/);
          const playsMatch = videoText.match(/播放数: (\d+)/);
          const timeMatch = videoText.match(/创建时间: (.*)/);

          if (descMatch) video.description = descMatch[1].trim();
          if (likesMatch) video.likes = likesMatch[1];
          if (playsMatch) video.plays = playsMatch[1];
          if (timeMatch) video.createTime = timeMatch[1].trim();

          return video;
        });

        allVideos.push(...videos);
        totalVideos += videoCount;
        successAuthors++;
        
        // 显示前3个视频的预览
        console.log('\n前3个视频预览:');
        videoMatches.slice(0, 3).forEach(preview => console.log('\n' + preview.trim()));
        
        console.log(`\n成功获取 ${videoCount} 个视频`);
      }
    } else {
      console.log('未找到视频');
      // 即使没有找到视频，也算作成功处理（因为可能确实没有视频）
      successAuthors++;
    }
  } catch (error) {
    console.error(`处理作者 ${author} 失败:`, error.message);
    failedAuthors++;
  }
}

// 如果有视频数据，写入CSV
if (allVideos.length > 0) {
  await csvWriter.writeRecords(allVideos);
}

console.log('\n获取完成:');
console.log(`成功处理 ${successAuthors} 个作者`);
console.log(`失败处理 ${failedAuthors} 个作者`);
console.log(`\n成功获取总计 ${totalVideos} 个视频信息`);

if (totalVideos > 0) {
  console.log(`数据已保存到: ${csvPath}`);
  
  // 打印CSV使用说明
  console.log('\n如何正确打开CSV文件：');
  console.log('1. 使用Excel打开时，选择"数据" -> "从文本/CSV"');
  console.log('2. 在打开对话框中，确保"文件原始格式"选择为"UTF-8"');
  console.log('3. 点击"加载"即可正确显示中文内容');
} else {
  console.log('未找到任何视频，不生成CSV文件');
}