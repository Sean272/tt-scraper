const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createUtf8CsvWriter } = require('./utils/csv-helper');

// 视频内容分析器类
class VideoContentAnalyzer {
  constructor(apiKey, config = {}) {
    this.apiKey = apiKey;
    this.config = {
      model: 'Qwen/Qwen2.5-VL-72B-Instruct', // 默认使用高质量视觉模型
      maxTokens: 1000,
      temperature: 0.3,
      baseURL: 'https://api.siliconflow.cn/v1',
      ...config
    };
    this.baseURL = this.config.baseURL;
  }

  // 将视频文件转换为base64
  async videoToBase64(videoPath) {
    try {
      const videoBuffer = fs.readFileSync(videoPath);
      return videoBuffer.toString('base64');
    } catch (error) {
      console.error('读取视频文件失败:', error);
      return null;
    }
  }

  // 分析视频内容
  async analyzeVideoContent(videoPath, videoInfo = {}) {
    try {
      console.log(`🎬 开始分析视频: ${path.basename(videoPath)}`);
      
      // 将视频转换为base64
      const videoBase64 = await this.videoToBase64(videoPath);
      if (!videoBase64) {
        throw new Error('无法读取视频文件');
      }

      // 构建分析提示
      const prompt = this.buildVideoAnalysisPrompt(videoInfo);
      
      // 调用API进行分析
      const response = await this.callVideoAnalysisAPI(videoBase64, prompt);
      return this.parseVideoAnalysisResponse(response);
      
    } catch (error) {
      console.error('视频内容分析失败:', error);
      return this.getDefaultVideoAnalysis(videoInfo);
    }
  }

  buildVideoAnalysisPrompt(videoInfo) {
    const { description = '', hashtags = [], author = '', createTime = '' } = videoInfo;
    
    return `请分析以下TikTok视频的内容，包括视觉元素、动作、场景、人物等。

视频信息：
- 描述：${description || '无描述'}
- 话题标签：${hashtags.join(', ') || '无标签'}
- 作者：${author || '未知'}
- 发布时间：${createTime ? new Date(createTime * 1000).toLocaleString() : '未知'}

请仔细观察视频内容，并按照以下JSON格式返回分析结果：

{
  "visualElements": ["视觉元素1", "视觉元素2", "视觉元素3"],
  "actions": ["动作1", "动作2", "动作3"],
  "scenes": ["场景1", "场景2", "场景3"],
  "people": ["人物特征1", "人物特征2"],
  "objects": ["物体1", "物体2", "物体3"],
  "topic": "主题分类（美食/舞蹈/音乐/搞笑/教育/时尚/旅行/运动/宠物/科技/生活/游戏/情感/商业/其他）",
  "topicConfidence": 0.95,
  "sentiment": "情感倾向（positive/negative/neutral）",
  "sentimentScore": 0.8,
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "summary": "内容摘要（100字以内，包含视觉描述）",
  "contentSummary": "基于内容理解的视频总结（不超过100字，简洁明了地概括视频的核心内容和亮点）",
  "language": "语言类型（中文/英文/混合）",
  "contentType": "内容类型（entertainment/educational/commercial/personal/other）",
  "targetAudience": ["目标受众1", "目标受众2"],
  "qualityScore": 0.85,
  "visualQuality": "视觉质量评估（high/medium/low）",
  "engagementPotential": "互动潜力评估（high/medium/low）"
}

分析要求：
1. 仔细观察视频中的视觉元素、动作、场景、人物等
2. 结合视频描述和话题标签进行综合分析
3. 主题分类要基于视频内容和文本信息
4. 情感分析要考虑视觉表现和文本内容
5. 内容摘要要包含视觉描述和主要内容
6. 内容总结要基于深度内容理解，简洁概括视频核心亮点
7. 评估视频的视觉质量和互动潜力

请确保返回的是有效的JSON格式。`;
  }

