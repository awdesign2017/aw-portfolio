import { SiteHeader, SiteFooter, SUPPORT_EMAIL, SUPPORT_TEL } from './_components/SiteChrome';

//시즌 소개 페이지
//문구 출처: 스테이시즌 입점제안서, stay-season.com 회사소개(브랜드 철학)
//내용을 바꿀 때는 아래 배열만 수정하면 됩니다.

//브랜드 철학 — 사계절
const SEASONS = [
    { en: 'Spring', name: '봄', text: '설렘이 진달래꽃처럼 붉게 물들고, 누군가와 나눴던 봄의 반짝임.' },
    { en: 'Summer', name: '여름', text: '숨을 고르며 녹음이 울창하고 짙은 여름 안에서 쉬어가는 시원한 그림자.' },
    { en: 'Autumn', name: '가을', text: '잎잎이 단풍이 물드는 늦가을의 저녁에 가만히 마주 앉아 바라보던 모닥불.' },
    { en: 'Winter', name: '겨울', text: '다정하게 흰 눈송이가 층층이 내리는 고요한 겨울의 밤.' },
];

//브랜드 소개 — 모기업 언제나디자인
const STATS = [
    { value: '전문 브랜드', title: '웹에이전시 전문 브랜드', text: '기획부터 제작, 운영까지 고객의 목적에 맞는 웹사이트를 제작합니다.' },
    { value: '10년+', title: '숙련된 경험', text: '숙소 브랜딩 분야에만 집중해 온 시간이 시장에 대한 깊은 이해도를 증명합니다.' },
    { value: '800곳+', title: '증명된 성과', text: '소규모 펜션부터 대규모 리조트까지 다양한 공간의 성공을 함께 만들었습니다.' },
    { value: '만족도 95%', title: '검증된 파트너십', text: '컨설팅 및 브랜딩 서비스는 파트너사의 높은 만족도로 검증되었습니다.' },
];

//핵심 가치 — 타 플랫폼과의 차이
const OTHERS = [
    { title: '과도한 노출 경쟁', text: '지속적인 운영 비용 부담, 브랜드 이미지와 고유 분위기 저하' },
    { title: '할인·광고 중심의 운영', text: '가격 경쟁 중심 운영으로 고객 충성도가 낮아짐' },
    { title: '브랜드 가치 하락', text: '브랜드의 고유한 이미지가 흐려짐' },
];

const OURS = [
    { title: '엄선된 공간 선정', text: '소수의 숙소만 직접 엄선하고 인증합니다.' },
    { title: '콘텐츠 제작 지원', text: '전문 포토그래퍼와 담당팀이 스토리텔링 콘텐츠를 제작합니다.' },
    { title: '마케팅 노출', text: '가치를 알아보는 취향 공동체에 집중 노출합니다.' },
];

//운영 전략 — 콘텐츠 확산 채널
const CHANNELS = [
    { name: '인스타그램', role: '공식 브랜드 콘텐츠 채널' },
    { name: '매거진', role: '공간 스토리텔링 채널' },
    { name: '메타광고', role: '타깃 광고 노출 채널' },
    { name: '인플루언서', role: '외부 확산 및 신뢰 채널' },
    { name: '카카오톡', role: '고객 재방문 및 전환 채널' },
];

//운영 전략 — 운영 지원 시스템
const SUPPORTS = [
    { title: '예약·객실 관리 지원', items: ['편리한 관리자 페이지', '실시간 예약 달력 제공', 'PMS 연동 진행', '외부 예약 채널 연동 지원'] },
    { title: '입점·운영 준비 지원', items: ['숙소 정보 등록 지원', '운영 컨설팅 진행', '담당자 1:1 안내'] },
    { title: '결제·정산 관리 지원', items: ['온라인 결제 시스템 제공', '결제 및 취소 내역 확인', '정산 일정 및 내역 안내'] },
];

//혜택 — 입점 혜택과 스테이컬렉션 연계 혜택을 같은 카드로 나열
type Benefit = { no: string; title: string; en: string; items: string[] };

const BENEFITS: Benefit[] = [
    { no: '01', title: '홈페이지 제작', en: 'Website Design & Development', items: ['베이직 타입 제공 (타입 내에서 선택 가능)', '홈페이지 제작 시에만 사진 촬영 지원', '영상 촬영은 추가 옵션'] },
    {
        no: '02',
        title: '자체 마케팅',
        en: 'In-house Marketing',
        items: ['프로모션, 콘텐츠 제작, SNS 광고 등 진행', '추가 콘텐츠 제작은 브랜드 방향에 맞춰 협의 후 진행', '입점사 1:1 마케팅은 입점사 매니저와 기획 후 진행', '시즌 기획 프로모션의 할인율·분담률은 유연하게 협의'],
    },
    { no: '03', title: '프리미엄 콘텐츠 제작', en: 'High-End Content Production', items: ['브랜드 이미지, 고객층에 맞춘 콘텐츠 제작', 'SNS, 광고, 홈페이지 등 다양한 채널에서 활용 가능'] },
    { no: '04', title: '입점 수수료 없음', en: 'No Listing Fee', items: ['초기 비용 부담 없이 서비스 이용 가능', '실제 예약 성과를 확인하며 운영 방향 조율 가능'] },
    { no: '05', title: '위약금 없음', en: 'No Cancellation Fee', items: ['계약 중도 해지 시 위약금 없음', '입점사 부담 없이 자유로운 서비스 이용', '불필요한 장기 계약 부담 없음'] },
    { no: '06', title: '합리적인 수수료', en: 'Reasonable Commission', items: ['합리적인 수수료 13% 모델', 'OTA 평균 대비 합리적인 수수료율'] },
];

