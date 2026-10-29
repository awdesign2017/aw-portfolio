'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { userState } from '@/store/user';
import { useRequest } from '@/hooks/useRequest';
import Pagination from '@/components/Pagination';
import { tokenStore } from '@/services/tokenStore';
import axios from 'axios';
import api from '@/lib/axiosInstance';
import { CategoriesService } from '@/services/categories.service';
import { PortfolioService } from '@/services/portfolios.service';
import { Portfolio, PortfolioContent, PortfolioForm } from '@/tpyes/portfolio';
import { Category, CategoryContent, CategorySelect } from '@/tpyes/category';
import { QuestionService } from '@/services/question.service';
import { QuestionForm } from '@/tpyes/question';
import { SubmissionService } from '@/services/submission.service';
import { Submission } from '@/tpyes/submission';
import { UserService } from '@/services/user.service';
import { MemberService } from '@/services/member.service';
import { MemberContent } from '@/tpyes/member';
import { UserContent, UserList } from '@/tpyes/userList';
import { AuthService } from '@/services/auth.service';

interface Question {
    id: string;
    portfolioId: string;
    step: number;
    title: string;
    description?: string;
    thumbnail?: string;
    minLength: number;
    maxLength?: number;
    requireMinLength?: boolean;
    order: number;
    isRequired: boolean;
    questionType?: string;
    options?: string;
}

type TabType = 'users' | 'portfolios' | 'questions' | 'submissions' | 'categories' | 'members';

//사용자 목록 역할별 구역 (표시 순서)
//deletable: 계정 삭제 버튼 노출 여부 (최고 관리자는 비밀번호 변경만 허용)
const USER_ROLE_SECTIONS = [
    { role: 'SUPER_ADMIN', label: '최고 관리자', deletable: false },
    { role: 'ADMIN', label: '관리자', hideWhenEmpty: true, deletable: true },
    { role: 'USER', label: '숙소 사장님', deletable: true },
];
//사용자 목록 구역별 페이지당 표시 수
const USER_PAGE_SIZE = 20;
//포트폴리오 목록 카테고리별 페이지당 표시 수
const PORTFOLIO_PAGE_SIZE = 12;

//비밀번호 변경 규칙 (일반 회원: 숫자 4~8자리 / 관리자: 제한 없음) - 통과 시 null, 실패 시 안내 문구
const validateNewPassword = (role: string, password: string): string | null => {
    if (role === 'USER') {
        return /^\d{4,8}$/.test(password) ? null : '비밀번호는 숫자 4~8자리로 입력해주세요.';
    }
    return password.trim() ? null : '비밀번호를 입력해주세요.';
};

const formatDateTime = (dateString: string | null | undefined) => (dateString ? new Date(dateString).toLocaleString('ko-KR') : '-');

