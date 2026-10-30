'use client';

import { ClipboardEvent, KeyboardEvent, useState } from 'react';

//요일별 요금
export interface SeasonPrice {
    weekday: string;
    fri: string;
    sat: string;
    sun: string;
}

//객실 (제출 JSON 의 rooms 항목 - 구조 변경 시 관리자 상세보기/엑셀에도 영향)
export interface Room {
    id: string;
    name: string;
    desc: string;
    capacity: { standard: string; max: string }; // 인원
    type: string;
    amenities: string; // 쉼표로 구분
    priceLow: SeasonPrice; // 비수기
    priceMid: SeasonPrice; // 준성수기
    priceHigh: SeasonPrice; // 성수기
}

type SeasonKey = 'priceLow' | 'priceMid' | 'priceHigh';
type DayKey = keyof SeasonPrice;

const SEASONS: { key: SeasonKey; label: string }[] = [
    { key: 'priceLow', label: '비수기' },
    { key: 'priceMid', label: '준성수기' },
    { key: 'priceHigh', label: '성수기' },
];

const DAYS: { key: DayKey; label: string }[] = [
    { key: 'weekday', label: '주중' },
    { key: 'fri', label: '금' },
    { key: 'sat', label: '토' },
    { key: 'sun', label: '일' },
];

//자주 쓰는 객실 형태 / 비품 (버튼으로 선택)
const ROOM_TYPE_PRESETS = ['독채형', '복층형', '원룸형', '투룸형', '침실분리형', '온돌형'];
const AMENITY_PRESETS = ['TV', '에어컨', '냉장고', '전기포트', '헤어드라이어', '와이파이', '인덕션', '전자레인지', '세탁기', '욕조', '커피머신', '바비큐 그릴', '수건', '어메니티'];

const toDigits = (value: string) => value.replace(/[^0-9]/g, '');
//천 단위 콤마 (예전 데이터가 숫자형일 수 있어 문자열로 변환)
const formatNumber = (value: string | number) => (value ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '');
const splitAmenities = (value: string) =>
    value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

//빈 객실
export const createEmptyRoom = (id: string): Room => ({
    id,
    name: '',
    desc: '',
    capacity: { standard: '', max: '' },
    type: '',
    amenities: '',
    priceLow: { weekday: '', fri: '', sat: '', sun: '' },
    priceMid: { weekday: '', fri: '', sat: '', sun: '' },
    priceHigh: { weekday: '', fri: '', sat: '', sun: '' },
});

//미입력 필수 항목 (portfolio/[id]/page.tsx 의 객실 검증 조건과 같게 유지)
const REQUIRED_FIELD_COUNT = 5;
const isFilled = (value: unknown) => String(value ?? '').trim() !== '';
export const getMissingRoomFields = (room: Room): string[] => {
    const missing: string[] = [];
    if (!isFilled(room.name)) missing.push('객실명');
    if (!isFilled(room.desc)) missing.push('객실 설명');
    if (!isFilled(room.capacity?.standard) || !isFilled(room.capacity?.max)) missing.push('인원');
    if (!isFilled(room.type)) missing.push('객실 형태');
    if (SEASONS.some(({ key }) => DAYS.some(({ key: day }) => !isFilled(room[key]?.[day])))) missing.push('요금');
    return missing;
};

interface RoomCardProps {
    room: Room;
    index: number;
    readOnly: boolean;
    canRemove: boolean;
    //처음 펼침 여부 (기본: 미완성 객실만 펼침)
    defaultOpen?: boolean;
    onChange: (room: Room) => void;
    onRemove: () => void;
    onDuplicate: () => void;
}

