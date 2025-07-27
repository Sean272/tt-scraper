const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// 重用单个视频详情的处理逻辑
const { formatNumber, formatDate, formatBoolean, formatArray, formatCSVField, MAX_RETRIES, RETRY_DELAY, sleep } = require('./show-video-details');
const { detectCapCutSource } = require('./capcut-detector');

// 批量处理视频
async function processBatchVideos(inputCsvPath) {
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
    const outputCsvPath = path.join(outputDir, `batch_videos_${timestamp}.csv`);
    
    // 读取输入的CSV文件
    const videoData = [];
    
    try {
        // 从CSV读取视频ID和可选的时长数据
        await new Promise((resolve, reject) => {
            fs.createReadStream(inputCsvPath)
                .pipe(csv())
                .on('data', (row) => {
                    const rowValues = Object.values(row);
                    // 获取第一列数据作为视频ID（无论列名是什么）
                    const videoId = rowValues[0];
                    // 获取第二列数据作为时长（如果存在）
                    const duration = rowValues[1];
                    
                    if (videoId && /^\d+$/.test(videoId)) { // 确保ID是纯数字
                        const item = { videoId };
                        // 如果第二列存在且是有效数字，则添加时长信息
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
        
        // 检查是否启用了时长过滤模式
        const hasDurationFilter = videoData.some(item => item.expectedDuration !== undefined);
        if (hasDurationFilter) {
            console.log('✅ 检测到时长过滤模式：仅时长匹配的视频会被标记为CapCut');
        }
        
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
                // 传递时长过滤信息给getVideoDetails
                const durationFilter = expectedDuration ? 
                    { targetDuration: expectedDuration, tolerance: 1 } : null;
                const videoDetails = await getVideoDetails(videoId, durationFilter);
                if (videoDetails) {
                    allVideosData.push(videoDetails);
                    console.log(`成功获取视频 ${videoId} 的信息`);
                }
            } catch (error) {
                console.error(`获取视频 ${videoId} 信息失败:`, error.message);
            }
            
            // 每处理5个视频暂停一下，避免API限制
            if (i < videoData.length - 1 && (i + 1) % 5 === 0) {
                console.log('暂停5秒后继续...');
                await sleep(5000);
            }
        }
        
        // 将所有数据写入CSV
        if (allVideosData.length > 0) {
            // 准备写入CSV
            const csvWriter = createObjectCsvWriter({
                path: outputCsvPath,
                header: Object.keys(allVideosData[0]).map(key => ({
                    id: key,
                    title: key
                })),
                encoding: 'utf8',
                bom: true // 添加BOM标记解决中文乱码问题
            });
            
            // 写入数据
            await csvWriter.writeRecords(allVideosData);
            
            console.log(`\n成功处理 ${allVideosData.length}/${videoIds.length} 个视频`);
            console.log(`数据已保存到: ${outputCsvPath}`);
        } else {
            console.error('未能成功获取任何视频信息');
        }
        
    } catch (error) {
        console.error('处理CSV文件时出错:', error);
    }
}

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

            console.log(`尝试第 ${retries + 1} 次获取视频 ${videoId} 的信息...`);
            
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
            const capCutAnalysis = detectCapCutSource(videoData, { durationFilter });
            
            // 准备CSV数据
            return {
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
            
        } catch (error) {
            console.error(`视频 ${videoId} 的第 ${retries + 1} 次请求失败:`, error.message);
            
            if (retries < MAX_RETRIES - 1) {
                console.log(`等待 ${RETRY_DELAY/1000} 秒后重试...`);
                await sleep(RETRY_DELAY);
                retries++;
            } else {
                console.error(`已达到最大重试次数，获取视频 ${videoId} 的信息失败`);
                return null;
            }
        }
    }
    
    return null;
}

// 检查命令行参数
if (process.argv.length < 3) {
    console.log('使用方法: node batch-video-details.js <输入CSV文件路径>');
    console.log('CSV文件格式: 第一列应包含视频ID，可以有标题行');
    process.exit(1);
}

const inputCsvPath = process.argv[2];
processBatchVideos(inputCsvPath); 