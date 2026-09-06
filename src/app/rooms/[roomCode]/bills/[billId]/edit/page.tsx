import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BillEditForm from "./BillEditForm";

type Props = {
  params: Promise<{ roomCode: string; billId: string }>;
};

export default async function EditBillPage({ params }: Props) {
  const { roomCode, billId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: bill, error } = await supabase
    .from("bills")
    .select(`
      id, billing_year, billing_month, rent_amount, occupant_count,
      water_rate_per_person, previous_meter, current_meter,
      electricity_rate, due_date,
      rooms (room_code),
      bill_items (id, item_name, amount, created_at)
    `)
    .eq("id", billId)
    .single();

  const room = Array.isArray(bill?.rooms) ? bill?.rooms[0] : bill?.rooms;
  if (error || !bill || room?.room_code !== roomCode) notFound();

  const items = [...(bill.bill_items || [])]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((item) => ({ name: item.item_name, amount: String(item.amount) }));

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href={`/rooms/${roomCode}/bills/${billId}`} className="text-sm text-gray-500 hover:text-black">
          ← กลับรายละเอียดบิล
        </Link>
        <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold">แก้ไขข้อมูลบิล</h1>
          <p className="mt-2 text-gray-500">ห้อง {roomCode}</p>
          <BillEditForm
            billId={bill.id}
            roomCode={roomCode}
            initial={{
              billingYear: bill.billing_year,
              billingMonth: bill.billing_month,
              rentAmount: String(bill.rent_amount),
              occupantCount: bill.occupant_count,
              waterRate: String(bill.water_rate_per_person),
              previousMeter: String(bill.previous_meter ?? ""),
              currentMeter: String(bill.current_meter ?? ""),
              electricityRate: String(bill.electricity_rate),
              dueDate: bill.due_date || "",
              items,
            }}
          />
        </div>
      </div>
    </main>
  );
}
