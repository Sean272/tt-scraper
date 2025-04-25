const axios = require('axios');

async function getFullVideoData(username, limit = 1) {
    try {
        const headers = {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'referer': 'https://www.tiktok.com/',
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'zh-CN,zh;q=0.9'
        };

        // 获取用户的secUid
        const userPageResponse = await axios.get(`https://www.tiktok.com/@${username}`, {
            headers
        });

        const secUidMatch = userPageResponse.data.match(/"secUid":"([^"]+)"/);
        if (!secUidMatch) {
            throw new Error('无法获取用户secUid');
        }
        const secUid = secUidMatch[1];

        // 获取视频列表
        const response = await axios.get('https://www.tiktok.com/api/post/item_list/', {
            params: {
                aid: '1988',
                secUid: secUid,
                count: limit,
                cursor: 0
            },
            headers
        });

        if (response.data && response.data.itemList && response.data.itemList.length > 0) {
            const video = response.data.itemList[0];
            console.log('\n完整的视频数据结构：');
            console.log(JSON.stringify(video, null, 2));

            console.log('\n\n主要数据字段说明：');
            console.log('基本信息：');
            console.log('- 视频ID:', video.id);
            console.log('- 描述:', video.desc);
            console.log('- 创建时间:', new Date(video.createTime * 1000).toLocaleString());
            
            console.log('\n作者信息：');
            console.log('- 用户ID:', video.author.id);
            console.log('- 用户名:', video.author.uniqueId);
            console.log('- 昵称:', video.author.nickname);
            console.log('- 签名:', video.author.signature);
            console.log('- 是否认证:', video.author.verified);
            
            console.log('\n视频数据：');
            console.log('- 时长:', video.video.duration, '秒');
            console.log('- 原始尺寸:', video.video.width, 'x', video.video.height);
            console.log('- 比特率:', video.video.bitrate);
            console.log('- 编码格式:', video.video.format);
            console.log('- 是否原创:', video.video.original);
            
            console.log('\n音乐信息：');
            console.log('- 音乐ID:', video.music.id);
            console.log('- 标题:', video.music.title);
            console.log('- 作者:', video.music.authorName);
            console.log('- 时长:', video.music.duration, '秒');
            console.log('- 是否原创:', video.music.original);
            
            console.log('\n统计数据：');
            console.log('- 播放数:', video.stats.playCount);
            console.log('- 点赞数:', video.stats.diggCount);
            console.log('- 分享数:', video.stats.shareCount);
            console.log('- 评论数:', video.stats.commentCount);
            console.log('- 收藏数:', video.stats.collectCount);
            
            console.log('\n其他信息：');
            console.log('- 话题标签:', video.challenges ? video.challenges.map(c => '#' + c.title).join(', ') : '无');
            console.log('- 是否有商业合作:', !!video.commercialInfo);
            console.log('- 是否包含特效:', video.effectStickers ? video.effectStickers.length > 0 : false);
            console.log('- 视频类型:', video.videoType);
            if (video.aiInfo) {
                console.log('- AI相关信息:', video.aiInfo);
            }
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
const username = process.argv[2] || 'tiktok';
console.log(`正在获取用户 @${username} 的视频详细信息...`);
getFullVideoData(username); 