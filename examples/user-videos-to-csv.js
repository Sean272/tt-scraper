const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { detectCapCutSource } = require('./capcut-detector');

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

async function getUserVideos(username, limit = 30) {
    try {
        const headers = {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'referer': 'https://www.tiktok.com/',
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'zh-CN,zh;q=0.9'
        };

        // 首先获取用户的secUid
        const userPageResponse = await axios.get(`https://www.tiktok.com/@${username}`, {
            headers
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
                secUid: secUid,
                count: limit,
                cursor: 0
            },
            headers
        });

        if (response.data && response.data.itemList) {
            // 准备CSV数据 (增加CapCut检测字段)
            const csvData = [
                ['视频ID', '描述', '作者', '点赞数', '评论数', '分享数', '播放数', '创建时间', '视频链接', '是否CapCut投稿', '来源平台代码']
            ];

            // 异步处理每个视频，添加CapCut检测
            console.log('正在检测CapCut投稿信息...');
            for (let i = 0; i < response.data.itemList.length; i++) {
                const video = response.data.itemList[i];
                const createTime = new Date(video.createTime * 1000).toLocaleString();
                
                // 获取CapCut检测信息
                process.stdout.write(`处理视频 ${i + 1}/${response.data.itemList.length}...`);
                const capCutInfo = await getVideoDetailForCapCut(video.id);
                console.log(` ${capCutInfo.isCapCut}`);
                
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
                if (i < response.data.itemList.length - 1) {
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

            console.log(`\n成功获取 ${response.data.itemList.length} 个视频信息`);
            console.log(`数据已保存到: ${outputPath}`);

            // 打印前5个视频的信息作为预览
            console.log('\n前5个视频预览:');
            response.data.itemList.slice(0, 5).forEach((video, index) => {
                console.log(`\n视频 ${index + 1}:`);
                console.log(`- 描述: ${video.desc}`);
                console.log(`- 作者: ${video.author.uniqueId}`);
                console.log(`- 点赞数: ${video.stats.diggCount}`);
                console.log(`- 播放数: ${video.stats.playCount}`);
                console.log(`- 视频链接: https://www.tiktok.com/@${video.author.uniqueId}/video/${video.id}`);
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

// 运行示例
const username = process.argv[2] || 'tiktok'; // 默认用户名为'tiktok'
const limit = parseInt(process.argv[3]) || 30; // 默认获取30个视频

console.log(`正在获取用户 @${username} 的视频信息...`);
getUserVideos(username, limit); 