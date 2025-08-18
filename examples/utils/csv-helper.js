const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');

/**
 * 创建带有正确UTF-8编码的CSV写入器
 * @param {string} outputPath - 输出文件路径
 * @param {Array} header - CSV头部定义
 * @returns {Object} CSV写入器对象
 */
function createUtf8CsvWriter(outputPath, header) {
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    encoding: 'utf8',
    header: header
  });
  
  return {
    ...csvWriter,
    // 重写writeRecords方法，添加BOM标记
    writeRecords: async function(records) {
      await csvWriter.writeRecords(records);
      
      // 添加UTF-8 BOM标记
      const csvContent = fs.readFileSync(outputPath, 'utf8');
      const bom = '\uFEFF'; // UTF-8 BOM
      fs.writeFileSync(outputPath, bom + csvContent, 'utf8');
    }
  };
}

/**
 * 验证CSV文件编码
 * @param {string} filePath - CSV文件路径
 * @returns {Object} 验证结果
 */
function validateCsvEncoding(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const hasBom = buffer.length >= 3 && 
                   buffer[0] === 0xEF && 
                   buffer[1] === 0xBB && 
                   buffer[2] === 0xBF;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const hasChinese = /[\u4e00-\u9fff]/.test(content);
    
    return {
      success: true,
      hasBom: hasBom,
      hasChinese: hasChinese,
      fileSize: buffer.length,
      encoding: hasBom ? 'UTF-8 with BOM' : 'UTF-8'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 修复CSV文件编码
 * @param {string} filePath - CSV文件路径
 * @returns {boolean} 是否成功修复
 */
function fixCsvEncoding(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const bom = '\uFEFF'; // UTF-8 BOM
    
    // 检查是否已有BOM
    if (!content.startsWith(bom)) {
      fs.writeFileSync(filePath, bom + content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error('修复CSV编码失败:', error);
    return false;
  }
}

/**
 * 创建测试CSV文件
 * @param {string} outputPath - 输出路径
 * @param {Array} testData - 测试数据
 */
async function createTestCsv(outputPath, testData) {
  const header = Object.keys(testData[0]).map(key => ({
    id: key,
    title: key
  }));
  
  const csvWriter = createUtf8CsvWriter(outputPath, header);
  await csvWriter.writeRecords(testData);
  
  console.log(`✅ 测试CSV文件已创建: ${outputPath}`);
  
  // 验证编码
  const validation = validateCsvEncoding(outputPath);
  if (validation.success) {
    console.log(`   编码: ${validation.encoding}`);
    console.log(`   包含BOM: ${validation.hasBom ? '是' : '否'}`);
    console.log(`   包含中文: ${validation.hasChinese ? '是' : '否'}`);
    console.log(`   文件大小: ${validation.fileSize} 字节`);
  } else {
    console.log(`❌ 验证失败: ${validation.error}`);
  }
}

module.exports = {
  createUtf8CsvWriter,
  validateCsvEncoding,
  fixCsvEncoding,
  createTestCsv
}; 