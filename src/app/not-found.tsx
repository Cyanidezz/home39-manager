import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-5xl font-bold text-blue-600">404</p>
        <h1 className="mt-4 text-2xl font-bold">ไม่พบหน้าที่ต้องการ</h1>
        <p className="mt-2 text-slate-500">
          ลิงก์อาจไม่ถูกต้อง หรือข้อมูลนี้ถูกลบไปแล้ว
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          กลับหน้าแรก
        </Link>
      </div>
    </main>
  );
}
