'use client';

import { Layout, Menu } from 'antd';
import { useRouter, usePathname } from 'next/navigation';
import ApiConfig from '@/components/ApiConfig';

const { Header, Content, Sider } = Layout;

const menuItems = [
  {
    key: '1',
    label: '视频信息查询',
    path: '/',
  },
  {
    key: '2',
    label: '视频帧分析',
    path: '/frame-analysis',
  },
  {
    key: '3',
    label: '批量视频处理',
    path: '/batch-process',
  },
  {
    key: '4',
    label: '作者视频查询',
    path: '/author-videos',
  },
  {
    key: '5',
    label: '作者粉丝查询',
    path: '/author-followers',
  },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // 根据当前路径获取选中的菜单项
  const getSelectedKey = () => {
    const item = menuItems.find(item => item.path === pathname);
    return item ? item.key : '1';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="flex items-center">
        <h1 className="text-white text-xl m-0">TikTok视频数据采集工具</h1>
      </Header>
      <Layout>
        <Sider width={300} theme="light">
          <div className="p-4">
            <ApiConfig />
          </div>
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItems.map(item => ({
              ...item,
              onClick: () => router.push(item.path),
            }))}
          />
        </Sider>
        <Content className="bg-white">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}