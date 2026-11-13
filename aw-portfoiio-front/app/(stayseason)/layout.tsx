import type { Metadata } from 'next';
import './stayseason.css';

//스테이시즌 입점 신청 영역 전용 레이아웃 (기초자료 영역과 분리: 로그인·Recoil·globals.css 를 쓰지 않음)
export const metadata: Metadata = {
    title: '스테이시즌 입점 신청',
    description: '스테이시즌과 함께할 호스트를 찾습니다. 입점 안내와 신청을 확인하세요.',
    openGraph: {
        title: '스테이시즌 입점 신청',
        description: '스테이시즌과 함께할 호스트를 찾습니다. 입점 안내와 신청을 확인하세요.',
    },
};

export default function StaySeasonLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
            <body>{children}</body>
        </html>
    );
}
