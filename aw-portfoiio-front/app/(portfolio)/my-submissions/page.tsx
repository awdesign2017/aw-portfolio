'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubmissionService } from '@/services/submission.service';
import { useRequest } from '@/hooks/useRequest';
import Link from 'next/link';
import { useRecoilValue } from 'recoil';
import { userState } from '@/store/user';

interface Submission {
    id: string;
    portfolioId: string;
    companyName: string;
    isDraft: boolean;
    completedAt: string;
    updatedAt: string;
    responses: any;
    portfolio: {
        id: string;
        title: string;
        slug: string;
    };
}

export default function MySubmissionsPage() {
    const router = useRouter();

    //hooks
    const { request } = useRequest();
    const currentUser = useRecoilValue(userState);
    const [companyName, setCompanyName] = useState<string>('');

    const [password, setPassword] = useState(''); // 보안상 저장하지 않음
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [submissions, setSubmissions] = useState<Submission[]>([]);

    useEffect(() => {
        const login = localStorage.getItem('login');

        if (!login) {
            window.location.href = '/login';
        } else if (currentUser) {
            handleSearch();
        }
    }, [currentUser]);

    const handleSearch = async () => {
        setError('');
        setLoading(true);

        const params = {
            companyName: companyName.trim(),
            password,
        };

        try {
            await request(
                () => SubmissionService.getMyList(),
                (res) => {
                    setSubmissions(res.data);
                    if (res.data.length === 0) {
                        setError('제출 내역이 없습니다.');
                    }
                },
                { ignoreErrorRedirect: true }
            );
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = (submission: Submission) => {
        router.push(`/portfolio/${submission.portfolioId}?submissionId=${submission.id}`);
    };

    // 자세히보기
    const handleDetailSubmission = (submission: Submission) => {
        router.push(`/portfolio/${submission.portfolioId}?submissionId=${submission.id}&detail=true`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b-2 border-black">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <a href="/" className="block">
                            <h1 className="text-2xl font-bold text-black">
                                <img src="/logo.png" alt="로고" className="h-8" />
                            </h1>
                        </a>
                        <div className="flex items-center gap-2">
                            <Link href="/" className="px-4 py-2 border-2 border-black rounded-lg font-semibold hover:bg-black hover:text-white transition-all">
                                홈으로
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-black mb-2">내 제출 내역 조회</h1>
                </div>

                {/* Submissions List - 로컬스토리지 기준으로 즉시 표시 */}
                {submissions.length > 0 && (
                    <div className="bg-white border-2 border-black rounded-lg overflow-hidden shadow-lg">
                        <div className="p-6 bg-gray-50 border-b-2 border-black">
                            <h2 className="text-xl font-bold text-black">제출 내역 ({submissions.length}건)</h2>
                        </div>

                        <div className="divide-y-2 divide-gray-200">
                            {submissions.map((submission) => (
                                <div key={submission.id} className="p-6 hover:bg-gray-50 transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-black">{submission.portfolio.title}</h3>
                                                {submission.isDraft ? <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">임시저장</span> : <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">제출완료</span>}
                                            </div>

                                            <div className="space-y-1 text-sm text-gray-600">
                                                <p>
                                                    {submission.isDraft ? '저장일' : '제출일'}:{' '}
                                                    {new Date(submission.isDraft ? submission.updatedAt : submission.completedAt).toLocaleDateString('ko-KR', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                                {submission.isDraft && submission.updatedAt !== submission.completedAt && (
                                                    <p className="text-yellow-600">
                                                        {new Date(submission.updatedAt).toLocaleDateString('ko-KR', {
                                                            month: 'long',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {submission.isDraft ? (
                                                <button onClick={() => handleContinue(submission)} className="px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all">
                                                    이어서 작성
                                                </button>
                                            ) : (
                                                <span className="px-4 py-2 text-gray-500 border-2 border-gray-300 rounded-lg font-semibold">수정 불가</span>
                                            )}
                                            <button className="text-sm text-black border-2 border-black px-3 py-1 rounded hover:bg-black hover:text-white transition-all" onClick={() => handleDetailSubmission(submission)}>
                                                작성내역 보기
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 조회했지만 결과가 없을 때 (로컬 기준) */}
                {submissions.length === 0 && <p className="text-gray-600">제출 내역이 없습니다.</p>}

                {/* Info Box */}
                <div className="mt-8 p-6 border-2 rounded-lg">
                    <h4 className="font-bold mb-2">💡 안내</h4>
                    <ul className="text-sm space-y-1">
                        <li>• 이전에 작성하신 제출 내역이 있을 경우, 자동으로 목록에 표시됩니다.</li>
                        <li>• 임시 저장된 제출물은 언제든지 이어서 작성할 수 있습니다.</li>
                        <li>• 제출 완료된 내용은 기본적으로 수정이 제한됩니다.</li>
                        <li>• 관리자 검토 과정에서 보완이 필요한 경우 제출이 완료된 내용도 수정이 가능하도록 안내드립니다.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
