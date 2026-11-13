'use client';

import HomePageClient, { type HomeSlide } from '@/components/HomePageClient';

const slides: HomeSlide[] = [
    {
        imageSrc: '/slide2_2.jpg',
        imageAlt: '컬렉션 슬라이드 1',
        title: (
            <>
                컬렉션 타입만 모아
                <br />
                한 번에 확인해 보세요.
            </>
        ),
        subtitle: (
            <>
                필요한 구성만 빠르게 비교하고
                <br className="md:hidden" />
                바로 선택할 수 있습니다.
            </>
        ),
    },
    {
        imageSrc: '/slide1.jpg',
        imageAlt: '컬렉션 슬라이드 2',
        title: (
            <>
                브랜드 톤에 맞춘
                <br />
                콘텐츠 흐름을 제공합니다.
            </>
        ),
        subtitle: (
            <>
                촬영/기획 없이도 적용 가능한
                <br className="md:hidden" />
                베이스 구조를 확인해 보세요.
            </>
        ),
    },
    {
        imageSrc: '/slide3.jpg',
        imageAlt: '컬렉션 슬라이드 3',
        title: (
            <>
                운영에 필요한 요소를
                <br />
                깔끔하게 정리했습니다.
            </>
        ),
        subtitle: (
            <>
                예약/문의/안내까지
                <br className="md:hidden" />
                사용자 흐름을 자연스럽게 설계합니다.
            </>
        ),
    },
];

export default function CollectionPage() {
    return (
        <HomePageClient
            slides={slides}
            className="collection-page"
            preset={{
                lockedCategorySlug: 6,
                lockedCategoryName: '컬렉션',
                hideAllButton: true,
                hideOtherCategories: true,
                requireSelectedCategory: true,
            }}
        />
    );
}

