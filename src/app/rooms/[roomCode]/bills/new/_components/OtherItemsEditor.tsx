import type { OtherItem } from "@/lib/billing";

type Props = {
  items: OtherItem[];
  total: number;
  onAdd: () => void;
  onChange: (index: number, field: "name" | "amount", value: string) => void;
  onRemove: (index: number) => void;
};

export default function OtherItemsEditor({ items, total, onAdd, onChange, onRemove }: Props) {
  return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="font-medium">ค่าใช้จ่ายอื่น</label>
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
          >
            + เพิ่มรายการ
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-[1fr_160px_auto] gap-3">
              <input
                value={item.name}
                onChange={(e) => onChange(index, "name", e.target.value)}
                className="rounded-lg border px-4 py-3"
                placeholder="ชื่อรายการ เช่น ค่ากุญแจ"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.amount}
                onChange={(e) => onChange(index, "amount", e.target.value)}
                className="rounded-lg border px-4 py-3 text-right"
                placeholder="จำนวนเงิน"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-lg border px-3 text-slate-500 hover:bg-red-50 hover:text-red-600"
                title="ลบรายการ"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <span className="text-sm text-slate-600">
            รวมค่าใช้จ่ายอื่น{" "}
            <strong className="text-black">
              {total.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} บาท
            </strong>
          </span>
        </div>
      </div>
  );
}
