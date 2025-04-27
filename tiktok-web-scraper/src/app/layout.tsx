import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import StyledComponentsRegistry from '@/lib/AntdRegistry';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TikTok 视频数据采集工具",
  description: "一个简单的TikTok视频数据采集工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <StyledComponentsRegistry>
          <ConfigProvider locale={zhCN}>
            {children}
          </ConfigProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
