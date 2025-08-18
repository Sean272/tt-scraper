const fs = require('fs');
const path = require('path');

// 详细分析所有字段的所有可能值
function detailedFieldAnalysis() {
    const outputDir = path.join(__dirname, 'output');
    const files = fs.readdirSync(outputDir).filter(file => 
        file.startsWith('capcut_analysis_') && file.endsWith('.json')
    );
    
    console.log(`\n=== 详细字段分析 ===`);
    console.log(`分析 ${files.length} 个结果文件\n`);
    
    const allFields = {
        music_source_platform: new Set(),
        added_sound_source_platform: new Set(),
        item_distribute_source: new Set(),
        item_source_category: new Set(),
        shoot_tab_name: new Set(),
        content_type: new Set()
    };
    
    const results = [];
    
    files.forEach(file => {
        try {
            const filePath = path.join(outputDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            const result = {
                video_id: data.video_id,
                is_capcut: data.capcut_analysis.isCapCut,
                confidence: data.capcut_analysis.confidence,
                fields: data.platform_fields
            };
            
            results.push(result);
            
            // 收集所有字段的所有可能值
            Object.keys(allFields).forEach(fieldName => {
                const value = data.platform_fields[fieldName];
                if (value !== undefined && value !== null) {
                    allFields[fieldName].add(value);
                }
            });
            
        } catch (error) {
            console.error(`读取文件 ${file} 失败:`, error.message);
        }
    });
    
    // 显示每个字段的所有可能值
    console.log('=== 各字段的所有可能值 ===\n');
    
    Object.entries(allFields).forEach(([fieldName, values]) => {
        console.log(`${fieldName}:`);
        const sortedValues = Array.from(values).sort();
        sortedValues.forEach(value => {
            const count = results.filter(r => r.fields[fieldName] === value).length;
            const percentage = ((count / results.length) * 100).toFixed(1);
            console.log(`  ${value}: ${count} 个 (${percentage}%)`);
        });
        console.log('');
    });
    
    // 详细的组合分析
    console.log('=== 字段组合详细分析 ===\n');
    
    const combinations = {};
    
    results.forEach(result => {
        const key = `${result.fields.music_source_platform}_${result.fields.shoot_tab_name}_${result.fields.content_type}`;
        if (!combinations[key]) {
            combinations[key] = {
                count: 0,
                capcut_detected: 0,
                examples: [],
                fields: {
                    music_source_platform: result.fields.music_source_platform,
                    shoot_tab_name: result.fields.shoot_tab_name,
                    content_type: result.fields.content_type,
                    item_distribute_source: result.fields.item_distribute_source
                }
            };
        }
        combinations[key].count++;
        if (result.is_capcut) {
            combinations[key].capcut_detected++;
        }
        combinations[key].examples.push(result.video_id);
    });
    
    Object.entries(combinations).forEach(([key, data]) => {
        const capCutRate = ((data.capcut_detected / data.count) * 100).toFixed(1);
        console.log(`组合模式:`);
        console.log(`  music_source_platform: ${data.fields.music_source_platform}`);
        console.log(`  shoot_tab_name: ${data.fields.shoot_tab_name}`);
        console.log(`  content_type: ${data.fields.content_type}`);
        console.log(`  item_distribute_source: ${data.fields.item_distribute_source}`);
        console.log(`  视频数量: ${data.count}`);
        console.log(`  CapCut检测率: ${capCutRate}%`);
        console.log(`  示例: ${data.examples.slice(0, 2).join(', ')}${data.examples.length > 2 ? '...' : ''}`);
        console.log('');
    });
    
    // 异常值检测
    console.log('=== 可能需要关注的异常值 ===\n');
    
    const platformGroups = {};
    results.forEach(result => {
        const platform = result.fields.music_source_platform;
        if (!platformGroups[platform]) {
            platformGroups[platform] = {
                capcut: [],
                non_capcut: []
            };
        }
        if (result.is_capcut) {
            platformGroups[platform].capcut.push(result.video_id);
        } else {
            platformGroups[platform].non_capcut.push(result.video_id);
        }
    });
    
    Object.entries(platformGroups).forEach(([platform, groups]) => {
        if (groups.capcut.length > 0 && groups.non_capcut.length > 0) {
            console.log(`⚠️ 平台 ${platform} 同时有 CapCut 和非 CapCut 视频:`);
            console.log(`  CapCut: ${groups.capcut.length} 个`);
            console.log(`  非CapCut: ${groups.non_capcut.length} 个`);
            console.log('');
        }
    });
    
    return results;
}

// 如果直接运行此文件
if (require.main === module) {
    detailedFieldAnalysis();
}

module.exports = { detailedFieldAnalysis }; 