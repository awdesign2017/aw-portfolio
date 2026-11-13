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
    { no: '01', title: '홈페이지 제작', text: '베이직 타입 홈페이지를 제작하고, 제작 시 사진 촬영을 함께 지원합니다.' },
    { no: '02', title: '마케팅 · 콘텐츠 제작', text: '프로모션과 SNS 광고를 진행하고, 브랜드에 맞춘 프리미엄 콘텐츠를 제작합니다.' },
    { no: '03', title: '운영 지원 시스템', text: '전용 관리자 페이지와 PMS로 예약·객실·결제·정산을 한곳에서 관리합니다.' },
    { no: '04', title: '입점 수수료 · 위약금 없음', text: '초기 비용 없이 시작할 수 있고, 중도 해지 시에도 위약금이 없습니다.' },
    { no: '05', title: '합리적인 수수료', text: 'OTA 평균 대비 합리적인 13% 수수료 모델로 운영합니다.' },
    { no: '06', title: '스테이컬렉션 연계', text: '커머스 플랫폼과 연계해 특별 할인가, 브랜드 프로모션, 협업 기회를 제공합니다.' },
];

//입점 절차 안내
const STEPS = [
    { no: 'STEP 1', title: '제안 / 신청', text: '입점을 제안·신청하면 필요한 자료를 취합합니다.' },
    { no: 'STEP 2', title: '브랜드 분석', text: '숙소 브랜드를 리서치하고 분석합니다.' },
    { no: 'STEP 3', title: '전문 TEAM 매칭', text: '전문팀을 매칭해 숙소별 맞춤 컨설팅을 진행합니다.' },
    { no: 'STEP 4', title: '최종 런칭', text: '스테이시즌에 숙소를 공개합니다.' },
];

