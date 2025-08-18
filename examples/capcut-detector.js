export function detectCapCutSource(videoData) {
    try {
        // 检查音乐来源平台
        const sourcePlatform = videoData.music?.source_platform || '';
        const isCapCut = sourcePlatform === '24';
        
        return {
            isCapCut,
            sourcePlatform
        };
    } catch (error) {
        console.error('CapCut检测失败:', error);
        return {
            isCapCut: false,
            sourcePlatform: ''
        };
    }
}