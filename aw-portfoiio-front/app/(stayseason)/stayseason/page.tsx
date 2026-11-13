import { SiteHeader, SiteFooter, SUPPORT_EMAIL, SUPPORT_TEL } from './_components/SiteChrome';

//시즌 소개 페이지 (요약판)
//문구 출처: 스테이시즌 입점제안서, stay-season.com 회사소개(브랜드 철학)
//내용을 바꿀 때는 아래 배열만 수정하면 됩니다.

//시즌 소개 — 모기업 언제나디자인의 실적
const STATS = [
    { value: '10년+', label: '숙소 브랜딩 경험' },
    { value: '800곳+', label: '함께한 공간' },
    { value: '95%', label: '파트너 만족도' },
];

//제공 중인 서비스
const SERVICES = [
    { no: '01', title: '홈페이지 제작', text: '베이직 타입 홈페이지를 제작하고, 제작 시 사진 촬영을 지원합니다.' },
    { no: '02', title: '마케팅 · 콘텐츠 제작', text: '프로모션과 SNS 광고를 진행하고, 브랜드에 맞춘 프리미엄 콘텐츠를 제작합니다.' },
    { no: '03', title: '운영 지원 시스템', text: '전용 관리자 페이지와 PMS로 예약, 객실, 결제, 정산을 한 곳에서 관리합니다.' },
    { no: '04', title: '입점 수수료 · 위약금 없음', text: '초기 비용 없이 시작하고, 중도 해지 시에도 위약금이 없습니다.' },
    { no: '05', title: '합리적인 수수료', text: 'OTA 평균 대비 합리적인 수수료 13% 모델로 운영합니다.' },
    { no: '06', title: '스테이컬렉션 연계', text: '커머스 플랫폼과 연계한 특별 할인가, 브랜드 프로모션, 협업 기회를 제공합니다.' },
];

