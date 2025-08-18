'use client';

import AppLayout from '@/components/AppLayout';
import VideoInfo from '@/components/VideoInfo';
import EnvironmentCheck from '@/components/EnvironmentCheck';

export default function Home() {
  return (
    <AppLayout>
      <div>
        <EnvironmentCheck />
        <VideoInfo />
      </div>
    </AppLayout>
  );
}