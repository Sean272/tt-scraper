const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// 重用单个视频详情的处理逻辑
const { formatNumber, formatDate, formatBoolean, formatArray, formatCSVField, MAX_RETRIES, RETRY_DELAY, sleep } = require('./show-video-details');
const { detectCapCutSource } = require('./capcut-detector');

// 内容分析器类
class SimpleContentAnalyzer {
  constructor() {
    this.topicKeywords = {
      '美食': ['美食', 'food', 'cooking', 'recipe', '吃', '餐厅', '美食', '料理', '烹饪'],
      '舞蹈': ['舞蹈', 'dance', '跳舞', '舞', 'choreography', '街舞', '现代舞'],
      '音乐': ['音乐', 'music', '唱歌', '歌曲', '歌手', '演唱会', '乐器'],
      '搞笑': ['搞笑', 'funny', '幽默', '笑话', '喜剧', '段子', '梗'],
      '教育': ['教育', 'education', '学习', '知识', '教程', '科普', '教学'],
      '时尚': ['时尚', 'fashion', '穿搭', '服装', '美妆', '化妆', '造型'],
      '旅行': ['旅行', 'travel', '旅游', '景点', '风景', '度假', '游记'],
      '运动': ['运动', 'sport', '健身', '锻炼', '跑步', '瑜伽', '篮球'],
      '宠物': ['宠物', 'pet', '猫', '狗', '动物', '萌宠', '可爱'],
      '科技': ['科技', 'technology', '数码', '手机', '电脑', '编程', 'AI'],
      '生活': ['生活', 'life', '日常', 'vlog', '生活记录', '分享'],
      '游戏': ['游戏', 'game', '电竞', '主播', '直播', '游戏'],
      '情感': ['情感', '爱情', '恋爱', '分手', '感情', 'relationship'],
      '商业': ['商业', 'business', '创业', '赚钱', '投资', '营销', '广告']
    };
  }

  analyzeContent(description, hashtags = []) {
    const text = this.preprocessText(description);
    const extractedHashtags = hashtags.length > 0 ? hashtags : this.extractHashtags(description);
    
    return {
      topic: this.classifyTopic(text, extractedHashtags),
      sentiment: this.analyzeSentiment(text),
      keywords: this.extractKeywords(text, extractedHashtags),
      summary: this.generateSummary(text),
      language: this.detectLanguage(text),
      contentType: this.classifyContentType(text, extractedHashtags),
      targetAudience: this.identifyTargetAudience(text, extractedHashtags),
      qualityScore: this.calculateQualityScore(text, extractedHashtags)
    };
  }

  preprocessText(text) {
    return text
      .replace(/[^\w\s\u4e00-\u9fff#@]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  extractHashtags(text) {
    const hashtagRegex = /#([^\s#]+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1)) : [];
  }

  classifyTopic(text, hashtags) {
    let bestTopic = '其他';
    let bestScore = 0;

    for (const [topic, keywords] of Object.entries(this.topicKeywords)) {
      let score = 0;
      
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += 2;
        }
      }
      
      for (const hashtag of hashtags) {
        for (const keyword of keywords) {
          if (hashtag.includes(keyword)) {
            score += 3;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestTopic = topic;
      }
    }

    return bestTopic;
  }

  analyzeSentiment(text) {
    const positiveWords = ['喜欢', '爱', '好', '棒', '赞', '美', '开心', '快乐', '兴奋', '激动', '感动', '温暖', '可爱', '漂亮', '帅气', '酷', '厉害', '强', '牛', '绝', '神', '完美', '优秀', '精彩', '震撼', '惊艳'];
    const negativeWords = ['讨厌', '恨', '坏', '差', '烂', '恶心', '烦', '生气', '愤怒', '失望', '伤心', '难过', '痛苦', '可怕', '恐怖', '吓人', '丑', '难看', '垃圾', '废物', '没用', '失败', '糟糕'];

    let positiveScore = 0;
    let negativeScore = 0;

    for (const word of positiveWords) {
      if (text.includes(word)) {
        positiveScore += 1;
      }
    }

    for (const word of negativeWords) {
      if (text.includes(word)) {
        negativeScore += 1;
      }
    }

    const totalScore = positiveScore - negativeScore;
    
    if (totalScore > 0) {
      return 'positive';
    } else if (totalScore < 0) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  extractKeywords(text, hashtags) {
    const keywords = new Set(hashtags);
    const words = text.split(/\s+/);
    const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);
    
    words.forEach(word => {
      if (word.length > 1 && !stopWords.has(word) && !word.match(/^[0-9]+$/)) {
        keywords.add(word);
      }
    });

    return Array.from(keywords).slice(0, 10);
  }

  generateSummary(text) {
    if (!text || text.length < 10) {
      return '内容描述较少';
    }

    const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) {
      return '这是一个视频内容';
    }

    const longestSentence = sentences.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );

    return longestSentence.length > 50 ? longestSentence.substring(0, 50) + '...' : longestSentence;
  }

  detectLanguage(text) {
    const chineseRegex = /[\u4e00-\u9fff]/;
    const englishRegex = /[a-zA-Z]/;
    
    const chineseCount = (text.match(chineseRegex) || []).length;
    const englishCount = (text.match(englishRegex) || []).length;
    
    if (chineseCount > englishCount) {
      return '中文';
    } else if (englishCount > chineseCount) {
      return '英文';
    } else {
      return '混合';
    }
  }

