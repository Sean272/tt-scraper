const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { detectCapCutSource } = require('./capcut-detector');

// 获取单个视频的详细信息用于CapCut检测
async function getVideoDetailForCapCut(videoId, durationFilter = null) {
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
            const capCutAnalysis = detectCapCutSource(videoData, { durationFilter });
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

// 检查命令行参数
if (process.argv.length < 5) {
    console.log('用法: node batch-authors-videos.js <作者列表文件路径> <时间范围> <时间单位(weeks/months)>');
    console.log('示例: node batch-authors-videos.js authors.csv 2 weeks');
    process.exit(1);
}

// 转义CSV字段
function escapeCsvField(field) {
    if (field === null || field === undefined) {
        return '';
    }
    field = String(field);
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}

// 处理单个作者
async function processAuthor(authorData, startTime) {
    const { author: username, expectedDuration } = authorData;
    try {
        console.log(`\n正在获取作者 ${username} 的视频...${expectedDuration ? ` (时长过滤: ${expectedDuration}秒)` : ''}`);
        
        const headers = {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'referer': 'https://www.tiktok.com/',
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'zh-CN,zh;q=0.9'
        };

        // 首先获取用户的secUid
        const userPageResponse = await axios.get(`https://www.tiktok.com/@${username}`, {
            headers,
            timeout: 10000
        });

        const secUidMatch = userPageResponse.data.match(/"secUid":"([^"]+)"/);
        if (!secUidMatch) {
            throw new Error('无法获取用户secUid');
        }
        const secUid = secUidMatch[1];

        // 获取用户视频列表
        const response = await axios.get('https://www.tiktok.com/api/post/item_list/', {
            params: {
                aid: '1988',
                app_language: 'en',
                app_name: 'tiktok_web',
                battery_info: '1',
                browser_language: 'en',
                browser_name: 'Mozilla',
                browser_online: true,
                browser_platform: 'MacIntel',
                browser_version: '5.0 (Macintosh)',
                channel: 'tiktok_web',
                cookie_enabled: true,
                device_id: Date.now(),
                device_platform: 'web_pc',
                focus_state: true,
                from_page: 'user',
                history_len: 5,
                is_fullscreen: false,
                is_page_visible: true,
                os: 'mac',
                priority_region: '',
                referer: '',
                region: 'US',
                screen_height: 1080,
                screen_width: 1920,
                secUid: secUid,
                tz_name: 'America/New_York',
                webcast_language: 'en',
                msToken: '',
                count: 30,
                cursor: 0
            },
            headers,
            timeout: 10000
        });

        if (!response.data || !response.data.itemList) {
            console.log(`未找到用户 ${username} 的视频`);
            return [];
        }

        // 过滤指定时间范围内的视频
        const filteredVideos = response.data.itemList.filter(video => {
            const videoDate = new Date(video.createTime * 1000);
            return videoDate >= startTime;
        });

        console.log(`找到 ${filteredVideos.length} 个视频在指定时间范围内`);

        // 格式化视频数据并添加CapCut检测
        console.log(`正在检测 ${username} 的 ${filteredVideos.length} 个视频的CapCut信息...`);
        const formattedVideos = [];
        
        for (let i = 0; i < filteredVideos.length; i++) {
            const video = filteredVideos[i];
            process.stdout.write(`处理视频 ${i + 1}/${filteredVideos.length}...`);
            
            // 获取CapCut检测信息
            const durationFilter = expectedDuration ? 
                { targetDuration: expectedDuration, tolerance: 1 } : null;
            const capCutInfo = await getVideoDetailForCapCut(video.id, durationFilter);
            console.log(` ${capCutInfo.isCapCut}`);
            
            formattedVideos.push({
                author: username,
                videoId: video.id,
                description: (video.desc || '').replace(/[\r\n,]/g, ' '), // 移除换行符和逗号
                likes: video.stats.diggCount,
                comments: video.stats.commentCount,
                shares: video.stats.shareCount,
                plays: video.stats.playCount,
                createTime: new Date(video.createTime * 1000).toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai'
                }),
                videoUrl: `https://www.tiktok.com/@${username}/video/${video.id}`,
                isCapCut: capCutInfo.isCapCut,
                sourcePlatform: capCutInfo.sourcePlatform
            });
            
            // 添加延迟避免请求过快
            if (i < filteredVideos.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // 打印前3个视频的预览
        if (formattedVideos.length > 0) {
            console.log('\n前3个视频预览:');
            formattedVideos.slice(0, 3).forEach((video, index) => {
                console.log(`\n视频 ${index + 1}:`);
                console.log(`- 描述: ${video.description}`);
                console.log(`- 点赞数: ${video.likes}`);
                console.log(`- 播放数: ${video.plays}`);
                console.log(`- 创建时间: ${video.createTime}`);
            });
        }

        return formattedVideos;
    } catch (error) {
        console.error(`获取作者 ${username} 的视频时出错:`, error.message);
        if (error.response) {
            console.error('错误状态码:', error.response.status);
            console.error('错误详情:', error.response.data);
        }
        return [];
    }
}

