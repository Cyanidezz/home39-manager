import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data/session";
import { fetchBillHistory } from "@/lib/data/roomPages";
import { formatMoney, formatThaiDateShort, thaiMonths } from "@/lib/format";
import { getBillStatus } from "@/lib/billStatus";

type Props = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function BillsHistoryPage({ params }: Props) {
  const { roomCode } = await params;
  const { supabase } = await requireUser();

  const history = await fetchBillHistory(supabase, roomCode);
  if (!history) notFound();

  const { room, bills } = history;

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/rooms/${room.room_code}`}
          className="text-sm text-sand-500 hover:text-brand-700"
        >
          ← กลับห้อง {room.room_code}
        </Link>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">🧾 ประวัติบิล</h1>
            <p className="mt-2 text-sand-500">ห้อง {room.room_code}</p>
          </div>

          <Link
            href={`/rooms/${room.room_code}/bills/new`}
            className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700"
          >
            + ออกบิลใหม่
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-sm">
          {!bills || bills.length === 0 ? (
            <div className="px-6 py-10 text-center text-sand-500">
              ยังไม่มีประวัติบิล
            </div>
          ) : (
            bills.map((bill) => {
              const status = getBillStatus(bill.status);

              return (
                <Link
                  key={bill.id}
                  href={`/rooms/${room.room_code}/bills/${bill.id}`}
                  className="flex items-center justify-between gap-4 border-b px-6 py-5 last:border-b-0 hover:bg-sand-50"
                >
                  <div>
                    <p className="font-bold">
                      {thaiMonths[bill.billing_month - 1]}{" "}
                      {bill.billing_year + 543}
                    </p>

                    <p className="mt-1 text-sm text-sand-500">
                      กำหนดชำระ: {formatThaiDateShort(bill.due_date)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold">
                      {formatMoney(bill.total_amount)} บาท
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}
                    >
                      {status.text}
                    </span>

                    <span className="text-sand-400">›</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
