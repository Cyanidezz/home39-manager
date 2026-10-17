import Link from "next/link";
import Icon from "@/components/Icon";
import { formatMoney, formatNumber, formatThaiDate, formatThaiMonth } from "@/lib/format";
import { EmptyNote, InfoCard, InfoRows, secondaryButton } from "./InfoCard";

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
  return value != null ? `${formatMoney(value)} บาท` : "-";
}

export default function TenantCard({ roomCode, tenants }: Props) {
  const icon = <Icon name="user" className="h-5 w-5" />;

  if (tenants.length === 0) {
    return (
      <InfoCard icon={icon} title="ผู้เช่า">
        <EmptyNote>ยังไม่มีข้อมูลผู้เช่า</EmptyNote>
      </InfoCard>
    );
  }

  return (
    <>
      {tenants.map((tenant) => (
        <InfoCard
          key={tenant.id}
          icon={icon}
          title="ผู้เช่า"
          footer={
            <Link href={`/rooms/${roomCode}/tenant/${tenant.id}/edit`} className={secondaryButton}>
              <Icon name="pencil" className="h-4 w-4" /> แก้ไขข้อมูลผู้เช่า
            </Link>
          }
        >
          <p className="mb-3 text-base font-semibold">{tenant.full_name}</p>
          <InfoRows
            rows={[
              { label: "โทร", value: tenant.phone || "-" },
              { label: "เริ่มเช่า", value: formatThaiDate(tenant.move_in_date) },
              { label: "ค่าเช่าล่วงหน้า", value: baht(tenant.advance_rent_amount) },
              { label: "ค่ามัดจำ", value: baht(tenant.deposit_amount) },
              {
                label: "มิเตอร์ไฟตอนเข้าอยู่",
                value:
                  tenant.initial_electricity_meter != null
                    ? formatNumber(tenant.initial_electricity_meter)
                    : "ยังไม่ได้ระบุ",
              },
            ]}
          />

          {tenant.planned_move_out_date && (
            <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
              <p className="font-semibold">
                ผู้เช่าแจ้งย้ายออก {formatThaiDate(tenant.planned_move_out_date)}
              </p>
              <p className="mt-1">แจ้งเมื่อ {formatThaiDate(tenant.termination_notice_date)}</p>
              <p className="mt-1">
                ค่าเช่าเดือน {formatThaiMonth(tenant.termination_notice_date)} ใช้ค่าเช่าล่วงหน้า
              </p>
            </div>
          )}
        </InfoCard>
      ))}
    </>
  );
}
