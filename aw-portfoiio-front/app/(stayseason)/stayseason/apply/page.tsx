'use client';

import { useEffect, useRef, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { SiteHeader, SiteFooter, SUPPORT_EMAIL } from '../_components/SiteChrome';

//입점 신청 페이지 (로그인 없이 제출)

const BUSINESS_TYPES = ['한옥체험업', '민박업', '생활 숙박시설 운영업', '호텔/호스텔업', '외국인관광도시민박업', '기타'];

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

type FormValues = {
    managerName: string;
    managerPhone: string;
    managerEmail: string;
    experience: '' | 'NONE' | 'HAS';
    stayName: string;
    stayAddress: string;
    website: string;
    stayIntro: string;
    businessRegistered: '' | 'PREPARING' | 'REGISTERED';
    businessType: string;
    privacyAgreed: boolean;
};

type FieldName = keyof FormValues | 'images';

const INITIAL_VALUES: FormValues = {
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    experience: '',
    stayName: '',
    stayAddress: '',
    website: '',
    stayIntro: '',
    businessRegistered: '',
    businessType: '',
    privacyAgreed: false,
};

//화면에 보이는 순서 (오류가 있을 때 가장 위 항목으로 이동)
const FIELD_ORDER: FieldName[] = ['managerName', 'managerPhone', 'managerEmail', 'experience', 'stayName', 'stayAddress', 'website', 'stayIntro', 'businessRegistered', 'businessType', 'images', 'privacyAgreed'];

function validate(values: FormValues): Partial<Record<FieldName, string>> {
    const errors: Partial<Record<FieldName, string>> = {};

    if (!values.managerName.trim()) errors.managerName = '담당자 성함을 입력해주세요.';
    if (!values.managerPhone.trim()) errors.managerPhone = '담당자 전화번호를 입력해주세요.';
    else if (!/^[0-9+\-\s()]{8,}$/.test(values.managerPhone.trim())) errors.managerPhone = '전화번호 형식을 확인해주세요.';
    if (!values.managerEmail.trim()) errors.managerEmail = '담당자 이메일을 입력해주세요.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.managerEmail.trim())) errors.managerEmail = '이메일 형식이 올바르지 않습니다.';
    if (!values.experience) errors.experience = '숙박업 경험 유무를 선택해주세요.';
    if (!values.stayName.trim()) errors.stayName = '스테이 이름을 입력해주세요.';
    if (!values.stayAddress.trim()) errors.stayAddress = '스테이 주소를 입력해주세요.';
    if (!values.stayIntro.trim()) errors.stayIntro = '스테이 소개를 입력해주세요.';
    if (!values.businessRegistered) errors.businessRegistered = '숙박업 사업자 등록 여부를 선택해주세요.';
    if (!values.businessType) errors.businessType = '업종을 선택해주세요.';
    if (!values.privacyAgreed) errors.privacyAgreed = '개인정보 수집 및 이용에 동의해주세요.';

    return errors;
}

export default function StaySeasonApplyPage() {
    const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
    const [images, setImages] = useState<File[]>([]);
    const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [dragging, setDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const honeypotRef = useRef<HTMLInputElement>(null);

    //이미지 미리보기 주소
    const [previews, setPreviews] = useState<string[]>([]);
    useEffect(() => {
        const urls = images.map((file) => URL.createObjectURL(file));
        setPreviews(urls);
        return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }, [images]);

    const setValue = <K extends keyof FormValues>(name: K, value: FormValues[K]) => {
        setValues((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const addImages = (files: FileList | File[]) => {
        const next = [...images];
        let message = '';

        for (const file of Array.from(files)) {
            if (!IMAGE_TYPES.includes(file.type)) {
                message = '이미지 파일(jpg, png, webp, gif)만 첨부할 수 있습니다.';
                continue;
            }
            if (file.size > MAX_IMAGE_SIZE) {
                message = '이미지는 한 장당 10MB 이하로 첨부해주세요.';
                continue;
            }
            if (next.length >= MAX_IMAGES) {
                message = `이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`;
                break;
            }
            next.push(file);
        }

        setImages(next);
        setErrors((prev) => ({ ...prev, images: message || undefined }));
    };

    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
        setErrors((prev) => ({ ...prev, images: undefined }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        const nextErrors = validate(values);
        setErrors(nextErrors);
        setSubmitError('');

        const firstError = FIELD_ORDER.find((name) => nextErrors[name]);
        if (firstError) {
            document.getElementById(`field-${firstError}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const body = new FormData();
        body.append('managerName', values.managerName.trim());
        body.append('managerPhone', values.managerPhone.trim());
        body.append('managerEmail', values.managerEmail.trim());
        body.append('experience', values.experience);
        body.append('stayName', values.stayName.trim());
        body.append('stayAddress', values.stayAddress.trim());
        body.append('website', values.website.trim());
        body.append('stayIntro', values.stayIntro.trim());
        body.append('businessRegistered', values.businessRegistered);
        body.append('businessType', values.businessType);
        body.append('privacyAgreed', 'true');
        body.append('fax', honeypotRef.current?.value ?? '');
        images.forEach((file) => body.append('images', file));

        setSubmitting(true);
        try {
            await axios.post('/api/hosting-applications', body, {
                baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
                timeout: 120000,
            });
            setSubmitted(true);
            window.scrollTo({ top: 0 });
        } catch (error) {
            const data = (error as AxiosError<any>).response?.data;
            if (Array.isArray(data?.validation) && data.validation.length > 0) {
                setSubmitError(data.validation.map((v: any) => Object.values(v).join(' ')).join('\n'));
            } else {
                setSubmitError(data?.message ?? '신청을 접수하지 못했습니다. 잠시 후 다시 시도해주세요.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const videoMailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[스테이시즌 입점 신청 영상] ${values.stayName.trim()}`)}`;

    const inputClass = (name: FieldName) => `ss-input ${errors[name] ? 'ss-input-error' : ''}`;

    //제출 완료 화면
    if (submitted) {
        return (
            <div className="flex min-h-screen flex-col bg-season-beige">
                <SiteHeader current="apply" />
                <main className="flex-1">
                    <div className="ss-container max-w-2xl py-24 text-center md:py-32">
                        <p className="ss-eyebrow">Thank you</p>
                        <h1 className="mt-5 text-3xl font-semibold md:text-4xl">입점 신청이 접수되었습니다</h1>
                        <p className="mt-6 text-base leading-relaxed text-gray-600">
                            제출하신 내용을 검토한 뒤, 입력하신 이메일({values.managerEmail.trim()})로 결과를 안내드리겠습니다.
                        </p>

                        <div className="mt-10 border border-season-brown p-6 text-left md:p-8">
                            <h2 className="text-base font-semibold">영상을 아직 보내지 않으셨다면</h2>
                            <p className="mt-3 text-sm leading-relaxed text-gray-600">
                                숙소 영상은 아래 주소로 메일에 첨부해 보내주세요. 메일 제목에 <b className="text-season-ink">스테이 이름</b>을 적어주시면 신청서와 함께 확인합니다.
                            </p>
                            <a href={videoMailHref} className="mt-4 inline-block text-base font-semibold underline underline-offset-4">
                                {SUPPORT_EMAIL}
                            </a>
                        </div>

                        <a href="/stayseason" className="ss-btn ss-btn-dark mt-10">
                            시즌 소개로 돌아가기
                        </a>
                    </div>
                </main>
                <SiteFooter />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-season-beige">
            <SiteHeader current="apply" />

            <main>
                <div className="border-b border-season-line">
                    <div className="ss-container max-w-3xl py-14 md:py-20">
                        <p className="ss-eyebrow">Apply</p>
                        <h1 className="mt-4 text-3xl font-semibold md:text-4xl">입점 신청</h1>
                        <p className="mt-5 text-base leading-relaxed text-gray-600">아래 내용을 작성해 제출해 주세요. 검토 후 담당자 이메일로 결과를 안내드립니다.</p>
                        <p className="mt-2 text-sm text-gray-400">
                            <span className="text-red-500">*</span> 표시는 필수 입력 항목입니다.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} noValidate className="ss-container max-w-3xl pb-24">
                    {/* 자동 입력 봇 차단용 — 사람에게는 보이지 않습니다 */}
                    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                        <label>
                            팩스 번호
                            <input ref={honeypotRef} type="text" name="fax" tabIndex={-1} autoComplete="off" />
                        </label>
                    </div>

                    {/* 01 담당자 정보 */}
                    <Section no="01" title="담당자 정보">
                        <Field name="managerName" label="담당자 성함" required error={errors.managerName}>
                            <input id="managerName" type="text" value={values.managerName} onChange={(e) => setValue('managerName', e.target.value)} maxLength={50} autoComplete="name" className={inputClass('managerName')} />
                        </Field>
                        <Field name="managerPhone" label="담당자 전화번호" required error={errors.managerPhone}>
                            <input id="managerPhone" type="tel" value={values.managerPhone} onChange={(e) => setValue('managerPhone', e.target.value)} maxLength={30} placeholder="010-0000-0000" autoComplete="tel" className={inputClass('managerPhone')} />
                        </Field>
                        <Field name="managerEmail" label="담당자 이메일" required error={errors.managerEmail} hint="검토 결과를 이 주소로 안내드립니다.">
                            <input id="managerEmail" type="email" value={values.managerEmail} onChange={(e) => setValue('managerEmail', e.target.value)} maxLength={100} placeholder="name@example.com" autoComplete="email" className={inputClass('managerEmail')} />
                        </Field>
                        <Field name="experience" label="숙박업 경험 유무" required error={errors.experience} group>
                            <Choice
                                name="experience"
                                value={values.experience}
                                onChange={(v) => setValue('experience', v as FormValues['experience'])}
                                options={[
                                    { value: 'NONE', label: '경험 없음' },
                                    { value: 'HAS', label: '경험 있음' },
                                ]}
                            />
                        </Field>
                    </Section>

                    {/* 02 스테이 정보 */}
                    <Section no="02" title="스테이 정보">
                        <Field name="stayName" label="스테이 이름" required error={errors.stayName}>
                            <input id="stayName" type="text" value={values.stayName} onChange={(e) => setValue('stayName', e.target.value)} maxLength={100} className={inputClass('stayName')} />
                        </Field>
                        <Field name="stayAddress" label="스테이 주소" required error={errors.stayAddress}>
                            <input id="stayAddress" type="text" value={values.stayAddress} onChange={(e) => setValue('stayAddress', e.target.value)} maxLength={255} placeholder="도로명 주소를 입력해주세요" autoComplete="street-address" className={inputClass('stayAddress')} />
                        </Field>
                        <Field name="website" label="웹사이트 및 SNS 주소" error={errors.website}>
                            <input id="website" type="text" value={values.website} onChange={(e) => setValue('website', e.target.value)} maxLength={500} placeholder="홈페이지, 인스타그램 등" className={inputClass('website')} />
                        </Field>
                        <Field name="stayIntro" label="스테이 소개" required error={errors.stayIntro} hint="공간의 기획 의도, 객실 구성, 주변 환경 등을 자유롭게 적어주세요.">
                            <textarea id="stayIntro" value={values.stayIntro} onChange={(e) => setValue('stayIntro', e.target.value)} maxLength={5000} rows={7} className={`${inputClass('stayIntro')} resize-y`} />
                            <div className="mt-1 text-right text-xs text-gray-400">{values.stayIntro.length.toLocaleString()} / 5,000</div>
                        </Field>
                    </Section>

                    {/* 03 사업자 정보 */}
                    <Section no="03" title="사업자 정보">
                        <Field name="businessRegistered" label="숙박업 사업자 등록 여부" required error={errors.businessRegistered} group>
                            <Choice
                                name="businessRegistered"
                                value={values.businessRegistered}
                                onChange={(v) => setValue('businessRegistered', v as FormValues['businessRegistered'])}
                                options={[
                                    { value: 'PREPARING', label: '준비 중' },
                                    { value: 'REGISTERED', label: '등록 완료' },
                                ]}
                            />
                        </Field>
                        <Field name="businessType" label="업종" required error={errors.businessType}>
                            <select id="businessType" value={values.businessType} onChange={(e) => setValue('businessType', e.target.value)} className={`${inputClass('businessType')} ${values.businessType ? '' : 'text-gray-400'}`}>
                                <option value="">업종을 선택해주세요</option>
                                {BUSINESS_TYPES.map((type) => (
                                    <option key={type} value={type} className="text-season-ink">
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </Section>

                    {/* 04 이미지 및 영상 */}
                    <Section no="04" title="이미지 및 영상">
                        <div id="field-images">
                            <div className="ss-label">
                                이미지 첨부 <span className="ml-1 font-normal text-gray-400">선택 · 최대 {MAX_IMAGES}장, 한 장당 10MB 이하</span>
                            </div>
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragging(true);
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragging(false);
                                    addImages(e.dataTransfer.files);
                                }}
                                className={`border border-dashed px-6 py-10 text-center transition-colors ${dragging ? 'border-season-brown bg-white' : 'border-season-line bg-white/60'}`}
                            >
                                <p className="text-sm text-gray-600">이미지를 여기로 끌어다 놓거나</p>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-3 border border-season-brown px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-season-brown hover:text-white">
                                    파일 선택
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={IMAGE_TYPES.join(',')}
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files) addImages(e.target.files);
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                            {errors.images && <p className="ss-error">{errors.images}</p>}

                            {images.length > 0 && (
                                <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                                    {images.map((file, index) => (
                                        <li key={`${file.name}-${index}`} className="relative aspect-square overflow-hidden rounded-[3px] bg-season-sand">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={previews[index]} alt={file.name} className="h-full w-full object-cover" />
                                            <button type="button" onClick={() => removeImage(index)} aria-label={`${file.name} 삭제`} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center bg-black/70 text-sm text-white hover:bg-black">
                                                ×
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="border border-season-brown p-6">
                            <h3 className="text-base font-semibold">영상은 메일로 보내주세요</h3>
                            <p className="mt-3 text-sm leading-relaxed text-gray-600">
                                영상은 용량이 커서 이 페이지에서 받지 않습니다. 신청서 제출 후 아래 주소로 <b className="text-season-ink">메일에 첨부</b>해 보내주세요. 메일 제목에 스테이 이름을 적어주시면 신청서와 함께 확인합니다.
                            </p>
                            <a href={videoMailHref} className="mt-3 inline-block text-base font-semibold underline underline-offset-4">
                                {SUPPORT_EMAIL}
                            </a>
                            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-500">
                                <li>실내 조명을 모두 켜고, 모든 공간이 나오도록 촬영해 주세요.</li>
                                <li>외관과 주변 환경, 실내 모습이 모두 드러나면 좋습니다.</li>
                                <li>용량이 커서 첨부가 어려우면 클라우드 공유 링크를 메일로 보내주셔도 됩니다.</li>
                            </ul>
                        </div>
                    </Section>

                    {/* 동의 */}
                    <div id="field-privacyAgreed" className="mt-14 border-t border-season-brown pt-8">
                        <h2 className="text-base font-semibold">
                            개인정보 수집 및 이용 동의 <span className="text-red-500">*</span>
                        </h2>
                        <div className="mt-4 rounded-[3px] bg-season-sand p-5 text-sm leading-relaxed text-gray-600">
                            <p>· 수집 항목: 담당자 정보(성함, 전화번호, 이메일), 스테이 정보, 사업자 등록 여부 및 업종, 첨부 자료</p>
                            <p>· 수집 목적: 입점 가능 여부 검토 및 문의 대응</p>
                            <p>· 보유 기간: 검토 완료 후 3개월간 보관 후 파기</p>
                            <p className="mt-2 text-gray-500">동의를 거부하실 수 있으나, 거부 시 입점 신청이 접수되지 않습니다.</p>
                        </div>
                        <label className="mt-4 flex cursor-pointer items-center gap-3">
                            <input type="checkbox" checked={values.privacyAgreed} onChange={(e) => setValue('privacyAgreed', e.target.checked)} className="h-5 w-5 accent-season-brown" />
                            <span className="text-sm font-semibold">개인정보 수집 및 이용에 동의합니다.</span>
                        </label>
                        {errors.privacyAgreed && <p className="ss-error">{errors.privacyAgreed}</p>}
                    </div>

                    {submitError && (
                        <div role="alert" className="mt-8 whitespace-pre-line border border-red-500 bg-red-50 p-4 text-sm text-red-600">
                            {submitError}
                        </div>
                    )}

                    <button type="submit" disabled={submitting} className="ss-btn ss-btn-dark mt-10 w-full">
                        {submitting ? '제출하는 중입니다...' : '제출하기'}
                    </button>
                </form>
            </main>

            <SiteFooter />
        </div>
    );
}

function Section({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
    return (
        <section className="mt-14">
            <div className="flex items-baseline gap-3 border-b border-season-brown pb-4">
                <span className="ss-en text-sm font-medium text-season-accent">{no}</span>
                <h2 className="text-xl font-semibold">{title}</h2>
            </div>
            <div className="mt-8 space-y-7">{children}</div>
        </section>
    );
}

function Field({ name, label, required, error, hint, group, children }: { name: string; label: string; required?: boolean; error?: string; hint?: string; group?: boolean; children: React.ReactNode }) {
    const labelContent = (
        <>
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
        </>
    );

    return (
        <div id={`field-${name}`}>
            {/* 선택형(라디오)은 묶음 제목, 입력형은 입력칸과 연결된 label */}
            {group ? (
                <div className="ss-label">{labelContent}</div>
            ) : (
                <label htmlFor={name} className="ss-label">
                    {labelContent}
                </label>
            )}
            {children}
            {hint && !error && <p className="mt-1.5 text-sm text-gray-400">{hint}</p>}
            {error && <p className="ss-error">{error}</p>}
        </div>
    );
}

function Choice({ name, value, onChange, options }: { name: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {options.map((option) => {
                const selected = value === option.value;
                return (
                    <label key={option.value} className={`cursor-pointer border px-4 py-3 text-center text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-season-brown focus-within:ring-offset-2 ${selected ? 'border-season-brown bg-season-brown text-white' : 'border-season-line bg-white text-gray-600 hover:border-season-brown'}`}>
                        <input type="radio" name={name} value={option.value} checked={selected} onChange={() => onChange(option.value)} className="sr-only" />
                        {option.label}
                    </label>
                );
            })}
        </div>
    );
}
