import TikTokScraper from '../src/tiktok-scraper';
import { mkdir } from 'fs/promises';
import path from 'path';

async function main() {
    const scraper = new TikTokScraper();
    const outputDir = path.join(__dirname, 'downloads');

    try {
        // 创建下载目录
        await mkdir(outputDir, { recursive: true });

        // 获取用户视频
        console.log('获取用户视频...');
        const userVideos = await scraper.getUserVideos('tiktok', 5);
        console.log(`找到 ${userVideos.length} 个用户视频`);
        console.log('用户视频列表:', JSON.stringify(userVideos, null, 2));

        // 获取热门视频
        console.log('\n获取热门视频...');
        const trendingVideos = await scraper.getTrendingVideos(5);
        console.log(`找到 ${trendingVideos.length} 个热门视频`);
        console.log('热门视频列表:', JSON.stringify(trendingVideos, null, 2));

        // 搜索视频
        const keyword = '猫';
        console.log(`\n搜索关键词 "${keyword}" 的视频...`);
        const searchResults = await scraper.searchVideos(keyword, 5);
        console.log(`找到 ${searchResults.length} 个相关视频`);
        console.log('搜索结果:', JSON.stringify(searchResults, null, 2));

        // 下载第一个热门视频（如果有的话）
        if (trendingVideos.length > 0) {
            console.log('\n下载第一个热门视频...');
            await scraper.downloadVideo(trendingVideos[0], outputDir);
        }

    } catch (error) {
        console.error('发生错误:', error);
    }
}

main(); 