// 主函数
async function main() {
    const authorsFile = process.argv[2];
    const timeRange = parseInt(process.argv[3]);
    const timeUnit = process.argv[4].toLowerCase();

    // 验证时间单位
    if (timeUnit !== 'weeks' && timeUnit !== 'months') {
        console.log('错误: 时间单位必须是 weeks 或 months');
        process.exit(1);
    }

    // 创建输出目录
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 生成输出文件路径
    const outputFile = path.join(outputDir, `batch_authors_videos_${new Date().toISOString().split('T')[0]}.csv`);

    // 创建写入流
    const writeStream = fs.createWriteStream(outputFile, { encoding: 'utf8' });

    // 写入BOM
    writeStream.write('\ufeff');

    // 写入表头
    const headers = [
        '作者',
        '视频ID',
        '描述',
        '点赞数',
        '评论数',
        '分享数',
        '播放数',
        '创建时间',
        '视频链接',
        '是否CapCut投稿',
        '来源平台代码'
    ];
    writeStream.write(headers.join(',') + '\n');

    // 读取作者列表
    let authorsData = [];

    // 检查文件格式（CSV还是纯文本）
    const fileContent = fs.readFileSync(authorsFile, 'utf8');
    if (fileContent.includes(',') || authorsFile.toLowerCase().endsWith('.csv')) {
        // CSV格式，支持时长过滤
        console.log('检测到CSV格式，尝试读取时长过滤信息...');
        const csv = require('csv-parser');
        await new Promise((resolve, reject) => {
            fs.createReadStream(authorsFile)
                .pipe(csv())
                .on('data', (row) => {
                    const rowValues = Object.values(row);
                    const author = rowValues[0]?.trim();
                    const duration = rowValues[1]?.trim();
                    
                    if (author && !author.startsWith('#')) {
                        const item = { author };
                        // 如果第二列存在且是有效数字，则添加时长过滤
                        if (duration && /^\d+$/.test(duration)) {
                            item.expectedDuration = parseInt(duration);
                        }
                        authorsData.push(item);
                    }
                })
                .on('end', () => {
                    resolve();
                })
                .on('error', (err) => {
                    reject(err);
                });
        });
    } else {
        // 纯文本格式，每行一个作者
        console.log('检测到纯文本格式...');
        const authors = fileContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(author => ({ author }));
        authorsData = authors;
    }

    // 检查是否启用了时长过滤模式
    const hasDurationFilter = authorsData.some(item => item.expectedDuration !== undefined);
    if (hasDurationFilter) {
        console.log('✅ 检测到时长过滤模式：仅时长匹配的视频会被标记为CapCut');
    }

    console.log(`找到 ${authorsData.length} 个作者，开始批量查询...`);

    // 计算时间范围
    const now = new Date();
    const timeRangeInMs = timeUnit === 'weeks' 
        ? timeRange * 7 * 24 * 60 * 60 * 1000 
        : timeRange * 30 * 24 * 60 * 60 * 1000;
    const startTime = new Date(now.getTime() - timeRangeInMs);

    const allVideos = [];
    let successCount = 0;
    let failCount = 0;
    
    for (const authorData of authorsData) {
        try {
            const authorVideos = await processAuthor(authorData, startTime);
            if (authorVideos.length > 0) {
                // 写入数据到CSV
                authorVideos.forEach(video => {
                    const row = [
                        video.author,
                        video.videoId,
                        video.description,
                        video.likes,
                        video.comments,
                        video.shares,
                        video.plays,
                        video.createTime,
                        video.videoUrl,
                        video.isCapCut,
                        video.sourcePlatform
                    ].map(escapeCsvField).join(',');
                    writeStream.write(row + '\n');
                });
                
                allVideos.push(...authorVideos);
                successCount++;
                console.log(`\n成功获取 ${authorVideos.length} 个视频`);
            } else {
                failCount++;
            }
        } catch (error) {
            failCount++;
            console.error(`处理作者 ${author} 时出错:`, error.message);
        }
        
        if (authors.indexOf(author) !== authors.length - 1) {
            console.log('\n等待3秒后继续...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    // 关闭写入流
    writeStream.end();
    
    // 等待写入完成
    await new Promise(resolve => writeStream.on('finish', resolve));
    
    console.log('\n获取完成:');
    console.log(`成功处理 ${successCount} 个作者`);
    console.log(`失败处理 ${failCount} 个作者`);
    
    if (allVideos.length === 0) {
        console.log('\n未找到任何视频，请检查：');
        console.log('1. 作者名称是否正确');
        console.log('2. 网络连接是否正常');
        console.log('3. TikTok API是否有变化');
    } else {
        console.log(`\n成功获取总计 ${allVideos.length} 个视频信息`);
        console.log(`数据已保存到: ${outputFile}`);
        
        console.log('\n如何正确打开CSV文件：');
        console.log('1. 使用Excel打开时，选择"数据" -> "从文本/CSV"');
        console.log('2. 在打开对话框中，确保"文件原始格式"选择为"UTF-8"');
        console.log('3. 点击"加载"即可正确显示中文内容');
    }
}

main().catch(console.error); 