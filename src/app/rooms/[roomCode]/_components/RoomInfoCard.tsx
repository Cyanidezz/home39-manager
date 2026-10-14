type Props = {
  room: {
    monthly_rent: number | string | null;
    occupant_count: number;
  };
};

export default function RoomInfoCard({ room }: Props) {
  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">🏠 ข้อมูลห้อง</h2>

      <div className="mt-5 space-y-3">
        <p>
          ค่าเช่า{" "}
          <strong>{Number(room.monthly_rent).toLocaleString()} บาท/เดือน</strong>
        </p>

        <p>
          จำนวนผู้พัก <strong>{room.occupant_count} คน</strong>
        </p>

        <p>
          ค่าน้ำ{" "}
          <strong>
            {room.occupant_count} × 150 ={" "}
            {(room.occupant_count * 150).toLocaleString()} บาท
          </strong>
        </p>

        <p>
          ค่าไฟ <strong>7 บาท/หน่วย</strong>
        </p>
      </div>
    </section>
  );
}
