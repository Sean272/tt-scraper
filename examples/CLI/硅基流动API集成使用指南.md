# 硅基流动API集成使用指南

## 概述

硅基流动API集成功能为TikTok视频内容分析提供了强大的AI分析能力，相比OpenAI API具有成本更低、响应更快的优势。

## 功能特点

### 🚀 核心功能
- **智能内容分析**：自动分析视频描述和话题标签
- **主题分类**：准确识别14个主要主题类别
- **情感分析**：分析内容情感倾向和评分
- **关键词提取**：自动提取重要关键词
- **内容摘要**：生成简洁的内容总结
- **质量评估**：多维度评估内容质量

### 📊 分析维度
- **主题分类**：美食、舞蹈、音乐、搞笑、教育、时尚、旅行、运动、宠物、科技、生活、游戏、情感、商业、其他
- **情感倾向**：positive（正面）、negative（负面）、neutral（中性）
- **内容类型**：entertainment（娱乐）、educational（教育）、commercial（商业）、personal（个人）、other（其他）
- **语言检测**：中文、英文、混合
- **目标受众**：基于内容特征推断的受众群体

## 安装和配置

### 1. 获取API密钥
1. 访问 [硅基流动官网](https://www.siliconflow.cn/)
2. 注册账号并登录
3. 在控制台获取API密钥
4. 确保账户有足够的余额

### 2. 测试API连接
```bash
node examples/test-siliconflow-integration.js <您的API密钥>
```

## 使用方法

### 基础批量分析

```bash
node examples/batch-video-content-analysis-siliconflow.js <视频ID列表文件> <API密钥>
```

**示例**：
```bash
node examples/batch-video-content-analysis-siliconflow.js sample-video-ids-for-siliconflow.csv sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 输入文件格式

**基础格式**（仅视频ID）：
```csv
video_id
7529241930178252037
7530472638058155271
7530473621936934151
```

**时长过滤格式**（包含时长信息）：
```csv
video_id,duration
7529241930178252037,15
7530472638058155271,30
7530473621936934151,16
```

## 输出结果

### 1. CSV数据文件
输出文件位置：`examples/output/siliconflow_content_analysis_YYYY-MM-DDTHH-MM-SS.csv`

**包含字段**：
- 视频ID、描述、作者、点赞数、评论数、分享数、播放数
- 创建时间、视频链接、CapCut检测结果
- **内容主题**、**主题置信度**、**情感倾向**、**情感评分**
- **关键词**、**内容摘要**、**语言**、**内容类型**
- **目标受众**、**内容质量评分**、**分析方式**

### 2. 分析报告
报告文件位置：`examples/output/siliconflow_analysis_report_YYYY-MM-DDTHH-MM-SS.txt`

**报告内容**：
- 主题分布统计
- 情感分布统计
- 内容类型分布
- 语言分布
- 平均评分统计
- 热门关键词统计

## 高级配置

### 模型选择
默认使用 `Pro/deepseek-ai/DeepSeek-V3` 模型，您可以在代码中修改：

```javascript
const analyzer = new SiliconFlowContentAnalyzer(apiKey, {
  model: 'Pro/deepseek-ai/DeepSeek-R1',  // 可选：Pro/deepseek-ai/DeepSeek-V3, Pro/deepseek-ai/DeepSeek-R1
  maxTokens: 1000,
  temperature: 0.3
});
```

### 可用模型
- `Pro/deepseek-ai/DeepSeek-V3`：快速响应，适合大批量处理
- `Pro/deepseek-ai/DeepSeek-R1`：高性能，适合高质量分析

## 错误处理

### 常见错误及解决方案

1. **API连接失败**
   - 检查网络连接
   - 验证API密钥是否正确
   - 确认账户余额充足

2. **分析失败**
   - 检查视频ID是否有效
   - 确认视频内容可访问
   - 查看控制台错误信息

3. **API限制**
   - 增加请求间隔时间
   - 减少批量处理数量
   - 检查API使用配额

## 性能优化

### 1. 批量处理建议
- **小批量**（<50个视频）：使用 `Pro/deepseek-ai/DeepSeek-V3`
- **中等批量**（50-200个视频）：使用 `Pro/deepseek-ai/DeepSeek-R1`
- **大批量**（>200个视频）：分批处理，使用 `Pro/deepseek-ai/DeepSeek-V3`

### 2. 成本控制
- 硅基流动API成本约为OpenAI的1/3
- 建议先测试小批量，确认效果后再大批量处理
- 监控API使用量和费用

### 3. 处理速度
- 平均每个视频分析时间：2-5秒
- 建议在请求间添加2秒延迟
- 大批量处理时考虑使用队列

## 与其他分析方式对比

| 特性 | 本地分析 | OpenAI API | 硅基流动API |
|------|----------|------------|-------------|
| 准确性 | 中等 | 高 | 高 |
| 响应速度 | 快 | 中等 | 快 |
| 成本 | 免费 | 高 | 低 |
| 功能丰富度 | 基础 | 丰富 | 丰富 |
| 稳定性 | 高 | 高 | 高 |

## 最佳实践

### 1. 数据准备
- 确保视频ID格式正确
- 建议先用小批量测试
- 备份原始数据

### 2. 分析策略
- 根据需求选择合适的模型
- 合理设置批量大小
- 监控分析质量

### 3. 结果处理
- 定期清理输出文件
- 保存重要的分析报告
- 建立结果数据库

## 故障排除

### 1. 检查API状态
```bash
node examples/test-siliconflow-integration.js <API密钥>
```

### 2. 查看详细日志
程序运行时会显示详细的处理日志，包括：
- API连接状态
- 每个视频的处理进度
- 错误信息和重试次数
- 最终统计结果

### 3. 常见问题
- **网络超时**：检查网络连接，增加超时时间
- **API配额不足**：检查账户余额和使用量
- **文件格式错误**：确保CSV文件格式正确

## 技术支持

如遇到问题，请：
1. 查看控制台错误信息
2. 检查API密钥和网络连接
3. 尝试重新运行测试脚本
4. 联系技术支持团队

---

*最后更新：2024年12月* 