  async callVideoAnalysisAPI(videoBase64, prompt) {
    // 检查模型是否支持视觉分析
    const isVisionModel = this.config.model.includes('VL') || this.config.model.includes('vision');
    
    if (isVisionModel) {
      console.log('🎬 使用视觉模型进行视频分析...');
      
      try {
        // 尝试使用视频分析
        const response = await axios.post(
          `${this.baseURL}/chat/completions`,
          {
            model: this.config.model,
            messages: [
              {
                role: 'system',
                content: '你是一个专业的视频内容分析专家，擅长分析短视频的视觉内容、主题分类、情感分析等。请严格按照要求的JSON格式返回分析结果。'
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: prompt
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:video/mp4;base64,${videoBase64}`
                    }
                  }
                ]
              }
            ],
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature
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
      } catch (error) {
        console.log('⚠️  视频分析失败，尝试图片分析模式...');
        
        // 如果视频分析失败，尝试使用图片分析
        return await this.callImageAnalysisAPI(videoBase64, prompt);
      }
    } else {
      console.log('⚠️  当前模型不支持视频分析，使用文本分析模式');
      return await this.callTextAnalysisAPI(prompt);
    }
  }

  async callImageAnalysisAPI(videoBase64, prompt) {
    try {
      // 将视频转换为图片帧进行分析
      console.log('🖼️  使用图片分析模式...');
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的视频内容分析专家，擅长分析短视频的视觉内容、主题分类、情感分析等。请严格按照要求的JSON格式返回分析结果。'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${videoBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
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
    } catch (error) {
      console.log('⚠️  图片分析也失败，使用文本分析模式');
      return await this.callTextAnalysisAPI(prompt);
    }
  }

  async callTextAnalysisAPI(prompt) {
    console.log('📝 使用文本分析模式...');
    
    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的视频内容分析专家，擅长分析短视频的视觉内容、主题分类、情感分析等。请严格按照要求的JSON格式返回分析结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
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

  parseVideoAnalysisResponse(response) {
    try {
      // 清理响应文本，移除Markdown代码块标记
      let cleanedResponse = response.trim();
      
      // 移除开头的 ```json 或 ``` 标记
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.substring(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.substring(3);
      }
      
      // 移除结尾的 ``` 标记
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
      }
      
      // 清理后的响应
      cleanedResponse = cleanedResponse.trim();
      
      // 尝试解析JSON响应
      const data = JSON.parse(cleanedResponse);
      
      return {
        visualElements: Array.isArray(data.visualElements) ? data.visualElements : [],
        actions: Array.isArray(data.actions) ? data.actions : [],
        scenes: Array.isArray(data.scenes) ? data.scenes : [],
        people: Array.isArray(data.people) ? data.people : [],
        objects: Array.isArray(data.objects) ? data.objects : [],
        topic: data.topic || '其他',
        topicConfidence: data.topicConfidence || 0,
        sentiment: data.sentiment || 'neutral',
        sentimentScore: data.sentimentScore || 0,
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        summary: data.summary || '视频分析失败',
        contentSummary: data.contentSummary || '基于内容理解的视频总结生成失败',
        language: data.language || '未知',
        contentType: data.contentType || 'other',
        targetAudience: Array.isArray(data.targetAudience) ? data.targetAudience : ['一般用户'],
        qualityScore: data.qualityScore || 0,
        visualQuality: data.visualQuality || 'medium',
        engagementPotential: data.engagementPotential || 'medium'
      };
    } catch (error) {
      console.error('解析视频分析响应失败，尝试解析文本响应:', error);
      
      // 如果JSON解析失败，尝试从文本中提取信息
      return this.parseTextResponse(response);
    }
  }

  parseTextResponse(textResponse) {
    try {
      console.log('📝 原始响应文本:', textResponse);
      
      // 清理响应文本，移除Markdown代码块标记
      let cleanedResponse = textResponse.trim();
      
      // 移除开头的 ```json 或 ``` 标记
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.substring(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.substring(3);
      }
      
      // 移除结尾的 ``` 标记
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
      }
      
      // 清理后的响应
      cleanedResponse = cleanedResponse.trim();
      
      // 尝试从文本中提取JSON部分
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        return {
          visualElements: Array.isArray(jsonData.visualElements) ? jsonData.visualElements : [],
          actions: Array.isArray(jsonData.actions) ? jsonData.actions : [],
          scenes: Array.isArray(jsonData.scenes) ? jsonData.scenes : [],
          people: Array.isArray(jsonData.people) ? jsonData.people : [],
          objects: Array.isArray(jsonData.objects) ? jsonData.objects : [],
          topic: jsonData.topic || '其他',
          topicConfidence: jsonData.topicConfidence || 0,
          sentiment: jsonData.sentiment || 'neutral',
          sentimentScore: jsonData.sentimentScore || 0,
          keywords: Array.isArray(jsonData.keywords) ? jsonData.keywords : [],
          summary: jsonData.summary || '视频分析失败',
          contentSummary: jsonData.contentSummary || '基于内容理解的视频总结生成失败',
          language: jsonData.language || '未知',
          contentType: jsonData.contentType || 'other',
          targetAudience: Array.isArray(jsonData.targetAudience) ? jsonData.targetAudience : ['一般用户'],
          qualityScore: jsonData.qualityScore || 0,
          visualQuality: jsonData.visualQuality || 'medium',
          engagementPotential: jsonData.engagementPotential || 'medium'
        };
      }
      
      // 如果无法提取JSON，返回基于文本的简单分析
      return {
        visualElements: [],
        actions: [],
        scenes: [],
        people: [],
        objects: [],
        topic: '其他',
        topicConfidence: 0,
        sentiment: 'neutral',
        sentimentScore: 0,
        keywords: [],
        summary: cleanedResponse.substring(0, 200) || '视频分析失败',
        contentSummary: '基于文本响应的简单分析',
        language: '未知',
        contentType: 'other',
        targetAudience: ['一般用户'],
        qualityScore: 0,
        visualQuality: 'medium',
        engagementPotential: 'medium'
      };
    } catch (error) {
      console.error('解析文本响应失败:', error);
      return this.getDefaultVideoAnalysis({});
    }
  }

  getDefaultVideoAnalysis(videoInfo) {
    return {
      visualElements: [],
      actions: [],
      scenes: [],
      people: [],
      objects: [],
      topic: '其他',
      topicConfidence: 0,
      sentiment: 'neutral',
      sentimentScore: 0,
      keywords: [],
      summary: '视频分析失败，使用默认分析',
      contentSummary: '基于内容理解的视频总结生成失败',
      language: '未知',
      contentType: 'other',
      targetAudience: ['一般用户'],
      qualityScore: 0,
      visualQuality: 'medium',
      engagementPotential: 'medium'
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
      console.error('视频分析API连接测试失败:', error);
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
      return [
        'Qwen/Qwen2.5-VL-72B-Instruct',
        'Pro/Qwen/Qwen2.5-VL-7B-Instruct',
        'Qwen/Qwen2.5-VL-32B-Instruct',
        'deepseek-ai/deepseek-vl2',
        'Qwen/Qwen2.5-VL-7B-Instruct'
      ];
    }
  }
}

// 批量处理视频内容分析
async function processBatchVideoAnalysis(downloadsDir, apiKey, outputPath = null, config = {}) {
  console.log('🚀 开始批量视频内容分析...');
  
  // 创建分析器实例
  const analyzer = new VideoContentAnalyzer(apiKey, config);
  
  // 显示当前使用的模型
  console.log(`🤖 使用模型: ${analyzer.config.model}`);
  
  // 测试API连接
  console.log('🔗 测试视频分析API连接...');
  const connectionTest = await analyzer.testConnection();
  if (!connectionTest) {
    console.error('❌ 视频分析API连接失败，请检查API密钥和网络连接');
    return;
  }
  console.log('✅ 视频分析API连接成功');
  
  // 获取可用模型
  console.log('📋 获取可用模型列表...');
  const availableModels = await analyzer.getAvailableModels();
  console.log('可用模型:', availableModels);
  
  // 扫描下载目录
  const videoFiles = [];
  try {
    const files = fs.readdirSync(downloadsDir);
    for (const file of files) {
      if (file.endsWith('.mp4')) {
        const videoPath = path.join(downloadsDir, file);
        const videoId = path.parse(file).name; // 文件名就是视频ID
        videoFiles.push({ videoPath, videoId });
      }
    }
  } catch (error) {
    console.error('❌ 读取下载目录失败:', error);
    return;
  }
  
  console.log(`📊 找到 ${videoFiles.length} 个视频文件`);
  
  if (videoFiles.length === 0) {
    console.error('❌ 未找到视频文件');
    return;
  }
  
  // 创建输出目录
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 创建CSV写入器
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = outputPath || path.join(outputDir, `video_content_analysis_${timestamp}.csv`);
  
  const csvWriter = createUtf8CsvWriter(csvPath, [
    { id: 'video_id', title: '视频ID' },
    { id: 'video_path', title: '视频路径' },
    { id: 'visual_elements', title: '视觉元素' },
    { id: 'actions', title: '动作' },
    { id: 'scenes', title: '场景' },
    { id: 'people', title: '人物' },
    { id: 'objects', title: '物体' },
    { id: 'topic', title: '内容主题' },
    { id: 'topic_confidence', title: '主题置信度' },
    { id: 'sentiment', title: '情感倾向' },
    { id: 'sentiment_score', title: '情感评分' },
    { id: 'keywords', title: '关键词' },
    { id: 'summary', title: '内容摘要' },
    { id: 'content_summary', title: '内容总结' },
    { id: 'language', title: '语言' },
    { id: 'content_type', title: '内容类型' },
    { id: 'target_audience', title: '目标受众' },
    { id: 'quality_score', title: '内容质量评分' },
    { id: 'visual_quality', title: '视觉质量' },
    { id: 'engagement_potential', title: '互动潜力' },
    { id: 'analysis_method', title: '分析方式' }
  ]);
  
  const analysisResults = [];
  let successCount = 0;
  let errorCount = 0;
  
  console.log('🔄 开始批量分析视频内容...');
  
  for (let i = 0; i < videoFiles.length; i++) {
    const { videoPath, videoId } = videoFiles[i];
    console.log(`\n📹 处理第 ${i + 1}/${videoFiles.length} 个视频: ${videoId}`);
    
    try {
      // 分析视频内容
      const analysisResult = await analyzer.analyzeVideoContent(videoPath, {
        videoId,
        description: '', // 可以从其他数据源获取
        hashtags: [],
        author: '',
        createTime: Date.now() / 1000
      });
      
      // 合并数据
      const combinedData = {
        video_id: videoId,
        video_path: videoPath,
        visual_elements: analysisResult.visualElements.join('|'),
        actions: analysisResult.actions.join('|'),
        scenes: analysisResult.scenes.join('|'),
        people: analysisResult.people.join('|'),
        objects: analysisResult.objects.join('|'),
        topic: analysisResult.topic,
        topic_confidence: analysisResult.topicConfidence,
        sentiment: analysisResult.sentiment,
        sentiment_score: analysisResult.sentimentScore,
        keywords: analysisResult.keywords.join('|'),
        summary: analysisResult.summary,
        content_summary: analysisResult.contentSummary,
        language: analysisResult.language,
        content_type: analysisResult.contentType,
        target_audience: analysisResult.targetAudience.join('|'),
        quality_score: analysisResult.qualityScore,
        visual_quality: analysisResult.visualQuality,
        engagement_potential: analysisResult.engagementPotential,
        analysis_method: '视频内容分析API'
      };
      
      analysisResults.push(combinedData);
      successCount++;
      
      console.log(`✅ 视频 ${videoId} 分析完成`);
      console.log(`   主题: ${analysisResult.topic} (置信度: ${analysisResult.topicConfidence})`);
      console.log(`   情感: ${analysisResult.sentiment} (评分: ${analysisResult.sentimentScore})`);
      console.log(`   视觉质量: ${analysisResult.visualQuality}`);
      console.log(`   互动潜力: ${analysisResult.engagementPotential}`);
      
      // 写入CSV
      await csvWriter.writeRecords([combinedData]);
      
      // 添加延迟避免API限制
      if (i < videoFiles.length - 1) {
        console.log(`⏳ 等待 3 秒后处理下一个视频...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`❌ 处理视频 ${videoId} 时发生错误:`, error.message);
      errorCount++;
    }
  }
  
  // 生成分析报告
  console.log('\n📈 生成分析报告...');
  const report = generateVideoAnalysisReport(analysisResults);
  
  // 保存报告
  const reportPath = path.join(outputDir, `video_analysis_report_${timestamp}.txt`);
  fs.writeFileSync(reportPath, report);
  
  console.log('\n🎉 批量视频内容分析完成！');
  console.log(`📊 统计信息:`);
  console.log(`   - 总视频数: ${videoFiles.length}`);
  console.log(`   - 成功分析: ${successCount}`);
  console.log(`   - 分析失败: ${errorCount}`);
  console.log(`   - 成功率: ${((successCount / videoFiles.length) * 100).toFixed(1)}%`);
  console.log(`\n📁 输出文件:`);
  console.log(`   - 数据文件: ${csvPath}`);
  console.log(`   - 分析报告: ${reportPath}`);
  
  return {
    totalVideos: videoFiles.length,
    successCount,
    errorCount,
    csvPath,
    reportPath,
    analysisResults
  };
}

// 生成视频分析报告
function generateVideoAnalysisReport(analysisResults) {
  if (analysisResults.length === 0) {
    return '没有可分析的数据';
  }
  
  const report = [];
  report.push('='.repeat(60));
  report.push('视频内容分析报告');
  report.push('='.repeat(60));
  report.push(`生成时间: ${new Date().toLocaleString()}`);
  report.push(`分析视频数量: ${analysisResults.length}`);
  report.push('');
  
  // 主题分布统计
  const topicStats = {};
  const sentimentStats = { positive: 0, negative: 0, neutral: 0 };
  const contentTypeStats = {};
  const visualQualityStats = { high: 0, medium: 0, low: 0 };
  const engagementStats = { high: 0, medium: 0, low: 0 };
  
  analysisResults.forEach(result => {
    // 主题统计
    const topic = result.topic || '其他';
    topicStats[topic] = (topicStats[topic] || 0) + 1;
    
    // 情感统计
    const sentiment = result.sentiment || 'neutral';
    sentimentStats[sentiment] = (sentimentStats[sentiment] || 0) + 1;
    
    // 内容类型统计
    const contentType = result.content_type || 'other';
    contentTypeStats[contentType] = (contentTypeStats[contentType] || 0) + 1;
    
    // 视觉质量统计
    const visualQuality = result.visual_quality || 'medium';
    visualQualityStats[visualQuality] = (visualQualityStats[visualQuality] || 0) + 1;
    
    // 互动潜力统计
    const engagement = result.engagement_potential || 'medium';
    engagementStats[engagement] = (engagementStats[engagement] || 0) + 1;
  });
  
  // 主题分布
  report.push('📊 主题分布:');
  report.push('-'.repeat(30));
  Object.entries(topicStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([topic, count]) => {
      const percentage = ((count / analysisResults.length) * 100).toFixed(1);
      report.push(`${topic}: ${count} (${percentage}%)`);
    });
  report.push('');
  
  // 情感分布
  report.push('😊 情感分布:');
  report.push('-'.repeat(30));
  Object.entries(sentimentStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([sentiment, count]) => {
      const percentage = ((count / analysisResults.length) * 100).toFixed(1);
      report.push(`${sentiment}: ${count} (${percentage}%)`);
    });
  report.push('');
  
  // 视觉质量分布
  report.push('🎬 视觉质量分布:');
  report.push('-'.repeat(30));
  Object.entries(visualQualityStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([quality, count]) => {
      const percentage = ((count / analysisResults.length) * 100).toFixed(1);
      report.push(`${quality}: ${count} (${percentage}%)`);
    });
  report.push('');
  
  // 互动潜力分布
  report.push('📈 互动潜力分布:');
  report.push('-'.repeat(30));
  Object.entries(engagementStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([potential, count]) => {
      const percentage = ((count / analysisResults.length) * 100).toFixed(1);
      report.push(`${potential}: ${count} (${percentage}%)`);
    });
  report.push('');
  
  // 热门视觉元素
  const visualElementStats = {};
  analysisResults.forEach(result => {
    const elements = result.visual_elements ? result.visual_elements.split('|') : [];
    elements.forEach(element => {
      if (element.trim()) {
        visualElementStats[element.trim()] = (visualElementStats[element.trim()] || 0) + 1;
      }
    });
  });
  
  report.push('🎨 热门视觉元素 (出现次数):');
  report.push('-'.repeat(30));
  Object.entries(visualElementStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([element, count]) => {
      report.push(`${element}: ${count}次`);
    });
  report.push('');
  
  report.push('='.repeat(60));
  report.push('报告结束');
  report.push('='.repeat(60));
  
  return report.join('\n');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('使用方法: node video-content-analyzer.js <下载目录路径> <API密钥> [模型名称] [输出文件路径]');
    console.log('');
    console.log('支持的模型:');
    console.log('  Qwen/Qwen2.5-VL-72B-Instruct  (推荐，最高质量)');
    console.log('  Pro/Qwen/Qwen2.5-VL-7B-Instruct (快速响应)');
    console.log('');
    console.log('示例:');
    console.log('  node video-content-analyzer.js examples/downloads sk-xxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('  node video-content-analyzer.js examples/downloads sk-xxxxxxxxxxxxxxxxxxxxxxxx Qwen/Qwen2.5-VL-72B-Instruct');
    console.log('  node video-content-analyzer.js examples/downloads sk-xxxxxxxxxxxxxxxxxxxxxxxx Pro/Qwen/Qwen2.5-VL-7B-Instruct output.csv');
    process.exit(1);
  }
  
  const [downloadsDir, apiKey, modelName, outputPath] = args;
  
  // 检查目录是否存在
  if (!fs.existsSync(downloadsDir)) {
    console.error(`❌ 下载目录不存在: ${downloadsDir}`);
    process.exit(1);
  }
  
  // 检查API密钥
  if (!apiKey || apiKey.length < 10) {
    console.error('❌ 请提供有效的API密钥');
    process.exit(1);
  }
  
  try {
    // 如果提供了模型名称，使用指定模型
    const config = modelName ? { model: modelName } : {};
    await processBatchVideoAnalysis(downloadsDir, apiKey, outputPath, config);
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
  VideoContentAnalyzer,
  processBatchVideoAnalysis,
  generateVideoAnalysisReport
}; 