//입점 절차 안내
const STEPS = [
    { no: 'STEP 1', title: '제안 / 신청', text: '입점 제안 및 신청 후 자료를 취합합니다.' },
    { no: 'STEP 2', title: '브랜드 분석', text: '숙소 브랜드에 대한 리서치와 분석을 진행합니다.' },
    { no: 'STEP 3', title: '전문 TEAM 매칭', text: '전문팀 매칭 후 숙소별 맞춤 컨설팅을 진행합니다.' },
    { no: 'STEP 4', title: '최종 런칭', text: '플랫폼 내에 숙소를 게시합니다.' },
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
                    <p className="ss-en text-xs font-medium uppercase tracking-[0.25em] text-white/80">Stay in the season</p>
                    <h1 className="mt-5 text-3xl font-semibold leading-snug md:text-5xl md:leading-tight">
                        당신의 공간이 하나의 브랜드가 되도록,
                        <br />
                        스테이시즌이 새로운 감성의 문을 열어갑니다.
                    </h1>
                    <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">수수료 경쟁은 그만, 이제 브랜드 가치의 시대입니다.</p>
                    <a href="/stayseason/apply" className="ss-btn ss-btn-light mt-8">
                        입점 신청
                    </a>
                </div>
            </section>

            {/* 시즌 소개 */}
            <section className="border-b border-season-line">
                <div className="ss-container grid gap-8 py-20 md:grid-cols-[1fr_2fr] md:gap-16 md:py-24">
                    <div>
                        <p className="ss-eyebrow">About</p>
                        <h2 className="mt-4 text-2xl font-semibold md:text-3xl">시즌 소개</h2>
                    </div>
                    <div>
                        <p className="text-lg font-semibold leading-relaxed text-season-ink md:text-xl">스테이시즌은 프리미엄 숙소를 위한 큐레이션 플랫폼입니다.</p>
                        <p className="mt-4 text-base leading-loose text-gray-600">
                            소수의 숙소만 직접 엄선해 소개하고, 할인과 노출 경쟁 대신 브랜드의 감성과 경험에 집중합니다. 모기업 &lsquo;언제나디자인&rsquo;의 공간 브랜딩 10년 노하우를 담아, 숙소를 가장 잘 아는 기업이 만듭니다.
                        </p>
                        <dl className="mt-10 grid grid-cols-3 gap-6 border-t-2 border-season-brown pt-6">
                            {STATS.map((stat) => (
                                <div key={stat.label}>
                                    <dd className="text-2xl font-semibold text-season-brown md:text-3xl">{stat.value}</dd>
                                    <dt className="mt-1 text-sm text-gray-600">{stat.label}</dt>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </section>

            {/* 시즌 철학 */}
            <section className="border-b border-season-line bg-season-sand">
                <div className="ss-container grid gap-8 py-20 md:grid-cols-[1fr_2fr] md:gap-16 md:py-24">
                    <div>
                        <p className="ss-eyebrow">Philosophy</p>
                        <h2 className="mt-4 text-2xl font-semibold md:text-3xl">시즌 철학</h2>
                    </div>
                    <div>
                        <p className="text-lg font-semibold leading-relaxed text-season-ink md:text-xl">쉽게 떠날 수 없는 일상을, 쉽게 떠날 수 있게.</p>
                        <p className="mt-4 text-base leading-loose text-gray-600">
                            우리는 모두 자신의 계절을 갖고 있습니다. 스테이시즌은 일상과 낭만 사이에서 감각과 경험이 새로워지는 비일상적인 경험을 선사하고, 그날의 바다와 푸르름, 다정함까지 나만의 계절로 담아 일상으로 돌아가게 합니다.
                        </p>
                    </div>
                </div>
            </section>

            {/* 제공 중인 서비스 */}
            <section className="border-b border-season-line">
                <div className="ss-container py-20 md:py-24">
                    <p className="ss-eyebrow">Service</p>
                    <h2 className="mt-4 text-2xl font-semibold md:text-3xl">제공 중인 서비스</h2>
                    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {SERVICES.map((service) => (
                            <div key={service.no} className="rounded-[3px] bg-season-sand p-7">
                                <div className="ss-en text-2xl font-medium text-season-accent">{service.no}</div>
                                <h3 className="mt-5 text-lg font-semibold">{service.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-gray-600">{service.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 입점 절차 안내 */}
            <section className="border-b border-season-line bg-season-sand">
                <div className="ss-container py-20 md:py-24">
                    <p className="ss-eyebrow">Process</p>
                    <h2 className="mt-4 text-2xl font-semibold md:text-3xl">입점 절차 안내</h2>
                    <ol className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                        {STEPS.map((step) => (
                            <li key={step.no} className="border-t-2 border-season-brown pt-6">
                                <div className="ss-en text-xs font-medium tracking-[0.2em] text-season-accent">{step.no}</div>
                                <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-gray-600">{step.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* 신청 안내 */}
            <section className="bg-season-brown text-white">
                <div className="ss-container flex flex-col items-start gap-8 py-20 md:flex-row md:items-center md:justify-between md:py-24">
                    <div>
                        <p className="ss-en text-xs font-medium uppercase tracking-[0.25em] text-white/70">Contact us</p>
                        <h2 className="mt-4 text-2xl font-semibold md:text-3xl">나만의 시즌을, 스테이시즌과 함께 시작하세요</h2>
                        <p className="mt-4 text-sm leading-relaxed text-gray-300 md:text-base">
                            입점 문의{' '}
                            <a href={`tel:${SUPPORT_TEL}`} className="font-semibold text-white underline underline-offset-4">
                                {SUPPORT_TEL}
                            </a>
                            {' · '}
                            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-white underline underline-offset-4">
                                {SUPPORT_EMAIL}
                            </a>
                        </p>
                    </div>
                    <a href="/stayseason/apply" className="ss-btn ss-btn-light shrink-0">
                        입점 신청하기
                    </a>
                </div>
            </section>

            <SiteFooter />
        </div>
    );
}
