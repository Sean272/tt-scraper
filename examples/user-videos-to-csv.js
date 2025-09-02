import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { detectCapCutSource } from './capcut-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取单个视频的详细信息用于CapCut检测
async function getVideoDetailForCapCut(videoId) {
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
            timeout: 10000
        });

        if (response.data && response.data.aweme_list && response.data.aweme_list.length > 0) {
            const videoData = response.data.aweme_list[0];
            const capCutAnalysis = detectCapCutSource(videoData);
            return {
                isCapCut: capCutAnalysis.isCapCut ? '是' : '否',
                sourcePlatform: videoData.music?.source_platform || ''
            };
        }
    } catch (error) {
        console.log(`获取视频 ${videoId} 的CapCut信息失败: ${error.message}`);
    }
    return {
        isCapCut: '未知',
        sourcePlatform: ''
    };
}

// 计算时间范围的起始时间戳
function getTimeRangeStart(timeRange, timeUnit) {
    const now = new Date();
    const start = new Date(now);
    
    switch (timeUnit) {
        case 'days':
            start.setDate(now.getDate() - timeRange);
            break;
        case 'weeks':
            start.setDate(now.getDate() - (timeRange * 7));
            break;
        case 'months':
            start.setMonth(now.getMonth() - timeRange);
            break;
        default:
            throw new Error('不支持的时间单位');
    }
    
    return Math.floor(start.getTime() / 1000);
}

