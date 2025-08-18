const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const { createUtf8CsvWriter } = require('./utils/csv-helper');

// 重用单个视频详情的处理逻辑
const { detectCapCutSource } = require('./capcut-detector');

// 定义工具函数
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const formatNumber = (num) => {
    if (num === undefined || num === null) return '';
    return num.toString();
};

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleString();
};

const formatBoolean = (bool) => {
    if (bool === undefined || bool === null) return '';
    return bool ? '是' : '否';
};

const formatArray = (arr) => {
    if (!Array.isArray(arr)) return '';
    return arr.join('|');
};

const formatCSVField = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
};

// 硅基流动内容分析器类
class SiliconFlowContentAnalyzer {
  constructor(apiKey, config = {}) {
    this.apiKey = apiKey;
    this.config = {
      model: 'Pro/deepseek-ai/DeepSeek-R1',
      maxTokens: 1000,
      temperature: 0.3,
      baseURL: 'https://api.siliconflow.cn/v1',
      ...config
    };
    this.baseURL = this.config.baseURL;
  }

  async analyzeContent(videoData) {
    try {
      const prompt = this.buildAnalysisPrompt(videoData);
      const response = await this.callSiliconFlow(prompt);
      return this.parseSiliconFlowResponse(response);
    } catch (error) {
      console.error('硅基流动API调用失败:', error);
      return this.getDefaultAnalysis(videoData);
    }
  }

  buildAnalysisPrompt(videoData) {
    const { description, hashtags = [], author, createTime } = videoData;
    
    return `请分析以下TikTok视频内容，并提供详细的分析结果。

视频信息：
- 描述：${description || '无描述'}
- 话题标签：${hashtags.join(', ') || '无标签'}
- 作者：${author || '未知'}
- 发布时间：${createTime ? new Date(createTime * 1000).toLocaleString() : '未知'}

请按照以下JSON格式返回分析结果：

{
  "topic": "主题分类（美食/舞蹈/音乐/搞笑/教育/时尚/旅行/运动/宠物/科技/生活/游戏/情感/商业/其他）",
  "topicConfidence": 0.95,
  "sentiment": "情感倾向（positive/negative/neutral）",
  "sentimentScore": 0.8,
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "summary": "内容摘要（50字以内）",
  "language": "语言类型（中文/英文/混合）",
  "contentType": "内容类型（entertainment/educational/commercial/personal/other）",
  "targetAudience": ["目标受众1", "目标受众2"],
  "qualityScore": 0.85
}

分析要求：
1. 主题分类要准确，基于内容关键词和话题标签
2. 情感分析要考虑文本中的情感词汇和表达
3. 关键词提取要包含最重要的概念和标签
4. 内容摘要要简洁明了，突出主要内容
5. 目标受众要基于内容特征和主题推断
6. 质量评分要考虑文本完整性、话题标签数量、内容价值等因素

请确保返回的是有效的JSON格式。`;
  }

  async callSiliconFlow(prompt) {
    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的TikTok内容分析专家，擅长分析短视频的文本内容、主题分类、情感分析等。请严格按照要求的JSON格式返回分析结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  }

  parseSiliconFlowResponse(response) {
    try {
      const data = JSON.parse(response);
      
      return {
        topic: data.topic || '其他',
        topicConfidence: data.topicConfidence || 0,
        sentiment: data.sentiment || 'neutral',
        sentimentScore: data.sentimentScore || 0,
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        summary: data.summary || '内容分析失败',
        language: data.language || '未知',
        contentType: data.contentType || 'other',
        targetAudience: Array.isArray(data.targetAudience) ? data.targetAudience : ['一般用户'],
        qualityScore: data.qualityScore || 0
      };
    } catch (error) {
      console.error('解析硅基流动响应失败:', error);
      return this.getDefaultAnalysis({ description: '', hashtags: [] });
    }
  }

  getDefaultAnalysis(videoData) {
    return {
      topic: '其他',
      topicConfidence: 0,
      sentiment: 'neutral',
      sentimentScore: 0,
      keywords: [],
      summary: '硅基流动分析失败，使用默认分析',
      language: '未知',
      contentType: 'other',
      targetAudience: ['一般用户'],
      qualityScore: 0
    };
  }

  async testConnection() {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: 'Hello, this is a test message.'
            }
          ],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error('硅基流动API连接测试失败:', error);
      return false;
    }
  }

  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      return response.data.data.map(model => model.id);
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return ['Pro/deepseek-ai/DeepSeek-V3', 'Pro/deepseek-ai/DeepSeek-R1'];
    }
  }
} 

