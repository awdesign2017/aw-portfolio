'use client';

import HomePageClient, { type HomeSlide } from '@/components/HomePageClient';

const slides: HomeSlide[] = [
    {
        imageSrc: '/slide1.jpg',
        imageAlt: '슬라이드 1',
        title: (
            <>
                숙소에 가장 어울리는 타입을
                <br />
                선택해 보세요.
            </>
        ),
        subtitle: (
            <>
                시간과 장소에 구애받지 않고, <br className="md:hidden" />
                제작을 시작할 수 있습니다.
            </>
        ),
    },
    {
        imageSrc: '/slide2.jpg',
        imageAlt: '슬라이드 2',
        title: (
            <>
                다양한 형식의
                <br />
                콘텐츠 제작이 가능합니다.
            </>
        ),
        subtitle: (
            <>
                기획부터 제작까지, <br className="md:hidden" />
                AI를 활용한 다양한 콘텐츠를 제작해 보세요.
            </>
        ),
    },
    {
        imageSrc: '/slide3.jpg',
        imageAlt: '슬라이드 3',
        title: (
            <>
                숙소 운영에 필요한
                <br />
                예약 시스템을 확인해 보세요
            </>
        ),
        subtitle: (
            <>
                예약 관리부터 운영까지, <br className="md:hidden" />
                하나의 시스템으로 관리할 수 있습니다.
            </>
        ),
    },
];

export default function Page() {
    return (
        <HomePageClient
            slides={slides}
            preset={{
                autoSelectCategoryName: '독채형',
                hiddenCategoryNames: ['컬렉션'],
                excludePortfolioCategoryNames: ['컬렉션'],
            }}
        />
    );
}
