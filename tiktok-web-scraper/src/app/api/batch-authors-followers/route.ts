import { NextResponse } from 'next/server';
import axios from 'axios';

// 获取用户信息的函数
async function getUserProfileInfo(username: string) {
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

  return userDetail;
}

export async function POST(request: Request) {
  try {
    const { authors } = await request.json();
    
    if (!authors || !Array.isArray(authors) || authors.length === 0) {
      return NextResponse.json(
        { error: '请提供有效的作者列表' },
        { status: 400 }
      );
    }

    const results = [];
    
    for (const author of authors) {
      try {
        console.log(`正在查询作者 ${author} 的粉丝信息...`);
        
        const userMeta = await getUserProfileInfo(author.trim());
        
        const result = {
          username: author.trim(),
          nickname: userMeta.user.nickname,
          followerCount: userMeta.stats.followerCount,
          followingCount: userMeta.stats.followingCount,
          heartCount: userMeta.stats.heartCount,
          videoCount: userMeta.stats.videoCount,
          verified: userMeta.user.verified,
          signature: userMeta.user.signature || '',
          avatarThumb: userMeta.user.avatarThumb,
          status: 'success',
          error: null
        };

        results.push(result);
        
        // 添加延迟避免请求过于频繁
        if (authors.indexOf(author) < authors.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
      } catch (error: any) {
        console.error(`查询作者 ${author} 时出错:`, error.message);
        
        results.push({
          username: author.trim(),
          nickname: '',
          followerCount: 0,
          followingCount: 0,
          heartCount: 0,
          videoCount: 0,
          verified: false,
          signature: '',
          avatarThumb: '',
          status: 'error',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total: authors.length,
        success: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length
      }
    });

  } catch (error: any) {
    console.error('批量查询作者粉丝信息时出错:', error);
    return NextResponse.json(
      { error: error.message || '服务器内部错误' },
      { status: 500 }
    );
  }
} 