import Link from "next/link";
import { formatThaiDate, formatThaiMonth } from "@/lib/format";
import Icon from "@/components/Icon";

export type RoomTenant = {
  id: string;
  full_name: string;
  phone: string | null;
  move_in_date: string | null;
  planned_move_out_date: string | null;
  termination_notice_date: string | null;
  advance_rent_amount: number | string | null;
  deposit_amount: number | string | null;
  initial_electricity_meter: number | string | null;
};

type Props = {
  roomCode: string;
  tenants: RoomTenant[];
};

function baht(value: number | string | null) {
  return value != null ? `${Number(value).toLocaleString()} บาท` : "-";
}

export default function TenantCard({ roomCode, tenants }: Props) {
  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold"><Icon name="user" /> ผู้เช่า</h2>

      <div className="mt-5">
        {tenants.length > 0 ? (
          tenants.map((tenant) => (
            <div key={tenant.id}>
              <p className="text-lg font-medium">{tenant.full_name}</p>

              <p className="mt-2 text-sand-600">โทร: {tenant.phone || "-"}</p>

              <p className="text-sand-600">
                เริ่มเช่า: {formatThaiDate(tenant.move_in_date)}
              </p>

              <div className="mt-4 grid gap-2 rounded-xl bg-sand-50 p-4 text-sm text-sand-700 sm:grid-cols-2">
                <p>
                  ค่าเช่าล่วงหน้า <strong>{baht(tenant.advance_rent_amount)}</strong>
                </p>
                <p>
                  ค่ามัดจำ <strong>{baht(tenant.deposit_amount)}</strong>
                </p>
                <p className="sm:col-span-2">
                  มิเตอร์ไฟตอนเข้าอยู่{" "}
                  <strong>{tenant.initial_electricity_meter ?? "ยังไม่ได้ระบุ"}</strong>
                </p>
              </div>

              <Link
                href={`/rooms/${roomCode}/tenant/${tenant.id}/edit`}
                className="mt-4 inline-block rounded-lg border px-4 py-2 text-sm hover:bg-sand-50"
              >
                <Icon name="pencil" /> แก้ไขข้อมูลผู้เช่า
              </Link>

              {tenant.planned_move_out_date && (
                <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                  <p className="font-semibold">
                    ผู้เช่าแจ้งย้ายออก {formatThaiDate(tenant.planned_move_out_date)}
                  </p>
                  <p className="mt-1">
                    แจ้งเมื่อ {formatThaiDate(tenant.termination_notice_date)}
                  </p>
                  <p className="mt-1">
                    ค่าเช่าเดือน {formatThaiMonth(tenant.termination_notice_date)} ใช้ค่าเช่าล่วงหน้า
                  </p>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-sand-500">ยังไม่มีข้อมูลผู้เช่า</p>
        )}
      </div>
    </section>
  );
}
