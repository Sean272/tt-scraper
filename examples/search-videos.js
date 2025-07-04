const { TikTokScraper } = require('../src/core/TikTok');

async function main() {
    try {
        // 创建TikTokScraper实例，设置为获取热门视频
        const scraper = new TikTokScraper({
            type: 'trend',  // 设置类型为trend以获取热门视频
            number: 5,      // 限制获取5个视频
            download: false // 不下载视频
        });
        
        // 获取热门视频
        console.log('正在获取热门视频...');
        const results = await scraper.scrape();
        
        // 打印结果
        console.log('\n获取到的视频:');
        results.collector.forEach((post, index) => {
            console.log(`\n视频 ${index + 1}:`);
            console.log(`- 描述: ${post.text}`);
            console.log(`- 作者: ${post.authorMeta.name}`);
            console.log(`- 点赞数: ${post.diggCount}`);
            console.log(`- 播放数: ${post.playCount}`);
            console.log(`- 视频链接: ${post.webVideoUrl}`);
        });
        
    } catch (error) {
        console.error('发生错误:', error);
    }
}

main(); 