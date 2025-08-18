import axios from 'axios';

export interface ContentAnalysis {
  // 主题分类
  topic: string;
  topicConfidence: number;
  
  // 情感分析
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  
  // 关键词提取
  keywords: string[];
  
  // 内容摘要
  summary: string;
  
  // 语言检测
  language: string;
  
  // 内容类型
  contentType: 'entertainment' | 'educational' | 'commercial' | 'personal' | 'other';
  
  // 目标受众
  targetAudience: string[];
  
  // 内容质量评分
  qualityScore: number;
}

export interface VideoContentData {
  description: string;
  hashtags?: string[];
  comments?: string[];
  author?: string;
  createTime?: number;
}

export class ContentAnalyzer {
  private apiKey?: string;
  private useLocalAnalysis: boolean = true;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * 分析视频内容
   */
  async analyzeContent(videoData: VideoContentData): Promise<ContentAnalysis> {
    if (this.useLocalAnalysis) {
      return this.localContentAnalysis(videoData);
    } else {
      return this.apiContentAnalysis(videoData);
    }
  }

  /**
   * 本地内容分析（基于规则和简单NLP）
   */
  private localContentAnalysis(videoData: VideoContentData): ContentAnalysis {
    const text = this.preprocessText(videoData.description);
    const hashtags = videoData.hashtags || this.extractHashtags(videoData.description);
    
    // 主题分类
    const topicAnalysis = this.classifyTopic(text, hashtags);
    
    // 情感分析
    const sentimentAnalysis = this.analyzeSentiment(text);
    
    // 关键词提取
    const keywords = this.extractKeywords(text, hashtags);
    
    // 内容摘要
    const summary = this.generateSummary(text, topicAnalysis.topic);
    
    // 语言检测
    const language = this.detectLanguage(text);
    
    // 内容类型
    const contentType = this.classifyContentType(text, hashtags);
    
    // 目标受众
    const targetAudience = this.identifyTargetAudience(text, hashtags, topicAnalysis.topic);
    
    // 质量评分
    const qualityScore = this.calculateQualityScore(text, hashtags, videoData);

    return {
      topic: topicAnalysis.topic,
      topicConfidence: topicAnalysis.confidence,
      sentiment: sentimentAnalysis.sentiment,
      sentimentScore: sentimentAnalysis.score,
      keywords,
      summary,
      language,
      contentType,
      targetAudience,
      qualityScore
    };
  }

  /**
   * 预处理文本
   */
  private preprocessText(text: string): string {
    return text
      .replace(/[^\w\s\u4e00-\u9fff#@]/g, ' ') // 保留中文、英文、数字、空格、#、@
      .replace(/\s+/g, ' ') // 合并多个空格
      .trim()
      .toLowerCase();
  }

  /**
   * 提取话题标签
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#([^\s#]+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1)) : [];
  }

  /**
   * 主题分类
   */
  private classifyTopic(text: string, hashtags: string[]): { topic: string; confidence: number } {
    const topicKeywords = {
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

    let bestTopic = '其他';
    let bestScore = 0;

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      let score = 0;
      
      // 检查文本中的关键词
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += 2;
        }
      }
      
      // 检查话题标签
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

    const confidence = Math.min(bestScore / 10, 1.0);
    return { topic: bestTopic, confidence };
  }

  /**
   * 情感分析
   */
  private analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } {
    const positiveWords = ['喜欢', '爱', '好', '棒', '赞', '美', '开心', '快乐', '兴奋', '激动', '感动', '温暖', '可爱', '漂亮', '帅气', '酷', '厉害', '强', '牛', '绝', '神', '完美', '优秀', '精彩', '震撼', '惊艳', 'amazing', 'awesome', 'great', 'good', 'love', 'like', 'wow', 'cool', 'beautiful', 'perfect'];
    const negativeWords = ['讨厌', '恨', '坏', '差', '烂', '恶心', '烦', '生气', '愤怒', '失望', '伤心', '难过', '痛苦', '可怕', '恐怖', '吓人', '丑', '难看', '垃圾', '废物', '没用', '失败', '糟糕', 'hate', 'bad', 'terrible', 'awful', 'disgusting', 'horrible', 'ugly', 'stupid', 'idiot'];

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
    const normalizedScore = Math.max(-1, Math.min(1, totalScore / 5));

    let sentiment: 'positive' | 'negative' | 'neutral';
    if (normalizedScore > 0.2) {
      sentiment = 'positive';
    } else if (normalizedScore < -0.2) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    return { sentiment, score: normalizedScore };
  }

  /**
   * 关键词提取
   */
  private extractKeywords(text: string, hashtags: string[]): string[] {
    const keywords = new Set<string>();
    
    // 添加话题标签作为关键词
    hashtags.forEach(tag => keywords.add(tag));
    
    // 提取文本中的关键词（简单实现）
    const words = text.split(/\s+/);
    const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
    
    words.forEach(word => {
      if (word.length > 1 && !stopWords.has(word) && !word.match(/^[0-9]+$/)) {
        keywords.add(word);
      }
    });

    return Array.from(keywords).slice(0, 10); // 限制关键词数量
  }

