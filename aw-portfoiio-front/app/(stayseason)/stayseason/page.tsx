import { SiteHeader, SiteFooter, SUPPORT_EMAIL } from './_components/SiteChrome';

//시즌 소개 페이지
//문구는 임시 안내 문구입니다. 스테이시즌 운영 방향에 맞게 아래 배열과 본문을 수정하세요.

const CRITERIA = [
    { no: '01', title: '고유함', description: '어디에나 있는 숙소가 아닌, 그곳에서만 만날 수 있는 이야기와 분위기를 봅니다.' },
    { no: '02', title: '공간', description: '머무는 시간이 편안하도록 설계된 공간의 완성도와 관리 상태를 살핍니다.' },
    { no: '03', title: '환대', description: '예약부터 퇴실까지, 게스트를 맞이하는 호스트의 태도와 운영 방식을 확인합니다.' },
    { no: '04', title: '합리성', description: '공간과 경험에 걸맞은 요금인지, 게스트가 납득할 수 있는 기준인지 검토합니다.' },
];

const SERVICES = [
    { title: '소개 콘텐츠 제작', description: '숙소의 매력이 잘 전달되도록 소개 문구와 구성을 함께 다듬습니다.' },
    { title: '예약·운영 지원', description: '예약 관리와 게스트 응대가 수월하도록 운영에 필요한 도구와 안내를 제공합니다.' },
    { title: '시즌별 노출', description: '계절과 테마에 맞춘 기획전으로 숙소가 가장 빛나는 시기에 소개합니다.' },
];

const STEPS = [
    { no: 'STEP 1', title: '입점 신청', description: '신청서와 숙소 이미지를 제출하고, 영상은 메일로 보내주세요.' },
    { no: 'STEP 2', title: '검토', description: '제출하신 자료를 바탕으로 입점 가능 여부를 검토하고, 결과를 이메일로 안내드립니다.' },
    { no: 'STEP 3', title: '계약 및 입점', description: '계약 체결 후 소개 페이지를 준비하여 스테이시즌에 숙소를 공개합니다.' },
];

export default function StaySeasonIntroPage() {
    return (
        <div className="min-h-screen bg-season-beige">
            <SiteHeader current="intro" />

            {/* 히어로: 소개 영상 (소리 없이 자동 반복 재생) */}
            <section className="relative flex h-[calc(100svh-4rem)] max-h-[1080px] min-h-[520px] items-end overflow-hidden bg-season-brown text-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/stayseason/hero-poster.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
                {/* 화면 움직임 줄이기를 켠 사용자에게는 영상 대신 위 정지 이미지만 보입니다 */}
                <video className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden" src="/stayseason/hero.mp4" poster="/stayseason/hero-poster.jpg" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />

                <div className="ss-container relative pb-14 md:pb-20">
                    <p className="ss-en text-xs font-medium uppercase tracking-[0.25em] text-white/80">Are you a host?</p>
                    <h1 className="mt-5 text-3xl font-semibold leading-snug md:text-5xl md:leading-tight">
                        머무는 계절이 특별해지는 곳,
                        <br />
                        스테이시즌과 함께할 호스트를 찾습니다.
                    </h1>
                    <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">공간에 담긴 이야기를 가장 잘 어울리는 계절에 소개합니다. 입점 안내를 확인하고 신청해 주세요.</p>
                    <a href="/stayseason/apply" className="ss-btn ss-btn-light mt-8">
                        입점 신청
                    </a>
                </div>
            </section>

            {/* 소개 */}
            <section className="border-b border-season-line">
                <div className="ss-container grid gap-8 py-20 md:grid-cols-[1fr_2fr] md:gap-16 md:py-28">
                    <div>
                        <p className="ss-eyebrow">About</p>
                        <h2 className="mt-4 text-2xl font-semibold md:text-3xl">스테이시즌 큐레이션</h2>
                    </div>
                    <div className="space-y-5 text-base leading-loose text-gray-600 md:text-lg">
                        <p>스테이시즌은 숙소의 수보다 한 곳 한 곳의 경험을 중요하게 생각합니다. 그래서 모든 숙소를 직접 살펴보고, 기준에 맞는 곳만 소개합니다.</p>
                        <p>호스트가 공들여 만든 공간이 그 가치를 알아보는 게스트와 만날 수 있도록, 소개부터 예약까지의 과정을 함께 준비합니다.</p>
                    </div>
                </div>
            </section>

            {/* 선정 기준 */}
            <section className="border-b border-season-line">
                <div className="ss-container py-20 md:py-28">
                    <p className="ss-eyebrow">Criteria</p>
                    <h2 className="mt-4 text-2xl font-semibold md:text-3xl">네 가지 관점으로 살펴봅니다</h2>
                    <div className="mt-12 grid gap-px bg-season-line sm:grid-cols-2 lg:grid-cols-4">
                        {CRITERIA.map((item) => (
                            <div key={item.no} className="bg-season-beige p-8">
                                <div className="ss-en text-sm font-medium text-season-accent">{item.no}</div>
                                <h3 className="mt-6 text-xl font-semibold">{item.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 호스트 서비스 */}
            <section className="border-b border-season-line bg-season-sand">
                <div className="ss-container py-20 md:py-28">
                    <p className="ss-eyebrow">Service</p>
                    <h2 className="mt-4 text-2xl font-semibold md:text-3xl">호스트 서비스</h2>
                    <div className="mt-12 grid gap-10 md:grid-cols-3">
                        {SERVICES.map((item) => (
                            <div key={item.title} className="border-t-2 border-season-brown pt-6">
                                <h3 className="text-lg font-semibold">{item.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 절차 안내 */}
            <section className="border-b border-season-line">
                <div className="ss-container py-20 md:py-28">
                    <p className="ss-eyebrow">Process</p>
                    <h2 className="mt-4 text-2xl font-semibold md:text-3xl">입점 절차</h2>
                    <ol className="mt-12 grid gap-10 md:grid-cols-3">
                        {STEPS.map((step) => (
                            <li key={step.no}>
                                <div className="ss-en text-xs font-medium tracking-[0.2em] text-season-accent">{step.no}</div>
                                <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-gray-600">{step.description}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* 신청 안내 */}
            <section className="bg-season-brown text-white">
                <div className="ss-container flex flex-col items-start gap-8 py-20 md:flex-row md:items-center md:justify-between md:py-24">
                    <div>
                        <h2 className="text-2xl font-semibold md:text-3xl">스테이시즌 입점을 신청하세요</h2>
                        <p className="mt-4 text-sm leading-relaxed text-gray-300 md:text-base">
                            궁금한 점은{' '}
                            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-white underline underline-offset-4">
                                {SUPPORT_EMAIL}
                            </a>
                            으로 문의해 주세요.
                        </p>
                    </div>
                    <a href="/stayseason/apply" className="ss-btn ss-btn-light shrink-0">
                        신청하기
                    </a>
                </div>
            </section>

            <SiteFooter />
        </div>
    );
}
