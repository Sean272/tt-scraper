const axios = require('axios');

// 获取用户信息的函数
async function getUserProfileInfo(username) {
    const headers = {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'referer': 'https://www.tiktok.com/',
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'zh-CN,zh;q=0.9'
    };

    // 获取用户页面HTML
    const userPageResponse = await axios.get(`https://www.tiktok.com/@${username}`, {
        headers,
        timeout: 10000
    });

    // 提取用户数据 - 尝试多种解析方法
    const htmlContent = userPageResponse.data;
    
    // 方法1: 尝试解析 __UNIVERSAL_DATA_FOR_REHYDRATION__
    let userDetail = null;
    let scriptMatch = htmlContent.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);
    
    if (scriptMatch) {
        try {
            const jsonData = JSON.parse(scriptMatch[1]);
            userDetail = jsonData.default?.['webapp.user-detail']?.userInfo;
        } catch (e) {
            // 静默失败，尝试其他方法
        }
    }
    
    // 方法2: 尝试解析 SIGI_STATE
    if (!userDetail) {
        scriptMatch = htmlContent.match(/<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/);
        if (scriptMatch) {
            try {
                const jsonData = JSON.parse(scriptMatch[1]);
                const userInfo = jsonData.UserModule?.users || {};
                const userId = Object.keys(userInfo)[0];
                if (userId && userInfo[userId]) {
                    const user = userInfo[userId];
                    const statsInfo = jsonData.UserModule?.stats?.[userId] || {};
                    userDetail = {
                        user: user,
                        stats: statsInfo
                    };
                }
            } catch (e) {
                // 静默失败
            }
        }
    }
    
    // 方法3: 简单正则提取关键信息
    if (!userDetail) {
        const followerMatch = htmlContent.match(/"followerCount":(\d+)/);
        const followingMatch = htmlContent.match(/"followingCount":(\d+)/);
        const heartMatch = htmlContent.match(/"heartCount":(\d+)/);
        const videoMatch = htmlContent.match(/"videoCount":(\d+)/);
        const nicknameMatch = htmlContent.match(/"nickname":"([^"]+)"/);
        const verifiedMatch = htmlContent.match(/"verified":(true|false)/);
        const signatureMatch = htmlContent.match(/"signature":"([^"]*)"/);
        const avatarMatch = htmlContent.match(/"avatarThumb":"([^"]+)"/);
        
        if (followerMatch && nicknameMatch) {
            userDetail = {
                user: {
                    id: '',
                    uniqueId: username,
                    nickname: nicknameMatch[1],
                    avatarThumb: avatarMatch ? avatarMatch[1] : '',
                    avatarMedium: avatarMatch ? avatarMatch[1] : '',
                    avatarLarger: avatarMatch ? avatarMatch[1] : '',
                    signature: signatureMatch ? signatureMatch[1] : '',
                    verified: verifiedMatch ? verifiedMatch[1] === 'true' : false,
                    secUid: '',
                    secret: false,
                    ftc: false,
                    relation: 0,
                    openFavorite: false,
                    commentSetting: 0,
                    duetSetting: 0,
                    stitchSetting: 0,
                    privateAccount: false
                },
                stats: {
                    followingCount: followingMatch ? parseInt(followingMatch[1]) : 0,
                    followerCount: parseInt(followerMatch[1]),
                    heartCount: heartMatch ? parseInt(heartMatch[1]) : 0,
                    videoCount: videoMatch ? parseInt(videoMatch[1]) : 0,
                    diggCount: 0,
                    heart: heartMatch ? parseInt(heartMatch[1]) : 0
                },
                shareMeta: {
                    title: '',
                    desc: ''
                }
            };
        }
    }
    
    if (!userDetail) {
        throw new Error('无法解析用户数据，可能是用户不存在或页面结构已变化');
    }

    return {
        user: {
            id: userDetail.user.id,
            uniqueId: userDetail.user.uniqueId,
            nickname: userDetail.user.nickname,
            avatarThumb: userDetail.user.avatarThumb,
            avatarMedium: userDetail.user.avatarMedium,
            avatarLarger: userDetail.user.avatarLarger,
            signature: userDetail.user.signature,
            verified: userDetail.user.verified,
            secUid: userDetail.user.secUid,
            secret: userDetail.user.secret,
            ftc: userDetail.user.ftc,
            relation: userDetail.user.relation,
            openFavorite: userDetail.user.openFavorite,
            commentSetting: userDetail.user.commentSetting,
            duetSetting: userDetail.user.duetSetting,
            stitchSetting: userDetail.user.stitchSetting,
            privateAccount: userDetail.user.privateAccount
        },
        stats: {
            followingCount: userDetail.stats.followingCount,
            followerCount: userDetail.stats.followerCount,
            heartCount: userDetail.stats.heartCount,
            videoCount: userDetail.stats.videoCount,
            diggCount: userDetail.stats.diggCount,
            heart: userDetail.stats.heart || userDetail.stats.heartCount
        },
        shareMeta: userDetail.shareMeta
    };
}
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// 检查命令行参数
if (process.argv.length < 3) {
    console.log('用法: node batch-authors-followers.js <作者列表CSV文件路径> [作者名列名]');
    console.log('示例: node batch-authors-followers.js authors.csv username');
    console.log('示例: node batch-authors-followers.js authors.csv author_id');
    console.log('注意: 如果不指定列名，默认使用第一列');
    process.exit(1);
}

