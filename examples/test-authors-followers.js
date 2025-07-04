// 测试批量查询作者粉丝功能的示例
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
            console.log('方法1解析失败，尝试其他方法...');
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
                console.log('方法2解析失败...');
            }
        }
    }
    
    // 方法3: 简单正则提取关键信息
    if (!userDetail) {
        const followerMatch = htmlContent.match(/"followerCount":(\d+)/);
        const nicknameMatch = htmlContent.match(/"nickname":"([^"]+)"/);
        const verifiedMatch = htmlContent.match(/"verified":(true|false)/);
        
        if (followerMatch && nicknameMatch) {
            userDetail = {
                user: {
                    uniqueId: username,
                    nickname: nicknameMatch[1],
                    verified: verifiedMatch ? verifiedMatch[1] === 'true' : false
                },
                stats: {
                    followerCount: parseInt(followerMatch[1]),
                    followingCount: 0,
                    heartCount: 0,
                    videoCount: 0
                }
            };
        }
    }
    
    if (!userDetail) {
        throw new Error('无法解析用户数据，可能是用户不存在或页面结构已变化');
    }

    return {
        user: {
            uniqueId: userDetail.user.uniqueId,
            nickname: userDetail.user.nickname,
            verified: userDetail.user.verified
        },
        stats: {
            followingCount: userDetail.stats.followingCount,
            followerCount: userDetail.stats.followerCount,
            heartCount: userDetail.stats.heartCount,
            videoCount: userDetail.stats.videoCount
        }
    };
}

async function testSingleAuthor() {
    try {
        console.log('正在测试单个作者查询...');
        const userMeta = await getUserProfileInfo('tiktok', {});
        
        console.log('✅ 单个作者查询成功！');
        console.log(`作者: ${userMeta.user.nickname} (@${userMeta.user.uniqueId})`);
        console.log(`粉丝数: ${userMeta.stats.followerCount.toLocaleString()}`);
        console.log(`获赞数: ${userMeta.stats.heartCount.toLocaleString()}`);
        console.log(`视频数: ${userMeta.stats.videoCount}`);
        console.log(`认证状态: ${userMeta.user.verified ? '已认证' : '未认证'}`);
        
        return true;
    } catch (error) {
        console.error('❌ 单个作者查询失败:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 开始测试批量查询作者粉丝功能...\n');
    
    const success = await testSingleAuthor();
    
    if (success) {
        console.log('\n✅ 测试通过！你现在可以运行以下命令进行批量查询:');
        console.log('node examples/batch-authors-followers.js examples/sample-authors.csv');
        console.log('\n或者启动网页版进行可视化操作:');
        console.log('cd tiktok-web-scraper && npm run dev');
    } else {
        console.log('\n❌ 测试失败！请检查网络连接和项目配置。');
    }
}

main().catch(console.error); 