  classifyContentType(text, hashtags) {
    const commercialKeywords = ['广告', '推广', '合作', '赞助', '购买', '链接', '优惠', '折扣'];
    const educationalKeywords = ['教程', '教学', '学习', '知识', '科普', '讲解'];
    const entertainmentKeywords = ['搞笑', '娱乐', '有趣', '好玩'];
    const personalKeywords = ['日常', '生活', '记录', '分享', 'vlog'];

    const allText = text + ' ' + hashtags.join(' ');

    for (const keyword of commercialKeywords) {
      if (allText.includes(keyword)) {
        return 'commercial';
      }
    }

    for (const keyword of educationalKeywords) {
      if (allText.includes(keyword)) {
        return 'educational';
      }
    }

    for (const keyword of entertainmentKeywords) {
      if (allText.includes(keyword)) {
        return 'entertainment';
      }
    }

    for (const keyword of personalKeywords) {
      if (allText.includes(keyword)) {
        return 'personal';
      }
    }

    return 'other';
  }

  identifyTargetAudience(text, hashtags) {
    const audiences = new Set(['一般用户']);
    
    if (text.includes('学生') || text.includes('学习')) {
      audiences.add('学生');
    }
    if (text.includes('年轻人') || text.includes('青春')) {
      audiences.add('年轻人');
    }
    if (text.includes('女性') || text.includes('女生')) {
      audiences.add('女性');
    }
    if (text.includes('男性') || text.includes('男生')) {
      audiences.add('男性');
    }

    return Array.from(audiences);
  }

  calculateQualityScore(text, hashtags) {
    let score = 0;
    
    if (text.length > 50) score += 2;
    else if (text.length > 20) score += 1;
    
    if (hashtags.length >= 5) score += 2;
    else if (hashtags.length >= 3) score += 1;
    
    if (text.includes('分享') || text.includes('推荐') || text.includes('介绍')) score += 1;
    if (text.includes('教程') || text.includes('教学') || text.includes('讲解')) score += 2;
    
    return Math.min(score / 8, 1.0);
  }
} 

// 批量处理视频内容分析
async function processBatchContentAnalysis(inputCsvPath) {
  console.log(`开始处理输入文件: ${inputCsvPath}`);
  
  if (!fs.existsSync(inputCsvPath)) {
    console.error(`错误: 输入文件 "${inputCsvPath}" 不存在`);
    return;
  }
  
  // 创建输出目录
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 生成输出文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputCsvPath = path.join(outputDir, `content_analysis_${timestamp}.csv`);
  
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
    
    // 初始化内容分析器
    const contentAnalyzer = new SimpleContentAnalyzer();
    
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
          // 进行内容分析
          const contentAnalysis = contentAnalyzer.analyzeContent(
            videoDetails['描述'] || '',
            videoDetails['话题标签'] ? videoDetails['话题标签'].split('|') : []
          );
          
          // 合并视频详情和内容分析结果
          const enrichedData = {
            ...videoDetails,
            '内容主题': contentAnalysis.topic,
            '情感倾向': contentAnalysis.sentiment,
            '关键词': contentAnalysis.keywords.join('|'),
            '内容摘要': contentAnalysis.summary,
            '语言': contentAnalysis.language,
            '内容类型': contentAnalysis.contentType,
            '目标受众': contentAnalysis.targetAudience.join('|'),
            '内容质量评分': (contentAnalysis.qualityScore * 100).toFixed(1) + '%'
          };
          
          allVideosData.push(enrichedData);
          console.log(`✅ 成功分析视频 ${videoId} 的内容`);
          console.log(`   主题: ${contentAnalysis.topic}`);
          console.log(`   情感: ${contentAnalysis.sentiment}`);
          console.log(`   摘要: ${contentAnalysis.summary}`);
        }
      } catch (error) {
        console.error(`❌ 获取视频 ${videoId} 信息失败:`, error.message);
      }
      
      // 每处理5个视频暂停一下，避免API限制
      if (i < videoData.length - 1 && (i + 1) % 5 === 0) {
        console.log('暂停5秒后继续...');
        await sleep(5000);
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
    
    console.log(`\n✅ 内容分析完成！`);
    console.log(`📊 成功分析 ${allVideosData.length} 个视频`);
    console.log(`📁 结果已保存到: ${outputCsvPath}`);
    
    // 生成分析报告
    generateAnalysisReport(allVideosData);
    
  } catch (error) {
    console.error('处理过程中发生错误:', error);
  }
}

// 生成分析报告
function generateAnalysisReport(videosData) {
  console.log('\n=== 内容分析报告 ===');
  
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
  
  if (args.length === 0) {
    console.log('使用方法: node batch-video-content-analysis.js <视频ID列表文件路径>');
    console.log('示例: node batch-video-content-analysis.js video-ids.csv');
    console.log('');
    console.log('功能说明:');
    console.log('- 批量获取视频详细信息');
    console.log('- 自动进行内容分析（主题分类、情感分析、关键词提取等）');
    console.log('- 生成内容分析报告');
    console.log('- 支持时长过滤模式');
    return;
  }
  
  const inputCsvPath = args[0];
  
  try {
    await processBatchContentAnalysis(inputCsvPath);
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
  processBatchContentAnalysis,
  SimpleContentAnalyzer
}; 