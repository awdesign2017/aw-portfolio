'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import DynamicFormField from '@/components/DynamicFormField';
import RoomCard, { Room, createEmptyRoom } from '@/components/RoomCard';
import { useRecoilValue } from 'recoil';
import { userState } from '@/store/user';
import { PortfolioService } from '@/services/portfolios.service';
import { useRequest } from '@/hooks/useRequest';
import { QuestionService } from '@/services/question.service';
import { SubmissionService } from '@/services/submission.service';

interface Question {
    id: string;
    step: number;
    title: string;
    description?: string;
    thumbnail?: string;
    questionType: string;
    options?: string;
    minLength: number;
    maxLength?: number;
    requireMinLength?: boolean;
    order: number;
    isRequired: boolean;
}

interface Portfolio {
    id: string;
    title: string;
    description: string;
    slug: string;
}

interface FormData {
    [key: string]: any;
}

// 단계별 안내 문구
const stepMessages: Record<number, { title: string; description: JSX.Element }> = {
    0: {
        title: '안내사항',
        description: <>다음 단계로 진행하기 전에 안내사항을 확인해주세요.</>,
    },
    1: {
        title: '단계 1 - 필수 정보 입력',
        description: (
            <>
                홈페이지 제작을 위해 필요한 기본 정보를 입력해 주세요.
                <br />* 표시된 항목은 반드시 작성해 주셔야 합니다.
            </>
        ),
    },
    2: {
        title: '단계 2 - 계정 및 기술 정보 입력',
        description: (
            <>
                홈페이지 운영 및 연동 설정을 위해 필요한 정보를 입력해 주세요.
                <br />* 표시된 항목은 반드시 작성해 주셔야 합니다.
            </>
        ),
    },
    3: {
        title: '단계 3 - 디자인 및 이미지 방향 설정',
        description: (
            <>
                홈페이지의 전체 인상과 분위기를 결정하는 단계입니다.
                <br />
                선택하신 내용은 디자인 및 이미지 보정 방향에 직접 반영되므로,
                <br />
                숙소의 성격과 가장 잘 어울리는 방향을 기준으로 선택해 주세요.
                <br />* 표시된 항목은 반드시 작성해 주셔야 합니다.
            </>
        ),
    },
    4: {
        title: '단계 4',
        description: <></>,
    },
    5: {
        title: '단계 5',
        description: <></>,
    },
    6: {
        title: '단계 6',
        description: <></>,
    },
    7: {
        title: '단계 7',
        description: <></>,
    },
    8: {
        title: '단계 8',
        description: <></>,
    },
    9: {
        title: '단계 9',
        description: <></>,
    },
};

