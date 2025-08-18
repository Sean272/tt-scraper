import { PostCollector } from '../types/TikTok';

export = {
    scrape: [
        'user',
        'hashtag',
        'trend',
        'music',
        'discover_user',
        'discover_hashtag',
        'discover_music',
        'history',
        'video',
        'from-file',
        'userprofile',
    ],
    chronologicalTypes: ['user'],
    history: ['user', 'hashtag', 'trend', 'music'],
    requiredSession: ['user', 'hashtag', 'trend', 'music'],
    sourceType: {
        user: 8,
        music: 11,
        trend: 12,
    },
    /**
     * verifyFp is used to bypass captcha
     * Currently this method is with hardcoded values
     * later I or someone else will implement proper way to generate valid value
     */
    verifyFp: () => {
        const variants: string[] = [];
        return variants[Math.floor(Math.random() * variants.length)];
    },
    /**
     * Generate random user-agent with randon versions(fake)
     */
    userAgent: () => {
        const os = [
            'Macintosh; Intel Mac OS X 10_15_7',
            'Macintosh; Intel Mac OS X 10_15_5',
            'Macintosh; Intel Mac OS X 10_11_6',
            'Macintosh; Intel Mac OS X 10_6_6',
            'Macintosh; Intel Mac OS X 10_9_5',
            'Macintosh; Intel Mac OS X 10_10_5',
            'Macintosh; Intel Mac OS X 10_7_5',
            'Macintosh; Intel Mac OS X 10_11_3',
            'Macintosh; Intel Mac OS X 10_10_3',
            'Macintosh; Intel Mac OS X 10_6_8',
            'Macintosh; Intel Mac OS X 10_10_2',
            'Macintosh; Intel Mac OS X 10_10_3',
            'Macintosh; Intel Mac OS X 10_11_5',
            'Windows NT 10.0; Win64; x64',
            'Windows NT 10.0; WOW64',
            'Windows NT 10.0',
        ];

        return `Mozilla/5.0 (${os[Math.floor(Math.random() * os.length)]}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(
            Math.random() * 3,
        ) + 87}.0.${Math.floor(Math.random() * 190) + 4100}.${Math.floor(Math.random() * 50) + 140} Safari/537.36`;
    },
    webUrl: 'https://www.tiktok.com',
    apiUrl: 'https://m.tiktok.com/api',
    headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        referer: 'https://www.tiktok.com/',
        cookie: 'tt_webid_v2=689854141086886123',
    },
    params: {
        aid: '1988',
        app_language: 'en',
        device_platform: 'webapp',
        screen_width: '1920',
        screen_height: '1080',
        browser_language: 'en',
        browser_platform: 'Win32',
        browser_name: 'Mozilla',
        browser_version: '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        browser_online: 'true',
        verifyFp: '',
        device_id: '',
        region: 'US',
        appId: '1233',
        channel: 'tiktok_web',
    },
    addParams: {
        count: 30,
        cursor: 0,
        device_id: '',
        aid: '1988',
        app_language: 'en',
        device_platform: 'webapp',
        screen_width: '1920',
        screen_height: '1080',
        browser_language: 'en',
        browser_platform: 'Win32',
        browser_name: 'Mozilla',
        browser_version: '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        browser_online: 'true',
        verifyFp: '',
        region: 'US',
        appId: '1233',
        channel: 'tiktok_web',
    },
    videoMeta: (video: PostCollector): PostCollector => {
        if (video.videoMeta && video.videoMeta.ratio) {
            return video;
        }
        return video;
    },
};