export default function RoomCard({ room, index, readOnly, canRemove, defaultOpen, onChange, onRemove, onDuplicate }: RoomCardProps) {
    const missing = getMissingRoomFields(room);
    const isComplete = missing.length === 0;
    const [open, setOpen] = useState(defaultOpen ?? !isComplete);

    const update = (patch: Partial<Room>) => onChange({ ...room, ...patch });

    //요금 여러 칸 변경 (기존 값을 덮어쓰게 되면 확인)
    const applyPrices = (changes: { season: SeasonKey; day: DayKey; value: string }[]) => {
        if (changes.length === 0) return;
        const overwrites = changes.some(({ season, day, value }) => room[season][day] && room[season][day] !== value);
        if (overwrites && !confirm('이미 입력된 요금을 덮어씁니다. 계속하시겠습니까?')) return;

        const next = { priceLow: { ...room.priceLow }, priceMid: { ...room.priceMid }, priceHigh: { ...room.priceHigh } };
        changes.forEach(({ season, day, value }) => {
            next[season][day] = value;
        });
        update(next);
    };

    //주중 요금 → 금·토·일
    const fillWeekdayToAll = () => {
        const changes = SEASONS.flatMap(({ key: season }) => {
            const value = room[season].weekday;
            if (!value) return [];
            return (['fri', 'sat', 'sun'] as DayKey[]).map((day) => ({ season, day, value }));
        });
        if (changes.length === 0) return alert('먼저 주중 요금을 입력해주세요.');
        applyPrices(changes);
    };

    //비수기 요금 → 준성수기·성수기
    const fillLowToOtherSeasons = () => {
        if (DAYS.every(({ key }) => !room.priceLow[key])) return alert('먼저 비수기 요금을 입력해주세요.');
        const changes = (['priceMid', 'priceHigh'] as SeasonKey[]).flatMap((season) => DAYS.map(({ key: day }) => ({ season, day, value: room.priceLow[day] })));
        applyPrices(changes);
    };

    //엑셀 등에서 표 형태로 복사한 요금 붙여넣기 (붙여넣은 칸 기준으로 오른쪽·아래로 채움)
    const handlePricePaste = (e: ClipboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
        const text = e.clipboardData.getData('text');
        if (!text) return;
        e.preventDefault();

        const rows = text
            .replace(/\r/g, '')
            .split('\n')
            .filter((line) => line.trim() !== '')
            .map((line) => line.split('\t'));

        const changes: { season: SeasonKey; day: DayKey; value: string }[] = [];
        rows.forEach((cells, r) =>
            cells.forEach((cell, c) => {
                const season = SEASONS[rowIndex + r];
                const day = DAYS[colIndex + c];
                if (season && day) changes.push({ season: season.key, day: day.key, value: toDigits(cell) });
            }),
        );

        //한 칸 붙여넣기는 확인 없이 바로 반영
        if (changes.length === 1) {
            const { season, day, value } = changes[0];
            //숫자가 없는 글자를 붙여넣은 경우 기존 값 유지
            if (!value) return;
            update({ [season]: { ...room[season], [day]: value } } as Partial<Room>);
            return;
        }
        applyPrices(changes);
    };

    //비품 버튼 선택/해제
    const amenityList = splitAmenities(String(room.amenities ?? ''));
    const toggleAmenity = (item: string) => {
        const next = amenityList.includes(item) ? amenityList.filter((a) => a !== item) : [...amenityList, item];
        update({ amenities: next.join(', ') });
    };

    //인원 입력 (1 이상 정수만)
    const handleCapacityChange = (field: 'standard' | 'max', value: string) => {
        if (value === '' || (parseInt(value) > 0 && !isNaN(parseInt(value)))) {
            update({ capacity: { ...room.capacity, [field]: value } });
        }
    };
    const blockInvalidNumberKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '.') e.preventDefault();
    };

    const summary = [room.capacity.standard && room.capacity.max ? `기준 ${room.capacity.standard}명 / 최대 ${room.capacity.max}명` : '', room.type].filter(Boolean).join(' · ');

    return (
        <div className={`border rounded-lg ${isComplete ? 'border-gray-200' : 'border-gray-300'}`}>
            {/* 헤더 (클릭 시 접기/펼치기) */}
            <div className="flex items-center gap-3 p-4 cursor-pointer select-none" onClick={() => setOpen((prev) => !prev)}>
                <span className="inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-full bg-black text-white text-xs">{index + 1}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-black truncate">{room.name?.trim() || `객실 ${index + 1}`}</p>
                        {isComplete ? (
                            <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">✓ 입력완료</span>
                        ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                                필수 {REQUIRED_FIELD_COUNT - missing.length}/{REQUIRED_FIELD_COUNT}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{!isComplete ? `미입력: ${missing.join(', ')}` : summary}</p>
                </div>

                {!readOnly && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={onDuplicate} className="text-xs px-2 py-1 rounded border border-gray-300 hover:border-black transition-colors">
                            복사
                        </button>
                        {canRemove && (
                            <button type="button" onClick={onRemove} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
                                삭제
                            </button>
                        )}
                    </div>
                )}
                <span className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
                    ▾
                </span>
            </div>

            {open && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
                    <div>
                        <label className="block font-semibold mb-1">객실명</label>
                        <p className="text-xs text-gray-500 mb-1">홈페이지 및 예약 페이지에 노출될 객실 이름을 입력해 주세요.</p>
                        <input type="text" value={room.name} disabled={readOnly} onChange={(e) => update({ name: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2" placeholder="예: 달빛방, 스테이 101호, 온돌 독채" />
                    </div>

                    <div>
                        <label className="block font-semibold mb-1">객실 설명</label>
                        <p className="text-xs text-gray-500 mb-1">객실의 분위기, 주요 특징, 보이는 풍경, 제공되는 서비스 등을 자유롭게 작성해 주세요.</p>
                        <textarea
                            value={room.desc}
                            disabled={readOnly}
                            onChange={(e) => update({ desc: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2"
                            rows={3}
                            placeholder="예: 따뜻한 우드 톤의 인테리어와 넓은 통창으로 숲 전망을 즐길 수 있으며, 프라이빗 바비큐와 조식 서비스가 제공됩니다."
                        />
                    </div>

                    <div>
                        <label className="block font-semibold mb-1">객실 인원</label>
                        <p className="text-xs text-gray-500 mb-1">해당 객실의 수용 인원을 입력해 주세요.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" min="1" value={room.capacity.standard} disabled={readOnly} onKeyDown={blockInvalidNumberKey} onChange={(e) => handleCapacityChange('standard', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2" placeholder="기준" />
                            <input type="number" min="1" value={room.capacity.max} disabled={readOnly} onKeyDown={blockInvalidNumberKey} onChange={(e) => handleCapacityChange('max', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2" placeholder="최대" />
                        </div>
                    </div>

                    <div>
                        <label className="block font-semibold mb-1">객실 형태</label>
                        <p className="text-xs text-gray-500 mb-1">해당하는 형태를 누르거나 직접 입력해 주세요.</p>
                        {!readOnly && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {ROOM_TYPE_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => update({ type: room.type === preset ? '' : preset })}
                                        className={`px-3 py-1 rounded-full border text-sm transition-colors ${room.type === preset ? 'bg-black border-black text-white' : 'border-gray-300 text-gray-600 hover:border-black'}`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        )}
                        <input type="text" value={room.type} disabled={readOnly} onChange={(e) => update({ type: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2" placeholder="예: 독채형, 복층 구조, 침실 분리형, 원룸형 등" />
                    </div>

                    <div>
                        <label className="block font-semibold mb-1">객실 비품</label>
                        <p className="text-xs text-gray-500 mb-1">있는 비품을 눌러 선택하고, 목록에 없는 비품은 아래에 쉼표(,)로 구분해 추가해 주세요.</p>
                        {!readOnly && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {AMENITY_PRESETS.map((item) => {
                                    const selected = amenityList.includes(item);
                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => toggleAmenity(item)}
                                            className={`px-3 py-1 rounded-full border text-sm transition-colors ${selected ? 'bg-black border-black text-white' : 'border-gray-300 text-gray-600 hover:border-black'}`}
                                        >
                                            {selected && '✓ '}
                                            {item}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <textarea
                            value={room.amenities}
                            disabled={readOnly}
                            onChange={(e) => update({ amenities: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg p-2"
                            rows={2}
                            placeholder="예: TV, 에어컨, 냉장고, 전기포트, 헤어드라이어 등"
                        />
                    </div>

                    <div>
                        <label className="block font-semibold mb-1">요금</label>
                        {!readOnly && (
                            <>
                                <p className="text-xs text-gray-500 mb-2">엑셀 요금표의 숫자 칸을 복사해 칸에 붙여넣으면 한 번에 입력됩니다.</p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <button type="button" onClick={fillWeekdayToAll} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:border-black transition-colors">
                                        주중 요금을 금·토·일에 똑같이
                                    </button>
                                    <button type="button" onClick={fillLowToOtherSeasons} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:border-black transition-colors">
                                        비수기 요금을 준성수기·성수기에 복사
                                    </button>
                                </div>
                            </>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[480px] border-separate border-spacing-1">
                                <thead>
                                    <tr>
                                        <th className="w-20" />
                                        {DAYS.map(({ key, label }) => (
                                            <th key={key} className="text-xs font-semibold text-gray-500 pb-1">
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {SEASONS.map(({ key: season, label }, rowIndex) => (
                                        <tr key={season}>
                                            <th className="text-left text-sm font-semibold text-gray-700 pr-2 whitespace-nowrap">{label}</th>
                                            {DAYS.map(({ key: day, label: dayLabel }, colIndex) => (
                                                <td key={day}>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        disabled={readOnly}
                                                        value={formatNumber(room[season][day])}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/,/g, '');
                                                            //숫자만 허용
                                                            if (value !== '' && !/^\d+$/.test(value)) return;
                                                            update({ [season]: { ...room[season], [day]: value } } as Partial<Room>);
                                                        }}
                                                        onPaste={(e) => handlePricePaste(e, rowIndex, colIndex)}
                                                        className="w-full border border-gray-300 rounded-lg p-2"
                                                        placeholder={dayLabel}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
