'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecoilValue } from 'recoil';
import { userState } from '@/store/user';
import { useRequest } from '@/hooks/useRequest';
import { HostingService } from '@/services/hosting.service';
import { HostApplication, HostApplicationStatus } from '@/tpyes/hosting';

//스테이시즌 입점 신청 목록 (관리자)

const STATUS_LABEL: Record<HostApplicationStatus, string> = {
    NEW: '신규',
    REVIEWING: '검토 중',
    DONE: '완료',
};

const STATUS_CLASS: Record<HostApplicationStatus, string> = {
    NEW: 'bg-red-50 text-red-600',
    REVIEWING: 'bg-amber-50 text-amber-700',
    DONE: 'bg-emerald-50 text-emerald-700',
};

const EXPERIENCE_LABEL: Record<string, string> = { NONE: '경험 없음', HAS: '경험 있음' };
const REGISTERED_LABEL: Record<string, string> = { PREPARING: '준비 중', REGISTERED: '등록 완료' };

const NEW_DAYS = 7;
const TH = 'px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap';

const formatDateTime = (value: string) => (value ? new Date(value).toLocaleString('ko-KR') : '-');

export default function AdminHostingPage() {
    const router = useRouter();
    const currentUser = useRecoilValue(userState);
    const { request } = useRequest();

    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState<HostApplication[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | HostApplicationStatus>('all');
    const [keyword, setKeyword] = useState('');
    const [detail, setDetail] = useState<HostApplication | null>(null);

    const fetchApplications = async () => {
        await request(
            () => HostingService.adminGet(),
            (res) => setApplications(res.data),
            { ignoreErrorRedirect: true },
        );
    };

    //초기 진입시 검증 (관리자만)
    useEffect(() => {
        if (!localStorage.getItem('login')) {
            router.push('/admin/login');
            return;
        }
        if (!currentUser) return;

        if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN') {
            router.push('/');
            return;
        }

        fetchApplications()
            .catch(() => {})
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const changeStatus = async (application: HostApplication, status: HostApplicationStatus) => {
        await request(
            () => HostingService.putStatus(application.id, status),
            () => {
                setApplications((prev) => prev.map((a) => (a.id === application.id ? { ...a, status } : a)));
                setDetail((prev) => (prev && prev.id === application.id ? { ...prev, status } : prev));
            },
            { ignoreErrorRedirect: true },
        ).catch(() => {});
    };

    const deleteApplication = async (application: HostApplication) => {
        if (!confirm(`'${application.stayName}' 입점 신청을 삭제하시겠습니까?\n첨부 이미지도 함께 삭제됩니다.`)) return;

        await request(
            () => HostingService.delete(application.id),
            () => {
                alert('삭제되었습니다.');
                setDetail(null);
                fetchApplications();
            },
            { ignoreErrorRedirect: true },
        ).catch(() => {});
    };

    const newSince = Date.now() - NEW_DAYS * 24 * 60 * 60 * 1000;
    const isRecent = (application: HostApplication) => new Date(application.createdAt).getTime() >= newSince;

    const search = keyword.trim().toLowerCase();
    const filtered = applications
        .filter((a) => statusFilter === 'all' || a.status === statusFilter)
        .filter((a) => !search || [a.stayName, a.managerName, a.managerEmail, a.managerPhone].some((v) => (v ?? '').toLowerCase().includes(search)));
    const isFiltered = statusFilter !== 'all' || !!search;

    const downloadExcel = async () => {
        //엑셀 라이브러리는 용량이 커서 버튼을 누를 때만 불러온다
        const XLSX = await import('xlsx');
        const rows = filtered.map((a) => ({
            신청일시: formatDateTime(a.createdAt),
            상태: STATUS_LABEL[a.status] ?? a.status,
            '스테이 이름': a.stayName,
            '스테이 주소': a.stayAddress,
            '웹사이트 및 SNS': a.website ?? '',
            '스테이 소개': a.stayIntro,
            '담당자 성함': a.managerName,
            '담당자 전화번호': a.managerPhone,
            '담당자 이메일': a.managerEmail,
            '숙박업 경험': EXPERIENCE_LABEL[a.experience] ?? a.experience,
            '사업자 등록 여부': REGISTERED_LABEL[a.businessRegistered] ?? a.businessRegistered,
            업종: a.businessType,
            '첨부 이미지': (a.images ?? []).map((image) => image.url).join('\n'),
        }));

        const sheet = XLSX.utils.json_to_sheet(rows);
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, '입점 신청');
        XLSX.writeFile(book, `스테이시즌_입점신청_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
                <div className="w-8 h-8 rounded-full border-[3px] border-gray-200 border-t-gray-900 animate-spin" />
                <div className="text-sm font-medium text-gray-500">불러오는 중...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <h1 className="text-xl font-bold tracking-tight">스테이시즌 입점 신청</h1>
                        <div className="flex items-center gap-2">
                            <span className="mr-2 text-sm text-gray-400">{currentUser?.name}</span>
                            <a href="/stayseason" target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-2 rounded-lg bg-white/10 text-sm font-semibold hover:bg-white/20 transition-colors">
                                신청 페이지 보기
                            </a>
                            <button onClick={() => router.push(currentUser?.role === 'SUPER_ADMIN' ? '/admin/super' : '/admin/dashboard')} className="inline-flex items-center px-3 py-2 rounded-lg bg-white/10 text-sm font-semibold hover:bg-white/20 transition-colors">
                                관리자 페이지
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">신청 목록</h2>
                        <p className="text-sm text-gray-500 mt-1">/stayseason 페이지에서 접수된 입점 신청을 최신순으로 확인합니다</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={downloadExcel} disabled={filtered.length === 0} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:border-gray-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            엑셀 다운로드
                        </button>
                        <button onClick={() => fetchApplications().catch(() => {})} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:border-gray-400 transition-colors">
                            새로고침
                        </button>
                    </div>
                </div>

                {/* 요약 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <Stat label="전체" value={applications.length} />
                    <Stat label={`최근 ${NEW_DAYS}일`} value={applications.filter(isRecent).length} valueClass="text-red-500" />
                    <Stat label="신규 · 검토 중" value={applications.filter((a) => a.status !== 'DONE').length} valueClass="text-amber-500" />
                    <Stat label="완료" value={applications.filter((a) => a.status === 'DONE').length} valueClass="text-emerald-600" />
                </div>

                {/* 필터 */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-end gap-2 mb-6">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | HostApplicationStatus)} className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm">
                        <option value="all">상태 전체</option>
                        <option value="NEW">신규</option>
                        <option value="REVIEWING">검토 중</option>
                        <option value="DONE">완료</option>
                    </select>
                    <input type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="스테이 이름, 담당자, 연락처 검색" className="sm:w-72 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm" />
                    {isFiltered && (
                        <button
                            type="button"
                            onClick={() => {
                                setStatusFilter('all');
                                setKeyword('');
                            }}
                            className="px-3 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-900 whitespace-nowrap"
                        >
                            초기화
                        </button>
                    )}
                </div>

                {applications.length === 0 ? (
                    <Empty title="접수된 입점 신청이 없습니다" description="신청이 들어오면 여기에 표시되고, 알림 메일이 발송됩니다" />
                ) : filtered.length === 0 ? (
                    <Empty title="조건에 맞는 신청이 없습니다" description="필터나 검색어를 바꿔보세요" />
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-3 border-b border-gray-100 text-sm text-gray-500">
                            {isFiltered ? `검색 결과 ${filtered.length}건` : `전체 ${filtered.length}건`} · 최신순
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className={TH}>스테이 이름</th>
                                        <th className={TH}>담당자</th>
                                        <th className={TH}>연락처</th>
                                        <th className={TH}>상태</th>
                                        <th className={TH}>신청일시</th>
                                        <th className={`${TH} text-right`}>작업</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtered.map((application) => (
                                        <tr key={application.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    {application.stayName}
                                                    {isRecent(application) && <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold leading-none">NEW</span>}
                                                </div>
                                                <div className="mt-0.5 text-xs font-normal text-gray-400">{application.stayAddress}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{application.managerName}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                                <div>{application.managerPhone}</div>
                                                <div className="text-xs text-gray-400">{application.managerEmail}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLASS[application.status] ?? 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[application.status] ?? application.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(application.createdAt)}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex flex-col md:flex-row md:justify-end gap-2 md:gap-4">
                                                    <button onClick={() => setDetail(application)} className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap text-left">
                                                        상세보기
                                                    </button>
                                                    <button onClick={() => deleteApplication(application)} className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors whitespace-nowrap text-left">
                                                        삭제
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* 상세 */}
            {detail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
                    <div role="dialog" aria-modal="true" aria-label={`${detail.stayName} 입점 신청 상세`} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{detail.stayName}</h3>
                                <p className="mt-0.5 text-sm text-gray-400">{formatDateTime(detail.createdAt)} 신청</p>
                            </div>
                            <button onClick={() => setDetail(null)} aria-label="닫기" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-600 hover:bg-gray-200">
                                ×
                            </button>
                        </div>

                        <div className="overflow-y-auto px-6 py-5">
                            <div className="mb-5 flex flex-wrap items-center gap-2">
                                <span className="mr-1 text-sm font-semibold text-gray-500">처리 상태</span>
                                {(Object.keys(STATUS_LABEL) as HostApplicationStatus[]).map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => detail.status !== status && changeStatus(detail, status)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${detail.status === status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        {STATUS_LABEL[status]}
                                    </button>
                                ))}
                            </div>

                            <dl className="divide-y divide-gray-100 text-sm">
                                <Row label="담당자 성함">{detail.managerName}</Row>
                                <Row label="담당자 전화번호">
                                    <a href={`tel:${detail.managerPhone}`} className="underline underline-offset-2">
                                        {detail.managerPhone}
                                    </a>
                                </Row>
                                <Row label="담당자 이메일">
                                    <a href={`mailto:${detail.managerEmail}`} className="underline underline-offset-2">
                                        {detail.managerEmail}
                                    </a>
                                </Row>
                                <Row label="숙박업 경험">{EXPERIENCE_LABEL[detail.experience] ?? detail.experience}</Row>
                                <Row label="스테이 주소">{detail.stayAddress}</Row>
                                <Row label="웹사이트 및 SNS">{detail.website || '-'}</Row>
                                <Row label="스테이 소개">
                                    <span className="whitespace-pre-line">{detail.stayIntro}</span>
                                </Row>
                                <Row label="사업자 등록 여부">{REGISTERED_LABEL[detail.businessRegistered] ?? detail.businessRegistered}</Row>
                                <Row label="업종">{detail.businessType}</Row>
                            </dl>

                            <div className="mt-5">
                                <div className="text-sm font-semibold text-gray-500">첨부 이미지 {detail.images?.length ?? 0}장</div>
                                {detail.images && detail.images.length > 0 ? (
                                    <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                        {detail.images.map((image) => (
                                            <li key={image.url}>
                                                <a href={image.url} target="_blank" rel="noreferrer" title={image.name} className="block aspect-square overflow-hidden rounded-lg bg-gray-100">
                                                    <img src={image.url} alt={image.name} className="h-full w-full object-cover" loading="lazy" />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-2 text-sm text-gray-400">첨부된 이미지가 없습니다.</p>
                                )}
                                <p className="mt-4 text-xs text-gray-400">영상은 신청자가 support@stay-season.com 으로 따로 보내도록 안내되어 있습니다.</p>
                            </div>
                        </div>

                        <div className="flex justify-between gap-2 border-t border-gray-100 px-6 py-4">
                            <button onClick={() => deleteApplication(detail)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                                삭제
                            </button>
                            <button onClick={() => setDetail(null)} className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors">
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, valueClass = 'text-gray-900' }: { label: string; value: number; valueClass?: string }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
            <div className="text-sm text-gray-500">{label}</div>
            <div className={`mt-1 text-2xl font-bold ${valueClass}`}>
                {value.toLocaleString()}
                <span className="ml-1 text-sm font-medium text-gray-400">건</span>
            </div>
        </div>
    );
}

function Empty({ title, description }: { title: string; description: string }) {
    return (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 text-center px-6 py-14">
            <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[7.5rem_1fr] gap-4 py-3">
            <dt className="font-semibold text-gray-500">{label}</dt>
            <dd className="min-w-0 break-words text-gray-900">{children}</dd>
        </div>
    );
}