const authorsFile = process.argv[2];
const authorColumn = process.argv[3] || null; // 如果没有指定列名，将使用第一列

// 检查输入文件是否存在
if (!fs.existsSync(authorsFile)) {
    console.error(`错误: 文件 ${authorsFile} 不存在`);
    process.exit(1);
}

// 创建输出目录
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 生成输出文件路径
const outputFile = path.join(outputDir, `batch_authors_followers_${new Date().toISOString().split('T')[0]}.csv`);

// 创建写入流
const writeStream = fs.createWriteStream(outputFile, { encoding: 'utf8' });

// 写入BOM
writeStream.write('\ufeff');

// 写入表头
const headers = [
    '作者用户名',
    '作者昵称',
    '粉丝数量',
    '关注数量',
    '获赞数量',
    '视频数量',
    '是否认证',
    '个人简介',
    '查询状态',
    '错误信息'
];
writeStream.write(headers.join(',') + '\n');

// 转义CSV字段
function escapeCsvField(field) {
    if (field === null || field === undefined) {
        return '';
    }
    field = String(field);
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}

// 格式化数字显示
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// 处理单个作者
async function processAuthor(username) {
    try {
        console.log(`\n正在查询作者 ${username} 的粉丝信息...`);
        
        const userMeta = await getUserProfileInfo(username, {});
        
        const result = {
            username: username,
            nickname: userMeta.user.nickname,
            followerCount: userMeta.stats.followerCount,
            followingCount: userMeta.stats.followingCount,
            heartCount: userMeta.stats.heartCount,
            videoCount: userMeta.stats.videoCount,
            verified: userMeta.user.verified,
            signature: (userMeta.user.signature || '').replace(/[\r\n,]/g, ' '), // 移除换行符和逗号
            status: '成功',
            error: ''
        };

        console.log(`✅ ${username}: ${formatNumber(result.followerCount)} 粉丝 | ${formatNumber(result.heartCount)} 获赞 | ${result.videoCount} 视频`);
        
        return result;
    } catch (error) {
        console.error(`❌ ${username}: ${error.message}`);
        
        return {
            username: username,
            nickname: '',
            followerCount: 0,
            followingCount: 0,
            heartCount: 0,
            videoCount: 0,
            verified: false,
            signature: '',
            status: '失败',
            error: error.message
        };
    }
}

// 读取CSV文件并处理
async function main() {
    const authors = [];
    
    return new Promise((resolve, reject) => {
        fs.createReadStream(authorsFile)
            .pipe(csv())
            .on('data', (row) => {
                // 如果指定了列名，使用指定的列；否则使用第一列
                let authorName;
                if (authorColumn && row[authorColumn]) {
                    authorName = row[authorColumn].trim();
                } else {
                    // 使用第一列
                    const firstKey = Object.keys(row)[0];
                    authorName = row[firstKey].trim();
                }
                
                if (authorName && !authorName.startsWith('#')) {
                    authors.push(authorName);
                }
            })
            .on('end', async () => {
                if (authors.length === 0) {
                    console.error('错误: 未找到有效的作者名称');
                    process.exit(1);
                }

                console.log(`\n找到 ${authors.length} 个作者，开始批量查询...`);
                console.log('='.repeat(50));

                let successCount = 0;
                let failCount = 0;

                for (const author of authors) {
                    try {
                        const result = await processAuthor(author);
                        
                        // 写入数据到CSV
                        const csvRow = [
                            escapeCsvField(result.username),
                            escapeCsvField(result.nickname),
                            result.followerCount,
                            result.followingCount,
                            result.heartCount,
                            result.videoCount,
                            result.verified ? '是' : '否',
                            escapeCsvField(result.signature),
                            escapeCsvField(result.status),
                            escapeCsvField(result.error)
                        ];
                        writeStream.write(csvRow.join(',') + '\n');

                        if (result.status === '成功') {
                            successCount++;
                        } else {
                            failCount++;
                        }

                        // 添加延迟避免请求过于频繁
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                    } catch (error) {
                        console.error(`处理作者 ${author} 时出错:`, error.message);
                        failCount++;
                    }
                }

                // 关闭写入流
                writeStream.end();

                console.log('\n' + '='.repeat(50));
                console.log('📊 批量查询完成！');
                console.log(`✅ 成功: ${successCount} 个作者`);
                console.log(`❌ 失败: ${failCount} 个作者`);
                console.log(`📁 结果已保存到: ${outputFile}`);
                console.log('\n💡 提示: 用Excel打开CSV文件时，选择"数据"→"从文本/CSV"→选择UTF-8编码可避免中文乱码');
                
                resolve();
            })
            .on('error', (error) => {
                console.error('读取CSV文件时出错:', error.message);
                reject(error);
            });
    });
}

// 运行主函数
main().catch(error => {
    console.error('程序执行出错:', error.message);
    process.exit(1);
}); 