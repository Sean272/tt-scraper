const axios = require('axios');

async function getTrendingVideos(limit = 5) {
    try {
        const headers = {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'referer': 'https://www.tiktok.com/',
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'zh-CN,zh;q=0.9'
        };

        const response = await axios.get('https://www.tiktok.com/api/recommend/item_list/', {
            params: {
                aid: '1988',
                app_name: 'tiktok_web',
                device_platform: 'web',
                region: 'CN',
                count: limit
            },
            headers
        });

        if (response.data && response.data.itemList) {
            console.log('\n获取到的视频:');
            response.data.itemList.forEach((video, index) => {
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
console.log('正在获取热门视频...');
getTrendingVideos(); 