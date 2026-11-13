import Link from 'next/link';

export default function ThankYouPage() {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="max-w-2xl mx-auto px-4 py-12 text-center">
                <div className="mb-8">
                    <div className="text-6xl mb-6">
                        <img src="/logo.png" alt="check" className="w-[300px] h-full mb-10 mx-auto" />
                    </div>
                    <h1 className="text-4xl font-bold text-black mb-4">제출이 완료되었습니다</h1>
                    <p className="text-xl text-gray-600 mb-8">
                        입력하신 정보가 성공적으로 접수되었습니다. <br />
                        검토 후 필요한 경우 별도로 안내드리겠습니다.
                    </p>
                </div>

                <Link href="/" className="inline-block px-8 py-4 bg-black text-white text-lg font-semibold rounded-lg hover:bg-gray-800 transition-all">
                    홈으로 돌아가기
                </Link>
            </div>
        </div>
    );
}
