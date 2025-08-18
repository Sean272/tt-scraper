const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createUtf8CsvWriter } = require('./utils/csv-helper');

// 视频帧分析器类
class VideoFrameAnalyzer {
  constructor(apiKey, config = {}) {
    this.apiKey = apiKey;
    this.config = {
      model: 'deepseek-ai/deepseek-vl2', // 使用支持图片的模型
      maxTokens: 1000,
      temperature: 0.3,
      baseURL: 'https://api.siliconflow.cn/v1',
      frameInterval: 2, // 每2秒提取一帧
      maxFrames: 5, // 最多分析5帧
      ...config
    };
    this.baseURL = this.config.baseURL;
  }

  // 使用ffmpeg提取视频帧
  async extractVideoFrames(videoPath, outputDir) {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
      // 创建输出目录
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // 获取视频时长
      const { stdout: durationOutput } = await execAsync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`
      );
      const duration = parseFloat(durationOutput.trim());
      
      // 计算提取帧的时间点
      const frameTimes = [];
      const interval = Math.max(1, Math.floor(duration / this.config.maxFrames));
      
      for (let i = 0; i < this.config.maxFrames; i++) {
        const time = Math.min(i * interval, duration - 1);
        frameTimes.push(time);
      }
      
      console.log(`📹 视频时长: ${duration}秒，将提取 ${frameTimes.length} 帧`);
      
      // 提取帧
      const framePaths = [];
      for (let i = 0; i < frameTimes.length; i++) {
        const time = frameTimes[i];
        const framePath = path.join(outputDir, `frame_${i}.jpg`);
        
        await execAsync(
          `ffmpeg -ss ${time} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}" -y`
        );
        
        if (fs.existsSync(framePath)) {
          framePaths.push(framePath);
          console.log(`✅ 提取帧 ${i + 1}/${frameTimes.length}: ${time}s`);
        }
      }
      
      return framePaths;
    } catch (error) {
      console.error('提取视频帧失败:', error);
      return [];
    }
  }

  // 将图片转换为base64
  async imageToBase64(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString('base64');
    } catch (error) {
      console.error('读取图片文件失败:', error);
      return null;
    }
  }

  // 分析单个图片帧
  async analyzeFrame(imagePath, frameIndex, totalFrames, videoInfo = {}) {
    try {
      console.log(`🖼️  分析帧 ${frameIndex + 1}/${totalFrames}: ${path.basename(imagePath)}`);
      
      const imageBase64 = await this.imageToBase64(imagePath);
      if (!imageBase64) {
        throw new Error('无法读取图片文件');
      }

      const prompt = this.buildFrameAnalysisPrompt(frameIndex, totalFrames, videoInfo);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的视频内容分析专家，擅长分析视频帧的视觉内容。请严格按照要求的JSON格式返回分析结果。'
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
                    url: `data:image/jpeg;base64,${imageBase64}`
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

      return this.parseFrameAnalysisResponse(response.data.choices[0].message.content);
      
    } catch (error) {
      console.error('帧分析失败:', error);
      return this.getDefaultFrameAnalysis(frameIndex, totalFrames);
    }
  }

  buildFrameAnalysisPrompt(frameIndex, totalFrames, videoInfo) {
    const { description = '', hashtags = [], author = '', createTime = '' } = videoInfo;
    
    return `请分析这个视频帧的内容，这是第 ${frameIndex + 1}/${totalFrames} 帧。

视频信息：
- 描述：${description || '无描述'}
- 话题标签：${hashtags.join(', ') || '无标签'}
- 作者：${author || '未知'}
- 发布时间：${createTime ? new Date(createTime * 1000).toLocaleString() : '未知'}

请仔细观察这个帧的内容，并按照以下JSON格式返回分析结果：

{
  "visualElements": ["视觉元素1", "视觉元素2", "视觉元素3"],
  "actions": ["动作1", "动作2", "动作3"],
  "scenes": ["场景1", "场景2", "场景3"],
  "people": ["人物特征1", "人物特征2"],
  "objects": ["物体1", "物体2", "物体3"],
  "frameQuality": "帧质量评估（high/medium/low）",
  "frameDescription": "这个帧的详细描述（50字以内）",
  "keyElements": ["关键元素1", "关键元素2", "关键元素3"],
  "colorScheme": "色彩方案描述",
  "composition": "构图分析"
}

分析要求：
1. 仔细观察帧中的视觉元素、动作、场景、人物等
2. 结合视频描述和话题标签进行综合分析
3. 评估帧的质量和清晰度
4. 识别关键视觉元素
5. 分析色彩和构图

请确保返回的是有效的JSON格式。`;
  }

  parseFrameAnalysisResponse(response) {
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
      
      const data = JSON.parse(cleanedResponse);
      
      return {
        visualElements: Array.isArray(data.visualElements) ? data.visualElements : [],
        actions: Array.isArray(data.actions) ? data.actions : [],
        scenes: Array.isArray(data.scenes) ? data.scenes : [],
        people: Array.isArray(data.people) ? data.people : [],
        objects: Array.isArray(data.objects) ? data.objects : [],
        frameQuality: data.frameQuality || 'medium',
        frameDescription: data.frameDescription || '帧分析失败',
        keyElements: Array.isArray(data.keyElements) ? data.keyElements : [],
        colorScheme: data.colorScheme || '未知',
        composition: data.composition || '未知'
      };
    } catch (error) {
      console.error('解析帧分析响应失败，尝试解析文本响应:', error);
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
          frameQuality: jsonData.frameQuality || 'medium',
          frameDescription: jsonData.frameDescription || '帧分析失败',
          keyElements: Array.isArray(jsonData.keyElements) ? jsonData.keyElements : [],
          colorScheme: jsonData.colorScheme || '未知',
          composition: jsonData.composition || '未知'
        };
      }
      
      // 如果无法提取JSON，返回基于文本的简单分析
      return {
        visualElements: [],
        actions: [],
        scenes: [],
        people: [],
        objects: [],
        frameQuality: 'medium',
        frameDescription: cleanedResponse.substring(0, 200) || '帧分析失败',
        keyElements: [],
        colorScheme: '未知',
        composition: '未知'
      };
    } catch (error) {
      console.error('解析文本响应失败:', error);
      return this.getDefaultFrameAnalysis(0, 1);
    }
  }

  getDefaultFrameAnalysis(frameIndex, totalFrames) {
    return {
      visualElements: [],
      actions: [],
      scenes: [],
      people: [],
      objects: [],
      frameQuality: 'medium',
      frameDescription: `第${frameIndex + 1}帧分析失败`,
      keyElements: [],
      colorScheme: '未知',
      composition: '未知'
    };
  }

  // 合并多个帧的分析结果
  mergeFrameAnalyses(frameAnalyses) {
    const merged = {
      visualElements: [],
      actions: [],
      scenes: [],
      people: [],
      objects: [],
      frameQuality: 'medium',
      frameDescriptions: [],
      keyElements: [],
      colorSchemes: [],
      compositions: []
    };

    frameAnalyses.forEach((analysis, index) => {
      // 合并数组字段
      merged.visualElements.push(...analysis.visualElements);
      merged.actions.push(...analysis.actions);
      merged.scenes.push(...analysis.scenes);
      merged.people.push(...analysis.people);
      merged.objects.push(...analysis.objects);
      merged.keyElements.push(...analysis.keyElements);
      
      // 收集描述性字段
      merged.frameDescriptions.push(analysis.frameDescription);
      merged.colorSchemes.push(analysis.colorScheme);
      merged.compositions.push(analysis.composition);
    });

    // 去重
    merged.visualElements = [...new Set(merged.visualElements)];
    merged.actions = [...new Set(merged.actions)];
    merged.scenes = [...new Set(merged.scenes)];
    merged.people = [...new Set(merged.people)];
    merged.objects = [...new Set(merged.objects)];
    merged.keyElements = [...new Set(merged.keyElements)];

    // 生成综合描述
    merged.frameQuality = this.calculateAverageQuality(frameAnalyses);
    merged.contentSummary = this.generateContentSummary(merged);

    return merged;
  }

  calculateAverageQuality(frameAnalyses) {
    const qualityScores = {
      'high': 3,
      'medium': 2,
      'low': 1
    };
    
    const totalScore = frameAnalyses.reduce((sum, analysis) => {
      return sum + (qualityScores[analysis.frameQuality] || 2);
    }, 0);
    
    const averageScore = totalScore / frameAnalyses.length;
    
    if (averageScore >= 2.5) return 'high';
    if (averageScore >= 1.5) return 'medium';
    return 'low';
  }

  generateContentSummary(merged) {
    const elements = [
      ...merged.visualElements.slice(0, 3),
      ...merged.actions.slice(0, 2),
      ...merged.scenes.slice(0, 2)
    ];
    
    return `视频包含${elements.join('、')}等元素，整体质量${merged.frameQuality === 'high' ? '较高' : merged.frameQuality === 'medium' ? '中等' : '较低'}。`;
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
      console.error('视频帧分析API连接测试失败:', error);
      return false;
    }
  }
}

