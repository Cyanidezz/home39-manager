import Icon from "@/components/Icon";
import { formatMoney } from "@/lib/format";
import { InfoCard, InfoRows } from "./InfoCard";

type Props = {
  room: {
    monthly_rent: number | string | null;
    occupant_count: number;
  };
};

const WATER_RATE = 150;

export default function RoomInfoCard({ room }: Props) {
  return (
    <InfoCard icon={<Icon name="home" className="h-5 w-5" />} title="ข้อมูลห้อง">
      <InfoRows
        rows={[
          { label: "ค่าเช่า", value: `${formatMoney(room.monthly_rent)} บาท/เดือน` },
          { label: "จำนวนผู้พัก", value: `${room.occupant_count} คน` },
          {
            label: "ค่าน้ำ",
            value: `${room.occupant_count} × ${WATER_RATE} = ${(room.occupant_count * WATER_RATE).toLocaleString("th-TH")} บาท`,
          },
          { label: "ค่าไฟ", value: "7 บาท/หน่วย" },
        ]}
      />
    </InfoCard>
  );
}
