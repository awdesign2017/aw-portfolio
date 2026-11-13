'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRecoilValue } from 'recoil';
import { userState } from '@/store/user';
import { useRequest } from '@/hooks/useRequest';
import { HostingService } from '@/services/hosting.service';
import { HostApplication, HostApplicationStatus } from '@/tpyes/hosting';

//스테이시즌 입점 신청 목록 (관리자)
//왼쪽: 신청 목록 / 오른쪽: 선택한 신청의 내용과 이미지를 한 화면에 표시

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

const formatDateTime = (value: string) => (value ? new Date(value).toLocaleString('ko-KR') : '-');
const formatDate = (value: string) => (value ? new Date(value).toLocaleDateString('ko-KR') : '-');

export default function AdminHostingPage() {
    const router = useRouter();
    const currentUser = useRecoilValue(userState);
    const { request } = useRequest();

    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState<HostApplication[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | HostApplicationStatus>('all');
    const [keyword, setKeyword] = useState('');
    //선택한 신청 (없으면 목록의 첫 번째를 보여줌)
    const [selectedId, setSelectedId] = useState<number | null>(null);
    //이미지 크게 보기 (보고 있는 이미지 순번)
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);

    const detailRef = useRef<HTMLDivElement>(null);

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

    const newSince = Date.now() - NEW_DAYS * 24 * 60 * 60 * 1000;
    const isRecent = (application: HostApplication) => new Date(application.createdAt).getTime() >= newSince;

    const search = keyword.trim().toLowerCase();
    const filtered = applications
        .filter((a) => statusFilter === 'all' || a.status === statusFilter)
        .filter((a) => !search || [a.stayName, a.managerName, a.managerEmail, a.managerPhone].some((v) => (v ?? '').toLowerCase().includes(search)));
    const isFiltered = statusFilter !== 'all' || !!search;

    const detail = filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null;
    const detailImages = detail?.images ?? [];

    const selectApplication = (application: HostApplication) => {
        setSelectedId(application.id);
        setViewerIndex(null);
        //좁은 화면에서는 목록 아래에 상세가 나오므로 그 위치로 이동
        if (window.innerWidth < 1024) {
            requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
        }
    };

    //이미지 크게 보기: ESC 닫기, 좌우 화살표 이동
    useEffect(() => {
        if (viewerIndex === null) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setViewerIndex(null);
            if (event.key === 'ArrowRight') setViewerIndex((prev) => (prev === null ? prev : (prev + 1) % detailImages.length));
            if (event.key === 'ArrowLeft') setViewerIndex((prev) => (prev === null ? prev : (prev - 1 + detailImages.length) % detailImages.length));
        };
        const prevOverflow = document.body.style.overflow;
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = prevOverflow || '';
        };
    }, [viewerIndex, detailImages.length]);

    const changeStatus = async (application: HostApplication, status: HostApplicationStatus) => {
        await request(
            () => HostingService.putStatus(application.id, status),
            () => setApplications((prev) => prev.map((a) => (a.id === application.id ? { ...a, status } : a))),
            { ignoreErrorRedirect: true },
        ).catch(() => {});
    };

    const deleteApplication = async (application: HostApplication) => {
        if (!confirm(`'${application.stayName}' 입점 신청을 삭제하시겠습니까?\n첨부 이미지도 함께 삭제됩니다.`)) return;

        await request(
            () => HostingService.delete(application.id),
            () => {
                alert('삭제되었습니다.');
                setSelectedId(null);
                fetchApplications();
            },
            { ignoreErrorRedirect: true },
        ).catch(() => {});
    };

    const downloadExcel = async () => {
        //엑셀 라이브러리는 용량이 커서 버튼을 누를 때만 불러온다
        const XLSX = await import('xlsx');
        const rows = filtered.map((a) => ({
            신청일시: formatDateTime(a.createdAt),
            상태: STATUS_LABEL[a.status] ?? a.status,
            '숙소 이름': a.stayName,
            '숙소 주소': a.stayAddress,
            '웹사이트 및 SNS': a.website ?? '',
            '숙소 소개': a.stayIntro,
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
                        <p className="text-sm text-gray-500 mt-1">목록에서 신청을 선택하면 내용과 이미지를 바로 확인할 수 있습니다</p>
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

                {applications.length === 0 ? (
                    <Empty title="접수된 입점 신청이 없습니다" description="신청이 들어오면 여기에 표시되고, 알림 메일이 발송됩니다" />
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
                        {/* 왼쪽: 목록 */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden lg:sticky lg:top-6">
                            <div className="p-4 border-b border-gray-100 space-y-2">
                                <div className="flex gap-2">
                                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | HostApplicationStatus)} className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm">
                                        <option value="all">상태 전체</option>
                                        <option value="NEW">신규</option>
                                        <option value="REVIEWING">검토 중</option>
                                        <option value="DONE">완료</option>
                                    </select>
                                    <input type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="숙소, 담당자, 연락처 검색" className="min-w-0 flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm" />
                                </div>
                                <div className="flex items-center justify-between text-sm text-gray-500">
                                    <span>{isFiltered ? `검색 결과 ${filtered.length}건` : `전체 ${filtered.length}건`} · 최신순</span>
                                    {isFiltered && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStatusFilter('all');
                                                setKeyword('');
                                            }}
                                            className="font-semibold text-gray-500 hover:text-gray-900"
                                        >
                                            초기화
                                        </button>
                                    )}
                                </div>
                            </div>

                            {filtered.length === 0 ? (
                                <p className="px-4 py-10 text-center text-sm text-gray-400">조건에 맞는 신청이 없습니다.</p>
                            ) : (
                                <ul className="divide-y divide-gray-100 lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto">
                                    {filtered.map((application) => {
                                        const selected = detail?.id === application.id;
                                        const thumbnail = application.images?.[0]?.url;
                                        return (
                                            <li key={application.id}>
                                                <button type="button" onClick={() => selectApplication(application)} aria-current={selected ? 'true' : undefined} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${selected ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}>
                                                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">{thumbnail && <img src={thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />}</div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="truncate text-sm font-semibold">{application.stayName}</span>
                                                            {isRecent(application) && <span className="shrink-0 px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold leading-none">NEW</span>}
                                                        </div>
                                                        <div className={`mt-0.5 truncate text-xs ${selected ? 'text-gray-300' : 'text-gray-500'}`}>
                                                            {application.managerName} · {formatDate(application.createdAt)}
                                                        </div>
                                                    </div>
                                                    <span className={`shrink-0 px-2 py-1 rounded-full text-[11px] font-semibold ${STATUS_CLASS[application.status] ?? 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[application.status] ?? application.status}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* 오른쪽: 선택한 신청 상세 */}
                        <div ref={detailRef} className="scroll-mt-4">
                            {!detail ? (
                                <Empty title="조건에 맞는 신청이 없습니다" description="필터나 검색어를 바꿔보세요" />
                            ) : (
                                <article className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    {/* 제목 */}
                                    <div className="px-6 py-6 border-b border-gray-100 md:px-8">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <h3 className="text-2xl font-bold tracking-tight text-gray-900 break-words">{detail.stayName}</h3>
                                                <p className="mt-1.5 text-sm text-gray-500 break-words">{detail.stayAddress}</p>
                                                <p className="mt-1 text-sm text-gray-400">{formatDateTime(detail.createdAt)} 신청</p>
                                            </div>
                                            <button onClick={() => deleteApplication(detail)} className="shrink-0 px-3 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                                                삭제
                                            </button>
                                        </div>
                                        <div className="mt-5 flex flex-wrap items-center gap-2">
                                            <span className="mr-1 text-sm font-semibold text-gray-500">처리 상태</span>
                                            {(Object.keys(STATUS_LABEL) as HostApplicationStatus[]).map((status) => (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    aria-pressed={detail.status === status}
                                                    onClick={() => detail.status !== status && changeStatus(detail, status)}
                                                    className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${detail.status === status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                >
                                                    {STATUS_LABEL[status]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 신청 내용 */}
                                    <div className="grid gap-px bg-gray-100 md:grid-cols-2">
                                        <Block title="담당자 정보">
                                            <Row label="성함">{detail.managerName}</Row>
                                            <Row label="전화번호">
                                                <a href={`tel:${detail.managerPhone}`} className="underline underline-offset-2">
                                                    {detail.managerPhone}
                                                </a>
                                            </Row>
                                            <Row label="이메일">
                                                <a href={`mailto:${detail.managerEmail}`} className="underline underline-offset-2">
                                                    {detail.managerEmail}
                                                </a>
                                            </Row>
                                            <Row label="숙박업 경험">{EXPERIENCE_LABEL[detail.experience] ?? detail.experience}</Row>
                                        </Block>
                                        <Block title="사업자 · 숙소 정보">
                                            <Row label="사업자 등록">{REGISTERED_LABEL[detail.businessRegistered] ?? detail.businessRegistered}</Row>
                                            <Row label="업종">{detail.businessType}</Row>
                                            <Row label="웹사이트·SNS">{detail.website || '-'}</Row>
                                        </Block>
                                    </div>

                                    <div className="px-6 py-6 border-t border-gray-100 md:px-8">
                                        <h4 className="text-sm font-semibold text-gray-500">숙소 소개</h4>
                                        <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-7 text-gray-800">{detail.stayIntro}</p>
                                    </div>

                                    {/* 이미지 */}
                                    <div className="px-6 py-6 border-t border-gray-100 md:px-8">
                                        <div className="flex items-baseline justify-between gap-4">
                                            <h4 className="text-sm font-semibold text-gray-500">
                                                첨부 이미지 <span className="text-gray-900">{detailImages.length}장</span>
                                            </h4>
                                            {detailImages.length > 0 && <span className="text-xs text-gray-400">이미지를 누르면 크게 볼 수 있습니다</span>}
                                        </div>
                                        {detailImages.length > 0 ? (
                                            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                                                {detailImages.map((image, index) => (
                                                    <li key={image.url}>
                                                        <button type="button" onClick={() => setViewerIndex(index)} aria-label={`${index + 1}번째 이미지 크게 보기`} className="group block aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100">
                                                            <img src={image.url} alt={image.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="mt-3 text-sm text-gray-400">첨부된 이미지가 없습니다.</p>
                                        )}
                                        <p className="mt-5 text-xs text-gray-400">영상은 신청자가 support@stay-season.com 으로 따로 보내도록 안내되어 있습니다.</p>
                                    </div>
                                </article>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 이미지 크게 보기 */}
            {detail && viewerIndex !== null && detailImages[viewerIndex] && (
                <div role="dialog" aria-modal="true" aria-label={`${detail.stayName} 첨부 이미지`} className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setViewerIndex(null)}>
                    <div className="flex items-center justify-between gap-4 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
                        <div className="min-w-0 text-sm">
                            <span className="font-semibold">
                                {viewerIndex + 1} / {detailImages.length}
                            </span>
                            <span className="ml-3 text-gray-400 break-all">{detailImages[viewerIndex].name}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <a href={detailImages[viewerIndex].url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-white/10 text-sm font-semibold hover:bg-white/20 transition-colors">
                                원본 열기
                            </a>
                            <button onClick={() => setViewerIndex(null)} aria-label="닫기" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl font-bold hover:bg-white/20 transition-colors">
                                ×
                            </button>
                        </div>
                    </div>
                    <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
                        <img src={detailImages[viewerIndex].url} alt={detailImages[viewerIndex].name} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
                        {detailImages.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    aria-label="이전 이미지"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setViewerIndex((viewerIndex - 1 + detailImages.length) % detailImages.length);
                                    }}
                                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/30 transition-colors"
                                >
                                    ‹
                                </button>
                                <button
                                    type="button"
                                    aria-label="다음 이미지"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setViewerIndex((viewerIndex + 1) % detailImages.length);
                                    }}
                                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/30 transition-colors"
                                >
                                    ›
                                </button>
                            </>
                        )}
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

//상세 화면의 정보 묶음 (담당자 정보 등)
function Block({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white px-6 py-6 md:px-8">
            <h4 className="text-sm font-semibold text-gray-500">{title}</h4>
            <dl className="mt-3 space-y-2.5 text-[15px]">{children}</dl>
        </div>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[6.5rem_1fr] gap-3">
            <dt className="text-gray-500">{label}</dt>
            <dd className="min-w-0 break-words font-medium text-gray-900">{children}</dd>
        </div>
    );
}
