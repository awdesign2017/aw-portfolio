//스테이시즌 영역 공통 상단/하단
//페이지 이동은 일반 링크(<a>)를 사용: 기초자료 영역과 레이아웃이 달라 어차피 전체 새로고침으로 이동한다.

export const SUPPORT_EMAIL = 'support@stay-season.com';
export const SUPPORT_TEL = '1522-5453';

export function SiteHeader({ current }: { current: 'intro' | 'apply' }) {
    const linkClass = (active: boolean) => `text-sm transition-colors ${active ? 'font-semibold text-season-ink' : 'font-medium text-gray-500 hover:text-season-ink'}`;

    return (
        <header className="sticky top-0 z-40 border-b border-season-line bg-season-beige/95 backdrop-blur">
            <div className="ss-container flex h-16 items-center justify-between">
                <a href="/stayseason" className="ss-en text-lg font-medium tracking-[0.18em] text-season-brown">
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
        <footer className="bg-season-stone">
            <div className="ss-container flex flex-col gap-4 py-10 md:flex-row md:items-center md:justify-between">
                <div className="ss-en text-base font-medium tracking-[0.18em] text-season-brown">STAY SEASON</div>
                <div className="text-sm text-gray-600">
                    입점 문의{' '}
                    <a href={`tel:${SUPPORT_TEL}`} className="font-semibold text-season-ink">
                        {SUPPORT_TEL}
                    </a>
                    {' · '}
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-season-ink underline underline-offset-4">
                        {SUPPORT_EMAIL}
                    </a>
                </div>
            </div>
        </footer>
    );
}
