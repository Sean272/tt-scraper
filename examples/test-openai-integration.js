const axios = require('axios');

// 简化的OpenAI内容分析器
class SimpleOpenAIContentAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1';
  }

  async testConnection() {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
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
      console.error('OpenAI API连接测试失败:', error.message);
      return false;
    }
  }

  async analyzeContent(videoData) {
    try {
      const prompt = `请分析以下TikTok视频内容：

视频信息：
- 描述：${videoData.description || '无描述'}
- 话题标签：${videoData.hashtags ? videoData.hashtags.join(', ') : '无标签'}
- 作者：${videoData.author || '未知'}

请返回JSON格式的分析结果：
{
  "topic": "主题分类",
  "sentiment": "情感倾向",
  "summary": "内容摘要"
}`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '你是一个TikTok内容分析专家。请返回JSON格式的分析结果。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.3,
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

      const content = response.data.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('OpenAI分析失败:', error.message);
      return {
        topic: '其他',
        sentiment: 'neutral',
        summary: '分析失败'
      };
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法: node test-openai-integration.js <OpenAI_API_Key>');
    console.log('示例: node test-openai-integration.js sk-xxxxxxxxxxxxxxxxxxxxxxxx');
    return;
  }
  
  const apiKey = args[0];
  const analyzer = new SimpleOpenAIContentAnalyzer(apiKey);
  
  console.log('正在测试OpenAI API连接...');
  const isConnected = await analyzer.testConnection();
  
  if (!isConnected) {
    console.log('❌ OpenAI API连接失败');
    return;
  }
  
  console.log('✅ OpenAI API连接成功！');
  
  // 测试内容分析
  console.log('\n正在测试内容分析...');
  const testData = {
    description: '分享一道美味的家常菜做法 #美食 #烹饪 #家常菜',
    hashtags: ['美食', '烹饪', '家常菜'],
    author: '美食达人'
  };
  
  const analysis = await analyzer.analyzeContent(testData);
  console.log('分析结果:', analysis);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { SimpleOpenAIContentAnalyzer }; 