async function getUserVideos(username, timeRange, timeUnit, skipCapcutCheck = false) {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.tiktok.com/',
            'Cookie': '_ttp=2; tiktok_webapp_theme=light; passport_csrf_token=13bb2e85f856a2b1e1d72a4b5162e542; passport_csrf_token_default=13bb2e85f856a2b1e1d72a4b5162e542; tta_attr_id=0.1708273264.7318246972899033089; tta_attr_id_mirror=0.1708273264.7318246972899033089; tiktok_webapp_theme=light; tt_csrf_token=NQv5mq-0-uXtxQv1TaXxXqHiXqNxm3f_dXkw; ttwid=1%7CWUyxR_4yxT_v9n5hFue5PBqZhUF3UGXgmEXgaHtqhGY%7C1708273265%7C1d3ad49bfaa3e1c15ce4c77d5c93fc38df8e8b1d5244d3a6f480eb5e51f07e4f; msToken=2Uu7Pu0cy_zGHGXxGtA8aqm9HxBxwQPBEGHFYHVRXQOHQGiRN5cJ_UhG_YxUQxVeKEGwn3_YxPGqFKiTZGHs3WxXRJrODvxo3GhQtCBVHwJEXA==',
            'Connection': 'keep-alive'
        };

        // 计算时间范围
        const startTime = getTimeRangeStart(parseInt(timeRange), timeUnit);
        console.log(`查询 ${timeRange} ${timeUnit} 内的视频（起始时间: ${new Date(startTime * 1000).toLocaleString()}）`);

        // 首先获取用户的secUid
        const userPageUrl = `https://www.tiktok.com/api/user/detail/?aid=1988&uniqueId=${username}&language=en`;
        const userResponse = await axios.get(userPageUrl, { headers });
        
        if (!userResponse.data || !userResponse.data.userInfo) {
            throw new Error('无法获取用户信息');
        }

        const secUid = userResponse.data.userInfo.user.secUid;
        if (!secUid) {
            throw new Error('无法获取用户secUid');
        }

        // 获取用户视频列表（支持分页）
        const videosUrl = 'https://www.tiktok.com/api/post/item_list/';
        let allVideos = [];
        let cursor = 0;
        let hasMore = true;
        let pageCount = 0;
        const maxPages = 50; // 最多获取50页，避免无限循环

        while (hasMore && pageCount < maxPages) {
            console.log(`正在获取第 ${pageCount + 1} 页视频...`);
            
            const response = await axios.get(videosUrl, {
                params: {
                    aid: '1988',
                    app_language: 'en',
                    browser_language: 'en-US',
                    browser_name: 'Mozilla',
                    browser_version: '5.0',
                    cookie_enabled: 'true',
                    device_id: Date.now(),
                    device_platform: 'web_pc',
                    focus_state: 'true',
                    from_page: 'user',
                    history_len: '3',
                    is_fullscreen: 'false',
                    is_page_visible: 'true',
                    language: 'en',
                    os: 'mac',
                    priority_region: '',
                    referer: '',
                    region: 'US',
                    screen_height: '1080',
                    screen_width: '1920',
                    secUid: secUid,
                    count: 30,
                    cursor: cursor,
                    verifyFp: '',
                    webcast_language: 'en'
                },
                headers
            });

            if (response.data && response.data.itemList) {
                const pageVideos = response.data.itemList;
                allVideos.push(...pageVideos);
                
                // 检查是否还有更多数据
                hasMore = response.data.hasMore || false;
                if (response.data.cursor) {
                    cursor = response.data.cursor;
                } else if (response.data.maxCursor) {
                    cursor = parseInt(response.data.maxCursor);
                }
                
                console.log(`第 ${pageCount + 1} 页获取到 ${pageVideos.length} 个视频，总计 ${allVideos.length} 个视频`);
                
                // 如果没有获取到视频，跳出循环
                if (pageVideos.length === 0) {
                    hasMore = false;
                }
                
                // 添加延迟避免请求过快
                if (hasMore && pageCount < maxPages - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } else {
                hasMore = false;
            }
            
            pageCount++;
        }

        console.log(`总共获取到 ${allVideos.length} 个视频`);

        if (allVideos.length > 0) {
            // 过滤指定时间范围内的视频
            const filteredVideos = allVideos.filter(video => 
                video.createTime >= startTime
            );

            console.log(`找到 ${filteredVideos.length} 个视频在指定时间范围内`);

            if (filteredVideos.length === 0) {
                console.log('未找到视频');
                return;
            }

            // 准备CSV数据
            const csvData = [
                ['视频ID', '描述', '作者', '点赞数', '评论数', '分享数', '播放数', '创建时间', '视频链接', '是否CapCut投稿', '来源平台代码']
            ];

            // 处理每个视频
            console.log(`正在检测 ${username} 的 ${filteredVideos.length} 个视频的CapCut信息...`);
            for (let i = 0; i < filteredVideos.length; i++) {
                const video = filteredVideos[i];
                const createTime = new Date(video.createTime * 1000).toLocaleString();
                
                // 获取CapCut检测信息
                let capCutInfo = { isCapCut: '否', sourcePlatform: '' };
                if (!skipCapcutCheck) {
                    process.stdout.write(`处理视频 ${i + 1}/${filteredVideos.length}... `);
                    capCutInfo = await getVideoDetailForCapCut(video.id);
                    console.log(capCutInfo.isCapCut);
                }
                
                csvData.push([
                    video.id,
                    video.desc.replace(/,/g, ' '), // 移除描述中的逗号，避免CSV格式错误
                    video.author.uniqueId,
                    video.stats.diggCount,
                    video.stats.commentCount,
                    video.stats.shareCount,
                    video.stats.playCount,
                    createTime,
                    `https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`,
                    capCutInfo.isCapCut,
                    capCutInfo.sourcePlatform
                ]);
                
                // 添加延迟避免请求过快
                if (!skipCapcutCheck && i < filteredVideos.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // 将数据转换为CSV格式
            const csvContent = csvData.map(row => row.join(',')).join('\n');

            // 创建输出目录
            const outputDir = path.join(__dirname, 'output');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir);
            }

            // 保存CSV文件，添加BOM标记
            const outputPath = path.join(outputDir, `${username}_videos.csv`);
            const BOM = '\ufeff';
            fs.writeFileSync(outputPath, BOM + csvContent, { encoding: 'utf8' });

            console.log(`\n成功获取 ${filteredVideos.length} 个视频信息`);
            console.log(`数据已保存到: ${outputPath}`);

            // 打印前3个视频的信息作为预览
            console.log('\n前3个视频预览:');
            filteredVideos.slice(0, 3).forEach((video, index) => {
                console.log(`\n视频 ${index + 1}:`);
                console.log(`- 描述: ${video.desc}`);
                console.log(`- 点赞数: ${video.stats.diggCount}`);
                console.log(`- 播放数: ${video.stats.playCount}`);
                console.log(`- 创建时间: ${new Date(video.createTime * 1000).toLocaleString()}`);
            });
        } else {
            console.log('未找到视频');
        }
    } catch (error) {
        console.error('获取视频失败:', error.message);
        if (error.response) {
            console.error('错误详情:', error.response.data);
        }
    }
}

// 获取命令行参数
const [username, timeRange, timeUnit, ...args] = process.argv.slice(2);
const skipCapcutCheck = args.includes('--skip-capcut-check');

if (!username || !timeRange || !timeUnit) {
    console.error('使用方法: node user-videos-to-csv.js <用户名> <时间范围> <时间单位>');
    console.error('时间单位可以是: days, weeks, months');
    process.exit(1);
}

console.log(`正在获取用户 @${username} 的视频信息...`);
getUserVideos(username, timeRange, timeUnit, skipCapcutCheck);