// 批量处理视频帧分析
async function processBatchVideoFrameAnalysis(downloadsDir, apiKey, outputPath = null, config = {}) {
  console.log('🚀 开始批量视频帧分析...');
  
  // 创建分析器实例
  const analyzer = new VideoFrameAnalyzer(apiKey, config);
  
  // 显示当前使用的模型
  console.log(`🤖 使用模型: ${analyzer.config.model}`);
  
  // 测试API连接
  console.log('🔗 测试视频帧分析API连接...');
  const connectionTest = await analyzer.testConnection();
  if (!connectionTest) {
    console.error('❌ 视频帧分析API连接失败，请检查API密钥和网络连接');
    return;
  }
  console.log('✅ 视频帧分析API连接成功');
  
  // 扫描下载目录
  const videoFiles = [];
  try {
    const files = fs.readdirSync(downloadsDir);
    for (const file of files) {
      if (file.endsWith('.mp4')) {
        const videoPath = path.join(downloadsDir, file);
        const videoId = path.parse(file).name;
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
  const csvPath = outputPath || path.join(outputDir, `video_frame_analysis_${timestamp}.csv`);
  
  const csvWriter = createUtf8CsvWriter(csvPath, [
    { id: 'video_id', title: '视频ID' },
    { id: 'video_path', title: '视频路径' },
    { id: 'visual_elements', title: '视觉元素' },
    { id: 'actions', title: '动作' },
    { id: 'scenes', title: '场景' },
    { id: 'people', title: '人物' },
    { id: 'objects', title: '物体' },
    { id: 'frame_quality', title: '帧质量' },
    { id: 'frame_descriptions', title: '帧描述' },
    { id: 'key_elements', title: '关键元素' },
    { id: 'color_schemes', title: '色彩方案' },
    { id: 'compositions', title: '构图分析' },
    { id: 'content_summary', title: '内容总结' },
    { id: 'analysis_method', title: '分析方式' }
  ]);
  
  const analysisResults = [];
  let successCount = 0;
  let errorCount = 0;
  
  console.log('🔄 开始批量分析视频帧...');
  
  for (let i = 0; i < videoFiles.length; i++) {
    const { videoPath, videoId } = videoFiles[i];
    console.log(`\n📹 处理第 ${i + 1}/${videoFiles.length} 个视频: ${videoId}`);
    
    try {
      // 创建临时帧目录
      const framesDir = path.join(__dirname, 'temp_frames', videoId);
      if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
      }
      
      // 提取视频帧
      console.log('🎬 提取视频帧...');
      const framePaths = await analyzer.extractVideoFrames(videoPath, framesDir);
      
      if (framePaths.length === 0) {
        console.log('⚠️  无法提取视频帧，跳过此视频');
        continue;
      }
      
      // 分析每个帧
      console.log(`🖼️  分析 ${framePaths.length} 个帧...`);
      const frameAnalyses = [];
      
      for (let j = 0; j < framePaths.length; j++) {
        const frameAnalysis = await analyzer.analyzeFrame(
          framePaths[j], 
          j, 
          framePaths.length,
          {
            videoId,
            description: '',
            hashtags: [],
            author: '',
            createTime: Date.now() / 1000
          }
        );
        frameAnalyses.push(frameAnalysis);
      }
      
      // 合并帧分析结果
      const mergedAnalysis = analyzer.mergeFrameAnalyses(frameAnalyses);
      
      // 合并数据
      const combinedData = {
        video_id: videoId,
        video_path: videoPath,
        visual_elements: mergedAnalysis.visualElements.join('|'),
        actions: mergedAnalysis.actions.join('|'),
        scenes: mergedAnalysis.scenes.join('|'),
        people: mergedAnalysis.people.join('|'),
        objects: mergedAnalysis.objects.join('|'),
        frame_quality: mergedAnalysis.frameQuality,
        frame_descriptions: mergedAnalysis.frameDescriptions.join('|'),
        key_elements: mergedAnalysis.keyElements.join('|'),
        color_schemes: mergedAnalysis.colorSchemes.join('|'),
        compositions: mergedAnalysis.compositions.join('|'),
        content_summary: mergedAnalysis.contentSummary,
        analysis_method: 'frame_analysis'
      };
      
      // 写入CSV
      await csvWriter.writeRecords([combinedData]);
      analysisResults.push(combinedData);
      
      successCount++;
      console.log(`✅ 视频 ${videoId} 帧分析完成`);
      
      // 清理临时文件
      try {
        framePaths.forEach(framePath => {
          if (fs.existsSync(framePath)) {
            fs.unlinkSync(framePath);
          }
        });
        if (fs.existsSync(framesDir)) {
          fs.rmdirSync(framesDir);
        }
      } catch (cleanupError) {
        console.log('⚠️  清理临时文件失败:', cleanupError.message);
      }
      
    } catch (error) {
      console.error(`❌ 视频 ${videoId} 分析失败:`, error);
      errorCount++;
    }
    
    // 添加延迟避免API限制
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📊 批量分析完成!');
  console.log(`✅ 成功: ${successCount} 个视频`);
  console.log(`❌ 失败: ${errorCount} 个视频`);
  console.log(`📄 结果保存到: ${csvPath}`);
  
  // 生成分析报告
  if (analysisResults.length > 0) {
    const report = generateFrameAnalysisReport(analysisResults);
    const reportPath = path.join(outputDir, `frame_analysis_report_${timestamp}.txt`);
    fs.writeFileSync(reportPath, report);
    console.log(`📋 分析报告保存到: ${reportPath}`);
  }
}

function generateFrameAnalysisReport(analysisResults) {
  const report = [];
  
  report.push('='.repeat(60));
  report.push('视频帧分析报告');
  report.push('='.repeat(60));
  report.push('');
  
  // 基本统计
  report.push(`📊 分析统计:`);
  report.push(`- 总视频数: ${analysisResults.length}`);
  report.push(`- 分析方式: 帧分析`);
  report.push('');
  
  // 帧质量分布
  const qualityStats = {};
  analysisResults.forEach(result => {
    const quality = result.frame_quality;
    qualityStats[quality] = (qualityStats[quality] || 0) + 1;
  });
  
  report.push('🎬 帧质量分布:');
  report.push('-'.repeat(30));
  Object.entries(qualityStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([quality, count]) => {
      const percentage = ((count / analysisResults.length) * 100).toFixed(1);
      report.push(`${quality}: ${count} (${percentage}%)`);
    });
  report.push('');
  
  // 热门视觉元素
  const elementStats = {};
  analysisResults.forEach(result => {
    const elements = result.visual_elements ? result.visual_elements.split('|') : [];
    elements.forEach(element => {
      if (element.trim()) {
        elementStats[element.trim()] = (elementStats[element.trim()] || 0) + 1;
      }
    });
  });
  
  report.push('🎨 热门视觉元素 (出现次数):');
  report.push('-'.repeat(30));
  Object.entries(elementStats)
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
    console.log('使用方法: node video-frame-analyzer.js <下载目录路径> <API密钥> [模型名称] [输出文件路径]');
    console.log('');
    console.log('示例:');
    console.log('  node video-frame-analyzer.js examples/downloads sk-xxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('  node video-frame-analyzer.js examples/downloads sk-xxxxxxxxxxxxxxxxxxxxxxxx deepseek-ai/deepseek-vl2');
    console.log('  node video-frame-analyzer.js examples/downloads sk-xxxxxxxxxxxxxxxxxxxxxxxx deepseek-ai/deepseek-vl2 output.csv');
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
    await processBatchVideoFrameAnalysis(downloadsDir, apiKey, outputPath, config);
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
  VideoFrameAnalyzer,
  processBatchVideoFrameAnalysis,
  generateFrameAnalysisReport
}; 