const COLLECTION_BENEFITS: Benefit[] = [
    { no: '07', title: '컬렉션 상품 특별 할인가 제공', en: 'Special Price', items: ['입점 상품 B2B 전용 공급가 협의 가능'] },
    { no: '08', title: '브랜드 프로모션 연계', en: 'Brand Promotion', items: ['입점 브랜드 프로모션 진행', '프로모션 제품 우선 지원 가능'] },
    { no: '09', title: '노출 기회 증대', en: 'More Exposure', items: ['플랫폼 내 숙소 노출로 브랜드 인지도 강화'] },
    { no: '10', title: '시즌 · 컬렉션 협업', en: 'Season & Collection', items: ['브랜드사 제품 협찬 + 입점사 숙박권 제공 기반으로 숙소 홍보, 콘텐츠 제작 지원'] },
];

//입점 절차
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

            {/* 브랜드 철학 */}
            <section className="border-b border-season-line">
                <div className="ss-container py-20 md:py-28">
                    <div className="grid gap-8 md:grid-cols-[1fr_2fr] md:gap-16">
                        <div>
                            <p className="ss-eyebrow">Philosophy</p>
                            <h2 className="mt-4 text-2xl font-semibold leading-snug md:text-3xl md:leading-snug">
                                쉽게 떠날 수 없는 일상을
                                <br />
                                쉽게 떠날 수 있게
                            </h2>
                        </div>
                        <div className="space-y-5 text-base leading-loose text-gray-600 md:text-lg">
                            <p>일상과 낭만 사이, 수천 가지 이야기를 만들어 가는 곳. 스테이시즌은 우리의 감각과 경험이 새로워지는 비일상적인 경험을 선사하고 싶습니다.</p>
                            <p>그날의 바다, 그날의 푸르름, 그날의 다정함까지. 나만의 계절을 고스란히 담아 일상으로 돌아오는 날, 우리의 삶 속에서 다시 꺼내 봅니다.</p>
                            <p className="font-semibold text-season-ink">우리는 모두 자신의 계절을 갖고 있습니다.</p>
                        </div>
                    </div>

                    <div className="mt-14 grid gap-px bg-season-line sm:grid-cols-2 lg:grid-cols-4">
                        {SEASONS.map((season) => (
                            <div key={season.en} className="bg-season-beige p-8">
                                <div className="ss-en text-sm font-medium text-season-accent">{season.en}</div>
                                <h3 className="mt-6 text-xl font-semibold">{season.name}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-gray-600">{season.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 브랜드 소개 */}
            <section className="border-b border-season-line bg-season-sand">
                <div className="ss-container py-20 md:py-28">
                    <p className="ss-eyebrow">Brand Introduction</p>
                    <h2 className="mt-4 text-2xl font-semibold leading-snug md:text-3xl md:leading-snug">
                        프리미엄 숙소를 위한 큐레이션 플랫폼,
                        <br />
                        숙소를 가장 잘 아는 기업이 만듭니다
                    </h2>
                    <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600">모기업 &lsquo;언제나디자인&rsquo;의 공간 브랜딩 10년 노하우를 스테이시즌에 담았습니다.</p>

                    <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                        {STATS.map((stat) => (
                            <div key={stat.title} className="border-t-2 border-season-brown pt-6">
                                <div className="text-2xl font-semibold text-season-brown md:text-3xl">{stat.value}</div>
                                <h3 className="mt-4 text-base font-semibold">{stat.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600">{stat.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 핵심 가치 */}
            <section className="border-b border-season-line">
                <div className="ss-container py-20 md:py-28">
                    <p className="ss-eyebrow">Core Value</p>
                    <h2 className="mt-4 text-2xl font-semibold leading-snug md:text-3xl md:leading-snug">이제, &lsquo;브랜드의 가치&rsquo;가 유일한 경쟁력이 됩니다</h2>
                    <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600">과도한 노출과 할인 중심의 운영은 브랜드 가치를 흐립니다. 스테이시즌은 브랜드의 감성과 경험에 집중하여 본연의 가치를 온전히 전달합니다.</p>

                    <div className="mt-12 grid gap-10 lg:grid-cols-2">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500">타 플랫폼</h3>
                            <ul className="mt-4 divide-y divide-season-line border-y border-season-line">
                                {OTHERS.map((item) => (
                                    <li key={item.title} className="py-5">
                                        <div className="text-base font-semibold text-gray-500">{item.title}</div>
                                        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{item.text}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-season-accent">스테이시즌</h3>
                            <ul className="mt-4 divide-y divide-season-line border-y-2 border-season-brown">
                                {OURS.map((item) => (
                                    <li key={item.title} className="py-5">
                                        <div className="text-base font-semibold text-season-ink">{item.title}</div>
                                        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{item.text}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* 운영 전략 */}
            <section className="border-b border-season-line bg-season-sand">
                <div className="ss-container py-20 md:py-28">
                    <p className="ss-eyebrow">Content &amp; Platform</p>
                    <h2 className="mt-4 text-2xl font-semibold leading-snug md:text-3xl md:leading-snug">만들어진 작품, 있어야 할 곳에 도달합니다</h2>
                    <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600">
                        입점 공간의 콘텐츠를 단순 노출에 그치지 않고 공식 채널·광고·매거진·인플루언서·카카오톡 채널과 연결해 운영합니다. 숙소의 브랜드 매력을 반복적으로 전달하고, 관심 유입부터 예약 전환까지 이어지는 흐름을 만듭니다.
                    </p>

                    <ul className="mt-12 grid gap-px bg-season-line sm:grid-cols-2 lg:grid-cols-5">
                        {CHANNELS.map((channel) => (
                            <li key={channel.name} className="bg-season-sand px-6 py-7">
                                <div className="text-lg font-semibold">{channel.name}</div>
                                <p className="mt-2 text-sm text-gray-600">{channel.role}</p>
                            </li>
                        ))}
                    </ul>

                    <h3 className="mt-20 text-xl font-semibold md:text-2xl">예약 관리부터 정산까지, 전용 관리시스템으로 운영을 더 쉽게</h3>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
                        숙소 정보 등록부터 객실 설정, 예약 운영, 정산 확인까지 하나의 흐름으로 관리할 수 있도록 관리자 페이지와 PMS를 설계했습니다. 초기 입점 부담은 줄이고, 실제 운영에 필요한 기능은 더욱 직관적으로 제공합니다.
                    </p>
                    <div className="mt-10 grid gap-10 md:grid-cols-3">
                        {SUPPORTS.map((support) => (
                            <div key={support.title} className="border-t-2 border-season-brown pt-6">
                                <h4 className="text-lg font-semibold">{support.title}</h4>
                                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                                    {support.items.map((item) => (
                                        <li key={item} className="flex gap-2">
                                            <span aria-hidden="true" className="text-season-accent">
                                                ·
                                            </span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 혜택 및 수수료 */}
            <section className="border-b border-season-line">
                <div className="ss-container py-20 md:py-28">
                    <p className="ss-eyebrow">Benefits &amp; Commission</p>
                    <h2 className="mt-4 text-2xl font-semibold leading-snug md:text-3xl md:leading-snug">
                        숙소 운영에 필요한 마케팅은 한 번에,
                        <br />
                        운영의 부담은 가볍게
                    </h2>
                    <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600">콘텐츠 제작부터 광고 지원까지 함께 제공하고, 입점 수수료와 위약금 부담은 없앴습니다.</p>

                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {BENEFITS.map((benefit) => (
                            <BenefitCard key={benefit.no} benefit={benefit} />
                        ))}
                    </div>

                    <h3 className="mt-20 text-xl font-semibold md:text-2xl">스테이컬렉션 연계 혜택</h3>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
                        스테이컬렉션은 스테이시즌이 운영하는 커머스 플랫폼입니다. 숙소에서의 경험을 일상으로 확장하여, 공간의 가치가 머무름 이후에도 지속되도록 합니다.
                    </p>
                    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {COLLECTION_BENEFITS.map((benefit) => (
                            <BenefitCard key={benefit.no} benefit={benefit} />
                        ))}
                    </div>
                </div>
            </section>

            {/* 입점 절차 */}
            <section className="border-b border-season-line bg-season-sand">
                <div className="ss-container py-20 md:py-28">
                    <p className="ss-eyebrow">Process</p>
                    <h2 className="mt-4 text-2xl font-semibold leading-snug md:text-3xl md:leading-snug">
                        당신의 공간이 브랜드가 되기까지,
                        <br />단 4단계면 충분합니다
                    </h2>
                    <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
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

//혜택 카드 (입점 혜택·연계 혜택 공용)
function BenefitCard({ benefit }: { benefit: Benefit }) {
    return (
        <div className="flex flex-col rounded-[3px] bg-season-sand p-7">
            <div className="ss-en text-2xl font-medium text-season-accent">{benefit.no}</div>
            <h3 className="mt-5 text-lg font-semibold">{benefit.title}</h3>
            <div className="ss-en mt-1 text-sm text-gray-500">{benefit.en}</div>
            <ul className="mt-6 space-y-2 border-t border-season-line pt-5 text-sm leading-relaxed text-gray-600">
                {benefit.items.map((item) => (
                    <li key={item} className="flex gap-2">
                        <span aria-hidden="true" className="text-season-accent">
                            ·
                        </span>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}
