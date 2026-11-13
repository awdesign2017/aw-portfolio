'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

//회원 관리 기능은 최고 관리자 페이지 > 사용자 관리 탭으로 통합됨 (옛 주소 접속 시 이동)
export default function MembersPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/super?tab=users');
    }, [router]);

    return null;
}
