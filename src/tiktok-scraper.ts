import axios from 'axios';
import { writeFile } from 'fs/promises';
import path from 'path';

interface TikTokVideo {
    id: string;
    desc: string;
    createTime: number;
    video: {
        id: string;
        height: number;
        width: number;
        duration: number;
        ratio: string;
        cover: string;
        originCover: string;
        dynamicCover: string;
        playAddr: string;
        downloadAddr: string;
    };
    author: {
        id: string;
        uniqueId: string;
        nickname: string;
        avatarLarger: string;
        signature: string;
        verified: boolean;
    };
    stats: {
        diggCount: number;
        shareCount: number;
        commentCount: number;
        playCount: number;
    };
    music: {
        id: string;
        title: string;
        authorName: string;
        original: boolean;
        playUrl: string;
        coverLarge: string;
        duration: number;
    };
}

class TikTokScraper {
    private headers = {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'referer': 'https://www.tiktok.com/',
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'zh-CN,zh;q=0.9',
    };

    private async makeRequest(url: string) {
        try {
            const response = await axios.get(url, {
                headers: this.headers,
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`请求失败: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * 获取用户视频列表
     * @param username TikTok 用户名
     * @param limit 获取视频数量限制
     */
    async getUserVideos(username: string, limit: number = 30) {
        try {
            // 首先获取用户页面的 HTML
            const userPageUrl = `https://www.tiktok.com/@${username}`;
            const response = await axios.get(userPageUrl, { headers: this.headers });
            const html = response.data;

            // 从 HTML 中提取 secUid
            const secUidMatch = html.match(/"secUid":"([^"]+)"/);
            if (!secUidMatch) {
                throw new Error('无法获取用户 secUid');
            }
            const secUid = secUidMatch[1];

            // 获取用户视频列表
            const apiUrl = `https://www.tiktok.com/api/post/item_list/?aid=1988&secUid=${secUid}&count=${limit}`;
            const data = await this.makeRequest(apiUrl);
            return data.itemList || [];
        } catch (error) {
            console.error('获取用户视频失败:', error);
            return [];
        }
    }

    /**
     * 获取热门视频
     * @param limit 获取视频数量限制
     */
    async getTrendingVideos(limit: number = 30) {
        try {
            const url = `https://www.tiktok.com/api/recommend/item_list/?aid=1988&count=${limit}&region=CN`;
            const data = await this.makeRequest(url);
            return data.itemList || [];
        } catch (error) {
            console.error('获取热门视频失败:', error);
            return [];
        }
    }

    /**
     * 下载视频
     * @param video 视频信息
     * @param outputDir 输出目录
     */
    async downloadVideo(video: TikTokVideo, outputDir: string = './downloads') {
        try {
            const videoUrl = video.video.playAddr || video.video.downloadAddr;
            if (!videoUrl) {
                throw new Error('无法获取视频地址');
            }

            const response = await axios({
                method: 'GET',
                url: videoUrl,
                responseType: 'arraybuffer',
                headers: {
                    ...this.headers,
                    'range': 'bytes=0-'
                }
            });

            const filename = `${video.id}.mp4`;
            const filepath = path.join(outputDir, filename);
            await writeFile(filepath, response.data);
            console.log(`视频已下载: ${filepath}`);
            return filepath;
        } catch (error) {
            console.error('下载视频失败:', error);
            return null;
        }
    }

    /**
     * 搜索视频
     * @param keyword 搜索关键词
     * @param limit 获取视频数量限制
     */
    async searchVideos(keyword: string, limit: number = 30) {
        try {
            const url = `https://www.tiktok.com/api/search/general/full/?aid=1988&keyword=${encodeURIComponent(keyword)}&count=${limit}`;
            const data = await this.makeRequest(url);
            return data.data || [];
        } catch (error) {
            console.error('搜索视频失败:', error);
            return [];
        }
    }
}

export default TikTokScraper; 