export default function PortfolioForm() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    //hooks
    const { request } = useRequest();

    //id 방식 교체
    const id = params.id as string;
    const submissionId = searchParams.get('submissionId');
    //상세보기 제어
    const isDetailMode = searchParams.get('detail') === 'true';
    //상세보기 진입 경로 (관리자 제출목록에서 들어온 경우 제출목록으로 복귀)
    const SUBMISSION_LIST_PATH: Record<string, string> = {
        super: '/admin/super?tab=submissions',
        dashboard: '/admin/dashboard',
    };
    const from = searchParams.get('from');
    const submissionListPath = isDetailMode && from ? SUBMISSION_LIST_PATH[from] : undefined;

    //로그인 상태
    const currentUser = useRecoilValue(userState);
    //썸네일
    const [showPreview, setShowPreview] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);

    //임시저장 체크
    const [isDraft, setIsDraft] = useState(false);

    //자동 저장
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [shouldAutoSave, setShouldAutoSave] = useState(false);

    //자동저장 여부
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const startAutoSave = () => {
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = setTimeout(() => {
            setShouldAutoSave(true); // 트리거
            startAutoSave(); // 다음 타이머 예약
        }, 60000);
    };

    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentStep, setCurrentStep] = useState(-1); // -1 = 로딩, 0+ = 질문 단계
    const [formData, setFormData] = useState<FormData>({});
    const [errors, setErrors] = useState<FormData>({});

    // 객실
    const [rooms, setRooms] = useState<Room[]>([createEmptyRoom('room-1')]);
    //방금 추가·복사한 객실 (펼친 상태로 표시)
    const [justAddedRoomId, setJustAddedRoomId] = useState<string | null>(null);

    // 스페셜
    const [specials, setSpecials] = useState<Array<{ id: string; name: string; desc: string }>>([{ id: 'special-1', name: '', desc: '' }]);

    //환불
    const [refunds, setRefunds] = useState<Array<{ id: string; day: string; percent: string }>>([
        { id: 'refund-1', day: '', percent: '' }, // 기본취소수수료
        { id: 'refund-2', day: '', percent: '' }, // 방문당일
    ]);

    const handleAddRefund = () => {
        setRefunds((prev) => [...prev, { id: `refund-${Date.now()}`, day: '', percent: '' }]);
    };

    const handleRemoveRefund = (id: string) => {
        setRefunds((prev) => prev.filter((r) => r.id !== id));
    };

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [existingSubmissionId, setExistingSubmissionId] = useState<string | null>(null);

    const maxStep = questions.length > 0 ? Math.max(...questions.map((q) => q.step)) : 1;
    const minStep = questions.length > 0 ? Math.min(...questions.map((q) => q.step)) : 0;

    //파일
    const fileMapRef = useRef<
        Record<
            string,
            {
                newFiles: File[];
                deleteFileIds: number[];
            }
        >
    >({});

    //파일 전송시 수정
    const extractSubmitData = () => {
        const optionFiles: any[] = [];
        const cleanedFormData: any = {};

        Object.entries(fileMapRef.current).forEach(([questionId, fileState]) => {
            const question = questions.find((q) => String(q.id) === questionId);
            if (!question) return;

            // 새 파일들
            fileState.newFiles.forEach((file) => {
                optionFiles.push({
                    optionsId: question.id,
                    questionStep: question.step,
                    questionOrder: question.order,
                    files: [file],
                });
            });

            // 삭제 파일들
            fileState.deleteFileIds.forEach((fileId) => {
                optionFiles.push({
                    optionsId: question.id,
                    questionStep: question.step,
                    questionOrder: question.order,
                    deleteFileId: fileId,
                    files: [],
                });
            });

            cleanedFormData[questionId] = null;
        });

        Object.entries(formData).forEach(([k, v]) => {
            if (fileMapRef.current[k]) return; // 파일 질문은 스킵
            cleanedFormData[k] = v;
        });

        return {
            response: {
                ...cleanedFormData,
                rooms,
                specials,
                refunds,
            },
            optionFiles,
        };
    };

    useEffect(() => {
        if (questions.length > 0 && currentStep === -1) {
            setCurrentStep(minStep);
        }
    }, [questions, minStep, currentStep]);

    // 1. 유저 정보 확인
    useEffect(() => {
        const loginGb = localStorage.getItem('login');

        //로그인 정보 확인
        if (loginGb) {
            if (currentUser) {
                fetchPortfolioAndQuestions();
            }
        } else {
            router.push('/');
        }
    }, [id, currentUser]);

    useEffect(() => {
        if (currentUser && portfolio?.id && submissionId) {
            checkExistingSubmission();
        }

        if (!isDetailMode) {
            startAutoSave();
        }
    }, [currentUser, portfolio?.id]);

    //자동저장 트리거
    useEffect(() => {
        if (!shouldAutoSave) return;

        const save = async () => {
            await handleSaveDraft(true);
            setShouldAutoSave(false);
        };

        save();
    }, [shouldAutoSave]);

    // Enter로 다음
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && !event.shiftKey && !submitting) {
                const target = event.target as HTMLElement;
                if (target.tagName === 'TEXTAREA' && !event.ctrlKey) return;
                event.preventDefault();
                if (currentStep < maxStep) {
                    handleNext();
                } else {
                    handleSubmit();
                }
            }
        };
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [currentStep, maxStep, submitting]);

    const checkExistingSubmission = async () => {
        if (!submissionId) return;
        try {
            await request(
                () => SubmissionService.get(submissionId),
                (res) => {
                    const data = res.data;

                    if (data) {
                        const parsedResponses = JSON.parse(data.submissionJson);

                        console.log('parsedResponses', parsedResponses);

                        setExistingSubmissionId(data.submissionId);
                        setFormData(parsedResponses);

                        // rooms 복원
                        const savedRooms = parsedResponses?.rooms;
                        if (Array.isArray(savedRooms) && savedRooms.length > 0) {
                            setRooms(
                                savedRooms.map((r: any, idx: number) => ({
                                    id: r.id ? String(r.id) : `room-${idx + 1}`,
                                    name: r.name || '',
                                    desc: r.desc || '',
                                    capacity: {
                                        standard: r.capacity?.standard || '',
                                        max: r.capacity?.max || '',
                                    },
                                    type: r.type || '',
                                    amenities: r.amenities || '',
                                    priceLow: {
                                        weekday: r.priceLow?.weekday || '',
                                        fri: r.priceLow?.fri || '',
                                        sat: r.priceLow?.sat || '',
                                        sun: r.priceLow?.sun || '',
                                    },
                                    priceMid: {
                                        weekday: r.priceMid?.weekday || '',
                                        fri: r.priceMid?.fri || '',
                                        sat: r.priceMid?.sat || '',
                                        sun: r.priceMid?.sun || '',
                                    },
                                    priceHigh: {
                                        weekday: r.priceHigh?.weekday || '',
                                        fri: r.priceHigh?.fri || '',
                                        sat: r.priceHigh?.sat || '',
                                        sun: r.priceHigh?.sun || '',
                                    },
                                }))
                            );
                        } else {
                            setRooms([
                                {
                                    id: 'room-1',
                                    name: '',
                                    desc: '',
                                    capacity: { standard: '', max: '' },
                                    type: '',
                                    amenities: '',
                                    priceLow: { weekday: '', fri: '', sat: '', sun: '' },
                                    priceMid: { weekday: '', fri: '', sat: '', sun: '' },
                                    priceHigh: { weekday: '', fri: '', sat: '', sun: '' },
                                },
                            ]);
                        }

                        // specials 복원
                        const savedSpecials = parsedResponses?.specials;
                        if (Array.isArray(savedSpecials) && savedSpecials.length > 0) {
                            setSpecials(
                                savedSpecials.map((s: any, idx: number) => ({
                                    id: s.id ? String(s.id) : `special-${idx + 1}`,
                                    name: s.name || '',
                                    desc: s.desc || '',
                                }))
                            );
                        } else {
                            setSpecials([{ id: 'special-1', name: '', desc: '' }]);
                        }

                        // 환불 복원
                        const savedRefunds = parsedResponses?.refunds;
                        if (Array.isArray(savedRefunds) && savedRefunds.length > 0) {
                            setRefunds(
                                savedRefunds.map((r: any, idx: number) => ({
                                    id: r.id || `refund-${idx + 1}`,
                                    day: r.day || '',
                                    percent: r.percent || '',
                                }))
                            );
                        } else {
                            setRefunds([
                                { id: 'refund-1', day: '', percent: '' }, // 기본취소수수료
                                { id: 'refund-2', day: '', percent: '' }, // 방문당일
                            ]);
                        }
                    }
                },
                { ignoreErrorRedirect: true }
            );
        } catch (error) {
            console.error('Failed to check existing submission:', error);
        }
    };

    const fetchPortfolioAndQuestions = async () => {
        try {
            await request(
                () => PortfolioService.getOne(id),
                (res) => {
                    if (!res.data) {
                        router.push('/');
                        return;
                    }

                    setPortfolio(res.data);
                },
                { ignoreErrorRedirect: true }
            );

            await request(
                () => QuestionService.getPortfolios(id),
                (res) => {
                    setQuestions(res.data);
                },
                { ignoreErrorRedirect: true }
            );
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    //sort 추가 2025.12.24
    const currentQuestions = questions.filter((q) => q.step === currentStep).sort((a, b) => a.order - b.order);

    const validateStep = (): boolean => {
        const newErrors: FormData = {};
        let isValid = true;

        currentQuestions.forEach((question) => {
            const value = formData[question.id];
            if (question.isRequired) {
                //객실
                if (question.questionType === 'parlor') {
                    if (!rooms || rooms.length === 0) {
                        newErrors[question.id] = '객실을 최소 1개 이상 입력해주세요.';
                        isValid = false;
                        return;
                    }

                    const hasInvalidRoom = rooms.some((room) => {
                        if (!room.name?.trim() || !room.desc?.trim() || !room.capacity?.standard?.trim() || !room.capacity?.max?.trim() || !room.type?.trim()) return true;

                        const seasons = [room.priceLow, room.priceMid, room.priceHigh];

                        return seasons.some((season) => !season.weekday?.trim() || !season.fri?.trim() || !season.sat?.trim() || !season.sun?.trim());
                    });

                    if (hasInvalidRoom) {
                        newErrors[question.id] = '객실의 모든 항목을 입력해주세요.';
                        isValid = false;
                        return;
                    }

                    return;
                }

                //스페셜
                if (question.questionType === 'special') {
                    const hasInvalidSpecial = specials.some((sp) => {
                        if (!sp.name?.trim()) return true;
                        if (!sp.desc?.trim()) return true;
                        if (sp.desc.trim().length < 0) return true;
                        return false;
                    });

                    if (hasInvalidSpecial) {
                        newErrors[question.id] = '스페셜명과 스페셜 설명을 입력하고, 설명은 최소 20자 이상이어야 합니다.';
                        isValid = false;
                        return;
                    }

                    return;
                }

                //환불 검증
                if (question.questionType === 'refund') {
                    if (!refunds || refunds.length < 2) {
                        newErrors[question.id] = '환불 정책을 최소 2개 이상 입력해주세요.';
                        isValid = false;
                        return;
                    }

                    const invalid = refunds.some((r, idx) => {
                        // idx === 0 (기본취소수수료): 선택사항
                        if (idx === 0) {
                            // 입력하지 않으면 OK
                            return false;
                        }

                        // idx === 1 (방문당일): percent만 필수
                        if (idx === 1) {
                            if (!r.percent || !r.percent.trim()) return true;
                            return false;
                        }

                        // idx > 1 (방문N일전): percent + day 둘 다 필수
                        if (!r.percent || !r.percent.trim()) return true;
                        if (!r.day || !r.day.trim()) return true;
                        return false;
                    });

                    if (invalid) {
                        newErrors[question.id] = '방문당일 환불 비율과 방문일 기준을 모두 입력해주세요.';
                        isValid = false;
                        return;
                    }

                    return;
                }

                if (question.questionType === 'file') {
                    const fileState = fileMapRef.current[question.id];

                    const hasNewFile = fileState && Array.isArray(fileState.newFiles) ? fileState.newFiles.length > 0 : false;

                    const hasExistingFile = Array.isArray(value) && value.some((f: any) => f.fileId);

                    if (!hasNewFile && !hasExistingFile) {
                        newErrors[question.id] = '파일을 업로드해주세요.';
                        isValid = false;
                    }

                    return;
                }

                if (question.questionType === 'checkbox') {
                    if (!value || typeof value !== 'object') {
                        newErrors[question.id] = '최소 하나 이상 선택해주세요.';
                        isValid = false;
                        return;
                    }
                    try {
                        const options = JSON.parse(question.options || '{}');
                        const isMultiple = options.multiple !== false;
                        if (isMultiple) {
                            if (!('checked' in value) || !(value as any).checked || (value as any).checked.length === 0) {
                                newErrors[question.id] = '최소 하나 이상 선택해주세요.';
                                isValid = false;
                                return;
                            }

                            // hasInput이 있는 항목의 입력값 검증
                            if (options.checkboxes && Array.isArray(options.checkboxes)) {
                                const checkedLabels = (value as any).checked || [];
                                const hasEmptyInput = options.checkboxes.some((opt: any) => {
                                    if (opt.hasInput && checkedLabels.includes(opt.label)) {
                                        const inputValue = (value as any).inputs?.[opt.label];
                                        return !inputValue || !inputValue.trim();
                                    }
                                    return false;
                                });

                                if (hasEmptyInput) {
                                    newErrors[question.id] = '선택한 항목의 입력란을 모두 작성해주세요.';
                                    isValid = false;
                                    return;
                                }
                            }
                        } else {
                            if (!('selected' in value) || !(value as any).selected) {
                                newErrors[question.id] = '하나를 선택해주세요.';
                                isValid = false;
                                return;
                            }

                            // 단일 선택에서도 hasInput 검증
                            if (options.checkboxes && Array.isArray(options.checkboxes)) {
                                const selectedLabel = (value as any).selected;
                                const selectedOption = options.checkboxes.find((opt: any) => opt.label === selectedLabel);

                                if (selectedOption?.hasInput) {
                                    const inputValue = (value as any).inputs?.[selectedLabel];
                                    if (!inputValue || !inputValue.trim()) {
                                        newErrors[question.id] = '선택한 항목의 입력란을 작성해주세요.';
                                        isValid = false;
                                        return;
                                    }
                                }
                            }
                        }
                    } catch {
                        if (!('checked' in value) || !(value as any).checked || (value as any).checked.length === 0) {
                            newErrors[question.id] = '최소 하나 이상 선택해주세요.';
                            isValid = false;
                            return;
                        }
                    }
                }

                if (question.questionType === 'checkbox_input') {
                    if (!value || typeof value !== 'object') {
                        newErrors[question.id] = '최소 하나 이상 선택해주세요.';
                        isValid = false;
                        return;
                    }

                    const { checked, inputs } = value as {
                        checked?: number[];
                        inputs?: string[];
                    };

                    if (!Array.isArray(checked) || checked.length === 0) {
                        newErrors[question.id] = '최소 하나 이상 선택해주세요.';
                        isValid = false;
                        return;
                    }

                    const hasEmptyInput = checked.some((idx) => {
                        const v = inputs?.[idx];
                        return !v || !v.trim();
                    });

                    if (hasEmptyInput) {
                        newErrors[question.id] = '선택한 항목의 내용을 모두 입력해주세요.';
                        isValid = false;
                        return;
                    }

                    return;
                }

                if (question.questionType === 'repeatable') {
                    if (!value || !Array.isArray(value) || value.length === 0) {
                        newErrors[question.id] = '최소 하나 이상 입력해주세요.';
                        isValid = false;
                        return;
                    }
                }

                //주소 검증 (상세주소는 선택사항)
                if (question.questionType === 'addr') {
                    if (!value || !value.address?.trim() || !value.zonecode?.trim()) {
                        newErrors[question.id] = '우편번호와 주소를 입력해주세요.';
                        isValid = false;
                        return;
                    }
                }

                if (question.questionType === 'agreement') {
                    if (!value || !value.agreed) {
                        newErrors[question.id] = '안내사항에 동의해주세요.';
                        isValid = false;
                        return;
                    }
                } else if (question.questionType === 'multi_text') {
                    // 멀티텍스트 검증: 두 입력값 모두 필수
                    if (!Array.isArray(value) || value.length !== 2) {
                        newErrors[question.id] = '두 항목을 모두 입력해주세요.';
                        isValid = false;
                        return;
                    }

                    const [first, second] = value;
                    if (!first || !first.trim() || !second || !second.trim()) {
                        newErrors[question.id] = '두 항목을 모두 입력해주세요.';
                        isValid = false;
                        return;
                    }
                } else {
                    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                        newErrors[question.id] = '이 항목은 필수입니다.';
                        isValid = false;
                        return;
                    }
                }
            }

            if (question.requireMinLength && (question.questionType === 'text' || question.questionType === 'textarea') && typeof value === 'string' && value.trim().length > 0 && value.trim().length < question.minLength) {
                newErrors[question.id] = `최소 ${question.minLength}자 이상 입력해주세요.`;
                isValid = false;
            }

            // multi_text의 최소 글자 수 검증
            if (question.requireMinLength && question.questionType === 'multi_text' && Array.isArray(value) && value.length === 2) {
                const [first, second] = value;
                if ((first && first.trim().length > 0 && first.trim().length < question.minLength) || (second && second.trim().length > 0 && second.trim().length < question.minLength)) {
                    newErrors[question.id] = `각 항목은 최소 ${question.minLength}자 이상 입력해주세요.`;
                    isValid = false;
                }
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const validateAllSteps = (): boolean => {
        const newErrors: FormData = {};
        let isValid = true;
        const missingSteps: number[] = [];

        questions.forEach((question) => {
            const value = formData[question.id];

            if (!question.isRequired) return;

            const fail = (message: string) => {
                newErrors[question.id] = message;
                isValid = false;
                if (!missingSteps.includes(question.step)) {
                    missingSteps.push(question.step);
                }
            };

            //객실
            if (question.questionType === 'parlor') {
                if (!rooms || rooms.length === 0) {
                    fail('객실을 최소 1개 이상 입력해주세요.');
                    return;
                }

                const hasInvalidRoom = rooms.some((room) => {
                    if (!room.name?.trim() || !room.desc?.trim() || !room.capacity?.standard?.trim() || !room.capacity?.max?.trim() || !room.type?.trim()) return true;

                    const seasons = [room.priceLow, room.priceMid, room.priceHigh];

                    return seasons.some((season) => !season.weekday?.trim() || !season.fri?.trim() || !season.sat?.trim() || !season.sun?.trim());
                });

                if (hasInvalidRoom) {
                    fail('객실의 모든 항목을 입력해주세요.');
                }
                return;
            }

            //스페셜
            if (question.questionType === 'special') {
                const hasInvalidSpecial = specials.some((sp) => !sp.name?.trim() || !sp.desc?.trim() || sp.desc.trim().length < 0);

                if (hasInvalidSpecial) {
                    fail('스페셜명과 스페셜 설명을 입력하고, 설명은 최소 20자 이상이어야 합니다.');
                }
                return;
            }

            //환불
            if (question.questionType === 'refund') {
                if (!refunds || refunds.length < 2) {
                    fail('환불 정책을 최소 2개 이상 입력해주세요.');
                    return;
                }

                const invalid = refunds.some((r, idx) => {
                    // idx === 0 (기본취소수수료): 선택사항
                    if (idx === 0) {
                        return false;
                    }

                    // idx === 1 (방문당일): percent만 필수
                    if (idx === 1) {
                        if (!r.percent || !r.percent.trim()) return true;
                        return false;
                    }

                    // idx > 1 (방문N일전): percent + day 둘 다 필수
                    if (!r.percent || !r.percent.trim()) return true;
                    if (!r.day || !r.day.trim()) return true;
                    return false;
                });

                if (invalid) {
                    fail('방문당일 환불 비율과 방문일 기준을 모두 입력해주세요.');
                }
                return;
            }

            //파일
            if (question.questionType === 'file') {
                const fileState = fileMapRef.current[question.id];

                const hasNewFile = fileState && Array.isArray(fileState.newFiles) ? fileState.newFiles.length > 0 : false;

                const hasExistingFile = Array.isArray(value) && value.some((f: any) => f.fileId);

                if (!hasNewFile && !hasExistingFile) {
                    fail('파일을 업로드해주세요.');
                }

                return;
            }

            //체크박스
            if (question.questionType === 'checkbox') {
                if (!value || typeof value !== 'object') {
                    fail('최소 하나 이상 선택해주세요.');
                    return;
                }

                try {
                    const options = JSON.parse(question.options || '{}');
                    const isMultiple = options.multiple !== false;

                    if (isMultiple) {
                        if (!value.checked || value.checked.length === 0) {
                            fail('최소 하나 이상 선택해주세요.');
                            return;
                        }

                        // hasInput이 있는 항목의 입력값 검증
                        if (options.checkboxes && Array.isArray(options.checkboxes)) {
                            const checkedLabels = value.checked || [];
                            const hasEmptyInput = options.checkboxes.some((opt: any) => {
                                if (opt.hasInput && checkedLabels.includes(opt.label)) {
                                    const inputValue = value.inputs?.[opt.label];
                                    return !inputValue || !inputValue.trim();
                                }
                                return false;
                            });

                            if (hasEmptyInput) {
                                fail('선택한 항목의 입력란을 모두 작성해주세요.');
                                return;
                            }
                        }
                    } else {
                        if (!value.selected) {
                            fail('하나를 선택해주세요.');
                            return;
                        }

                        // 단일 선택에서도 hasInput 검증
                        if (options.checkboxes && Array.isArray(options.checkboxes)) {
                            const selectedLabel = value.selected;
                            const selectedOption = options.checkboxes.find((opt: any) => opt.label === selectedLabel);

                            if (selectedOption?.hasInput) {
                                const inputValue = value.inputs?.[selectedLabel];
                                if (!inputValue || !inputValue.trim()) {
                                    fail('선택한 항목의 입력란을 작성해주세요.');
                                    return;
                                }
                            }
                        }
                    }
                } catch {
                    if (!value.checked || value.checked.length === 0) {
                        fail('최소 하나 이상 선택해주세요.');
                    }
                }
                return;
            }

            if (question.questionType === 'checkbox_input') {
                if (!value || typeof value !== 'object') {
                    fail('최소 하나 이상 선택해주세요.');
                    return;
                }

                const { checked, inputs } = value as {
                    checked?: number[];
                    inputs?: string[];
                };

                if (!Array.isArray(checked) || checked.length === 0) {
                    fail('최소 하나 이상 선택해주세요.');
                    return;
                }

                const hasEmptyInput = checked.some((idx) => {
                    const v = inputs?.[idx];
                    return !v || !v.trim();
                });

                if (hasEmptyInput) {
                    fail('선택한 항목의 내용을 모두 입력해주세요.');
                }

                return;
            }

            //repeatable
            if (question.questionType === 'repeatable') {
                if (!Array.isArray(value) || value.length === 0) {
                    fail('최소 하나 이상 입력해주세요.');
                }
                return;
            }

            //addr (상세주소는 선택사항)
            if (question.questionType === 'addr') {
                if (!value || !value.address?.trim() || !value.zonecode?.trim()) {
                    fail('우편번호와 주소를 입력해주세요.');
                }
                return;
            }

            //agreement
            if (question.questionType === 'agreement') {
                if (!value || !value.agreed) {
                    fail('안내사항에 동의해주세요.');
                }
                return;
            }

            //multi_text
            if (question.questionType === 'multi_text') {
                if (!Array.isArray(value) || value.length !== 2) {
                    fail('두 항목을 모두 입력해주세요.');
                    return;
                }

                const [first, second] = value;
                if (!first || !first.trim() || !second || !second.trim()) {
                    fail('두 항목을 모두 입력해주세요.');
                }
                return;
            }

            //text
            if (!value || (typeof value === 'string' && !value.trim())) {
                fail('이 항목은 필수입니다.');
                return;
            }

            if (question.requireMinLength && typeof value === 'string' && value.trim().length < question.minLength) {
                fail(`최소 ${question.minLength}자 이상 입력해주세요.`);
            }
        });

        setErrors(newErrors);

        if (!isValid && missingSteps.length > 0) {
            alert(`${missingSteps.sort((a, b) => a - b).join(', ')}단계에 미완성된 필수 항목이 있습니다.\n해당 단계로 이동하여 모든 필수 항목을 완성해주세요.`);
        }

        return isValid;
    };

    // 객실 추가
    const handleAddRoom = () => {
        const newId = `room-${Date.now()}`;
        setRooms((prev) => {
            // 마지막 객실의 데이터를 가져옴
            const lastRoom = prev[prev.length - 1];

            // 마지막 객실의 모든 정보 복사 (일부만 입력되어 있어도 복사), 첫 객실이면 빈 객실
            return [...prev, lastRoom ? { ...lastRoom, id: newId } : createEmptyRoom(newId)];
        });
        setJustAddedRoomId(newId);
    };

    // 객실 복사 (해당 객실 바로 아래에 추가)
    const handleDuplicateRoom = (id: string) => {
        const newId = `room-${Date.now()}`;
        setRooms((prev) => {
            const index = prev.findIndex((room) => room.id === id);
            if (index < 0) return prev;
            const source = prev[index];
            const copy = { ...source, id: newId, name: source.name ? `${source.name} (복사)` : '' };
            return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
        });
        setJustAddedRoomId(newId);
    };

    // 객실 삭제
    const handleRemoveRoom = (id: string) => {
        if (confirm('삭제하시겠습니까?')) {
            setRooms((prev) => prev.filter((room) => room.id !== id));
        }
    };

    // 스페셜 추가
    const handleAddSpecial = () => {
        setSpecials((prev) => [
            ...prev,
            {
                id: `special-${Date.now()}`,
                name: '',
                desc: '',
            },
        ]);
    };

    // 스페셜 삭제
    const handleRemoveSpecial = (id: string) => {
        if (confirm('삭제하시겠습니까?')) {
            setSpecials((prev) => prev.filter((sp) => sp.id !== id));
        }
    };

    const handleNext = () => {
        // 디테일 모드면 검증 없이 이동
        if (isDetailMode) {
            if (currentStep < maxStep) {
                setCurrentStep(currentStep + 1);
                window.scrollTo(0, 0);
            }
            return;
        }

        // 작성 모드 검증 실패 시 여기서 멈춤
        const isValid = validateStep();
        if (!isValid) return;

        if (currentStep < maxStep) {
            setCurrentStep(currentStep + 1);
            window.scrollTo(0, 0);
        }
    };

    const handlePrevious = () => {
        if (currentStep > minStep) {
            setCurrentStep(currentStep - 1);
            window.scrollTo(0, 0);
        }
    };

    //임시저장
    const handleSaveDraft = async (autoSave: boolean) => {
        if (!portfolio) return;
        setIsDraft(true);
        setSubmitting(true);
        try {
            const { response, optionFiles } = extractSubmitData();
            const fd = new FormData();

            // 수정일 경우
            if (existingSubmissionId) {
                fd.append('submissionId', String(existingSubmissionId));
            }

            fd.append('portfolioId', String(portfolio.id));
            fd.append('response', JSON.stringify(response));

            optionFiles.forEach((opt, idx) => {
                fd.append(`optionFiles[${idx}].optionsId`, opt.optionsId);
                fd.append(`optionFiles[${idx}].questionStep`, String(opt.questionStep));
                if (opt.deleteFileId !== undefined && opt.deleteFileId !== null) {
                    fd.append(`optionFiles[${idx}].deleteFileId`, String(opt.deleteFileId));
                }
                fd.append(`optionFiles[${idx}].questionOrder`, String(opt.questionOrder));
                opt.files.forEach((file: File) => {
                    fd.append(`optionFiles[${idx}].files`, file);
                });
            });

            await request(
                () => SubmissionService.temporaryPost(fd),
                (res) => {
                    if (!autoSave) {
                        alert('임시저장되었습니다.');
                    }

                    if (!existingSubmissionId) {
                        const newUrl = `/portfolio/${portfolio.id}?submissionId=${res.data.submissionId}`;
                        window.history.pushState({}, '', newUrl); // URL 변경
                        setExistingSubmissionId(res.data.submissionId); // 아이디 값 반영
                    }
                    startAutoSave();

                    //신규파일 비우기
                    Object.keys(fileMapRef.current).forEach((qid) => {
                        fileMapRef.current[qid].newFiles = [];
                        fileMapRef.current[qid].deleteFileIds = [];
                    });

                    checkExistingSubmission();
                },
                { ignoreErrorRedirect: true }
            );
        } catch (error) {
            console.error('Save draft error:', error);
        } finally {
            setSubmitting(false);
            setIsAutoSaving(false);
            setIsDraft(false);
        }
    };

    //제출하기
    const handleSubmit = async () => {
        if (!validateAllSteps() || !portfolio) return;

        if (!confirm('최종 제출 후에는 수정이 불가능합니다. 제출하시겠습니까?')) {
            return;
        }

        setSubmitting(true);
        try {
            const { response, optionFiles } = extractSubmitData();
            const fd = new FormData();

            // 수정일 경우
            if (existingSubmissionId) {
                fd.append('submissionId', String(existingSubmissionId));
            }

            fd.append('portfolioId', String(portfolio.id));
            fd.append('response', JSON.stringify(response));

            optionFiles.forEach((opt, idx) => {
                fd.append(`optionFiles[${idx}].optionsId`, opt.optionsId);
                fd.append(`optionFiles[${idx}].questionStep`, String(opt.questionStep));
                fd.append(`optionFiles[${idx}].questionOrder`, String(opt.questionOrder));
                if (opt.deleteFileId !== undefined && opt.deleteFileId !== null) {
                    fd.append(`optionFiles[${idx}].deleteFileId`, String(opt.deleteFileId));
                }
                opt.files.forEach((file: File) => {
                    fd.append(`optionFiles[${idx}].files`, file);
                });
            });

            await request(
                () => SubmissionService.post(fd),
                (res) => {
                    alert('제출이 완료되었습니다!\n데이터가 안전하게 저장되었습니다.');
                    router.push('/thank-you');
                },
                { ignoreErrorRedirect: true }
            );
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (questionId: string, value: any) => {
        // 새 파일 추가
        if (value instanceof File) {
            if (!fileMapRef.current[questionId]) {
                fileMapRef.current[questionId] = {
                    newFiles: [],
                    deleteFileIds: [],
                };
            }

            fileMapRef.current[questionId].newFiles.push(value);

            setFormData((prev) => {
                const prevValue = prev[questionId];
                const existing = Array.isArray(prevValue) ? prevValue : [];

                return {
                    ...prev,
                    [questionId]: [
                        ...existing,
                        {
                            __temp: true,
                            name: value.name,
                            file: value,
                        },
                    ],
                };
            });

            return;
        }

        //새로첨부된 파일 삭제
        if (value?.removeTempFileIndex !== undefined) {
            const fileState = fileMapRef.current[questionId];
            if (!fileState) return;

            setFormData((prev) => {
                const prevValue = prev[questionId];
                if (!Array.isArray(prevValue)) return prev;

                const removed = prevValue[value.removeTempFileIndex];

                const nextValue = prevValue.filter((_: any, idx: number) => idx !== value.removeTempFileIndex);

                if (removed?.file) {
                    fileMapRef.current[questionId].newFiles = fileMapRef.current[questionId].newFiles.filter((f) => f !== removed.file);
                }

                return {
                    ...prev,
                    [questionId]: nextValue,
                };
            });

            return;
        }

        // 기존 파일 삭제
        if (value?.deleteFileId) {
            if (!fileMapRef.current[questionId]) {
                fileMapRef.current[questionId] = {
                    newFiles: [],
                    deleteFileIds: [],
                };
            }

            fileMapRef.current[questionId].deleteFileIds.push(value.deleteFileId);

            setFormData((prev) => {
                const prevValue = prev[questionId];

                if (!Array.isArray(prevValue)) return prev;

                return {
                    ...prev,
                    [questionId]: prevValue.filter((file: any) => file.fileId !== value.deleteFileId),
                };
            });

            return;
        }

        setFormData((prev) => ({
            ...prev,
            [questionId]: value,
        }));
        if (errors[questionId]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[questionId];
                return newErrors;
            });
        }
    };

    //이미지 외부 영역
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (previewRef.current && !previewRef.current.contains(e.target as Node)) {
                setShowPreview(false);
            }
        };
        if (showPreview) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPreview]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">로딩 중...</div>
            </div>
        );
    }

    if (!portfolio) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">포트폴리오를 찾을 수 없습니다</h2>
                    <button
                        onClick={() => {
                            router.push('/');
                        }}
                        className="px-4 py-2 bg-black text-white rounded-lg"
                    >
                        홈으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">아직 설정된 질문이 없습니다</h2>
                    <p className="text-gray-600 mb-4">관리자에게 문의해주세요.</p>
                    <button
                        onClick={() => {
                            router.push('/');
                        }}
                        className="px-4 py-2 bg-black text-white rounded-lg"
                    >
                        홈으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Portfolio Info */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-black mb-2">{portfolio.title}</h1>
                    {portfolio.description && <p className="text-gray-600">{portfolio.description}</p>}
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                            {currentStep === 0 ? '안내사항' : `단계 ${currentStep}`} / {maxStep}
                        </span>
                        <span className="text-sm text-gray-500">{Math.round(((currentStep - minStep + 1) / (maxStep - minStep + 1)) * 100)}% 완료</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-black h-2 rounded-full transition-all duration-300"
                            style={{
                                width: `${((currentStep - minStep + 1) / (maxStep - minStep + 1)) * 100}%`,
                            }}
                        />
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white border-2 border-black rounded-lg p-2 md:p-8 shadow-lg">
                    <div>
                        <div className="mb-6">
                            {(() => {
                                const currentMessage = stepMessages[currentStep] || {
                                    title: `단계 ${currentStep}`,
                                    description: <>정보를 입력해 주세요.</>,
                                };

                                return (
                                    <>
                                        <h2 className="text-2xl font-bold text-black mb-2">{currentMessage.title}</h2>
                                        <p className="text-gray-600">{currentMessage.description}</p>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="pr-2 space-y-8">
                            {currentQuestions.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">이 단계에는 질문이 없습니다.</div>
                            ) : (
                                currentQuestions.map((question) => {
                                    if (question.questionType === 'parlor') {
                                        return (
                                            <div key={question.id} className="mt-6 space-y-8">
                                                <div className="flex-col md:flex-row items-start md:items-center justify-between">
                                                    <h3 className="flex items-center gap-1 text-lg font-semibold text-black">
                                                        객실 정보 입력
                                                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                                                        {question.thumbnail && (
                                                            <div className="relative inline-flex items-center gap-1">
                                                                <span className="text-xs text-gray-400 hover:text-black cursor-pointer" onClick={() => setShowPreview((prev) => !prev)}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="30" viewBox="0 0 50 50">
                                                                        <path d="M25,2C12.318,2,2,12.318,2,25s10.318,23,23,23s23-10.318,23-23S37.682,2,25,2z M26.797,36.935 c0,0.216-0.144,0.358-0.358,0.358h-2.726c-0.217,0-0.359-0.143-0.359-0.358v-3.084c0-0.215,0.143-0.358,0.359-0.358h2.726 c0.215,0,0.358,0.144,0.358,0.358V36.935z M29.952,23.268l-2.403,3.3c-0.717,0.968-0.933,1.47-0.933,2.689v1.147 c0,0.215-0.143,0.358-0.358,0.358h-2.367c-0.215,0.004-0.358-0.14-0.358-0.355v-1.47c0-1.436,0.322-2.188,1.075-3.229l2.404-3.3 c1.254-1.721,1.684-2.546,1.684-3.766c0-2.044-1.434-3.335-3.479-3.335c-2.008,0-3.299,1.219-3.729,3.407 c-0.036,0.215-0.179,0.323-0.395,0.287l-2.259-0.395c-0.216-0.036-0.323-0.179-0.288-0.395c0.539-3.443,3.014-5.703,6.744-5.703 c3.872,0,6.49,2.546,6.49,6.097C31.78,20.327,31.172,21.582,29.952,23.268z"></path>
                                                                    </svg>
                                                                </span>

                                                                {showPreview && (
                                                                    <div ref={previewRef} className="absolute top-[0.5rem] md:top-[-10.5rem] left-[-8rem] md:left-[4rem] z-50 w-[11rem] md:w-[22rem] border border-gray-300 shadow-lg bg-white rounded-lg p-2">
                                                                        <img src={question.thumbnail} alt={question.title} className="w-full h-auto object-cover rounded" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </h3>
                                                    <p className="text-gray-500 text-sm">
                                                        홈페이지에 노출될 객실 정보를 입력해 주세요.
                                                        <br />
                                                        입력하신 내용은 객실 상세 페이지 구성과 예약 정보에 직접 반영됩니다.
                                                    </p>
                                                </div>

                                                {rooms.length === 0 && <p className="text-gray-500 text-sm">아직 등록된 객실이 없습니다. “객실 추가”를 눌러주세요.</p>}

                                                {rooms.map((room, index) => (
                                                    <RoomCard
                                                        key={room.id}
                                                        room={room}
                                                        index={index}
                                                        readOnly={isDetailMode}
                                                        canRemove={rooms.length > 1}
                                                        //상세보기는 모두 펼침, 방금 추가·복사한 객실은 펼침, 그 외에는 미완성 객실만 펼침
                                                        defaultOpen={isDetailMode || room.id === justAddedRoomId ? true : undefined}
                                                        onChange={(updated) => setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))}
                                                        onRemove={() => handleRemoveRoom(room.id)}
                                                        onDuplicate={() => handleDuplicateRoom(room.id)}
                                                    />
                                                ))}
                                                {!isDetailMode && <p className="text-gray-500 text-sm">[+ 객실 추가]를 누르면 마지막 객실 내용이 복사되어 추가됩니다. 특정 객실을 바탕으로 만들려면 해당 객실의 [복사]를 눌러주세요.</p>}
                                                {!isDetailMode && (
                                                    <button type="button" onClick={handleAddRoom} className="px-4 py-2 bg-gray-100 border-2 border-black rounded-lg text-sm font-semibold hover:bg-black hover:text-white transition-all">
                                                        + 객실 추가
                                                    </button>
                                                )}
                                                {errors[question.id] && <p className="text-sm text-red-500 mt-2">{errors[question.id]}</p>}
                                            </div>
                                        );
                                    }

                                    if (question.questionType === 'special') {
                                        return (
                                            <div key={question.id} className="mt-6 space-y-8">
                                                <div className="flex-col md:flex-row items-start md:items-center justify-between">
                                                    <h3 className="flex items-center gap-1 text-lg font-semibold text-black">
                                                        스페셜 정보 입력
                                                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                                                        {question.thumbnail && (
                                                            <div className="relative inline-flex items-center gap-1">
                                                                <span className="text-xs text-gray-400 hover:text-black cursor-pointer" onClick={() => setShowPreview((prev) => !prev)}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="30" viewBox="0 0 50 50">
                                                                        <path d="M25,2C12.318,2,2,12.318,2,25s10.318,23,23,23s23-10.318,23-23S37.682,2,25,2z M26.797,36.935 c0,0.216-0.144,0.358-0.358,0.358h-2.726c-0.217,0-0.359-0.143-0.359-0.358v-3.084c0-0.215,0.143-0.358,0.359-0.358h2.726 c0.215,0,0.358,0.144,0.358,0.358V36.935z M29.952,23.268l-2.403,3.3c-0.717,0.968-0.933,1.47-0.933,2.689v1.147 c0,0.215-0.143,0.358-0.358,0.358h-2.367c-0.215,0.004-0.358-0.14-0.358-0.355v-1.47c0-1.436,0.322-2.188,1.075-3.229l2.404-3.3 c1.254-1.721,1.684-2.546,1.684-3.766c0-2.044-1.434-3.335-3.479-3.335c-2.008,0-3.299,1.219-3.729,3.407 c-0.036,0.215-0.179,0.323-0.395,0.287l-2.259-0.395c-0.216-0.036-0.323-0.179-0.288-0.395c0.539-3.443,3.014-5.703,6.744-5.703 c3.872,0,6.49,2.546,6.49,6.097C31.78,20.327,31.172,21.582,29.952,23.268z"></path>
                                                                    </svg>
                                                                </span>

                                                                {showPreview && (
                                                                    <div ref={previewRef} className="absolute top-[0.5rem] md:top-[-10.5rem] left-[-8rem] md:left-[4rem] z-50 w-[11rem] md:w-[22rem] border border-gray-300 shadow-lg bg-white rounded-lg p-2">
                                                                        <img src={question.thumbnail} alt={question.title} className="w-full h-auto object-cover rounded" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </h3>
                                                </div>
                                                <p className="text-gray-500 text-sm mt-0">
                                                    스페셜이란? <br />
                                                    숙소에서만 경험할 수 있는 차별화된 서비스·공간·체험 요소를 소개하는 영역입니다. <br />
                                                    입력하신 내용은 홈페이지에서 숙소의 매력을 강조하는 콘텐츠로 활용됩니다. <br />
                                                    <strong className="text-red-500 font-bold">한 칸에 스페셜 1개만 적어주세요. 여러 개라면 아래 [+ 스페셜 추가] 버튼을 눌러 하나씩 추가해 주세요.</strong>
                                                </p>
                                                {specials.length === 0 && <p className="text-gray-500 text-sm">아직 등록된 스페셜이 없습니다. “스페셜 추가”를 눌러주세요.</p>}

                                                {specials.map((sp, index) => (
                                                    <div key={sp.id} className="p-4 border rounded-lg space-y-4 relative">
                                                        {specials.length > 1 && (
                                                            <button type="button" onClick={() => handleRemoveSpecial(sp.id)} className="absolute top-3 right-3 text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
                                                                삭제
                                                            </button>
                                                        )}

                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-black text-white text-xs">{index + 1}</span>
                                                            <p className="text-sm text-gray-700">스페셜 {index + 1}</p>
                                                        </div>

                                                        <div>
                                                            <label className="block font-semibold mb-1">스페셜명</label>
                                                            <p className="text-xs text-gray-500 mb-1">이 숙소만의 특별한 포인트 한 가지의 이름을 적어주세요.</p>
                                                            <input
                                                                type="text"
                                                                value={sp.name}
                                                                disabled={isDetailMode}
                                                                onChange={(e) => {
                                                                    const updated = specials.map((s) => (s.id === sp.id ? { ...s, name: e.target.value } : s));
                                                                    setSpecials(updated);
                                                                }}
                                                                className="w-full border border-gray-300 rounded-lg p-2"
                                                                placeholder="예: 오션뷰"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block font-semibold mb-1">스페셜 설명</label>
                                                            <p className="text-xs text-gray-500 mb-1">해당 스페셜에 대한 간단한 설명을 작성해 주세요.</p>
                                                            <textarea
                                                                value={sp.desc}
                                                                disabled={isDetailMode}
                                                                onChange={(e) => {
                                                                    const updated = specials.map((s) => (s.id === sp.id ? { ...s, desc: e.target.value } : s));
                                                                    setSpecials(updated);
                                                                }}
                                                                className="w-full border border-gray-300 rounded-lg p-2"
                                                                rows={3}
                                                                placeholder="예: 객실 앞 바다를 바라보며 해질녘 노을과 함께 불멍을 즐길 수 있습니다."
                                                            />
                                                            {/* <p className={`text-xs mt-1 text-right ${sp.desc.length < 0 ? 'text-red-500' : 'text-gray-500'}`}>{sp.desc.length} / 최소 20자</p> */}
                                                        </div>
                                                    </div>
                                                ))}
                                                {!isDetailMode && (
                                                    <button type="button" onClick={handleAddSpecial} className="w-full px-6 py-4 bg-black text-white border-2 border-black rounded-lg text-base font-bold shadow-md hover:bg-white hover:text-black hover:shadow-lg transition-all">
                                                        + 스페셜 추가
                                                    </button>
                                                )}
                                                {errors[question.id] && <p className="text-sm text-red-500 mt-2">{errors[question.id]}</p>}
                                            </div>
                                        );
                                    }

                                    if (question.questionType === 'refund') {
                                        return (
                                            <div key={question.id} className="mt-6 space-y-4">
                                                <div className="flex-col md:flex-row items-start md:items-center justify-between">
                                                    <h3 className="flex items-center gap-1 text-lg font-semibold text-black">
                                                        취소/환불정책
                                                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                                                        {question.thumbnail && (
                                                            <div className="relative inline-flex items-center gap-1">
                                                                <span className="text-xs text-gray-400 hover:text-black cursor-pointer" onClick={() => setShowPreview((prev) => !prev)}>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="30" viewBox="0 0 50 50">
                                                                        <path d="M25,2C12.318,2,2,12.318,2,25s10.318,23,23,23s23-10.318,23-23S37.682,2,25,2z M26.797,36.935 c0,0.216-0.144,0.358-0.358,0.358h-2.726c-0.217,0-0.359-0.143-0.359-0.358v-3.084c0-0.215,0.143-0.358,0.359-0.358h2.726 c0.215,0,0.358,0.144,0.358,0.358V36.935z M29.952,23.268l-2.403,3.3c-0.717,0.968-0.933,1.47-0.933,2.689v1.147 c0,0.215-0.143,0.358-0.358,0.358h-2.367c-0.215,0.004-0.358-0.14-0.358-0.355v-1.47c0-1.436,0.322-2.188,1.075-3.229l2.404-3.3 c1.254-1.721,1.684-2.546,1.684-3.766c0-2.044-1.434-3.335-3.479-3.335c-2.008,0-3.299,1.219-3.729,3.407 c-0.036,0.215-0.179,0.323-0.395,0.287l-2.259-0.395c-0.216-0.036-0.323-0.179-0.288-0.395c0.539-3.443,3.014-5.703,6.744-5.703 c3.872,0,6.49,2.546,6.49,6.097C31.78,20.327,31.172,21.582,29.952,23.268z"></path>
                                                                    </svg>
                                                                </span>

                                                                {showPreview && (
                                                                    <div ref={previewRef} className="absolute top-[0.5rem] md:top-[-10.5rem] left-[-8rem] md:left-[4rem] z-50 w-[11rem] md:w-[22rem] border border-gray-300 shadow-lg bg-white rounded-lg p-2">
                                                                        <img src={question.thumbnail} alt={question.title} className="w-full h-auto object-cover rounded" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </h3>
                                                    <p className="text-gray-500 text-sm">
                                                        예약 취소 시 적용될 환불 기준을 설정해 주세요. <br />
                                                        입력하신 내용은 예약 및 이용안내와 함께 홈페이지에 그대로 안내됩니다.
                                                    </p>
                                                </div>

                                                <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                                                    {refunds.length === 0 && <p className="text-gray-500 text-sm">아직 등록된 환불 기준이 없습니다. “환불 기준 추가”를 눌러주세요.</p>}

                                                    {refunds.map((refund, index) => (
                                                        <div key={refund.id} className="flex flex-wrap items-center gap-2 bg-white p-3 rounded border border-gray-200">
                                                            {index === 0 ? (
                                                                <>
                                                                    <span>기본 취소 수수료</span>
                                                                    <span className="text-xs text-gray-500">(선택사항)</span>
                                                                    <input
                                                                        type="number"
                                                                        value={refund.percent}
                                                                        min={0}
                                                                        max={100}
                                                                        step={10}
                                                                        disabled={isDetailMode}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === 'Process' || /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(e.key)) {
                                                                                e.preventDefault();
                                                                            }
                                                                        }}
                                                                        onCompositionStart={(e) => e.preventDefault()}
                                                                        onChange={(e) => {
                                                                            let value = e.target.value.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
                                                                            if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 100 && !isNaN(parseInt(value)))) {
                                                                                const updated = refunds.map((r) => (r.id === refund.id ? { ...r, percent: value } : r));
                                                                                setRefunds(updated);
                                                                            }
                                                                        }}
                                                                        className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center"
                                                                        placeholder="0"
                                                                    />
                                                                    <span>% 환불</span>
                                                                </>
                                                            ) : index === 1 ? (
                                                                <>
                                                                    <span>방문당일 총 금액의</span>
                                                                    <input
                                                                        type="number"
                                                                        value={refund.percent}
                                                                        min={0}
                                                                        max={100}
                                                                        step={10}
                                                                        disabled={isDetailMode}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === 'Process' || /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(e.key)) {
                                                                                e.preventDefault();
                                                                            }
                                                                        }}
                                                                        onCompositionStart={(e) => e.preventDefault()}
                                                                        onChange={(e) => {
                                                                            let value = e.target.value.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
                                                                            if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 100 && !isNaN(parseInt(value)))) {
                                                                                const updated = refunds.map((r) => (r.id === refund.id ? { ...r, percent: value } : r));
                                                                                setRefunds(updated);
                                                                            }
                                                                        }}
                                                                        className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center"
                                                                    />
                                                                    <span>% 환불</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>방문</span>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        value={refund.day}
                                                                        disabled={isDetailMode}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '.' || e.key === 'Process' || /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(e.key)) {
                                                                                e.preventDefault();
                                                                            }
                                                                        }}
                                                                        onCompositionStart={(e) => e.preventDefault()}
                                                                        onChange={(e) => {
                                                                            let value = e.target.value.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
                                                                            if (value === '' || (parseInt(value) > 0 && !isNaN(parseInt(value)))) {
                                                                                const updated = refunds.map((r) => (r.id === refund.id ? { ...r, day: value } : r));
                                                                                setRefunds(updated);
                                                                            }
                                                                        }}
                                                                        className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-center"
                                                                    />
                                                                    <span>일 전 총 금액의</span>
                                                                    <input
                                                                        type="number"
                                                                        value={refund.percent}
                                                                        min={0}
                                                                        max={100}
                                                                        step={10}
                                                                        disabled={isDetailMode}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === 'Process' || /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(e.key)) {
                                                                                e.preventDefault();
                                                                            }
                                                                        }}
                                                                        onCompositionStart={(e) => e.preventDefault()}
                                                                        onChange={(e) => {
                                                                            let value = e.target.value.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, '');
                                                                            if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 100 && !isNaN(parseInt(value)))) {
                                                                                const updated = refunds.map((r) => (r.id === refund.id ? { ...r, percent: value } : r));
                                                                                setRefunds(updated);
                                                                            }
                                                                        }}
                                                                        className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center"
                                                                    />
                                                                    <span>% 환불</span>
                                                                </>
                                                            )}

                                                            {!isDetailMode && index > 1 && (
                                                                <button type="button" onClick={() => handleRemoveRefund(refund.id)} className="ml-auto text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
                                                                    삭제
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                {!isDetailMode && (
                                                    <button type="button" onClick={handleAddRefund} className="px-4 py-2 bg-gray-100 border-2 border-black rounded-lg text-sm font-semibold hover:bg-black hover:text-white transition-all">
                                                        + 추가
                                                    </button>
                                                )}
                                                {errors[question.id] && <p className="text-sm text-red-500 mt-2">{errors[question.id]}</p>}
                                            </div>
                                        );
                                    }

                                    return (
                                        <DynamicFormField
                                            key={question.id}
                                            question={{
                                                ...question,
                                                questionType: question.questionType || 'text',
                                            }}
                                            value={formData[question.id]}
                                            onChange={(value) => handleChange(question.id, value)}
                                            error={errors[question.id]}
                                            disabled={isDetailMode}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gray-200">
                        {/* 왼쪽 */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handlePrevious}
                                disabled={currentStep === minStep}
                                className={`px-6 py-3 rounded-lg font-semibold transition-all ${currentStep === minStep ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-black border-2 border-black hover:bg-black hover:text-white'}`}
                            >
                                이전
                            </button>

                            {/* 객실, 스페셜, 환불 규정 추가 예정*/}
                            {currentQuestions.some((q) => q.questionType === 'parlor') && (
                                <button className={'hidden'} onClick={handleAddRoom}>
                                    객실 추가
                                </button>
                            )}

                            {currentQuestions.some((q) => q.questionType === 'special') && (
                                <button className={'hidden'} onClick={handleAddSpecial}>
                                    스페셜 추가
                                </button>
                            )}

                            {/* 에러 메시지 표시 */}
                            {!isDetailMode && Object.keys(errors).length > 0 && (
                                <div className="flex flex-col gap-1 max-w-[300px]">
                                    {currentQuestions
                                        .filter((q) => errors[q.id])
                                        .map((q) => (
                                            <p key={q.id} className="text-sm text-red-500">
                                                {q.title}: {errors[q.id]}
                                            </p>
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* 오른쪽 - 디테일 모드 분리*/}
                        {!isDetailMode ? (
                            <div className="flex gap-3">
                                {currentStep !== 0 && (
                                    <button onClick={() => handleSaveDraft(false)} disabled={submitting} className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:border-black transition-all disabled:opacity-50">
                                        임시저장
                                    </button>
                                )}

                                {currentStep < maxStep ? (
                                    <button onClick={handleNext} className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all">
                                        {currentStep === 0 ? '시작하기' : '다음'}
                                    </button>
                                ) : (
                                    <button onClick={handleSubmit} disabled={submitting} className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed">
                                        {submitting && !isDraft ? '제출 중...' : '제출하기'}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                {currentStep < maxStep && (
                                    <button onClick={handleNext} className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all">
                                        다음
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Back to Home */}
                <div className="text-center mt-6">
                    <button
                        onClick={() => {
                            router.push(submissionListPath ?? '/');
                        }}
                        className="text-gray-600 hover:text-black transition-all"
                    >
                        {submissionListPath ? '제출목록으로 돌아가기' : '포트폴리오 리스트로 돌아가기'}
                    </button>
                </div>
            </div>
        </div>
    );
}
