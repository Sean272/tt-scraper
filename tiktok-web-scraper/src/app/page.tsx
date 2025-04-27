'use client';

import { Tabs } from 'antd';
import AuthorVideos from '@/components/AuthorVideos';
import VideoInfo from '@/components/VideoInfo';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">TikTok 视频数据采集工具</h1>
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: '作者视频查询',
            children: <AuthorVideos />,
          },
          {
            key: '2',
            label: '视频信息查询',
            children: <VideoInfo />,
          },
        ]}
      />
    </main>
  );
}
