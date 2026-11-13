//스테이시즌 영역 공통 상단/하단
//페이지 이동은 일반 링크(<a>)를 사용: 기초자료 영역과 레이아웃이 달라 어차피 전체 새로고침으로 이동한다.

export const SUPPORT_EMAIL = 'support@stay-season.com';

export function SiteHeader({ current }: { current: 'intro' | 'apply' }) {
    const linkClass = (active: boolean) => `text-sm font-semibold transition-colors ${active ? 'text-gray-900' : 'text-gray-400 hover:text-gray-900'}`;

    return (
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
            <div className="ss-container flex h-16 items-center justify-between">
                <a href="/stayseason" className="text-base font-bold tracking-[0.2em] text-gray-900">
                    STAY SEASON
                </a>
                <nav className="flex items-center gap-6 md:gap-10">
                    <a href="/stayseason" className={linkClass(current === 'intro')}>
                        시즌 소개
                    </a>
                    <a href="/stayseason/apply" className={linkClass(current === 'apply')}>
                        입점 신청
                    </a>
                </nav>
            </div>
        </header>
    );
}

export function SiteFooter() {
    return (
        <footer className="border-t border-gray-200 bg-white">
            <div className="ss-container flex flex-col gap-4 py-10 md:flex-row md:items-center md:justify-between">
                <div className="text-sm font-bold tracking-[0.2em] text-gray-900">STAY SEASON</div>
                <div className="text-sm text-gray-500">
                    입점 문의{' '}
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-gray-900 underline underline-offset-4">
                        {SUPPORT_EMAIL}
                    </a>
                </div>
            </div>
        </footer>
    );
}