export default function SuperAdminPage() {
    const router = useRouter();

    //유저정보
    const currentUser = useRecoilValue(userState);
    const resetUser = useSetRecoilState(userState);

    //hooks
    const { request } = useRequest();

    //페이지
    const [page, setPage] = useState(0);

    //카테고리 목록
    const [categories, setCategories] = useState<Category>();

    //포토폴리오 list
    const [portfolios, setPortfolios] = useState<Portfolio>();
    //포트폴리오 검색
    const [searchName, setSearchName] = useState('');
    //포토폴리오 카테고리 목록
    const [selectCategory, setSelectCategory] = useState<CategorySelect[]>();
    //포트폴리오 카테고리 탭 ('all' 또는 카테고리 ID)
    const [portfolioCategoryTab, setPortfolioCategoryTab] = useState<string>('all');
    //전체 포토폴리오
    const [allPortfolios, setAllPortfolios] = useState<PortfolioContent[]>();

    //제출 목록
    const [submissions, setSubmissions] = useState<Submission[]>([]);

    const [users, setUsers] = useState<UserList>();
    //사용자별 마지막 접속 (회원 ID → 일시)
    const [lastLoginMap, setLastLoginMap] = useState<Record<string, string | null>>({});
    //비밀번호 변경 대상
    const [passwordTargetUser, setPasswordTargetUser] = useState<UserContent | null>(null);
    const [newPassword, setNewPassword] = useState('');

    //질문 목록
    const [questions, setQuestions] = useState<Question[]>([]);
    //객실, 스페셜, 환불 숨김
    const [showTitleDescription, setShowTitleDescription] = useState(true);
    const QUESTION_TYPE_LABEL_MAP: Record<string, string> = {
        parlor: '객실',
        special: '스페셜',
        refund: '환불',
        addr: '주소',
    };

    const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('portfolios');

    // User creation form
    const [showUserForm, setShowUserForm] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        name: '',
        role: 'ADMIN',
    });

    // Portfolio form
    const [showPortfolioForm, setShowPortfolioForm] = useState(false);
    const [editingPortfolio, setEditingPortfolio] = useState<PortfolioContent | null>(null);
    const [portfolioForm, setPortfolioForm] = useState<PortfolioForm>({
        title: '',
        description: '',
        slug: '',
        thumbnail: '',
        isActive: true,
        order: 0,
        categoryId: '',
        mood: '',
        domain: '',
        thumbnailFile: null,
    });

    // Question form
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [questionForm, setQuestionForm] = useState<QuestionForm>({
        portfolioId: '',
        step: 1,
        title: '',
        description: '',
        thumbnail: '',
        minLength: 10,
        maxLength: 500,
        requireMinLength: false,
        order: 0,
        isRequired: true,
        questionType: 'text',
        options: '',
        thumbnailFile: null,
    });

    // Category form
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryContent | null>(null);
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        slug: '',
        order: 0,
    });

    const fetchUsers = async () => {
        await Promise.all([
            request(
                //역할별 구역으로 나누기 위해 전체 조회 후 구역별로 페이지 처리
                () => UserService.get({ page: 0, size: 1000 }),
                (res) => {
                    setUsers(res.data);
                },
                { ignoreErrorRedirect: true },
            ),
            //마지막 접속은 회원 API 에만 있어 회원 ID 로 매칭
            request(
                () => MemberService.get({ page: 0, size: 1000 }),
                (res) => {
                    const map: Record<string, string | null> = {};
                    res.data.content.forEach((m: MemberContent) => {
                        map[String(m.id)] = m.lastLoginAt;
                    });
                    setLastLoginMap(map);
                },
                { ignoreErrorRedirect: true },
            ),
        ]);
    };

    //사용자 비밀번호 변경
    const handleSubmitPasswordChange = async () => {
        if (!passwordTargetUser) return;

        const error = validateNewPassword(passwordTargetUser.role, newPassword);
        if (error) {
            alert(error);
            return;
        }

        await request(
            () => MemberService.post({ memberId: passwordTargetUser.id, password: newPassword }),
            () => {
                alert('비밀번호가 변경되었습니다.');
                setPasswordTargetUser(null);
                setNewPassword('');
                fetchUsers();
            },
            { ignoreErrorRedirect: true },
        );
    };

    //사용자 계정 삭제 (제출 내역·업로드 파일까지 함께 삭제됨)
    const handleDeleteUser = async (user: UserContent) => {
        if (!confirm(`'${user.name}' 계정을 삭제하시겠습니까?\n\n이 계정의 제출 내역과 업로드 파일도 모두 함께 삭제되며, 되돌릴 수 없습니다.`)) {
            return;
        }

        await request(
            () => MemberService.delete(user.id),
            () => {
                alert('계정이 삭제되었습니다.');
                fetchUsers();
            },
            { ignoreErrorRedirect: true },
        );
    };

    //포트폴리오 탭
    const fetchPortfolios = async () => {
        await request(
            //카테고리별로 나누기 위해 전체 조회 후 카테고리별로 페이지 처리
            () => PortfolioService.get({ page: 0, size: 1000, name: searchName }),
            (res) => {
                setPortfolios(res.data);
                //카테고리 select 목록
                request(
                    () => PortfolioService.getCategorySelect(),
                    (res) => {
                        setSelectCategory(res.data);
                    },
                    { ignoreErrorRedirect: true },
                );
            },
            { ignoreErrorRedirect: true },
        );
    };

    //포트폴리오 카드 (카테고리별 구역에서 사용)
    const renderPortfolioCard = (portfolio: PortfolioContent) => (
        <div key={portfolio.id} className="bg-white border-2 border-black rounded-lg overflow-hidden">
            {portfolio.thumbnail && (
                <div className="w-full bg-gray-200">
                    <img src={portfolio.thumbnail} alt={portfolio.title} className="w-full h-full" />
                </div>
            )}
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-black">{portfolio.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            {portfolio.category && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{portfolio.category.name}</span>}
                            {!portfolio.isActive && <span className="text-xs bg-gray-200 px-2 py-1 rounded">비활성</span>}
                        </div>
                    </div>
                </div>
                {portfolio.description && <p className="text-gray-600 mb-4">{portfolio.description}</p>}
                <div className="text-sm text-gray-500 mb-4">
                    <div>슬러그: {portfolio.slug}</div>
                    <div>순서: {portfolio.order}</div>
                    {portfolio.count && (
                        <>
                            <div>질문: {portfolio.count.questions}개</div>
                            <div>제출: {portfolio.count.submissions}개</div>
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleEditPortfolio(portfolio)} className="flex-1 px-3 py-2 text-sm border-2 border-black rounded hover:bg-black hover:text-white transition-all">
                        수정
                    </button>
                    <button onClick={() => handleDeletePortfolio(portfolio.id)} className="flex-1 px-3 py-2 text-sm border-2 border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all">
                        삭제
                    </button>
                    <button onClick={() => handleCopyPortfolio(portfolio.id)} className="flex-1 px-3 py-2 text-sm border-2 border-green-500 text-green-500 rounded hover:bg-green-500 hover:text-white transition-all">
                        복제
                    </button>
                </div>
            </div>
        </div>
    );

    //전체 포트폴리오
    const fetchAllPortfolios = async () => {
        await request(
            () => PortfolioService.getAll(),
            (res) => {
                setAllPortfolios(res.data);
            },
            { ignoreErrorRedirect: true },
        );
    };

    const fetchQuestionsByPortfolio = async (portfolioId: string) => {
        await request(
            () => QuestionService.get(portfolioId),
            (res) => {
                setQuestions(res.data);
            },
            { ignoreErrorRedirect: true },
        );
    };

    const fetchSubmissions = async () => {
        try {
            await request(
                () => SubmissionService.adminGet(),
                (res) => {
                    setSubmissions(res.data || []);
                },
                { ignoreErrorRedirect: true },
            );
        } catch (error) {
            console.error('Failed to fetch submissions:', error);
        }
    };

    // 엑셀 다운로드 함수
    const submissionOff = async (submission: Submission) => {
        if (!confirm('임시저장으로 되돌리시겠습니까?')) {
            return;
        }

        const params = {
            portfolioId: submission.portfolioId,
            submissionId: submission.id,
        };

        await request(
            () => SubmissionService.submissionOffPost(params),
            (res) => {
                alert('임시저장으로 변경하였습니다.');
                fetchSubmissions();
            },
            { ignoreErrorRedirect: true },
        );
    };

    // 엑셀 다운로드 함수
    const downloadExcel = async (submission: Submission) => {
        const params = {
            portfolioId: submission.portfolioId,
            submissionId: submission.id,
        };

        await request(
            () => SubmissionService.adminExcelGet(params),
            (res) => {
                const blob = new Blob([res.data], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                });

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `제출_목록_${submission.companyName}_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            },
            { ignoreErrorRedirect: true },
        );
    };

    //카테고리 목록 조회
    const fetchCategories = async () => {
        await request(
            () => CategoriesService.get({ page: page, size: 30 }),
            (res) => {
                setCategories(res.data);
            },
            { ignoreErrorRedirect: true },
        );
    };
    //카테고리 저장 or 수정
    const handleCreateOrUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const method = editingCategory ? CategoriesService.put : CategoriesService.post;
            const body = editingCategory ? { ...categoryForm, id: editingCategory.id } : categoryForm;

            await request(
                () => method(body),
                (res) => {
                    alert(editingCategory ? '카테고리가 수정되었습니다.' : '카테고리가 생성되었습니다.');
                    setShowCategoryForm(false);
                    setEditingCategory(null);
                    setCategoryForm({
                        name: '',
                        slug: '',
                        order: 0,
                    });
                    fetchCategories();
                },
                { ignoreErrorRedirect: true },
            );
        } catch (error) {
            console.error('Save category error:', error);
        }
    };

    //카테고리 삭제
    const handleDeleteCategory = async (id: string) => {
        if (!confirm('정말로 이 카테고리를 삭제하시겠습니까?')) return;

        try {
            await request(
                () => CategoriesService.delete(id),
                (res) => {
                    alert('카테고리가 삭제되었습니다.');
                    fetchCategories();
                },
                { ignoreErrorRedirect: true },
            );
        } catch (error) {
            console.error('Delete category error:', error);
        }
    };

    const handleEditCategory = (category: CategoryContent) => {
        setEditingCategory(category);
        setCategoryForm({
            name: category.name,
            slug: category.slug,
            order: category.order,
        });
        setShowCategoryForm(true);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        await request(
            () => UserService.post(newUser),
            (res) => {
                alert('사용자가 생성되었습니다.');
                setShowUserForm(false);
                setNewUser({ email: '', password: '', name: '', role: 'ADMIN' });
                fetchUsers();
            },
            { ignoreErrorRedirect: true },
        );
    };

    //포토폴리오 추가, 수정
    const handleCreateOrUpdatePortfolio = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingPortfolio ? PortfolioService.put : PortfolioService.post;

            const formData = new FormData();

            formData.append('title', portfolioForm.title);
            formData.append('description', portfolioForm.description);
            formData.append('slug', portfolioForm.slug);
            formData.append('domain', portfolioForm.domain);
            formData.append('order', String(portfolioForm.order));
            formData.append('isActive', String(portfolioForm.isActive));
            if (portfolioForm.categoryId) {
                formData.append('categoryId', portfolioForm.categoryId);
            }
            if (portfolioForm.mood) {
                formData.append('mood', portfolioForm.mood);
            }
            if (editingPortfolio) {
                formData.append('id', editingPortfolio.id);

                //썸네일 조건
                if (portfolioForm.thumbnailFile) {
                    // 썸네일 새파일이 있으면 교체
                    formData.append('thumbnail.remove', 'true');
                    formData.append('thumbnail.file', portfolioForm.thumbnailFile);
                } else if (!portfolioForm.thumbnail) {
                    // 썸네일 URL 없다면 삭제
                    formData.append('thumbnail.remove', 'true');
                } else {
                    // 유지
                    formData.append('thumbnail.remove', 'false');
                }
            } else {
                //신규 추가
                if (portfolioForm.thumbnailFile) {
                    formData.append('thumbnail', portfolioForm.thumbnailFile);
                }
            }

            await request(
                () => method(formData),
                (res) => {
                    alert(editingPortfolio ? '포트폴리오가 수정되었습니다.' : '포트폴리오가 생성되었습니다.');
                    setShowPortfolioForm(false);
                    setEditingPortfolio(null);
                    setPortfolioForm({
                        title: '',
                        description: '',
                        slug: '',
                        thumbnail: '',
                        isActive: true,
                        order: 0,
                        categoryId: '',
                        mood: '',
                        domain: '',
                        thumbnailFile: null,
                    });
                    fetchPortfolios();
                    fetchAllPortfolios();
                },
                { ignoreErrorRedirect: true },
            );
        } catch (error) {
            console.error('Save portfolio error:', error);
        }
    };

    //포트폴리오 복제
    const handleCopyPortfolio = async (portfolioId: string) => {
        if (!confirm('정말 이 포트폴리오를 복제하시겠습니까?')) return;

        try {
            await request(
                () => PortfolioService.copy(portfolioId),
                (res) => {
                    alert('포트폴리오가 복제되었습니다.');
                    fetchPortfolios();
                    fetchAllPortfolios();
                },
                { ignoreErrorRedirect: true },
            );
        } catch (error) {
            console.error('copy portfolio error:', error);
        }
    };

    //포토폴리오 삭제
    const handleDeletePortfolio = async (portfolioId: string) => {
        if (!confirm('정말 이 포트폴리오를 삭제하시겠습니까? 관련된 모든 질문과 제출 내역도 함께 삭제됩니다.')) return;

        try {
            await request(
                () => PortfolioService.delete(portfolioId),
                (res) => {
                    alert('포트폴리오가 삭제되었습니다.');
                    fetchPortfolios();
                    fetchAllPortfolios();
                },
                { ignoreErrorRedirect: true },
            );
        } catch (error) {
            console.error('Delete portfolio error:', error);
        }
    };

    const handleEditPortfolio = (portfolio: PortfolioContent) => {
        setEditingPortfolio(portfolio);
        setPortfolioForm({
            title: portfolio.title,
            description: portfolio.description,
            slug: portfolio.slug,
            thumbnail: portfolio.thumbnail || '',
            isActive: portfolio.isActive,
            order: portfolio.order,
            categoryId: portfolio.categoryId || '',
            mood: portfolio.mood || '',
            domain: portfolio.domain || '',
            thumbnailFile: null,
        });
        setShowPortfolioForm(true);
    };

    //질문 추가, 수정
    const handleCreateOrUpdateQuestion = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const method = editingQuestion ? QuestionService.put : QuestionService.post;

            const formData = new FormData();

            formData.append('portfolioId', selectedPortfolio);
            formData.append('step', String(questionForm.step));
            formData.append('order', String(questionForm.order));
            formData.append('title', questionForm.title);
            formData.append('description', questionForm.description || ' ');
            formData.append('type', questionForm.questionType.toUpperCase());
            formData.append('minLength', String(questionForm.minLength));
            formData.append('maxLength', String(questionForm.maxLength));
            formData.append('requireMinLength', String(questionForm.requireMinLength));
            formData.append('isRequired', String(questionForm.isRequired));
            formData.append('options', questionForm.options);

            if (editingQuestion) {
                formData.append('optionsId', editingQuestion.id);

                //썸네일 조건
                if (questionForm.thumbnailFile) {
                    // 썸네일 새파일이 있으면 교체
                    formData.append('thumbnail.remove', 'true');
                    formData.append('thumbnail.file', questionForm.thumbnailFile);
                } else if (!questionForm.thumbnail) {
                    // 썸네일 URL 없다면 삭제
                    formData.append('thumbnail.remove', 'true');
                } else {
                    // 유지
                    formData.append('thumbnail.remove', 'false');
                }
            } else {
                //신규 추가
                if (questionForm.thumbnailFile) {
                    formData.append('thumbnail', questionForm.thumbnailFile);
                }
            }

            await request(
                () => method(formData),
                (res) => {
                    alert(editingQuestion ? '질문이 수정되었습니다.' : '질문이 생성되었습니다.');
                    setShowQuestionForm(false);
                    setEditingQuestion(null);
                    setQuestionForm({
                        portfolioId: selectedPortfolio,
                        step: 1,
                        title: '',
                        description: '',
                        thumbnail: '',
                        minLength: 10,
                        maxLength: 500,
                        requireMinLength: false,
                        order: 0,
                        isRequired: true,
                        questionType: 'text',
                        options: '',
                        thumbnailFile: null,
                    });
                    fetchQuestionsByPortfolio(selectedPortfolio);
                },
                { ignoreErrorRedirect: true },
            );
        } catch (error) {
            console.error('Save question error:', error);
        }
    };

    //질문 삭제
    const handleDeleteQuestion = async (questionId: string) => {
        if (!confirm('정말 이 질문을 삭제하시겠습니까?')) return;

        await request(
            () => QuestionService.delete(questionId),
            (res) => {
                alert('질문이 삭제되었습니다.');
                fetchQuestionsByPortfolio(selectedPortfolio);
            },
            { ignoreErrorRedirect: true },
        );
    };

    const handleEditQuestion = (question: Question) => {
        setEditingQuestion(question);
        setQuestionForm({
            portfolioId: question.portfolioId,
            step: question.step,
            title: question.title,
            description: question.description || '',
            thumbnail: question.thumbnail || '',
            minLength: question.minLength,
            maxLength: question.maxLength || 500,
            requireMinLength: question.requireMinLength || false,
            order: question.order,
            isRequired: question.isRequired,
            questionType: question.questionType || 'text',
            options: question.options || '',
            thumbnailFile: null,
        });
        setShowQuestionForm(true);
    };

    //로그아웃
    const handleLogout = async () => {
        await axios.delete('/api/refresh', {
            baseURL: api.defaults.baseURL,
            withCredentials: true,
        });

        tokenStore.clear();
        resetUser(null);
        localStorage.removeItem('login');

        router.push('/admin/login');
    };

    //페이지 이동
    const handlePageClick = (pageNum: number) => {
        setPage(pageNum);
    };

    //초기 진입시 검증
    const checkAuth = async () => {
        const login = localStorage.getItem('login');

        if (!login) {
            router.push('/admin/login');
            return;
        }

        if (currentUser) {
            if (currentUser?.role !== 'SUPER_ADMIN') {
                router.push('/admin/dashboard');
                return;
            }

            await fetchPortfolios();
            await fetchAllPortfolios();

            //?tab= 으로 진입한 경우 해당 탭으로 ('제출목록으로 돌아가기' 복귀, 옛 회원관리 주소 이동)
            const initialTab = new URLSearchParams(window.location.search).get('tab');
            if (initialTab === 'submissions' || initialTab === 'users') {
                setActiveTab(initialTab);
            }
            setLoading(false);
        }
    };

    //제출목록 > 상세보기
    const handleDetailSubmission = (submission: Submission) => {
        router.push(`/portfolio/${submission.portfolioId}?submissionId=${submission.id}&detail=true&from=super`);
    };

    //유저 변경시 auth 체크
    useEffect(() => {
        checkAuth();
    }, [currentUser]);

    //탭 변경시 페이지 초기화
    useEffect(() => {
        setPage(0);
    }, [activeTab]);

    //tab 변경 및 페이지 변경시 조회
    useEffect(() => {
        if (loading) return;

        switch (activeTab) {
            case 'categories':
                fetchCategories();
                break;

            case 'portfolios':
                fetchPortfolios();
                break;

            case 'users':
                fetchUsers();
                break;

            case 'submissions':
                fetchSubmissions();
                break;

            case 'questions':
                if (allPortfolios) setSelectedPortfolio(allPortfolios[0].id);
                break;

            default:
                break;
        }
    }, [activeTab, page]);

    //질문 목록에 상위 포토폴리오 교체시
    useEffect(() => {
        if (selectedPortfolio) {
            fetchQuestionsByPortfolio(selectedPortfolio);
        }
    }, [selectedPortfolio]);

    //질문 유형 체크박스 초기 생성
    useEffect(() => {
        if (!questionForm.questionType) return;

        // 이미 options가 있으면 return
        if (questionForm.options) return;

        if (questionForm.questionType === 'agreement') {
            setQuestionForm((prev) => ({
                ...prev,
                options: JSON.stringify({
                    agreementItems: ['안내사항 1을 입력하세요.', '안내사항 2를 입력하세요.', '안내사항 3을 입력하세요.'],
                }),
            }));
        }

        if (questionForm.questionType === 'checkbox_input') {
            setQuestionForm((prev) => ({
                ...prev,
                options: JSON.stringify({
                    multiple: true,
                    inputs: [''],
                }),
            }));
        }

        if (questionForm.questionType === 'checkbox') {
            setQuestionForm((prev) => ({
                ...prev,
                options: JSON.stringify({
                    multiple: false,
                    checkboxes: [{ label: '선택지 1', hasInput: false }],
                }),
            }));
        }

        //객실, 스페셜, 환불
        if (['parlor', 'special', 'refund', 'addr'].includes(questionForm.questionType)) {
            const label = QUESTION_TYPE_LABEL_MAP[questionForm.questionType] || questionForm.questionType;

            setShowTitleDescription(false);

            setQuestionForm((prev) => ({
                ...prev,
                title: label,
                description: '',
            }));
        } else {
            setShowTitleDescription(true);
        }
    }, [questionForm.questionType]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-black text-white border-b-2 border-black">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center md:flex-row flex-col">
                        <h1 className="text-2xl font-bold">최고 관리자 페이지</h1>
                        <div className="flex items-center gap-4 mt-2 md:mt-0">
                            <span className="text-gray-300">{currentUser?.name}</span>
                            <button onClick={() => router.push('/')} className="px-2 md:px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-all">
                                메인 페이지
                            </button>
                            {/* <button onClick={() => router.push('/admin/dashboard')} className="hidden md:block px-2 md:px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-all">
                                일반 대시보드
                            </button> */}
                            <button onClick={handleLogout} className="px-2 md:px-4 py-2 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all">
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b-2 border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-0 md:gap-8 justify-center md:justify-start flex-wrap md:flex-nowrap">
                        <button
                            onClick={() => {
                                setActiveTab('portfolios');
                            }}
                            className={`py-1 md:py-4 px-2 font-semibold border-b-4 transition-all ${activeTab === 'portfolios' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'}`}
                        >
                            포트폴리오 관리
                        </button>
                        <button onClick={() => setActiveTab('questions')} className={`py-1 md:py-4 px-2 font-semibold border-b-4 transition-all ${activeTab === 'questions' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'}`}>
                            질문 관리
                        </button>
                        <button onClick={() => setActiveTab('users')} className={`py-1 md:py-4 px-2 font-semibold border-b-4 transition-all ${activeTab === 'users' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'}`}>
                            사용자 관리
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('submissions');
                            }}
                            className={`py-1 md:py-4 px-2 font-semibold border-b-4 transition-all ${activeTab === 'submissions' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'}`}
                        >
                            제출 목록
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('categories');
                            }}
                            className={`py-1 md:py-4 px-2 font-semibold border-b-4 transition-all ${activeTab === 'categories' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-black'}`}
                        >
                            카테고리 관리
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Portfolios Tab */}
                {activeTab === 'portfolios' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-black">포트폴리오 목록</h2>

                            <button
                                onClick={() => {
                                    setEditingPortfolio(null);
                                    setPortfolioForm({
                                        title: '',
                                        description: '',
                                        slug: '',
                                        thumbnail: '',
                                        isActive: true,
                                        order: portfolios?.content?.length ? portfolios?.content?.length + 1 : 0,
                                        categoryId: '',
                                        mood: '',
                                        domain: '',
                                        thumbnailFile: null,
                                    });
                                    setShowPortfolioForm(true);
                                }}
                                className="px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all"
                            >
                                + 새 포트폴리오 추가
                            </button>
                        </div>

                        {/* 검색 영역 */}
                        <div className="mb-6 flex items-center gap-3">
                            <input
                                type="text"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setPage(0);
                                        fetchPortfolios();
                                    }
                                }}
                                placeholder="포트폴리오 이름으로 검색"
                                className="flex-1 min-w-0 px-4 py-2 border-2 border-gray-300 rounded-lg max-w-xs focus:outline-none focus:ring-2 focus:ring-black"
                            />

                            <button
                                onClick={() => {
                                    setPage(0);
                                    fetchPortfolios();
                                }}
                                className="shrink-0 px-6 py-2 border-2 border-black rounded-lg font-semibold whitespace-nowrap hover:bg-black hover:text-white transition-all"
                            >
                                검색
                            </button>
                        </div>

                        {/* 카테고리 탭 */}
                        <div className="mb-8 flex flex-wrap gap-2">
                            {[{ id: 'all', name: '전체' }, ...(selectCategory ?? [])].map((category) => {
                                const id = String(category.id);
                                const count = id === 'all' ? (portfolios?.content?.length ?? 0) : (portfolios?.content?.filter((p) => String(p.categoryId) === id).length ?? 0);
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setPortfolioCategoryTab(id)}
                                        className={`px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all ${portfolioCategoryTab === id ? 'bg-black border-black text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-black hover:text-black'}`}
                                    >
                                        {category.name} <span className={portfolioCategoryTab === id ? 'text-gray-300' : 'text-gray-400'}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 카테고리별 구역 */}
                        <div className="space-y-10 pb-10">
                            {(selectCategory ?? [])
                                .filter((category) => portfolioCategoryTab === 'all' || String(category.id) === portfolioCategoryTab)
                                .map((category) => (
                                    <PortfolioCategorySection
                                        key={`${portfolioCategoryTab}-${category.id}`}
                                        label={category.name}
                                        portfolios={portfolios?.content?.filter((p) => String(p.categoryId) === String(category.id)) ?? []}
                                        //전체 보기에서는 빈 카테고리 숨김
                                        hideWhenEmpty={portfolioCategoryTab === 'all'}
                                        renderCard={renderPortfolioCard}
                                    />
                                ))}
                            {/* 카테고리가 없거나 삭제된 카테고리의 포트폴리오 */}
                            {portfolioCategoryTab === 'all' && (
                                <PortfolioCategorySection
                                    label="미분류"
                                    portfolios={portfolios?.content?.filter((p) => !(selectCategory ?? []).some((c) => String(c.id) === String(p.categoryId))) ?? []}
                                    hideWhenEmpty
                                    renderCard={renderPortfolioCard}
                                />
                            )}
                            {portfolioCategoryTab === 'all' && portfolios?.content?.length === 0 && (
                                <div className="bg-white border-2 border-gray-200 rounded-lg p-12 text-center text-gray-500">{searchName ? '검색 결과가 없습니다' : '등록된 포트폴리오가 없습니다'}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Questions Tab */}
                {activeTab === 'questions' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4 md:justify-center md:gap-1 md:flex-col">
                                <h2 className="hidden md:block text-2xl font-bold text-black">질문 목록</h2>
                                <select value={selectedPortfolio} onChange={(e) => setSelectedPortfolio(e.target.value)} className="px-4 py-2 md:px-0 md:py-1 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black">
                                    {allPortfolios?.map((portfolio) => (
                                        <option key={portfolio.id} value={portfolio.id}>
                                            {portfolio.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingQuestion(null);
                                    const maxStep = questions.length > 0 ? Math.max(...questions.map((q) => q.step)) : 0;
                                    const nextStep = maxStep + 1;
                                    setQuestionForm({
                                        portfolioId: selectedPortfolio,
                                        step: nextStep,
                                        title: '',
                                        description: '',
                                        thumbnail: '',
                                        minLength: 10,
                                        maxLength: 500,
                                        requireMinLength: false,
                                        order: 0,
                                        isRequired: true,
                                        questionType: 'text',
                                        options: '',
                                        thumbnailFile: null,
                                    });
                                    setShowQuestionForm(true);
                                }}
                                className="px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all"
                                disabled={!selectedPortfolio}
                            >
                                + 새 질문 추가
                            </button>
                        </div>

                        {questions.length === 0 ? (
                            <div className="text-center py-12 bg-white border-2 border-black rounded-lg">
                                <p className="text-gray-600">이 포트폴리오에는 아직 질문이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Array.from(new Set(questions.map((q) => q.step)))
                                    .sort()
                                    .map((step) => (
                                        <div key={step} className="bg-white border-2 border-black rounded-lg p-6">
                                            <h3 className="text-xl font-bold text-black mb-4">단계 {step}</h3>
                                            <div className="space-y-3">
                                                {questions
                                                    .filter((q) => q.step === step)
                                                    .sort((a, b) => a.order - b.order)
                                                    .map((question) => (
                                                        <div key={question.id} className="border-2 border-gray-300 rounded-lg p-4 hover:border-black transition-all">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1">
                                                                    <div className="font-semibold text-black">
                                                                        {question.title}
                                                                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                                                                    </div>
                                                                    {question.description && <div className="text-sm text-gray-600 mt-1">{question.description}</div>}
                                                                    <div className="text-xs text-gray-500 mt-2">
                                                                        최소 {question.minLength}자 | 순서: {question.order}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleEditQuestion(question)} className="px-3 py-1 text-sm border-2 border-black rounded hover:bg-black hover:text-white transition-all">
                                                                        수정
                                                                    </button>
                                                                    <button onClick={() => handleDeleteQuestion(question.id)} className="px-3 py-1 text-sm border-2 border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all">
                                                                        삭제
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-black">사용자 목록</h2>
                            <button onClick={() => setShowUserForm(true)} className="px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all">
                                + 새 사용자 생성
                            </button>
                        </div>

                        {/* 역할별 구역 */}
                        <div className="space-y-8 pb-10">
                            {USER_ROLE_SECTIONS.map(({ role, label, hideWhenEmpty, deletable }) => (
                                <UserRoleSection
                                    key={role}
                                    label={label}
                                    users={users?.content.filter((u) => u.role === role) ?? []}
                                    lastLoginMap={lastLoginMap}
                                    hideWhenEmpty={hideWhenEmpty}
                                    onChangePassword={(user) => {
                                        setPasswordTargetUser(user);
                                        setNewPassword('');
                                    }}
                                    onDelete={deletable ? handleDeleteUser : undefined}
                                />
                            ))}
                            {/* 위 역할에 해당하지 않는 사용자 */}
                            <UserRoleSection
                                label="기타"
                                users={users?.content.filter((u) => !USER_ROLE_SECTIONS.some((s) => s.role === u.role)) ?? []}
                                lastLoginMap={lastLoginMap}
                                hideWhenEmpty
                                onChangePassword={(user) => {
                                    setPasswordTargetUser(user);
                                    setNewPassword('');
                                }}
                                onDelete={handleDeleteUser}
                            />
                        </div>

                        {/* 비밀번호 변경 모달 */}
                        {passwordTargetUser && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4" onClick={() => setPasswordTargetUser(null)}>
                                <div className="bg-white rounded-lg p-6 w-full max-w-md border-2 border-black" onClick={(e) => e.stopPropagation()}>
                                    <h3 className="text-lg font-bold text-black mb-4">비밀번호 변경</h3>
                                    <p className="text-sm text-gray-600 mb-2">
                                        대상 계정: <strong>{passwordTargetUser.name}</strong> ({passwordTargetUser.email})
                                    </p>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(passwordTargetUser.role === 'USER' ? e.target.value.replace(/[^0-9]/g, '').slice(0, 8) : e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitPasswordChange()}
                                        placeholder={passwordTargetUser.role === 'USER' ? '숫자 4~8자리' : '새 비밀번호'}
                                        autoFocus
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setPasswordTargetUser(null)} className="px-4 py-2 bg-white text-black border-2 border-black rounded-lg font-semibold hover:bg-black hover:text-white transition-all">
                                            취소
                                        </button>
                                        <button onClick={handleSubmitPasswordChange} className="px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all">
                                            저장
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Portfolio Form Modal */}
            {showPortfolioForm && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                    onClick={() => {
                        setShowPortfolioForm(false);
                        setEditingPortfolio(null);
                    }}
                >
                    <div className="bg-white rounded-lg p-8 max-w-2xl w-full border-2 border-black" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-black mb-6">{editingPortfolio ? '포트폴리오 수정' : '새 포트폴리오 추가'}</h3>
                        <form onSubmit={handleCreateOrUpdatePortfolio} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">제목</label>
                                <input
                                    type="text"
                                    required
                                    value={portfolioForm.title}
                                    onChange={(e) =>
                                        setPortfolioForm({
                                            ...portfolioForm,
                                            title: e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">설명</label>
                                <textarea
                                    value={portfolioForm.description}
                                    onChange={(e) =>
                                        setPortfolioForm({
                                            ...portfolioForm,
                                            description: e.target.value,
                                        })
                                    }
                                    rows={3}
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">카테고리</label>
                                <select
                                    value={portfolioForm.categoryId}
                                    onChange={(e) =>
                                        setPortfolioForm({
                                            ...portfolioForm,
                                            categoryId: e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                    <option value="">카테고리 선택 (선택사항)</option>
                                    {selectCategory?.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">분위기</label>
                                <select
                                    value={portfolioForm.mood}
                                    onChange={(e) =>
                                        setPortfolioForm({
                                            ...portfolioForm,
                                            mood: e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                    <option value="">분위기 선택 (선택사항)</option>
                                    <option value="모던">모던</option>
                                    <option value="클래식">클래식</option>
                                    <option value="미니멀">미니멀</option>
                                    <option value="럭셔리">럭셔리</option>
                                    <option value="자연친화">자연친화</option>
                                    <option value="아늑한">아늑한</option>
                                    <option value="세련된">세련된</option>
                                    <option value="편안한">편안한</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">슬러그 (URL 경로)</label>
                                <input
                                    type="text"
                                    required
                                    value={portfolioForm.slug}
                                    onChange={(e) =>
                                        setPortfolioForm({
                                            ...portfolioForm,
                                            slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                                        })
                                    }
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                    placeholder="예: web-development"
                                />
                            </div>
                            {/* 도메인 입력 */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">도메인 (예: https://example.com)</label>
                                <input
                                    type="text"
                                    value={portfolioForm.domain}
                                    onChange={(e) =>
                                        setPortfolioForm({
                                            ...portfolioForm,
                                            domain: e.target.value,
                                        })
                                    }
                                    placeholder="포트폴리오 도메인 URL을 입력하세요"
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">썸네일 이미지 (선택사항)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setPortfolioForm((prev) => ({
                                                ...prev,
                                                thumbnailFile: file,
                                            }));
                                        }
                                    }}
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-black file:text-white file:cursor-pointer hover:file:bg-gray-800"
                                />
                                {portfolioForm.thumbnail && (
                                    <div className="mt-2 w-full h-32 bg-gray-200 rounded-lg overflow-hidden relative">
                                        <img src={portfolioForm.thumbnail} alt="미리보기" className="w-full h-full" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        <button type="button" onClick={() => setPortfolioForm({ ...portfolioForm, thumbnail: '' })} className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
                                            삭제
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-black mb-2">순서</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={portfolioForm.order}
                                        onChange={(e) =>
                                            setPortfolioForm({
                                                ...portfolioForm,
                                                order: parseInt(e.target.value),
                                            })
                                        }
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                </div>
                                <div className="flex items-center pt-6">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={portfolioForm.isActive}
                                        onChange={(e) =>
                                            setPortfolioForm({
                                                ...portfolioForm,
                                                isActive: e.target.checked,
                                            })
                                        }
                                        className="w-4 h-4 border-2 border-gray-300 rounded"
                                    />
                                    <label htmlFor="isActive" className="ml-2 text-sm font-semibold text-black">
                                        활성화
                                    </label>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPortfolioForm(false);
                                        setEditingPortfolio(null);
                                    }}
                                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-100 transition-all"
                                >
                                    취소
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all">
                                    {editingPortfolio ? '수정' : '생성'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Question Form Modal */}
            {showQuestionForm && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                    onClick={(e) => {
                        //질문 등록시 모달 닫히는 방지(외부 영역 클릭시에만 닫히게)
                        if (e.target === e.currentTarget) {
                            setShowQuestionForm(false);
                            setEditingQuestion(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-lg p-8 max-w-2xl w-full border-2 border-black max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold text-black mb-6">{editingQuestion ? '질문 수정' : '새 질문 추가'}</h3>
                        <form onSubmit={handleCreateOrUpdateQuestion} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-black mb-2">단계</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={questionForm.step}
                                        onChange={(e) =>
                                            setQuestionForm({
                                                ...questionForm,
                                                step: parseInt(e.target.value),
                                            })
                                        }
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                    <p className="text-xs text-gray-600 mt-1">0단계: 안내사항 페이지, 1단계 이상: 일반 질문</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-black mb-2">순서</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={questionForm.order}
                                        onChange={(e) =>
                                            setQuestionForm({
                                                ...questionForm,
                                                order: parseInt(e.target.value),
                                            })
                                        }
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                </div>
                            </div>
                            {showTitleDescription && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-2">질문 제목</label>
                                        <input
                                            type="text"
                                            required
                                            value={questionForm.title}
                                            onChange={(e) =>
                                                setQuestionForm({
                                                    ...questionForm,
                                                    title: e.target.value,
                                                })
                                            }
                                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-2">설명 (선택사항)</label>
                                        <textarea
                                            value={questionForm.description}
                                            onChange={(e) =>
                                                setQuestionForm({
                                                    ...questionForm,
                                                    description: e.target.value,
                                                })
                                            }
                                            rows={3}
                                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">질문 유형</label>
                                <select
                                    value={questionForm.questionType}
                                    onChange={(e) =>
                                        setQuestionForm({
                                            ...questionForm,
                                            questionType: e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                    <option value="agreement">동의 체크박스 (0단계 안내사항)</option>
                                    <option value="text">단답형 (텍스트)</option>
                                    <option value="textarea">장문형 (여러 줄)</option>
                                    <option value="multi_text">멀티 텍스트</option>
                                    <option value="file">파일 업로드</option>
                                    <option value="checkbox">체크박스 (조건부 입력)</option>
                                    <option value="checkbox_input">이용안내</option>
                                    <option value="parlor">객실</option>
                                    <option value="special">스페셜</option>
                                    <option value="refund">환불</option>
                                    <option value="addr">지도</option>
                                </select>
                            </div>
                            {questionForm.questionType === 'agreement' && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <h4 className="font-semibold text-black">동의 체크박스 설정</h4>

                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-2">안내사항 개수</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={(() => {
                                                try {
                                                    const parsed = JSON.parse(questionForm.options || '{}');
                                                    return parsed.agreementItems?.length || 3;
                                                } catch {
                                                    return 3;
                                                }
                                            })()}
                                            onChange={(e) => {
                                                const count = parseInt(e.target.value) || 3;
                                                try {
                                                    const parsed = JSON.parse(questionForm.options || '{}');
                                                    const currentItems = parsed.agreementItems || [];
                                                    const newItems = [];

                                                    for (let i = 0; i < count; i++) {
                                                        newItems.push(currentItems[i] || `안내사항 ${i + 1}을 입력하세요.`);
                                                    }

                                                    parsed.agreementItems = newItems;
                                                    setQuestionForm({
                                                        ...questionForm,
                                                        options: JSON.stringify(parsed),
                                                    });
                                                } catch {
                                                    const newItems = [];
                                                    for (let i = 0; i < count; i++) {
                                                        newItems.push(`안내사항 ${i + 1}을 입력하세요.`);
                                                    }
                                                    setQuestionForm({
                                                        ...questionForm,
                                                        options: JSON.stringify({
                                                            agreementItems: newItems,
                                                        }),
                                                    });
                                                }
                                            }}
                                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-sm font-semibold text-black">안내사항 내용</label>
                                        {(() => {
                                            try {
                                                const parsed = JSON.parse(questionForm.options || '{}');
                                                return (parsed.agreementItems || []).map((item: string, index: number) => (
                                                    <div key={index} className="flex gap-3 items-start p-3 bg-white rounded border">
                                                        <span className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-semibold mt-1">{index + 1}</span>
                                                        <textarea
                                                            value={item || ''}
                                                            onChange={(e) => {
                                                                const parsed = JSON.parse(questionForm.options || '{}');
                                                                parsed.agreementItems[index] = e.target.value;
                                                                setQuestionForm({
                                                                    ...questionForm,
                                                                    options: JSON.stringify(parsed),
                                                                });
                                                            }}
                                                            placeholder={`안내사항 ${index + 1}을 입력하세요`}
                                                            rows={3}
                                                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black resize-none"
                                                        />
                                                    </div>
                                                ));
                                            } catch {
                                                return <p className="text-red-500 text-sm">안내사항 설정을 불러올 수 없습니다.</p>;
                                            }
                                        })()}
                                    </div>

                                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                                        <strong>💡 사용 팁:</strong> 0단계 안내사항 페이지로 사용하려면 단계를 0으로 설정하고, 순서를 0으로 설정하세요.
                                    </div>
                                </div>
                            )}

                            {questionForm.questionType === 'checkbox' && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <h4 className="font-semibold text-black">체크박스 설정</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-black mb-2">선택 방식</label>
                                            <select
                                                value={(() => {
                                                    try {
                                                        const parsed = JSON.parse(questionForm.options || '{}');
                                                        return parsed.multiple ? 'multiple' : 'single';
                                                    } catch {
                                                        return 'single';
                                                    }
                                                })()}
                                                onChange={(e) => {
                                                    try {
                                                        const parsed = JSON.parse(questionForm.options || '{}');
                                                        parsed.multiple = e.target.value === 'multiple';
                                                        setQuestionForm({
                                                            ...questionForm,
                                                            options: JSON.stringify(parsed),
                                                        });
                                                    } catch {
                                                        setQuestionForm({
                                                            ...questionForm,
                                                            options: JSON.stringify({
                                                                multiple: e.target.value === 'multiple',
                                                                checkboxes: [],
                                                            }),
                                                        });
                                                    }
                                                }}
                                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                            >
                                                <option value="single">단일 선택 (라디오 버튼)</option>
                                                <option value="multiple">다중 선택 (체크박스)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-black mb-2">체크박스 개수</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10"
                                                value={(() => {
                                                    try {
                                                        const parsed = JSON.parse(questionForm.options || '{}');
                                                        return parsed.checkboxes?.length || 1;
                                                    } catch {
                                                        return 1;
                                                    }
                                                })()}
                                                onChange={(e) => {
                                                    const count = parseInt(e.target.value) || 1;
                                                    try {
                                                        const parsed = JSON.parse(questionForm.options || '{}');
                                                        const currentBoxes = parsed.checkboxes || [];
                                                        const newBoxes = [];

                                                        for (let i = 0; i < count; i++) {
                                                            newBoxes.push(
                                                                currentBoxes[i] || {
                                                                    label: `선택지 ${i + 1}`,
                                                                    hasInput: false,
                                                                },
                                                            );
                                                        }

                                                        parsed.checkboxes = newBoxes;
                                                        setQuestionForm({
                                                            ...questionForm,
                                                            options: JSON.stringify(parsed),
                                                        });
                                                    } catch {
                                                        const newBoxes = [];
                                                        for (let i = 0; i < count; i++) {
                                                            newBoxes.push({
                                                                label: `선택지 ${i + 1}`,
                                                                hasInput: false,
                                                            });
                                                        }
                                                        setQuestionForm({
                                                            ...questionForm,
                                                            options: JSON.stringify({
                                                                multiple: false,
                                                                checkboxes: newBoxes,
                                                            }),
                                                        });
                                                    }
                                                }}
                                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-sm font-semibold text-black">체크박스 옵션</label>
                                        {(() => {
                                            try {
                                                const parsed = JSON.parse(questionForm.options || '{}');
                                                return (parsed.checkboxes || []).map((checkbox: any, index: number) => (
                                                    <div key={index} className="bg-white rounded-lg border border-gray-200">
                                                        <div className="flex gap-3 items-center p-3">
                                                            <span className="text-sm font-medium w-8 text-gray-600">{index + 1}.</span>

                                                            <input
                                                                type="text"
                                                                value={checkbox.label || ''}
                                                                onChange={(e) => {
                                                                    const parsed = JSON.parse(questionForm.options || '{}');
                                                                    parsed.checkboxes[index].label = e.target.value;
                                                                    setQuestionForm({
                                                                        ...questionForm,
                                                                        options: JSON.stringify(parsed),
                                                                    });
                                                                }}
                                                                placeholder="선택지 제목"
                                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md
                 focus:outline-none focus:ring-2 focus:ring-black"
                                                            />

                                                            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checkbox.hasInput || false}
                                                                    onChange={(e) => {
                                                                        const parsed = JSON.parse(questionForm.options || '{}');
                                                                        parsed.checkboxes[index].hasInput = e.target.checked;
                                                                        setQuestionForm({
                                                                            ...questionForm,
                                                                            options: JSON.stringify(parsed),
                                                                        });
                                                                    }}
                                                                    className="w-4 h-4"
                                                                />
                                                                추가 입력
                                                            </label>
                                                        </div>

                                                        {/* 플레이스홀더 및 요금 입력 영역 */}
                                                        {checkbox.hasInput && (
                                                            <div className="px-2 pb-3 space-y-3">
                                                                <input
                                                                    type="text"
                                                                    value={checkbox.placeholder || ''}
                                                                    onChange={(e) => {
                                                                        const parsed = JSON.parse(questionForm.options || '{}');
                                                                        parsed.checkboxes[index].placeholder = e.target.value;
                                                                        setQuestionForm({
                                                                            ...questionForm,
                                                                            options: JSON.stringify(parsed),
                                                                        });
                                                                    }}
                                                                    placeholder="원하는 플레이스홀더를 입력해주세요."
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                                                                />
                                                                <label className="flex items-center gap-2 text-sm">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checkbox.isPrice || false}
                                                                        onChange={(e) => {
                                                                            const parsed = JSON.parse(questionForm.options || '{}');
                                                                            parsed.checkboxes[index].isPrice = e.target.checked;
                                                                            setQuestionForm({
                                                                                ...questionForm,
                                                                                options: JSON.stringify(parsed),
                                                                            });
                                                                        }}
                                                                        className="w-4 h-4"
                                                                    />
                                                                    요금 입력 (숫자만, 천 단위 콤마)
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                ));
                                            } catch {
                                                return <p className="text-red-500 text-sm">옵션 설정을 불러올 수 없습니다.</p>;
                                            }
                                        })()}
                                    </div>
                                </div>
                            )}

                            {questionForm.questionType === 'checkbox_input' && (
                                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <h4 className="font-semibold text-black">체크박스 입력 설정</h4>

                                    <div>
                                        <label className="block text-sm font-semibold mb-2">체크박스 개수</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={(() => {
                                                try {
                                                    const parsed = JSON.parse(questionForm.options || '{}');
                                                    return parsed.inputs?.length || 1;
                                                } catch {
                                                    return 1;
                                                }
                                            })()}
                                            onChange={(e) => {
                                                const count = Number(e.target.value) || 1;
                                                const inputs = Array.from({ length: count }, (_, i) => {
                                                    try {
                                                        const parsed = JSON.parse(questionForm.options || '{}');
                                                        return parsed.inputs?.[i] || '';
                                                    } catch {
                                                        return '';
                                                    }
                                                });

                                                setQuestionForm({
                                                    ...questionForm,
                                                    options: JSON.stringify({
                                                        multiple: true,
                                                        inputs,
                                                    }),
                                                });
                                            }}
                                            className="w-full border px-3 py-2 rounded"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold">체크박스 인풋</label>

                                        {(() => {
                                            try {
                                                const parsed = JSON.parse(questionForm.options || '{}');
                                                return (parsed.inputs || []).map((val: string, idx: number) => (
                                                    <input
                                                        key={idx}
                                                        type="text"
                                                        value={val}
                                                        onChange={(e) => {
                                                            const newInputs = [...parsed.inputs];
                                                            newInputs[idx] = e.target.value;

                                                            setQuestionForm({
                                                                ...questionForm,
                                                                options: JSON.stringify({
                                                                    ...parsed,
                                                                    inputs: newInputs,
                                                                }),
                                                            });
                                                        }}
                                                        placeholder={`${idx + 1}번 항목 이용안내 입력`}
                                                        className="w-full border px-3 py-2 rounded"
                                                    />
                                                ));
                                            } catch {
                                                return null;
                                            }
                                        })()}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">썸네일 이미지 (선택사항)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setQuestionForm((prev) => ({
                                                ...prev,
                                                thumbnailFile: file,
                                            }));
                                        }
                                    }}
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-black file:text-white file:cursor-pointer hover:file:bg-gray-800"
                                />
                                {questionForm.thumbnail && (
                                    <div className="mt-2 w-full h-32 bg-gray-200 rounded-lg overflow-hidden relative">
                                        <img src={questionForm.thumbnail} alt="미리보기" className="w-full h-full" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        <button type="button" onClick={() => setQuestionForm({ ...questionForm, thumbnail: '' })} className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
                                            삭제
                                        </button>
                                    </div>
                                )}
                            </div>
                            {(questionForm.questionType === 'text' || questionForm.questionType === 'textarea') && (
                                <div>
                                    <label className="block text-sm font-semibold text-black mb-2">플레이스홀더</label>
                                    <input
                                        type="text"
                                        value={(() => {
                                            try {
                                                const parsed = JSON.parse(questionForm.options || '{}');
                                                return parsed.placeholder || '';
                                            } catch {
                                                return '';
                                            }
                                        })()}
                                        onChange={(e) => {
                                            let parsed: any = {};
                                            try {
                                                parsed = JSON.parse(questionForm.options || '{}');
                                            } catch {}
                                            parsed.placeholder = e.target.value;
                                            setQuestionForm({
                                                ...questionForm,
                                                options: JSON.stringify(parsed),
                                            });
                                        }}
                                        placeholder="원하는 플레이스홀더를 입력해주세요."
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                </div>
                            )}

                            {questionForm.questionType === 'multi_text' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-2">플레이스홀더 1</label>
                                        <input
                                            type="text"
                                            value={(() => {
                                                try {
                                                    const parsed = JSON.parse(questionForm.options || '{}');
                                                    return parsed.placeholder1 || '';
                                                } catch {
                                                    return '';
                                                }
                                            })()}
                                            onChange={(e) => {
                                                let parsed: any = {};
                                                try {
                                                    parsed = JSON.parse(questionForm.options || '{}');
                                                } catch {}
                                                parsed.placeholder1 = e.target.value;
                                                setQuestionForm({
                                                    ...questionForm,
                                                    options: JSON.stringify(parsed),
                                                });
                                            }}
                                            placeholder="첫 번째 항목의 플레이스홀더"
                                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-black mb-2">플레이스홀더 2</label>
                                        <input
                                            type="text"
                                            value={(() => {
                                                try {
                                                    const parsed = JSON.parse(questionForm.options || '{}');
                                                    return parsed.placeholder2 || '';
                                                } catch {
                                                    return '';
                                                }
                                            })()}
                                            onChange={(e) => {
                                                let parsed: any = {};
                                                try {
                                                    parsed = JSON.parse(questionForm.options || '{}');
                                                } catch {}
                                                parsed.placeholder2 = e.target.value;
                                                setQuestionForm({
                                                    ...questionForm,
                                                    options: JSON.stringify(parsed),
                                                });
                                            }}
                                            placeholder="두 번째 항목의 플레이스홀더"
                                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                </div>
                            )}

                            {(questionForm.questionType === 'text' || questionForm.questionType === 'textarea' || questionForm.questionType === 'multi_text') && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-black mb-2">최소 글자 수</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={questionForm.minLength}
                                                onChange={(e) =>
                                                    setQuestionForm({
                                                        ...questionForm,
                                                        minLength: parseInt(e.target.value),
                                                    })
                                                }
                                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                                disabled={!questionForm.requireMinLength}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-black mb-2">최대 글자 수</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={questionForm.maxLength}
                                                onChange={(e) =>
                                                    setQuestionForm({
                                                        ...questionForm,
                                                        maxLength: parseInt(e.target.value),
                                                    })
                                                }
                                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="requireMinLength"
                                            checked={questionForm.requireMinLength}
                                            onChange={(e) =>
                                                setQuestionForm({
                                                    ...questionForm,
                                                    requireMinLength: e.target.checked,
                                                })
                                            }
                                            className="w-4 h-4 border-2 border-gray-300 rounded"
                                        />
                                        <label htmlFor="requireMinLength" className="ml-2 text-sm font-semibold text-black">
                                            최소 글자 수 검증 활성화
                                        </label>
                                    </div>
                                </>
                            )}
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isRequired"
                                    checked={questionForm.isRequired}
                                    onChange={(e) =>
                                        setQuestionForm({
                                            ...questionForm,
                                            isRequired: e.target.checked,
                                        })
                                    }
                                    className="w-4 h-4 border-2 border-gray-300 rounded"
                                />
                                <label htmlFor="isRequired" className="ml-2 text-sm font-semibold text-black">
                                    필수 항목
                                </label>
                            </div>
                            {(questionForm.questionType === 'text' || questionForm.questionType === 'multi_text') && (
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isNumber"
                                        checked={(() => {
                                            try {
                                                const parsed = JSON.parse(questionForm.options || '{}');
                                                return parsed.isNumber || false;
                                            } catch {
                                                return false;
                                            }
                                        })()}
                                        onChange={(e) => {
                                            let parsed: any = {};
                                            try {
                                                parsed = JSON.parse(questionForm.options || '{}');
                                            } catch {}

                                            parsed.isNumber = e.target.checked;
                                            // 아이디/비밀번호와 숫자만 허용은 동시에 사용 불가
                                            if (e.target.checked) {
                                                parsed.isIdPassword = false;
                                            }

                                            setQuestionForm({
                                                ...questionForm,
                                                options: JSON.stringify(parsed),
                                            });
                                        }}
                                        className="w-4 h-4 border-2 border-gray-300 rounded"
                                    />
                                    <label htmlFor="isNumber" className="ml-2 text-sm font-semibold text-black">
                                        숫자만 허용
                                    </label>
                                </div>
                            )}
                            {questionForm.questionType === 'multi_text' && (
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isIdPassword"
                                        checked={(() => {
                                            try {
                                                const parsed = JSON.parse(questionForm.options || '{}');
                                                return parsed.isIdPassword || false;
                                            } catch {
                                                return false;
                                            }
                                        })()}
                                        onChange={(e) => {
                                            let parsed: any = {};
                                            try {
                                                parsed = JSON.parse(questionForm.options || '{}');
                                            } catch {}

                                            parsed.isIdPassword = e.target.checked;
                                            // 아이디/비밀번호와 숫자만 허용은 동시에 사용 불가
                                            if (e.target.checked) {
                                                parsed.isNumber = false;
                                            }

                                            setQuestionForm({
                                                ...questionForm,
                                                options: JSON.stringify(parsed),
                                            });
                                        }}
                                        className="w-4 h-4 border-2 border-gray-300 rounded"
                                    />
                                    <label htmlFor="isIdPassword" className="ml-2 text-sm font-semibold text-black">
                                        아이디/비밀번호 입력
                                    </label>
                                </div>
                            )}
                            <div className="flex gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowQuestionForm(false);
                                        setEditingQuestion(null);
                                    }}
                                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-100 transition-all"
                                >
                                    취소
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all">
                                    {editingQuestion ? '수정' : '생성'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Creation Modal */}
            {showUserForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowUserForm(false)}>
                    <div className="bg-white rounded-lg p-8 max-w-md w-full border-2 border-black" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-black mb-6">새 사용자 생성</h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">숙소명</label>
                                <input type="text" required value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">계정 아이디</label>
                                <input type="text" required value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">계정 비밀번호</label>
                                <input type="password" required value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">구분</label>
                                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black">
                                    <option value="ADMIN">관리자</option>
                                    <option value="SUPER_ADMIN">최고 관리자</option>
                                    <option value="USER">숙소 사장님</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowUserForm(false)} className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-100 transition-all">
                                    취소
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all">
                                    생성
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
                <div className="max-w-7xl mx-auto">
                    {/* 전체 요약 */}
                    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-bold text-black mb-3">전체 요약</h3>
                        <div className="flex gap-6 text-sm text-gray-600">
                            <span>
                                전체: <strong className="text-black">{submissions?.length}</strong>건
                            </span>
                            <span>
                                제출완료: <strong className="text-green-600">{submissions?.filter((s) => !s.isDraft).length}</strong>건
                            </span>
                            <span>
                                임시저장: <strong className="text-yellow-600">{submissions?.filter((s) => s.isDraft).length}</strong>건
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">제출 목록</h2>
                        <div className="flex gap-3">
                            <button onClick={fetchSubmissions} className="px-4 py-2 border-2 border-black rounded-lg font-semibold hover:bg-black hover:text-white transition-all">
                                새로고침
                            </button>
                        </div>
                    </div>

                    {submissions?.length === 0 ? (
                        <div className="bg-white border-2 border-gray-200 rounded-lg p-12 text-center">
                            <span className="text-6xl mb-4 block">📝</span>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">제출 내역이 없습니다</h3>
                            <p className="text-gray-600">사용자가 포트폴리오를 제출하면 여기에 표시됩니다</p>
                        </div>
                    ) : (
                        <div className="space-y-6 pb-10">
                            {/* 포트폴리오별로 그룹화 */}
                            {submissions &&
                                submissions.length > 0 &&
                                Object.entries(
                                    submissions.reduce((groups: any, submission) => {
                                        const portfolioId = submission.portfolioId;
                                        const portfolioTitle = submission.portfolio?.title || '알 수 없음';
                                        const key = `${portfolioId}-${portfolioTitle}`;

                                        if (!groups[key]) {
                                            groups[key] = {
                                                portfolioId,
                                                portfolioTitle,
                                                submissions: [],
                                            };
                                        }
                                        groups[key].submissions.push(submission);
                                        return groups;
                                    }, {}),
                                ).map(([key, group]: [string, any]) => (
                                    <div key={key} className="bg-white border-2 border-black rounded-lg overflow-hidden">
                                        {/* 포트폴리오 헤더 */}
                                        <div className="bg-gray-50 px-6 py-4 border-b-2 border-gray-200 flex justify-between items-center">
                                            <div>
                                                <h3 className="text-lg font-bold text-black">{group.portfolioTitle}</h3>
                                                <p className="text-sm text-gray-600">
                                                    총 {group.submissions.length}건 (완료: {group.submissions.filter((s: any) => !s.isDraft).length}
                                                    건, 임시저장: {group.submissions.filter((s: any) => s.isDraft).length}
                                                    건)
                                                </p>
                                            </div>
                                        </div>

                                        {/* 제출목록 테이블 */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-100 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-1 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상호명</th>
                                                        <th className="px-1 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                                                        <th className="px-1 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제출일시</th>
                                                        <th className="px-1 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {group.submissions.map((submission: any) => (
                                                        <tr key={submission.id} className="hover:bg-gray-50">
                                                            <td className="px-1 md:px-6 py-4 text-sm font-semibold text-black">{submission.companyName}</td>
                                                            <td className="px-1 md:px-6 py-4 text-sm cursor-pointer">
                                                                {submission.isDraft ? (
                                                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">임시저장</span>
                                                                ) : (
                                                                    <span onClick={() => submissionOff(submission)} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                                                        제출완료
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-1 md:px-6 py-4 text-sm text-gray-900">{new Date(submission.isDraft ? submission.updatedAt : submission.completedAt).toLocaleString('ko-KR')}</td>
                                                            <td className="px-1 md:px-6 py-4 text-sm">
                                                                <div className="flex flex-col md:flex-row gap-2">
                                                                    <button onClick={() => handleDetailSubmission(submission)} className="text-blue-600 hover:text-blue-900 font-semibold">
                                                                        상세보기
                                                                    </button>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (confirm('이 제출을 삭제하시겠습니까?')) {
                                                                                await request(
                                                                                    () => SubmissionService.delete(submission.id),
                                                                                    (res) => {
                                                                                        alert('삭제되었습니다.');
                                                                                        fetchSubmissions();
                                                                                    },
                                                                                    { ignoreErrorRedirect: true },
                                                                                );
                                                                            }
                                                                        }}
                                                                        className="text-red-600 hover:text-red-900 font-semibold"
                                                                    >
                                                                        삭제
                                                                    </button>
                                                                    <button onClick={() => downloadExcel(submission)} className="text-green-600 hover:text-green-900 font-semibold">
                                                                        엑셀 다운로드
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">카테고리 관리</h2>
                        <button
                            onClick={() => {
                                setEditingCategory(null);
                                setCategoryForm({
                                    name: '',
                                    slug: '',
                                    order: categories?.content?.length ? categories?.content?.length + 1 : 0,
                                });
                                setShowCategoryForm(true);
                            }}
                            className="px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all"
                        >
                            + 새 카테고리 추가
                        </button>
                    </div>

                    {categories?.content?.length === 0 ? (
                        <div className="bg-white border-2 border-gray-200 rounded-lg p-12 text-center">
                            <span className="text-6xl mb-4 block">📁</span>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">카테고리가 없습니다</h3>
                            <p className="text-gray-600">새 카테고리를 추가하여 포트폴리오를 분류해보세요</p>
                        </div>
                    ) : (
                        <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b-2 border-black">
                                        <tr>
                                            <th className="px-1 md:px-6 py-4 text-left text-sm font-bold text-black">카테고리명</th>
                                            <th className="px-1 md:px-6 py-4 text-left text-sm font-bold text-black">슬러그</th>
                                            <th className="px-1 md:px-6 py-4 text-left text-sm font-bold text-black">순서</th>
                                            <th className="px-1 md:px-6 py-4 text-left text-sm font-bold text-black">포트폴리오 수</th>
                                            <th className="px-1 md:px-6 py-4 text-left text-sm font-bold text-black">작업</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {categories?.content?.map((category) => (
                                            <tr key={category.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm font-semibold text-black">{category.name}</td>
                                                <td className="px-6 py-4 text-sm font-mono text-gray-700">{category.slug}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{category.order}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{category.count?.portfolios || 0}개</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <div className="flex flex-col md:flex-row gap-2">
                                                        <button onClick={() => handleEditCategory(category)} className="text-blue-600 font-semibold hover:underline">
                                                            수정
                                                        </button>
                                                        <button onClick={() => handleDeleteCategory(category.id)} className="text-red-600 font-semibold hover:underline">
                                                            삭제
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="my-6">
                                <Pagination current={page} totalPages={categories?.totalPages ?? 0} onChange={handlePageClick} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Category Form Modal */}
            {showCategoryForm && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={() => {
                        setShowCategoryForm(false);
                        setEditingCategory(null);
                    }}
                >
                    <div className="bg-white rounded-lg p-8 max-w-md w-full border-2 border-black" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-black mb-6">{editingCategory ? '카테고리 수정' : '새 카테고리 추가'}</h3>
                        <form onSubmit={handleCreateOrUpdateCategory} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">카테고리명</label>
                                <input type="text" required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">슬러그 (URL용)</label>
                                <input type="text" required value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-black mb-2">순서</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={categoryForm.order}
                                    onChange={(e) =>
                                        setCategoryForm({
                                            ...categoryForm,
                                            order: parseInt(e.target.value),
                                        })
                                    }
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all">
                                    {editingCategory ? '수정' : '생성'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCategoryForm(false);
                                        setEditingCategory(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-white text-black border-2 border-black rounded-lg font-semibold hover:bg-black hover:text-white transition-all"
                                >
                                    취소
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

//포트폴리오 목록 > 카테고리별 구역 (구역마다 페이지 따로 관리)
function PortfolioCategorySection({
    label,
    portfolios,
    hideWhenEmpty = false,
    renderCard,
}: {
    label: string;
    portfolios: PortfolioContent[];
    hideWhenEmpty?: boolean;
    renderCard: (portfolio: PortfolioContent) => ReactNode;
}) {
    const [page, setPage] = useState(0);

    const totalPages = Math.ceil(portfolios.length / PORTFOLIO_PAGE_SIZE);
    //목록이 줄어 현재 페이지가 범위를 벗어나면 마지막 페이지로
    const currentPage = Math.min(page, Math.max(totalPages - 1, 0));
    const pagePortfolios = portfolios.slice(currentPage * PORTFOLIO_PAGE_SIZE, (currentPage + 1) * PORTFOLIO_PAGE_SIZE);

    if (hideWhenEmpty && portfolios.length === 0) return null;

    return (
        <div>
            <h3 className="text-lg font-bold text-black mb-3">
                {label} <span className="text-gray-500 font-semibold">({portfolios.length})</span>
            </h3>

            {portfolios.length === 0 ? (
                <div className="bg-white border-2 border-gray-200 rounded-lg px-6 py-8 text-center text-sm text-gray-500">등록된 포트폴리오가 없습니다</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{pagePortfolios.map(renderCard)}</div>
                    {totalPages > 1 && (
                        <div className="my-6">
                            <Pagination current={currentPage} totalPages={totalPages} onChange={setPage} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

//사용자 목록 > 역할별 구역 (구역마다 페이지 따로 관리)
function UserRoleSection({
    label,
    users,
    lastLoginMap,
    hideWhenEmpty = false,
    onChangePassword,
    onDelete,
}: {
    label: string;
    users: UserContent[];
    lastLoginMap: Record<string, string | null>;
    hideWhenEmpty?: boolean;
    onChangePassword: (user: UserContent) => void;
    //없으면 삭제 버튼 숨김
    onDelete?: (user: UserContent) => void;
}) {
    const [page, setPage] = useState(0);

    const totalPages = Math.ceil(users.length / USER_PAGE_SIZE);
    //목록이 줄어 현재 페이지가 범위를 벗어나면 마지막 페이지로
    const currentPage = Math.min(page, Math.max(totalPages - 1, 0));
    const pageUsers = users.slice(currentPage * USER_PAGE_SIZE, (currentPage + 1) * USER_PAGE_SIZE);

    if (hideWhenEmpty && users.length === 0) return null;

    return (
        <div>
            <h3 className="text-lg font-bold text-black mb-3">
                {label} <span className="text-gray-500 font-semibold">({users.length})</span>
            </h3>

            <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
                {users.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-gray-500">등록된 사용자가 없습니다</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                        <table className="min-w-full divide-y-2 divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">이름</th>
                                    <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">계정 아이디</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">생성일</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">마지막 접속</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">작업</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {pageUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-black">{user.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDateTime(lastLoginMap[String(user.id)])}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                            <button onClick={() => onChangePassword(user)} className="text-green-600 hover:text-green-900 mr-4">
                                                비밀번호 변경
                                            </button>
                                            {onDelete && (
                                                <button onClick={() => onDelete(user)} className="text-red-600 hover:text-red-900">
                                                    삭제
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="my-6">
                                <Pagination current={currentPage} totalPages={totalPages} onChange={setPage} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
