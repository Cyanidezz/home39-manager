import Icon from "@/components/Icon";
import { formatMoney } from "@/lib/format";
import type { BillingRates } from "@/lib/billingRates";
import { InfoCard, InfoRows } from "./InfoCard";

type Props = {
  room: {
    monthly_rent: number | string | null;
    occupant_count: number;
  };
  rates: BillingRates;
};

export default function RoomInfoCard({ room, rates }: Props) {
  return (
    <InfoCard icon={<Icon name="home" className="h-5 w-5" />} title="ข้อมูลห้อง">
      <InfoRows
        rows={[
          { label: "ค่าเช่า", value: `${formatMoney(room.monthly_rent)} บาท/เดือน` },
          { label: "จำนวนผู้พัก", value: `${room.occupant_count} คน` },
          {
            label: "ค่าน้ำ",
            value: `${room.occupant_count} × ${rates.water} = ${(room.occupant_count * rates.water).toLocaleString("th-TH")} บาท`,
          },
          { label: "ค่าไฟ", value: `${rates.electricity} บาท/หน่วย` },
        ]}
      />
    </InfoCard>
  );
}
