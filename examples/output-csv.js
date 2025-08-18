const fs = require('fs');
const path = require('path');

/**
 * 生成包含BOM标记的CSV文件
 * @param {string} filePath - 文件路径
 * @param {Array} headers - CSV表头
 * @param {Array} data - CSV数据行
 */
function writeCSVWithBOM(filePath, headers, data) {
    // 定义BOM标记 (UTF-8)
    const BOM = '\ufeff';
    
    // 创建CSV内容
    const headerRow = headers.join(',');
    const dataRows = data.map(row => 
        headers.map(header => {
            // 将值转换为字符串并处理null/undefined
            const value = row[header] !== null && row[header] !== undefined 
                ? String(row[header]) 
                : '';
            
            // 处理包含逗号、引号或换行的字段
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',')
    );
    
    // 组合所有行
    const csvContent = [headerRow, ...dataRows].join('\n');
    
    // 添加BOM标记并写入文件
    fs.writeFileSync(filePath, BOM + csvContent, 'utf8');
    
    console.log(`CSV文件已保存至: ${filePath}`);
}

// 示例使用
if (require.main === module) {
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testFile = path.join(outputDir, `test-bom-${timestamp}.csv`);
    
    const headers = ['ID', '名称', '描述', '数量'];
    const data = [
        { 'ID': 1, '名称': '测试产品1', '描述': '这是一个测试产品', '数量': 100 },
        { 'ID': 2, '名称': '测试产品2', '描述': '这是另一个测试产品,带逗号', '数量': 200 },
        { 'ID': 3, '名称': '中文测试', '描述': '包含"引号"的描述', '数量': 300 }
    ];
    
    writeCSVWithBOM(testFile, headers, data);
}

module.exports = { writeCSVWithBOM }; 