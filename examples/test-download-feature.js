#!/usr/bin/env node

/**
 * 批量视频下载功能测试脚本
 * 用于验证下载功能是否正常工作
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 批量视频下载功能测试');
console.log('========================');

// 测试1：检查脚本文件是否存在
console.log('\n1. 检查脚本文件...');
const scriptPath = path.join(__dirname, 'batch-video-details-with-download.js');
if (fs.existsSync(scriptPath)) {
    console.log('✅ 脚本文件存在');
} else {
    console.log('❌ 脚本文件不存在');
    process.exit(1);
}

// 测试2：检查示例CSV文件
console.log('\n2. 检查示例CSV文件...');
const csvPath = path.join(__dirname, 'sample-videos-for-download.csv');
if (fs.existsSync(csvPath)) {
    console.log('✅ 示例CSV文件存在');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    console.log(`   包含 ${lines.length - 1} 个视频ID`);
} else {
    console.log('❌ 示例CSV文件不存在');
}

// 测试3：检查输出目录
console.log('\n3. 检查输出目录...');
const outputDir = path.join(__dirname, 'output');
const downloadDir = path.join(__dirname, 'downloads');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('✅ 创建输出目录');
} else {
    console.log('✅ 输出目录存在');
}

if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
    console.log('✅ 创建下载目录');
} else {
    console.log('✅ 下载目录存在');
}

// 测试4：检查依赖
console.log('\n4. 检查依赖...');
try {
    require('axios');
    require('csv-parser');
    require('csv-writer');
    console.log('✅ 所有依赖已安装');
} catch (error) {
    console.log('❌ 缺少依赖:', error.message);
    console.log('请运行: npm install');
}

// 测试5：显示使用说明
console.log('\n5. 使用说明...');
console.log('📝 基本用法:');
console.log('   node examples/batch-video-details-with-download.js examples/sample-videos-for-download.csv');
console.log('');
console.log('📥 带下载功能:');
console.log('   node examples/batch-video-details-with-download.js examples/sample-videos-for-download.csv --download');
console.log('');
console.log('📊 输出文件:');
console.log('   - CSV数据: examples/output/batch_videos_*.csv');
console.log('   - 视频文件: examples/downloads/*.mp4');

console.log('\n🎉 测试完成！');
console.log('现在可以运行上述命令来测试下载功能。'); 