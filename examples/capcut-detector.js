const axios = require('axios');
const fs = require('fs');
const path = require('path');

// CapCut 相关的检测规则
const CAPCUT_INDICATORS = {
    // 已知的CapCut平台代码 (基于观察和分析)
    SOURCE_PLATFORM_CODES: [72], // 已确认为CapCut特有
    
    // 其他可能的指标
    KEYWORDS: ['capcut', 'jianying', 'viamaker'],
    
    // 特征模式
    PATTERNS: {
        // CapCut特有的标识符模式
        capcut_signature: /capcut|jianying|viamaker/i,
        // 可能的编辑器标识
        editor_markers: /edited|capcut|jianying/i
    }
};

// 平台代码映射 (基于观察和分析)
const PLATFORM_CODES = {
    72: 'CapCut (已确认)',
    10033: '其他工具 (已确认)',
    10036: '其他工具 (已确认)', 
    24: '其他工具 (已确认)',
    // 可以随着发现更多视频而扩展
};

// 延迟函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// CapCut检测器
function detectCapCutSource(videoData, options = {}) {
    const { durationFilter = null } = options; // 时长过滤器：{targetDuration: number, tolerance: number}
    
    const indicators = {
        isCapCut: false,
        confidence: 0,
        evidence: []
    };
    
    // 如果启用了时长过滤模式，先检查时长是否匹配
    if (durationFilter) {
        const videoDuration = videoData.video?.duration || videoData.duration;
        if (videoDuration !== undefined) {
            const { targetDuration, tolerance = 1 } = durationFilter;
            const isWithinDurationRange = Math.abs(videoDuration - targetDuration) <= tolerance;
            
            if (!isWithinDurationRange) {
                // 时长不匹配，直接返回非CapCut
                indicators.isCapCut = false;
                indicators.confidence = 0;
                indicators.evidence.push(`时长不匹配: 实际${videoDuration}秒，期望${targetDuration}±${tolerance}秒`);
                return indicators;
            } else {
                indicators.evidence.push(`时长匹配: ${videoDuration}秒在${targetDuration}±${tolerance}秒范围内`);
            }
        } else {
            // 无法获取视频时长，标记为非CapCut
            indicators.isCapCut = false;
            indicators.confidence = 0;
            indicators.evidence.push('无法获取视频时长，在时长过滤模式下标记为非CapCut');
            return indicators;
        }
    }
    
    // 检查 source_platform 字段
    if (videoData.music?.source_platform) {
        const sourcePlatform = videoData.music.source_platform;
        if (CAPCUT_INDICATORS.SOURCE_PLATFORM_CODES.includes(sourcePlatform)) {
            indicators.isCapCut = true;
            indicators.confidence += 0.8;
            indicators.evidence.push(`音乐 source_platform: ${sourcePlatform} (${PLATFORM_CODES[sourcePlatform] || '未知'})`);
        }
    }
    
    if (videoData.added_sound_music_info?.source_platform) {
        const sourcePlatform = videoData.added_sound_music_info.source_platform;
        if (CAPCUT_INDICATORS.SOURCE_PLATFORM_CODES.includes(sourcePlatform)) {
            indicators.isCapCut = true;
            indicators.confidence += 0.8;
            indicators.evidence.push(`added_sound_music_info source_platform: ${sourcePlatform} (${PLATFORM_CODES[sourcePlatform] || '未知'})`);
        }
    }
    
    // 检查描述和标题中的关键词 (降低权重，避免个人签名误判)
    const textFields = [
        videoData.desc,
        videoData.music?.title
        // 移除author.signature，因为这可能是个人签名而非视频制作工具指示
    ];
    
    textFields.forEach((text, index) => {
        if (text && CAPCUT_INDICATORS.PATTERNS.capcut_signature.test(text)) {
            // 只有在没有source_platform强指示时才考虑文本证据
            if (!videoData.music?.source_platform || videoData.music.source_platform === 72) {
                indicators.confidence += 0.1; // 降低权重从0.3到0.1
                indicators.evidence.push(`文本中发现CapCut关键词: ${text}`);
            }
        }
    });
    
    // 检查特效和编辑信息
    if (videoData.effect_stickers && videoData.effect_stickers.length > 0) {
        videoData.effect_stickers.forEach(effect => {
            if (effect.name && CAPCUT_INDICATORS.PATTERNS.editor_markers.test(effect.name)) {
                indicators.confidence += 0.2;
                indicators.evidence.push(`特效中发现编辑器标识: ${effect.name}`);
            }
        });
    }
    
    // 检查其他可能的字段
    const otherFields = [
        videoData.item_distribute_source,
        videoData.item_source_category,
        videoData.shoot_tab_name,
        videoData.content_type
    ];
    
    otherFields.forEach((field, index) => {
        if (field && typeof field === 'string' && CAPCUT_INDICATORS.PATTERNS.editor_markers.test(field)) {
            indicators.confidence += 0.1;
            indicators.evidence.push(`其他字段中发现标识: ${field}`);
        }
    });
    
    // 基于source_platform做出最终判断
    if (videoData.music?.source_platform === 72 || videoData.added_sound_music_info?.source_platform === 72) {
        indicators.isCapCut = true;
    } else if (videoData.music?.source_platform && videoData.music.source_platform !== 72) {
        // 如果有明确的非72平台代码，则判断为非CapCut
        indicators.isCapCut = false;
        indicators.confidence = 0; // 重置confidence
        indicators.evidence = indicators.evidence.filter(e => !e.includes('文本中发现CapCut关键词'));
    }
    
    return indicators;
}

