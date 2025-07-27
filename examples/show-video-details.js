const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { detectCapCutSource } = require('./capcut-detector');

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2秒

// 延迟函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 格式化数字
const formatNumber = (num) => {
    if (num === undefined || num === null) return '';
    return num.toString();
};

// 格式化日期
const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleString();
};

// 格式化布尔值
const formatBoolean = (bool) => {
    if (bool === undefined || bool === null) return '';
    return bool ? '是' : '否';
};

// 格式化数组
const formatArray = (arr) => {
    if (!Array.isArray(arr)) return '';
    return arr.join('|');
};

// 格式化CSV字段值
const formatCSVField = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
};

async function getVideoDetails(videoId) {
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

            console.log(`\n尝试第 ${retries + 1} 次获取视频信息...`);
            console.log('视频ID:', videoId);
            
            const url = `https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=${videoId}`;
            console.log('请求URL:', url);
            
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
                console.log('原始响应数据:', JSON.stringify(response.data, null, 2));
                throw new Error('未找到视频数据');
            }

            console.log('响应状态码:', response.status);
            
            const videoData = response.data.aweme_list[0];
            
            // 保存完整的原始数据到JSON文件
            const rawOutputDir = path.join(__dirname, 'output');
            if (!fs.existsSync(rawOutputDir)) {
                fs.mkdirSync(rawOutputDir, { recursive: true });
            }
            
            const rawTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const jsonFilePath = path.join(rawOutputDir, `raw_video_${videoId}_${rawTimestamp}.json`);
            fs.writeFileSync(jsonFilePath, JSON.stringify(videoData, null, 2), 'utf8');
            console.log(`\n完整原始数据已保存到: ${jsonFilePath}`);
            
            // 进行CapCut检测
            const capCutAnalysis = detectCapCutSource(videoData);
            
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
                }).join('|') : ''
            };

            // 创建输出目录
            const outputDir = path.join(__dirname, 'output');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // 生成CSV文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const csvFilePath = path.join(outputDir, `video_${videoId}_${timestamp}.csv`);

            // 生成CSV内容
            const csvHeaders = Object.keys(csvData);
            const csvValues = Object.values(csvData).map(formatCSVField);
            const csvContent = [
                csvHeaders.join(','),
                csvValues.join(',')
            ].join('\n');

            // 写入CSV文件
            fs.writeFileSync(csvFilePath, '\ufeff' + csvContent, 'utf8');
            console.log(`\n数据已保存到: ${csvFilePath}`);

            // 打印主要信息到控制台
            console.log('\n=== 视频信息摘要 ===');
            console.log('视频ID:', csvData['视频ID']);
            console.log('描述:', csvData['描述']);
            console.log('作者:', csvData['作者昵称']);
            console.log('发布时间:', csvData['创建时间']);
            console.log('播放量:', csvData['播放量']);
            console.log('点赞数:', csvData['点赞数']);
            console.log('评论数:', csvData['评论数']);
            console.log('是否CapCut投稿:', csvData['是否CapCut投稿']);
            console.log('来源平台代码:', csvData['来源平台代码']);
            
            // 显示特效信息
            if (videoData.effect_stickers && videoData.effect_stickers.length > 0) {
                console.log('\n=== 特效信息 ===');
                console.log('特效数量:', videoData.effect_stickers.length);
                videoData.effect_stickers.forEach((effect, index) => {
                    console.log(`特效 ${index + 1}:`);
                    console.log('  名称:', effect.name || '未知');
                    console.log('  ID:', effect.id || '未知');
                    console.log('  类型:', effect.type || '未知');
                });
            } else {
                console.log('\n该视频未使用特效');
            }
            
            // 显示贴纸信息
            if (videoData.stickers && videoData.stickers.length > 0) {
                console.log('\n=== 贴纸信息 ===');
                console.log('贴纸数量:', videoData.stickers.length);
                videoData.stickers.forEach((sticker, index) => {
                    console.log(`贴纸 ${index + 1}:`);
                    console.log('  名称:', sticker.name || '未知');
                    console.log('  ID:', sticker.id || '未知');
                });
            } else {
                console.log('该视频未使用贴纸');
            }
            
            return;
            
        } catch (error) {
            console.error(`\n第 ${retries + 1} 次请求失败:`, error.message);
            
            if (error.response) {
                console.error('状态码:', error.response.status);
                if (error.response.data) {
                    console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
                }
            } else if (error.request) {
                console.error('请求失败，未收到响应');
            } else {
                console.error('请求配置错误:', error.message);
            }

            if (retries < MAX_RETRIES - 1) {
                console.log(`等待 ${RETRY_DELAY/1000} 秒后重试...\n`);
                await sleep(RETRY_DELAY);
                retries++;
            } else {
                console.error('\n已达到最大重试次数，获取视频信息失败');
                break;
            }
        }
    }
}

// 检查命令行参数
if (process.argv.length < 3) {
    console.log('使用方法: node show-video-details.js <视频ID>');
    process.exit(1);
}

// 仅在直接运行此文件时执行
if (require.main === module) {
    const videoId = process.argv[2];
    getVideoDetails(videoId);
}

// 导出工具函数供其他模块使用
module.exports = {
    formatNumber,
    formatDate,
    formatBoolean,
    formatArray,
    formatCSVField,
    MAX_RETRIES,
    RETRY_DELAY,
    sleep
}; 