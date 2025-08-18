import axios from 'axios';
import { ContentAnalysis, VideoContentData } from './ContentAnalyzer';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class OpenAIContentAnalyzer {
  private config: OpenAIConfig;
  private baseURL = 'https://api.openai.com/v1';

  constructor(config: OpenAIConfig) {
    this.config = {
      model: 'gpt-3.5-turbo',
      maxTokens: 1000,
      temperature: 0.3,
      ...config
    };
  }

  /**
   * 使用OpenAI API分析视频内容
   */
  async analyzeContent(videoData: VideoContentData): Promise<ContentAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(videoData);
      const response = await this.callOpenAI(prompt);
      return this.parseOpenAIResponse(response);
    } catch (error) {
      console.error('OpenAI API调用失败:', error);
      // 返回默认分析结果
      return this.getDefaultAnalysis(videoData);
    }
  }

  /**
   * 构建分析提示词
   */
  private buildAnalysisPrompt(videoData: VideoContentData): string {
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

  /**
   * 调用OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
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
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * 解析OpenAI响应
   */
  private parseOpenAIResponse(response: string): ContentAnalysis {
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

  /**
   * 获取默认分析结果
   */
  private getDefaultAnalysis(videoData: VideoContentData): ContentAnalysis {
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

  /**
   * 批量分析视频内容
   */
  async analyzeBatchContent(videosData: VideoContentData[]): Promise<ContentAnalysis[]> {
    const results: ContentAnalysis[] = [];
    
    for (let i = 0; i < videosData.length; i++) {
      const videoData = videosData[i];
      console.log(`正在使用OpenAI分析第 ${i + 1}/${videosData.length} 个视频...`);
      
      try {
        const analysis = await this.analyzeContent(videoData);
        results.push(analysis);
        
        // 添加延迟避免API限制
        if (i < videosData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`分析视频失败:`, error);
        results.push(this.getDefaultAnalysis(videoData));
      }
    }
    
    return results;
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<boolean> {
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
            'Authorization': `Bearer ${this.config.apiKey}`,
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