export default function StaySeasonIntroPage() {
    return (
        <div className="min-h-screen bg-season-beige">
            <SiteHeader current="intro" />

            {/* 히어로: 소개 영상 (소리 없이 자동 반복 재생) */}
            {/* 모바일: 영상을 가리지 않도록 영상 아래에 문구를 둠 / PC: 영상 위에 문구를 겹침 */}
            <section className="relative overflow-hidden bg-season-brown text-white md:flex md:h-[calc(100svh-4rem)] md:max-h-[1080px] md:min-h-[520px] md:items-end">
                <div className="relative aspect-[4/3] md:static md:aspect-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/stayseason/hero-poster.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
                    {/* 화면 움직임 줄이기를 켠 사용자에게는 영상 대신 위 정지 이미지만 보입니다 */}
                    <video className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden" src="/stayseason/hero.mp4" poster="/stayseason/hero-poster.jpg" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
                    <div className="absolute inset-0 hidden bg-gradient-to-t from-black/75 via-black/30 to-black/10 md:block" />
                </div>

                <div className="ss-container relative py-10 md:pb-20 md:pt-0">
                    <p className="ss-en text-xs font-medium uppercase tracking-[0.25em] text-white/80">Stay in the season</p>
                    <h1 className="mt-4 text-2xl font-semibold leading-[1.45] md:mt-5 md:text-5xl md:leading-[1.3]">
                        당신의 공간이 하나의 브랜드가 되도록,
                        <br />
                        스테이시즌이 새로운 감성의 문을 열어갑니다.
                    </h1>
                    <p className="mt-4 max-w-xl text-[15px] leading-7 text-white/85 md:mt-6 md:text-lg md:leading-8">수수료 경쟁은 그만, 이제는 브랜드 가치의 시대입니다.</p>
                    <a href="/stayseason/apply" className="ss-btn ss-btn-light mt-7 w-full md:mt-8 md:w-auto">
                        입점 신청
                    </a>
                </div>
            </section>

            {/* 시즌 소개 */}
            <section className="border-b border-season-line">
                <div className="ss-container grid gap-8 py-20 md:grid-cols-[1fr_2fr] md:gap-16 md:py-24">
                    <div>
                        <p className="ss-eyebrow">About</p>
                        <h2 className="mt-4 text-2xl font-semibold leading-snug md:text-[32px]">시즌 소개</h2>
                    </div>
                    <div>
                        <p className="text-xl font-semibold leading-[1.6] text-season-ink md:text-2xl md:leading-[1.6]">
                            <span className="ss-line">스테이시즌은 프리미엄 숙소를 위한 </span>
                            <span className="ss-line">큐레이션 플랫폼입니다.</span>
                        </p>
                        <p className="ss-body mt-6">
                            <span className="ss-line">소수의 숙소만 직접 엄선해 소개합니다. </span>
                            <span className="ss-line">할인과 노출 경쟁 대신, 브랜드의 감성과 경험에 집중합니다.</span>
                        </p>
                        <p className="ss-body mt-4">
                            <span className="ss-line">모기업 &lsquo;언제나디자인&rsquo;의 공간 브랜딩 10년 노하우를 담아 </span>
                            <span className="ss-line">숙소를 가장 잘 아는 기업이 만듭니다.</span>
                        </p>
                        <dl className="mt-12 grid grid-cols-3 gap-6 border-t-2 border-season-brown pt-7">
                            {STATS.map((stat) => (
                                <div key={stat.label}>
                                    <dd className="text-2xl font-semibold leading-tight text-season-brown md:text-4xl">{stat.value}</dd>
                                    <dt className="mt-2 text-sm leading-6 text-gray-600 md:text-[15px]">{stat.label}</dt>
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
                        <h2 className="mt-4 text-2xl font-semibold leading-snug md:text-[32px]">시즌 철학</h2>
                    </div>
                    <div>
                        <p className="text-xl font-semibold leading-[1.6] text-season-ink md:text-2xl md:leading-[1.6]">
                            <span className="ss-line">쉽게 떠날 수 없는 일상을, </span>
                            <span className="ss-line">쉽게 떠날 수 있게.</span>
                        </p>
                        <p className="ss-body mt-6">우리는 모두 자신의 계절을 갖고 있습니다.</p>
                        <p className="ss-body mt-4">
                            <span className="ss-line">스테이시즌은 일상과 낭만 사이에서 </span>
                            <span className="ss-line">감각과 경험이 새로워지는 비일상적인 경험을 선사합니다.</span>
                        </p>
                        <p className="ss-body mt-4">
                            <span className="ss-line">그날의 바다와 푸르름, 다정함까지 </span>
                            <span className="ss-line">나만의 계절로 담아 일상으로 돌아가게 합니다.</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* 제공 중인 서비스 */}
            <section className="border-b border-season-line">
                <div className="ss-container py-20 md:py-24">
                    <p className="ss-eyebrow">Service</p>
                    <h2 className="mt-4 text-2xl font-semibold leading-snug md:text-[32px]">제공 중인 서비스</h2>
                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {SERVICES.map((service) => (
                            <div key={service.no} className="rounded-[3px] bg-season-sand p-7 md:p-8">
                                <div className="ss-en text-2xl font-medium text-season-accent">{service.no}</div>
                                <h3 className="mt-5 text-lg font-semibold leading-snug md:text-xl">{service.title}</h3>
                                <p className="ss-small mt-3">{service.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 입점 절차 안내 */}
            <section className="border-b border-season-line bg-season-sand">
                <div className="ss-container py-20 md:py-24">
                    <p className="ss-eyebrow">Process</p>
                    <h2 className="mt-4 text-2xl font-semibold leading-snug md:text-[32px]">입점 절차 안내</h2>
                    <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                        {STEPS.map((step) => (
                            <li key={step.no} className="border-t-2 border-season-brown pt-6">
                                <div className="ss-en text-xs font-medium tracking-[0.2em] text-season-accent">{step.no}</div>
                                <h3 className="mt-3 text-xl font-semibold leading-snug">{step.title}</h3>
                                <p className="ss-small mt-3">{step.text}</p>
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
                        <h2 className="mt-4 text-2xl font-semibold leading-snug md:text-[32px]">
                            <span className="ss-line">나만의 시즌을, </span>
                            <span className="ss-line">스테이시즌과 함께 시작하세요.</span>
                        </h2>
                        <dl className="mt-6 space-y-1.5 text-[15px] leading-7 text-gray-300 md:text-base">
                            <div className="flex gap-4">
                                <dt className="w-14 shrink-0">전화</dt>
                                <dd>
                                    <a href={`tel:${SUPPORT_TEL}`} className="font-semibold text-white underline underline-offset-4">
                                        {SUPPORT_TEL}
                                    </a>
                                </dd>
                            </div>
                            <div className="flex gap-4">
                                <dt className="w-14 shrink-0">이메일</dt>
                                <dd>
                                    <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-white underline underline-offset-4">
                                        {SUPPORT_EMAIL}
                                    </a>
                                </dd>
                            </div>
                        </dl>
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
