const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

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

// OpenAI内容分析器类
class OpenAIContentAnalyzer {
  constructor(apiKey, config = {}) {
    this.apiKey = apiKey;
    this.config = {
      model: 'gpt-3.5-turbo',
      maxTokens: 1000,
      temperature: 0.3,
      ...config
    };
    this.baseURL = 'https://api.openai.com/v1';
  }

  async analyzeContent(videoData) {
    try {
      const prompt = this.buildAnalysisPrompt(videoData);
      const response = await this.callOpenAI(prompt);
      return this.parseOpenAIResponse(response);
    } catch (error) {
      console.error('OpenAI API调用失败:', error);
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

  async callOpenAI(prompt) {
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

  parseOpenAIResponse(response) {
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
      console.error('解析OpenAI响应失败:', error);
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
      summary: 'OpenAI分析失败，使用默认分析',
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
      console.error('OpenAI API连接测试失败:', error);
      return false;
    }
  }
} 

// 批量处理视频内容分析（使用OpenAI）
async function processBatchContentAnalysisWithOpenAI(inputCsvPath, openaiApiKey) {
  console.log(`开始处理输入文件: ${inputCsvPath}`);
  
  if (!fs.existsSync(inputCsvPath)) {
    console.error(`错误: 输入文件 "${inputCsvPath}" 不存在`);
    return;
  }

  if (!openaiApiKey) {
    console.error('错误: 请提供OpenAI API密钥');
    console.log('使用方法: node batch-video-content-analysis-openai.js <视频ID列表文件路径> <OpenAI_API_Key>');
    return;
  }
  
  // 初始化OpenAI分析器
  const openaiAnalyzer = new OpenAIContentAnalyzer(openaiApiKey);
  
  // 测试API连接
  console.log('正在测试OpenAI API连接...');
  const isConnected = await openaiAnalyzer.testConnection();
  if (!isConnected) {
    console.error('❌ OpenAI API连接失败，请检查API密钥和网络连接');
    return;
  }
  console.log('✅ OpenAI API连接成功！');
  
  // 创建输出目录
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 生成输出文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputCsvPath = path.join(outputDir, `openai_content_analysis_${timestamp}.csv`);
  
  // 读取输入的CSV文件
  const videoData = [];
  
  try {
    // 从CSV读取视频ID和可选的时长数据
    await new Promise((resolve, reject) => {
      fs.createReadStream(inputCsvPath)
        .pipe(csv())
        .on('data', (row) => {
          const rowValues = Object.values(row);
          const videoId = rowValues[0];
          const duration = rowValues[1];
          
          if (videoId && /^\d+$/.test(videoId)) {
            const item = { videoId };
            if (duration && /^\d+$/.test(duration)) {
              item.expectedDuration = parseInt(duration);
            }
            videoData.push(item);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });
    
    console.log(`从CSV文件中读取到 ${videoData.length} 个视频ID`);
    
    if (videoData.length === 0) {
      console.error('未找到有效的视频ID，请检查输入文件格式');
      return;
    }
    
    // 用于存储所有视频的数据
    const allVideosData = [];
    
    // 依次处理每个视频ID
    for (let i = 0; i < videoData.length; i++) {
      const item = videoData[i];
      const { videoId, expectedDuration } = item;
      console.log(`\n处理视频 ${i + 1}/${videoData.length}: ${videoId}${expectedDuration ? ` (期望时长: ${expectedDuration}秒)` : ''}`);
      
      try {
        const durationFilter = expectedDuration ? 
          { targetDuration: expectedDuration, tolerance: 1 } : null;
        const videoDetails = await getVideoDetails(videoId, durationFilter);
        
        if (videoDetails) {
          // 准备OpenAI分析数据
          const analysisData = {
            description: videoDetails['描述'] || '',
            hashtags: videoDetails['话题标签'] ? videoDetails['话题标签'].split('|') : [],
            author: videoDetails['作者昵称'] || '',
            createTime: videoDetails['创建时间'] ? new Date(videoDetails['创建时间']).getTime() / 1000 : null
          };
          
          // 使用OpenAI进行内容分析
          console.log('🤖 正在使用OpenAI分析内容...');
          const contentAnalysis = await openaiAnalyzer.analyzeContent(analysisData);
          
          // 合并视频详情和内容分析结果
          const enrichedData = {
            ...videoDetails,
            '内容主题': contentAnalysis.topic,
            '主题置信度': (contentAnalysis.topicConfidence * 100).toFixed(1) + '%',
            '情感倾向': contentAnalysis.sentiment,
            '情感评分': contentAnalysis.sentimentScore.toFixed(2),
            '关键词': contentAnalysis.keywords.join('|'),
            '内容摘要': contentAnalysis.summary,
            '语言': contentAnalysis.language,
            '内容类型': contentAnalysis.contentType,
            '目标受众': contentAnalysis.targetAudience.join('|'),
            '内容质量评分': (contentAnalysis.qualityScore * 100).toFixed(1) + '%',
            '分析方式': 'OpenAI GPT-3.5'
          };
          
          allVideosData.push(enrichedData);
          console.log(`✅ 成功分析视频 ${videoId} 的内容`);
          console.log(`   主题: ${contentAnalysis.topic} (置信度: ${(contentAnalysis.topicConfidence * 100).toFixed(1)}%)`);
          console.log(`   情感: ${contentAnalysis.sentiment} (评分: ${contentAnalysis.sentimentScore.toFixed(2)})`);
          console.log(`   摘要: ${contentAnalysis.summary}`);
          console.log(`   关键词: ${contentAnalysis.keywords.join(', ')}`);
        }
      } catch (error) {
        console.error(`❌ 获取视频 ${videoId} 信息失败:`, error.message);
      }
      
      // 每处理3个视频暂停一下，避免API限制
      if (i < videoData.length - 1 && (i + 1) % 3 === 0) {
        console.log('暂停2秒后继续...');
        await sleep(2000);
      }
    }
    
    if (allVideosData.length === 0) {
      console.error('没有成功获取到任何视频数据');
      return;
    }
    
    // 创建CSV写入器
    const csvWriter = createObjectCsvWriter({
      path: outputCsvPath,
      header: Object.keys(allVideosData[0]).map(key => ({
        id: key,
        title: key
      })),
      encoding: 'utf8'
    });
    
    // 写入CSV文件
    await csvWriter.writeRecords(allVideosData);
    
    console.log(`\n✅ OpenAI内容分析完成！`);
    console.log(`📊 成功分析 ${allVideosData.length} 个视频`);
    console.log(`📁 结果已保存到: ${outputCsvPath}`);
    
    // 生成分析报告
    generateOpenAIAnalysisReport(allVideosData);
    
  } catch (error) {
    console.error('处理过程中发生错误:', error);
  }
}

// 生成OpenAI分析报告
function generateOpenAIAnalysisReport(videosData) {
  console.log('\n=== OpenAI内容分析报告 ===');
  
  // 主题分布统计
  const topicStats = {};
  const sentimentStats = { positive: 0, negative: 0, neutral: 0 };
  const contentTypeStats = {};
  const languageStats = {};
  
  videosData.forEach(video => {
    const topic = video['内容主题'] || '其他';
    const sentiment = video['情感倾向'] || 'neutral';
    const contentType = video['内容类型'] || 'other';
    const language = video['语言'] || '未知';
    
    topicStats[topic] = (topicStats[topic] || 0) + 1;
    sentimentStats[sentiment] = (sentimentStats[sentiment] || 0) + 1;
    contentTypeStats[contentType] = (contentTypeStats[contentType] || 0) + 1;
    languageStats[language] = (languageStats[language] || 0) + 1;
  });
  
  console.log('\n📈 主题分布:');
  Object.entries(topicStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([topic, count]) => {
      const percentage = ((count / videosData.length) * 100).toFixed(1);
      console.log(`   ${topic}: ${count}个 (${percentage}%)`);
    });
  
  console.log('\n😊 情感分布:');
  Object.entries(sentimentStats).forEach(([sentiment, count]) => {
    const percentage = ((count / videosData.length) * 100).toFixed(1);
    console.log(`   ${sentiment}: ${count}个 (${percentage}%)`);
  });
  
  console.log('\n📝 内容类型分布:');
  Object.entries(contentTypeStats).forEach(([type, count]) => {
    const percentage = ((count / videosData.length) * 100).toFixed(1);
    console.log(`   ${type}: ${count}个 (${percentage}%)`);
  });
  
  console.log('\n🌍 语言分布:');
  Object.entries(languageStats).forEach(([lang, count]) => {
    const percentage = ((count / videosData.length) * 100).toFixed(1);
    console.log(`   ${lang}: ${count}个 (${percentage}%)`);
  });
  
  // 平均质量评分
  const qualityScores = videosData
    .map(video => parseFloat(video['内容质量评分']?.replace('%', '') || '0'))
    .filter(score => !isNaN(score));
  
  if (qualityScores.length > 0) {
    const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    console.log(`\n⭐ 平均内容质量评分: ${avgQuality.toFixed(1)}%`);
  }
  
  // 平均主题置信度
  const confidenceScores = videosData
    .map(video => parseFloat(video['主题置信度']?.replace('%', '') || '0'))
    .filter(score => !isNaN(score));
  
  if (confidenceScores.length > 0) {
    const avgConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    console.log(`🎯 平均主题置信度: ${avgConfidence.toFixed(1)}%`);
  }
  
  // 平均情感评分
  const sentimentScores = videosData
    .map(video => parseFloat(video['情感评分'] || '0'))
    .filter(score => !isNaN(score));
  
  if (sentimentScores.length > 0) {
    const avgSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
    console.log(`💭 平均情感评分: ${avgSentiment.toFixed(2)}`);
  }
}

// 获取视频详情的函数（重用现有逻辑）
async function getVideoDetails(videoId, durationFilter = null) {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const requestHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.tiktok.com/',
        'Connection': 'keep-alive'
      };

      const url = `https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=${videoId}`;
      
      const response = await axios.get(url, {
        headers: requestHeaders,
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTP错误: ${response.status}`);
      }

      if (!response.data || !response.data.aweme_list || response.data.aweme_list.length === 0) {
        throw new Error('未找到视频数据');
      }
      
      const videoData = response.data.aweme_list[0];
      
      // 进行CapCut检测
      const capCutAnalysis = detectCapCutSource(videoData);
      
      // 应用时长过滤（如果启用）
      if (durationFilter) {
        const actualDuration = videoData.video?.duration;
        const { targetDuration, tolerance } = durationFilter;
        
        if (actualDuration && Math.abs(actualDuration - targetDuration) > tolerance) {
          // 时长不匹配，强制标记为非CapCut
          capCutAnalysis.isCapCut = false;
          capCutAnalysis.confidence = 0;
        }
      }
      
      // 准备CSV数据
      const csvData = {
        // 基本信息
        '视频ID': videoData.aweme_id,
        '描述': videoData.desc,
        '创建时间': formatDate(videoData.create_time),
        '地区': videoData.region || '',
        '语言': videoData.desc_language || '',
        
        // 作者信息
        '作者ID': videoData.author?.uid || '',
        '作者用户名': videoData.author?.unique_id || '',
        '作者昵称': videoData.author?.nickname || '',
        '作者签名': videoData.author?.signature || '',
        '作者认证': formatBoolean(videoData.author?.verified),
        '粉丝数': formatNumber(videoData.author?.follower_count),
        '关注数': formatNumber(videoData.author?.following_count),
        '获赞数': formatNumber(videoData.author?.total_favorited),
        '作品数': formatNumber(videoData.author?.aweme_count),
        
        // 视频信息
        '视频时长': formatNumber(videoData.video?.duration),
        '原始比例': videoData.video?.ratio || '',
        '封面图片': videoData.video?.cover?.url_list ? formatArray(videoData.video.cover.url_list) : '',
        '动态封面': videoData.video?.dynamic_cover?.url_list ? formatArray(videoData.video.dynamic_cover.url_list) : '',
        '播放地址': videoData.video?.play_addr?.url_list ? formatArray(videoData.video.play_addr.url_list) : '',
        '分辨率': `${videoData.video?.width || ''}x${videoData.video?.height || ''}`,
        
        // 音乐信息
        '音乐ID': videoData.music?.id || '',
        '音乐标题': videoData.music?.title || '',
        '音乐作者': videoData.music?.author || '',
        '音乐时长': formatNumber(videoData.music?.duration),
        '音乐链接': videoData.music?.play_url?.url_list ? formatArray(videoData.music.play_url.url_list) : '',
        
        // 统计数据
        '播放量': formatNumber(videoData.statistics?.play_count),
        '点赞数': formatNumber(videoData.statistics?.digg_count),
        '评论数': formatNumber(videoData.statistics?.comment_count),
        '分享数': formatNumber(videoData.statistics?.share_count),
        '收藏数': formatNumber(videoData.statistics?.collect_count),
        
        // 互动设置
        '允许评论': formatBoolean(videoData.comment_permission),
        '允许分享': formatBoolean(videoData.allow_share),
        '允许下载': formatBoolean(videoData.download_permission),
        '允许二创': formatBoolean(videoData.duet_permission),
        '允许合拍': formatBoolean(videoData.stitch_permission),
        
        // 其他信息
        '是否置顶': formatBoolean(videoData.is_top),
        '是否广告': formatBoolean(videoData.is_ads),
        '视频类型': videoData.aweme_type || '',
        '风险等级': videoData.risk_infos?.type || '',
        '位置信息': videoData.location || '',
        
        // CapCut检测信息
        '是否CapCut投稿': capCutAnalysis.isCapCut ? '是' : '否',
        'CapCut置信度': (capCutAnalysis.confidence * 100).toFixed(1) + '%',
        '来源平台代码': videoData.music?.source_platform || '',
        
        // 特效信息
        '特效数量': videoData.effect_stickers ? videoData.effect_stickers.length.toString() : '0',
        '特效列表': videoData.effect_stickers ? videoData.effect_stickers.map(effect => {
          return `${effect.name || ''}(ID:${effect.id || ''})`;
        }).join('|') : '',
        '特效类型': videoData.effect_stickers ? videoData.effect_stickers.map(effect => effect.type || '').join('|') : '',
        
        // 贴纸信息
        '贴纸数量': videoData.stickers ? videoData.stickers.length.toString() : '0',
        '贴纸列表': videoData.stickers ? videoData.stickers.map(sticker => {
          return `${sticker.name || ''}(ID:${sticker.id || ''})`;
        }).join('|') : '',
        
        // 话题标签（从描述中提取）
        '话题标签': extractHashtags(videoData.desc)
      };

      return csvData;
      
    } catch (error) {
      retries++;
      console.error(`第 ${retries} 次尝试失败:`, error.message);
      
      if (retries < MAX_RETRIES) {
        console.log(`等待 ${RETRY_DELAY / 1000} 秒后重试...`);
        await sleep(RETRY_DELAY);
      } else {
        throw error;
      }
    }
  }
}

// 提取话题标签的辅助函数
function extractHashtags(text) {
  if (!text) return '';
  const hashtagRegex = /#([^\s#]+)/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.slice(1)).join('|') : '';
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('使用方法: node batch-video-content-analysis-openai.js <视频ID列表文件路径> <OpenAI_API_Key>');
    console.log('示例: node batch-video-content-analysis-openai.js video-ids.csv sk-xxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('');
    console.log('功能说明:');
    console.log('- 使用OpenAI GPT-3.5进行智能内容分析');
    console.log('- 提供更准确的主题分类、情感分析、关键词提取');
    console.log('- 生成详细的内容摘要和质量评估');
    console.log('- 支持批量处理和分析报告生成');
    console.log('');
    console.log('注意事项:');
    console.log('- 需要有效的OpenAI API密钥');
    console.log('- 会产生API调用费用');
    console.log('- 建议控制批量处理数量以控制成本');
    return;
  }
  
  const inputCsvPath = args[0];
  const openaiApiKey = args[1];
  
  try {
    await processBatchContentAnalysisWithOpenAI(inputCsvPath, openaiApiKey);
  } catch (error) {
    console.error('程序执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  processBatchContentAnalysisWithOpenAI,
  OpenAIContentAnalyzer
}; 