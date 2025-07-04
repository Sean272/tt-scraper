const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// 导入单个视频处理中的工具函数
const {
    formatNumber,
    formatDate,
    formatBoolean,
    formatArray,
    formatCSVField,
    MAX_RETRIES,
    RETRY_DELAY,
    sleep
} = require('./show-video-details');

/**
 * 从TikTok链接中提取视频ID
 * @param {string} url - TikTok视频链接
 * @returns {string|null} - 视频ID或null(如果无法提取)
 */
function extractVideoIdFromURL(url) {
    if (!url) return null;
    
    try {
        // 处理标准TikTok URL
        // 格式例如: https://www.tiktok.com/@username/video/7123456789012345678
        const standardMatch = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/i);
        if (standardMatch && standardMatch[1]) {
            return standardMatch[1];
        }
        
        // 处理短链接格式
        // 格式例如: https://vm.tiktok.com/AbCdEfGh/
        if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
            // 对于短链接，我们需要跟踪重定向到最终URL
            console.log(`检测到短链接: ${url}，需要解析最终URL`);
            return null; // 在后续实现中处理重定向
        }
        
        // 处理移动应用分享格式
        // 有时格式为: https://m.tiktok.com/v/7123456789012345678.html
        const mobileMatch = url.match(/tiktok\.com\/v\/(\d+)/i);
        if (mobileMatch && mobileMatch[1]) {
            return mobileMatch[1];
        }
        
        // 尝试直接从URL中提取数字ID（如果是纯数字且长度合适）
        const numericMatch = url.match(/^[^\d]*(\d{19})[^\d]*$/);
        if (numericMatch && numericMatch[1]) {
            return numericMatch[1];
        }
        
        return null;
    } catch (error) {
        console.error('从URL提取视频ID时出错:', error.message);
        return null;
    }
}

/**
 * 解析TikTok短链接获取真实视频ID
 * @param {string} shortUrl - TikTok短链接
 * @returns {Promise<string|null>} - 视频ID或null(如果无法解析)
 */
async function resolveShortUrl(shortUrl) {
    try {
        console.log(`正在解析短链接: ${shortUrl}`);
        const response = await axios.get(shortUrl, {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });
        
        // 检查重定向头
        if (response.headers.location) {
            const redirectUrl = response.headers.location;
            console.log(`短链接重定向到: ${redirectUrl}`);
            return extractVideoIdFromURL(redirectUrl);
        }
        
        return null;
    } catch (error) {
        // 某些重定向可能会在响应头中返回
        if (error.response && error.response.headers && error.response.headers.location) {
            const redirectUrl = error.response.headers.location;
            console.log(`从错误响应中获取重定向URL: ${redirectUrl}`);
            return extractVideoIdFromURL(redirectUrl);
        }
        
        console.error('解析短链接时出错:', error.message);
        return null;
    }
}

/**
 * 生成包含BOM标记的CSV文件
 * @param {string} filePath - 文件路径
 * @param {Array} headers - CSV表头
 * @param {Array} data - CSV数据行
 */
