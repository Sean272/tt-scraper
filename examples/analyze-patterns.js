const fs = require('fs');
const path = require('path');

// 读取所有CapCut分析结果文件
function analyzeAllResults() {
    const outputDir = path.join(__dirname, 'output');
    const files = fs.readdirSync(outputDir).filter(file => 
        file.startsWith('capcut_analysis_') && file.endsWith('.json')
    );
    
    console.log(`\n=== 所有测试视频的关键字段分析 ===`);
    console.log(`共找到 ${files.length} 个分析结果文件\n`);
    
    const results = [];
    
    files.forEach(file => {
        try {
            const filePath = path.join(outputDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            results.push({
                video_id: data.video_id,
                is_capcut: data.capcut_analysis.isCapCut,
                confidence: data.capcut_analysis.confidence,
                music_source_platform: data.platform_fields.music_source_platform,
                added_sound_source_platform: data.platform_fields.added_sound_music_info_source_platform,
                item_distribute_source: data.platform_fields.item_distribute_source,
                item_source_category: data.platform_fields.item_source_category,
                shoot_tab_name: data.platform_fields.shoot_tab_name,
                content_type: data.platform_fields.content_type,
                timestamp: data.timestamp
            });
        } catch (error) {
            console.error(`读取文件 ${file} 失败:`, error.message);
        }
    });
    
    // 按视频ID排序
    results.sort((a, b) => a.video_id.localeCompare(b.video_id));
    
    // 显示表格
    console.log('视频ID'.padEnd(20) + ' | ' +
                'CapCut'.padEnd(8) + ' | ' +
                '音乐平台'.padEnd(8) + ' | ' +
                '音频平台'.padEnd(8) + ' | ' +
                '分发来源'.padEnd(15) + ' | ' +
                '拍摄标签'.padEnd(12) + ' | ' +
                '内容类型'.padEnd(10));
    console.log('-'.repeat(100));
    
    results.forEach(result => {
        const capcut = result.is_capcut ? '是' : '否';
        const musicPlatform = result.music_source_platform || '未知';
        const addedSoundPlatform = result.added_sound_source_platform || '未知';
        const distributeSource = result.item_distribute_source || '未知';
        const shootTab = result.shoot_tab_name || '未知';
        const contentType = result.content_type || '未知';
        
        console.log(result.video_id.padEnd(20) + ' | ' +
                    capcut.padEnd(8) + ' | ' +
                    musicPlatform.toString().padEnd(8) + ' | ' +
                    addedSoundPlatform.toString().padEnd(8) + ' | ' +
                    distributeSource.padEnd(15) + ' | ' +
                    shootTab.padEnd(12) + ' | ' +
                    contentType.padEnd(10));
    });
    
    // 统计分析
    console.log('\n=== 统计分析 ===');
    
    const platformCounts = {};
    const shootTabCounts = {};
    const distributeCounts = {};
    
    results.forEach(result => {
        // 统计平台代码
        const platform = result.music_source_platform;
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        
        // 统计拍摄标签
        const shootTab = result.shoot_tab_name;
        shootTabCounts[shootTab] = (shootTabCounts[shootTab] || 0) + 1;
        
        // 统计分发来源
        const distribute = result.item_distribute_source;
        distributeCounts[distribute] = (distributeCounts[distribute] || 0) + 1;
    });
    
    console.log('\nmusic_source_platform 分布:');
    Object.entries(platformCounts).forEach(([platform, count]) => {
        const percentage = ((count / results.length) * 100).toFixed(1);
        console.log(`  ${platform}: ${count} 个 (${percentage}%)`);
    });
    
    console.log('\nshoot_tab_name 分布:');
    Object.entries(shootTabCounts).forEach(([tab, count]) => {
        const percentage = ((count / results.length) * 100).toFixed(1);
        console.log(`  ${tab}: ${count} 个 (${percentage}%)`);
    });
    
    console.log('\nitem_distribute_source 分布:');
    Object.entries(distributeCounts).forEach(([source, count]) => {
        const percentage = ((count / results.length) * 100).toFixed(1);
        console.log(`  ${source}: ${count} 个 (${percentage}%)`);
    });
    
    // 模式分析
    console.log('\n=== 模式分析 ===');
    const patterns = {};
    
    results.forEach(result => {
        const pattern = `${result.music_source_platform}_${result.shoot_tab_name}`;
        if (!patterns[pattern]) {
            patterns[pattern] = {
                count: 0,
                capcut_detected: 0,
                examples: []
            };
        }
        patterns[pattern].count++;
        if (result.is_capcut) {
            patterns[pattern].capcut_detected++;
        }
        patterns[pattern].examples.push(result.video_id);
    });
    
    Object.entries(patterns).forEach(([pattern, data]) => {
        const [platform, shootTab] = pattern.split('_');
        const capCutRate = ((data.capcut_detected / data.count) * 100).toFixed(1);
        console.log(`模式: source_platform=${platform} + shoot_tab_name=${shootTab}`);
        console.log(`  视频数量: ${data.count}`);
        console.log(`  CapCut检测率: ${capCutRate}%`);
        console.log(`  示例: ${data.examples.slice(0, 2).join(', ')}${data.examples.length > 2 ? '...' : ''}`);
        console.log('');
    });
    
    return results;
}

// 如果直接运行此文件
if (require.main === module) {
    analyzeAllResults();
}

module.exports = { analyzeAllResults }; 