// 批量处理内容分析
async function processBatchContentAnalysisWithSiliconFlow(inputCsvPath, siliconFlowApiKey) {
  console.log('🚀 开始使用硅基流动API进行批量视频内容分析...');
  
  // 创建分析器实例
  const analyzer = new SiliconFlowContentAnalyzer(siliconFlowApiKey);
  
  // 测试API连接
  console.log('🔗 测试硅基流动API连接...');
  const connectionTest = await analyzer.testConnection();
  if (!connectionTest) {
    console.error('❌ 硅基流动API连接失败，请检查API密钥和网络连接');
    return;
  }
  console.log('✅ 硅基流动API连接成功');
  
  // 获取可用模型
  console.log('📋 获取可用模型列表...');
  const availableModels = await analyzer.getAvailableModels();
  console.log('可用模型:', availableModels);
  
  // 读取输入文件
  const videoIds = [];
  try {
    const fileStream = fs.createReadStream(inputCsvPath);
    await new Promise((resolve, reject) => {
      fileStream
        .pipe(csv())
        .on('data', (row) => {
          const videoId = row.video_id || row.videoId || Object.values(row)[0];
          const duration = row.duration || row.duration_seconds;
          if (videoId) {
            videoIds.push({ videoId, duration: duration ? parseInt(duration) : null });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
  } catch (error) {
    console.error('❌ 读取输入文件失败:', error);
    return;
  }
  
  console.log(`📊 共找到 ${videoIds.length} 个视频ID`);
  
  if (videoIds.length === 0) {
    console.error('❌ 未找到有效的视频ID');
    return;
  }
  
  // 创建输出目录
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 创建CSV写入器
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `siliconflow_content_analysis_${timestamp}.csv`);
  
  const csvWriter = createUtf8CsvWriter(outputPath, [
    { id: 'video_id', title: '视频ID' },
    { id: 'description', title: '描述' },
    { id: 'author', title: '作者' },
    { id: 'likes', title: '点赞数' },
    { id: 'comments', title: '评论数' },
    { id: 'shares', title: '分享数' },
    { id: 'views', title: '播放数' },
    { id: 'create_time', title: '创建时间' },
    { id: 'video_url', title: '视频链接' },
    { id: 'is_capcut', title: '是否CapCut投稿' },
    { id: 'capcut_confidence', title: 'CapCut置信度' },
    { id: 'source_platform', title: '来源平台代码' },
    { id: 'topic', title: '内容主题' },
    { id: 'topic_confidence', title: '主题置信度' },
    { id: 'sentiment', title: '情感倾向' },
    { id: 'sentiment_score', title: '情感评分' },
    { id: 'keywords', title: '关键词' },
    { id: 'summary', title: '内容摘要' },
    { id: 'language', title: '语言' },
    { id: 'content_type', title: '内容类型' },
    { id: 'target_audience', title: '目标受众' },
    { id: 'quality_score', title: '内容质量评分' },
    { id: 'analysis_method', title: '分析方式' }
  ]);
  
  const videosData = [];
  let successCount = 0;
  let errorCount = 0;
  
  console.log('🔄 开始批量分析视频内容...');
  
  for (let i = 0; i < videoIds.length; i++) {
    const { videoId, duration } = videoIds[i];
    console.log(`\n📹 处理第 ${i + 1}/${videoIds.length} 个视频: ${videoId}`);
    
    try {
      // 获取视频详情
      const videoDetails = await getVideoDetails(videoId, duration);
      
      if (!videoDetails) {
        console.log(`⚠️  视频 ${videoId} 获取详情失败，跳过`);
        errorCount++;
        continue;
      }
      
      // 使用硅基流动进行内容分析
      console.log(`🤖 使用硅基流动API分析视频内容...`);
      const analysisResult = await analyzer.analyzeContent(videoDetails);
      
      // 合并数据
      const combinedData = {
        ...videoDetails,
        topic: analysisResult.topic,
        topic_confidence: analysisResult.topicConfidence,
        sentiment: analysisResult.sentiment,
        sentiment_score: analysisResult.sentimentScore,
        keywords: formatArray(analysisResult.keywords),
        summary: analysisResult.summary,
        language: analysisResult.language,
        content_type: analysisResult.contentType,
        target_audience: formatArray(analysisResult.targetAudience),
        quality_score: analysisResult.qualityScore,
        analysis_method: '硅基流动API'
      };
      
      videosData.push(combinedData);
      successCount++;
      
      console.log(`✅ 视频 ${videoId} 分析完成`);
      console.log(`   主题: ${analysisResult.topic} (置信度: ${analysisResult.topicConfidence})`);
      console.log(`   情感: ${analysisResult.sentiment} (评分: ${analysisResult.sentimentScore})`);
      console.log(`   关键词: ${analysisResult.keywords.join(', ')}`);
      
      // 写入CSV
      await csvWriter.writeRecords([combinedData]);
      
      // 添加延迟避免API限制
      if (i < videoIds.length - 1) {
        console.log(`⏳ 等待 ${RETRY_DELAY/1000} 秒后处理下一个视频...`);
        await sleep(RETRY_DELAY);
      }
      
    } catch (error) {
      console.error(`❌ 处理视频 ${videoId} 时发生错误:`, error.message);
      errorCount++;
    }
  }
  
  // 生成分析报告
  console.log('\n📈 生成分析报告...');
  const report = generateSiliconFlowAnalysisReport(videosData);
  
  // 保存报告
  const reportPath = path.join(outputDir, `siliconflow_analysis_report_${timestamp}.txt`);
  fs.writeFileSync(reportPath, report);
  
  console.log('\n🎉 批量内容分析完成！');
  console.log(`📊 统计信息:`);
  console.log(`   - 总视频数: ${videoIds.length}`);
  console.log(`   - 成功分析: ${successCount}`);
  console.log(`   - 分析失败: ${errorCount}`);
  console.log(`   - 成功率: ${((successCount / videoIds.length) * 100).toFixed(1)}%`);
  console.log(`\n📁 输出文件:`);
  console.log(`   - 数据文件: ${outputPath}`);
  console.log(`   - 分析报告: ${reportPath}`);
  
  return {
    totalVideos: videoIds.length,
    successCount,
    errorCount,
    outputPath,
    reportPath,
    videosData
  };
}

// 生成硅基流动分析报告
function generateSiliconFlowAnalysisReport(videosData) {
  if (videosData.length === 0) {
    return '没有可分析的数据';
  }
  
  const report = [];
  report.push('='.repeat(60));
  report.push('硅基流动API 视频内容分析报告');
  report.push('='.repeat(60));
  report.push(`生成时间: ${new Date().toLocaleString()}`);
  report.push(`分析视频数量: ${videosData.length}`);
  report.push('');
  
  // 主题分布统计
  const topicStats = {};
  const sentimentStats = { positive: 0, negative: 0, neutral: 0 };
  const contentTypeStats = {};
  const languageStats = {};
  let totalQualityScore = 0;
  let totalTopicConfidence = 0;
  let totalSentimentScore = 0;
  
  videosData.forEach(video => {
    // 主题统计
    const topic = video.topic || '其他';
    topicStats[topic] = (topicStats[topic] || 0) + 1;
    
    // 情感统计
    const sentiment = video.sentiment || 'neutral';
    sentimentStats[sentiment] = (sentimentStats[sentiment] || 0) + 1;
    
    // 内容类型统计
    const contentType = video.content_type || 'other';
    contentTypeStats[contentType] = (contentTypeStats[contentType] || 0) + 1;
    
    // 语言统计
    const language = video.language || '未知';
    languageStats[language] = (languageStats[language] || 0) + 1;
    
    // 评分统计
    totalQualityScore += parseFloat(video.quality_score || 0);
    totalTopicConfidence += parseFloat(video.topic_confidence || 0);
    totalSentimentScore += parseFloat(video.sentiment_score || 0);
  });
  
  // 主题分布
  report.push('📊 主题分布:');
  report.push('-'.repeat(30));
  Object.entries(topicStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([topic, count]) => {
      const percentage = ((count / videosData.length) * 100).toFixed(1);
      report.push(`${topic}: ${count} (${percentage}%)`);
    });
  report.push('');
  
  // 情感分布
  report.push('😊 情感分布:');
  report.push('-'.repeat(30));
  Object.entries(sentimentStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([sentiment, count]) => {
      const percentage = ((count / videosData.length) * 100).toFixed(1);
      report.push(`${sentiment}: ${count} (${percentage}%)`);
    });
  report.push('');
  
  // 内容类型分布
  report.push('📝 内容类型分布:');
  report.push('-'.repeat(30));
  Object.entries(contentTypeStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      const percentage = ((count / videosData.length) * 100).toFixed(1);
      report.push(`${type}: ${count} (${percentage}%)`);
    });
  report.push('');
  
  // 语言分布
  report.push('🌐 语言分布:');
  report.push('-'.repeat(30));
  Object.entries(languageStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([language, count]) => {
      const percentage = ((count / videosData.length) * 100).toFixed(1);
      report.push(`${language}: ${count} (${percentage}%)`);
    });
  report.push('');
  
  // 平均评分
  const avgQualityScore = (totalQualityScore / videosData.length).toFixed(2);
  const avgTopicConfidence = (totalTopicConfidence / videosData.length).toFixed(2);
  const avgSentimentScore = (totalSentimentScore / videosData.length).toFixed(2);
  
  report.push('📈 平均评分:');
  report.push('-'.repeat(30));
  report.push(`内容质量评分: ${avgQualityScore}/100`);
  report.push(`主题置信度: ${avgTopicConfidence}/100`);
  report.push(`情感评分: ${avgSentimentScore}/100`);
  report.push('');
  
  // 热门关键词
  const keywordStats = {};
  videosData.forEach(video => {
    const keywords = video.keywords ? video.keywords.split('|') : [];
    keywords.forEach(keyword => {
      if (keyword.trim()) {
        keywordStats[keyword.trim()] = (keywordStats[keyword.trim()] || 0) + 1;
      }
    });
  });
  
  report.push('🔑 热门关键词 (出现次数):');
  report.push('-'.repeat(30));
  Object.entries(keywordStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([keyword, count]) => {
      report.push(`${keyword}: ${count}次`);
    });
  report.push('');
  
  report.push('='.repeat(60));
  report.push('报告结束');
  report.push('='.repeat(60));
  
  return report.join('\n');
}

// 获取视频详情（重用现有逻辑）
async function getVideoDetails(videoId, durationFilter = null) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(`https://www.tiktok.com/api/item/detail/?itemId=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      if (response.data && response.data.itemInfo && response.data.itemInfo.itemStruct) {
        const videoData = response.data.itemInfo.itemStruct;
        
        // 提取视频信息
        const videoInfo = {
          video_id: videoId,
          description: videoData.desc || '',
          author: videoData.author?.uniqueId || '',
          likes: videoData.stats?.diggCount || 0,
          comments: videoData.stats?.commentCount || 0,
          shares: videoData.stats?.shareCount || 0,
          views: videoData.stats?.playCount || 0,
          create_time: videoData.createTime || 0,
          video_url: `https://www.tiktok.com/@${videoData.author?.uniqueId}/video/${videoId}`,
          hashtags: extractHashtags(videoData.desc || '')
        };
        
        // CapCut检测
        const capcutResult = detectCapCutSource(videoData);
        videoInfo.is_capcut = capcutResult.isCapCut;
        videoInfo.capcut_confidence = capcutResult.confidence;
        videoInfo.source_platform = capcutResult.sourcePlatform;
        
        // 时长过滤检查
        if (durationFilter !== null) {
          const videoDuration = videoData.video?.duration || 0;
          const durationDiff = Math.abs(videoDuration - durationFilter);
          if (durationDiff > 1) {
            videoInfo.is_capcut = false;
            videoInfo.capcut_confidence = 0;
          }
        }
        
        return videoInfo;
      }
    } catch (error) {
      console.error(`尝试 ${attempt}/${MAX_RETRIES} 失败:`, error.message);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  return null;
}

// 提取话题标签
function extractHashtags(text) {
  const hashtagRegex = /#([^\s#]+)/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.slice(1)) : [];
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('使用方法: node batch-video-content-analysis-siliconflow.js <视频ID列表文件路径> <硅基流动API密钥>');
    console.log('');
    console.log('示例:');
    console.log('  node batch-video-content-analysis-siliconflow.js video-ids.csv sk-xxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('');
    console.log('文件格式:');
    console.log('  video_id');
    console.log('  7123456789');
    console.log('  7123456790');
    console.log('');
    console.log('或包含时长过滤:');
    console.log('  video_id,duration');
    console.log('  7123456789,15');
    console.log('  7123456790,30');
    process.exit(1);
  }
  
  const [inputCsvPath, siliconFlowApiKey] = args;
  
  // 检查文件是否存在
  if (!fs.existsSync(inputCsvPath)) {
    console.error(`❌ 输入文件不存在: ${inputCsvPath}`);
    process.exit(1);
  }
  
  // 检查API密钥
  if (!siliconFlowApiKey || siliconFlowApiKey.length < 10) {
    console.error('❌ 请提供有效的硅基流动API密钥');
    process.exit(1);
  }
  
  try {
    await processBatchContentAnalysisWithSiliconFlow(inputCsvPath, siliconFlowApiKey);
  } catch (error) {
    console.error('❌ 批量分析过程中发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

module.exports = {
  SiliconFlowContentAnalyzer,
  processBatchContentAnalysisWithSiliconFlow,
  generateSiliconFlowAnalysisReport
}; 