async function analyzeVideoCapCutSource(videoId) {
    console.log(`\n=== CapCut来源检测器 ===`);
    console.log('视频ID:', videoId);
    
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
            timeout: 15000
        });

        if (!response.data || !response.data.aweme_list || response.data.aweme_list.length === 0) {
            throw new Error('未找到视频数据');
        }

        const videoData = response.data.aweme_list[0];
        
        // 进行CapCut检测
        const capCutAnalysis = detectCapCutSource(videoData);
        
        console.log(`\n=== CapCut检测结果 ===`);
        console.log('是否来自CapCut:', capCutAnalysis.isCapCut ? '是' : '否');
        console.log('置信度:', (capCutAnalysis.confidence * 100).toFixed(1) + '%');
        
        if (capCutAnalysis.evidence.length > 0) {
            console.log('\n证据:');
            capCutAnalysis.evidence.forEach((evidence, index) => {
                console.log(`  ${index + 1}. ${evidence}`);
            });
        } else {
            console.log('\n未发现CapCut相关证据');
        }
        
        // 显示相关字段分析
        console.log(`\n=== 关键字段分析 ===`);
        console.log('音乐 source_platform:', videoData.music?.source_platform || '未知');
        console.log('added_sound_music_info source_platform:', videoData.added_sound_music_info?.source_platform || '未知');
        console.log('item_distribute_source:', videoData.item_distribute_source || '未知');
        console.log('item_source_category:', videoData.item_source_category || '未知');
        console.log('shoot_tab_name:', videoData.shoot_tab_name || '未知');
        console.log('content_type:', videoData.content_type || '未知');
        
        // 保存分析结果
        const outputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const analysisResult = {
            video_id: videoId,
            capcut_analysis: capCutAnalysis,
            platform_fields: {
                music_source_platform: videoData.music?.source_platform,
                added_sound_music_info_source_platform: videoData.added_sound_music_info?.source_platform,
                item_distribute_source: videoData.item_distribute_source,
                item_source_category: videoData.item_source_category,
                shoot_tab_name: videoData.shoot_tab_name,
                content_type: videoData.content_type
            },
            timestamp: new Date().toISOString()
        };
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const analysisFilePath = path.join(outputDir, `capcut_analysis_${videoId}_${timestamp}.json`);
        fs.writeFileSync(analysisFilePath, JSON.stringify(analysisResult, null, 2), 'utf8');
        console.log(`\n分析结果已保存到: ${analysisFilePath}`);
        
        return analysisResult;
        
    } catch (error) {
        console.error('检测失败:', error.message);
        return null;
    }
}

// 检查命令行参数
if (process.argv.length < 3) {
    console.log('使用方法: node capcut-detector.js <视频ID>');
    console.log('示例: node capcut-detector.js 7530745552569470230');
    process.exit(1);
}

// 仅在直接运行此文件时执行
if (require.main === module) {
    const videoId = process.argv[2];
    analyzeVideoCapCutSource(videoId);
}

module.exports = {
    detectCapCutSource,
    analyzeVideoCapCutSource,
    CAPCUT_INDICATORS,
    PLATFORM_CODES
}; 