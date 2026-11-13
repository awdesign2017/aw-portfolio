import type { Metadata } from 'next';
import '../globals.css';
import RecoilProvider from '@/app/RecoilProvider';
import AuthListener from '@/app/AuthListener';
import Script from 'next/script';

export const metadata: Metadata = {
    title: '언제나 디자인 기초자료 작성 페이지',
    description: '언제나 디자인 기초자료 사이트',
    openGraph: {
        title: '언제나 디자인 기초자료 작성 페이지',
        description: '언제나 디자인 기초자료 사이트',
        url: 'https://www.alwaysdesign-portfolio.com',
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
            <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests"></meta>
            <body>
                <Script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="beforeInteractive" />
                <RecoilProvider>
                    <AuthListener />
                    {children}
                </RecoilProvider>
            </body>
        </html>
    );
}