function writeCSVWithBOM(filePath, headers, data) {
    // 定义BOM标记 (UTF-8)
    const BOM = '\ufeff';
    
    // 创建CSV内容
    const headerRow = headers.join(',');
    const dataRows = data.map(row => 
        headers.map(header => {
            // 将值转换为字符串并处理null/undefined
            const value = row[header] !== null && row[header] !== undefined 
                ? String(row[header]) 
                : '';
            
            // 处理包含逗号、引号或换行的字段
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',')
    );
    
    // 组合所有行
    const csvContent = [headerRow, ...dataRows].join('\n');
    
    // 添加BOM标记并写入文件，确保UTF-8编码
    fs.writeFileSync(filePath, BOM + csvContent, {encoding: 'utf8'});
    
    console.log(`CSV文件已保存至: ${filePath}`);
}

/**
 * 获取单个视频的详细信息
 * @param {string} videoId - 视频ID
 * @returns {Promise<Object|null>} - 视频详情数据或null（如果获取失败）
 */
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

/**
 * 处理批量视频
 * @param {string} inputCsvPath - 输入CSV文件路径
 */
async function processBatchVideos(inputCsvPath) {
    // 检查输入文件是否存在
    if (!fs.existsSync(inputCsvPath)) {
        console.error(`错误: 输入文件 "${inputCsvPath}" 不存在`);
        return;
    }
    
    console.log(`开始处理输入文件: ${inputCsvPath}`);
    
    // 创建输出目录
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 生成输出文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputCsvPath = path.join(outputDir, `batch_videos_${timestamp}.csv`);
    
    // 读取CSV文件中的视频ID或URL
    const videoEntries = [];
    
    // 读取输入CSV文件
    await new Promise((resolve) => {
        fs.createReadStream(inputCsvPath)
            .pipe(csv())
            .on('data', (row) => {
                // 获取第一列数据作为视频ID或链接
                const value = Object.values(row)[0];
                if (value) {
                    videoEntries.push(value.trim());
                }
            })
            .on('end', () => {
                resolve();
            });
    });
    
    console.log(`从CSV文件中读取了 ${videoEntries.length} 条记录`);
    
    if (videoEntries.length === 0) {
        console.error('未找到任何记录，请检查输入文件格式');
        return;
    }
    
    // 存储所有视频的数据
    const allVideoData = [];
    
    // 处理每个视频ID或链接
    for (let i = 0; i < videoEntries.length; i++) {
        const entry = videoEntries[i];
        console.log(`\n处理第 ${i + 1}/${videoEntries.length} 个视频: ${entry}`);
        
        // 判断是视频ID还是URL
        let videoId;
        
        // 如果是纯数字，则当作视频ID处理
        if (/^\d+$/.test(entry)) {
            videoId = entry;
            console.log(`识别为视频ID: ${videoId}`);
        } 
        // 否则尝试从URL中提取视频ID
        else if (entry.includes('tiktok.com')) {
            videoId = extractVideoIdFromURL(entry);
            console.log(`从URL提取的视频ID: ${videoId || '无法提取'}`);
            
            // 如果是短链接且未能提取到ID，尝试解析短链接
            if (!videoId && (entry.includes('vm.tiktok.com') || entry.includes('vt.tiktok.com'))) {
                videoId = await resolveShortUrl(entry);
                console.log(`从短链接解析的视频ID: ${videoId || '解析失败'}`);
            }
        }
        
        // 如果没有有效的视频ID，跳过此条目
        if (!videoId) {
            console.error(`无法从 "${entry}" 中获取有效的视频ID，跳过此条目`);
            continue;
        }
        
        // 获取视频详情
        const videoData = await getVideoDetails(videoId);
        
        if (videoData) {
            // 添加原始输入信息
            videoData['原始输入'] = entry;
            
            console.log(`成功获取视频 ${videoId} 的信息`);
            allVideoData.push(videoData);
        } else {
            console.error(`无法获取视频 ${videoId} 的信息，跳过此视频`);
        }
        
        // 每处理5个视频，暂停5秒（避免API限制）
        if ((i + 1) % 5 === 0 && i < videoEntries.length - 1) {
            console.log('\n暂停5秒以避免API限制...');
            await sleep(5000);
        }
    }
    
    console.log(`\n成功获取 ${allVideoData.length}/${videoEntries.length} 个视频的详细信息`);
    
    if (allVideoData.length > 0) {
        // 使用自定义函数写入CSV（带BOM标记）
        const headers = Object.keys(allVideoData[0]);
        writeCSVWithBOM(outputCsvPath, headers, allVideoData);
    } else {
        console.error('没有成功获取任何视频的信息，未生成输出文件');
    }
}

// 检查命令行参数
if (process.argv.length < 3) {
    console.log('使用方法: node batch-video-details-fixed.js <输入CSV文件路径>');
    console.log('CSV文件格式: 第一列可以包含视频ID或TikTok视频链接');
    process.exit(1);
}

const inputCsvPath = process.argv[2];
processBatchVideos(inputCsvPath); 