const axios = require('axios');

async function getPopularVideos() {
    try {
        const headers = {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'referer': 'https://www.tiktok.com/',
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'zh-CN,zh;q=0.9'
        };

        // 获取热门视频
        const response = await axios.get('https://www.tiktok.com/api/recommend/item_list/', {
            params: {
                aid: '1988',
                count: 20,
                from_page: 'fyp',
                deviceId: 'virtual_device_id_' + Date.now()
            },
            headers
        });

        if (response.data && response.data.itemList) {
            console.log(`\n获取到 ${response.data.itemList.length} 个热门视频：`);
            
            response.data.itemList.forEach((item, index) => {
                console.log(`\n视频 ${index + 1}:`);
                console.log('描述:', item.desc);
                console.log('作者:', item.author?.nickname);
                console.log('播放量:', item.stats?.playCount);
                console.log('点赞数:', item.stats?.diggCount);
                
                // 检查特效相关信息
                console.log('\n特效相关信息:');
                
                // 检查特效贴纸
                if (item.effectStickers && item.effectStickers.length > 0) {
                    console.log('特效贴纸:');
                    item.effectStickers.forEach(effect => {
                        console.log('- 名称:', effect.name || '未命名');
                        console.log('  ID:', effect.ID);
                        console.log('  类型:', effect.type);
                        if (effect.icon) {
                            console.log('  图标:', effect.icon.urlList[0]);
                        }
                    });
                } else {
                    console.log('未检测到特效贴纸');
                }

                // 检查滤镜信息
                if (item.effectFilters && item.effectFilters.length > 0) {
                    console.log('\n滤镜效果:');
                    console.log(item.effectFilters);
                }

                // 检查视频特效
                if (item.videoMeta?.effects) {
                    console.log('\n视频特效:');
                    console.log(item.videoMeta.effects);
                }

                // 检查音乐特效
                if (item.music?.effects) {
                    console.log('\n音乐特效:');
                    console.log(item.music.effects);
                }

                // 检查标签中是否包含特效相关标签
                if (item.challenges) {
                    const effectRelatedTags = item.challenges
                        .filter(tag => /effect|filter|transition|edit|特效|滤镜|转场/.test(tag.title.toLowerCase()))
                        .map(tag => '#' + tag.title);
                    
                    if (effectRelatedTags.length > 0) {
                        console.log('\n特效相关标签:', effectRelatedTags.join(', '));
                    }
                }

                // 检查视频描述中是否提到特效
                if (/effect|filter|transition|edit|特效|滤镜|转场/.test(item.desc.toLowerCase())) {
                    console.log('\n描述中提到特效相关内容');
                }

                console.log('\n视频链接:', `https://www.tiktok.com/@${item.author?.uniqueId}/video/${item.id}`);
                console.log('================================================');
            });

            // 统计信息
            const videosWithEffects = response.data.itemList.filter(item => 
                (item.effectStickers && item.effectStickers.length > 0) ||
                (item.effectFilters && item.effectFilters.length > 0) ||
                (item.videoMeta?.effects) ||
                (item.music?.effects)
            ).length;

            console.log(`\n统计信息：`);
            console.log(`总视频数: ${response.data.itemList.length}`);
            console.log(`包含特效的视频数: ${videosWithEffects}`);
            console.log(`特效使用比例: ${((videosWithEffects / response.data.itemList.length) * 100).toFixed(2)}%`);

        } else {
            console.log('未能获取到视频数据');
        }
    } catch (error) {
        console.error('获取视频失败:', error.message);
        if (error.response) {
            console.error('错误详情:', error.response.data);
        }
    }
}

// 运行获取热门视频
getPopularVideos(); 