  /**
   * 生成内容摘要
   */
  private generateSummary(text: string, topic: string): string {
    if (!text || text.length < 10) {
      return '内容描述较少';
    }

    const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) {
      return `这是一个关于${topic}的视频`;
    }

    // 选择最长的句子作为摘要
    const longestSentence = sentences.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );

    return longestSentence.length > 50 ? longestSentence.substring(0, 50) + '...' : longestSentence;
  }

  /**
   * 语言检测
   */
  private detectLanguage(text: string): string {
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

  /**
   * 内容类型分类
   */
  private classifyContentType(text: string, hashtags: string[]): 'entertainment' | 'educational' | 'commercial' | 'personal' | 'other' {
    const commercialKeywords = ['广告', '推广', '合作', '赞助', '购买', '链接', '优惠', '折扣', 'ad', 'sponsored', 'promotion'];
    const educationalKeywords = ['教程', '教学', '学习', '知识', '科普', '讲解', 'tutorial', 'learn', 'education', 'how to'];
    const entertainmentKeywords = ['搞笑', '娱乐', '有趣', '好玩', 'funny', 'entertainment', 'fun'];
    const personalKeywords = ['日常', '生活', '记录', '分享', 'vlog', 'personal', 'life'];

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

  /**
   * 识别目标受众
   */
  private identifyTargetAudience(text: string, hashtags: string[], topic: string): string[] {
    const audiences = new Set<string>();
    
    // 基于话题推断受众
    const topicAudienceMap: Record<string, string[]> = {
      '美食': ['美食爱好者', '年轻人', '家庭主妇'],
      '舞蹈': ['舞蹈爱好者', '年轻人', '艺术爱好者'],
      '音乐': ['音乐爱好者', '年轻人', '艺术爱好者'],
      '搞笑': ['年轻人', '娱乐爱好者'],
      '教育': ['学生', '学习者', '知识爱好者'],
      '时尚': ['年轻人', '时尚爱好者', '女性'],
      '旅行': ['旅行爱好者', '年轻人', '中产阶级'],
      '运动': ['运动爱好者', '健身人群', '年轻人'],
      '宠物': ['宠物爱好者', '动物爱好者', '家庭'],
      '科技': ['科技爱好者', '年轻人', '专业人士'],
      '生活': ['年轻人', '生活分享者'],
      '游戏': ['游戏玩家', '年轻人', '电竞爱好者'],
      '情感': ['年轻人', '情感咨询者'],
      '商业': ['创业者', '商务人士', '投资者']
    };

    const topicAudience = topicAudienceMap[topic] || ['一般用户'];
    topicAudience.forEach(audience => audiences.add(audience));

    // 基于文本内容推断
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

  /**
   * 计算内容质量评分
   */
  private calculateQualityScore(text: string, hashtags: string[], videoData: VideoContentData): number {
    let score = 0;
    
    // 文本长度评分
    if (text.length > 50) score += 2;
    else if (text.length > 20) score += 1;
    
    // 话题标签数量评分
    if (hashtags.length >= 5) score += 2;
    else if (hashtags.length >= 3) score += 1;
    
    // 内容完整性评分
    if (text.includes('分享') || text.includes('推荐') || text.includes('介绍')) score += 1;
    if (text.includes('教程') || text.includes('教学') || text.includes('讲解')) score += 2;
    
    // 互动性评分
    if (text.includes('评论') || text.includes('点赞') || text.includes('关注')) score += 1;
    
    return Math.min(score / 8, 1.0); // 归一化到0-1
  }

  /**
   * API内容分析（可选，需要外部API）
   */
  private async apiContentAnalysis(videoData: VideoContentData): Promise<ContentAnalysis> {
    // 这里可以集成外部AI API，如OpenAI、百度AI等
    // 暂时返回本地分析结果
    return this.localContentAnalysis(videoData);
  }

  /**
   * 批量分析视频内容
   */
  async analyzeBatchContent(videosData: VideoContentData[]): Promise<ContentAnalysis[]> {
    const results: ContentAnalysis[] = [];
    
    for (const videoData of videosData) {
      try {
        const analysis = await this.analyzeContent(videoData);
        results.push(analysis);
      } catch (error) {
        console.error('内容分析失败:', error);
        // 返回默认分析结果
        results.push({
          topic: '其他',
          topicConfidence: 0,
          sentiment: 'neutral',
          sentimentScore: 0,
          keywords: [],
          summary: '分析失败',
          language: '未知',
          contentType: 'other',
          targetAudience: ['一般用户'],
          qualityScore: 0
        });
      }
    }
    
    return results;
  }
} 