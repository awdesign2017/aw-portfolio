'use client';

import { useRequest } from '@/hooks/useRequest';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AuthService } from '@/services/auth.service';
import { tokenStore } from '@/services/tokenStore';
import { useSetRecoilState } from 'recoil';
import { userState } from '@/store/user';

export default function LoginPage() {
    //hooks
    const { request } = useRequest();

    const searchParams = useSearchParams();

    const redirect = searchParams.get('redirect');

    const setUser = useSetRecoilState(userState);

    const [companyName, setCompanyName] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    // 인증 처리
    const handleAuth = async () => {
        setAuthError('');

        if (!companyName.trim()) {
            setAuthError('상호명을 입력해주세요.');
            return;
        }
        if (!/^\d{4,8}$/.test(password)) {
            setAuthError('비밀번호 4~8자리를 입력해주세요.');
            return;
        }

        try {
            await request(
                () => AuthService.UserLogin(companyName, password),
                (res) => {
                    localStorage.removeItem('showLoginForm');
                    tokenStore.set(res.data.token);
                    setUser(res.data.user);
                    localStorage.setItem('login', 'true');

                    if (res.data.isNewMember) alert('환영합니다! 새로운 회원으로 등록되었습니다.');

                    const target = redirect ? decodeURIComponent(redirect) : '/';
                    window.location.href = target;
                },
                { ignoreErrorRedirect: true }
            );
        } catch (error) {
            console.error('Auth error:', error);
            setAuthError('인증 처리 중 오류가 발생했습니다.');
        }
    };
    return (
        <div className="min-h-screen bg-white">
            <header className="bg-white border-b-2 border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <a href="/" className="block">
                            <h1 className="text-2xl font-bold text-black">
                                <img src="/logo.png" alt="로고" className="h-8" />
                            </h1>
                        </a>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <form
                    onSubmit={(e) => {
                        e.preventDefault(); // 새로고침 방지
                        handleAuth(); // 확인 버튼과 동일한 동작
                    }}
                    className="max-w-md mx-auto mt-36 mb-12 bg-white border border-gray-300 rounded-lg p-8 shadow-lg"
                >
                    <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-black mb-2">로그인</h3>
                        <p className="text-gray-600">
                            제공받은 상호명과 <br className="md:hidden" /> 비밀번호를 입력해주세요.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                상호명 <span className="text-red-500">*</span>
                            </label>
                            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="상호명을 입력해주세요" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-all" required />
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                                확인용 비밀번호 (4~8자리) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                                placeholder="숫자 4~8자리"
                                maxLength={8}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition-all"
                                required
                            />
                            <p className="text-sm text-gray-500 mt-1 text-center mt-[1rem] mb-[1rem]">
                                처음 방문하셨거나 로그인에 어려움이 있으신 경우, <br /> 아래 유선번호로 문의해 주시기 바랍니다.
                            </p>
                            <p className="text-sm text-gray-500 mt-1 text-center">대표전화 : 1522-5453</p>
                        </div>

                        {authError && (
                            <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                                <p className="text-sm text-red-700">{authError}</p>
                            </div>
                        )}

                        <button type="submit" className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all">
                            확인
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
