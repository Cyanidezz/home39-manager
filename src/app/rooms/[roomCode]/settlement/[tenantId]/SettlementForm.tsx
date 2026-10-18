"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bangkokDate, formatMoney, formatThaiMonth } from "@/lib/format";
import {
  electricityDeduction,
  hasInvalidDeduction,
  itemsTotal,
  settlementTotals,
  suggestedWater,
  type DeductionItem,
} from "@/lib/settlement";
import type { BillingRates } from "@/lib/billingRates";
import { primaryButton, secondaryButton } from "../../_components/InfoCard";

type OutstandingBill = { id: string; year: number; month: number; amount: number; status: string };

type SavedSettlement = {
  status: string;
  finalMeter: number | string | null;
  electricity: number;
  water: number;
  items: { name: string; amount: number }[];
  note: string | null;
  refund: number;
  outstandingSaved: number;
  refundedOn: string | null;
  reference: string | null;
  hasSlip: boolean;
};

type Props = {
  tenantId: string;
  deposit: number;
  previousMeter: number | null;
  rates: BillingRates;
  lastOccupants: number | null;
  outstandingBills: OutstandingBill[];
  pendingCheckCount: number;
  settlement: SavedSettlement | null;
  slipUrl: string | null;
};

const statusLabel: Record<string, string> = { unpaid: "ค้างชำระ", overdue: "เกินกำหนด", rejected: "สลิปไม่ผ่าน" };
const input = "w-full rounded-lg border border-sand-300 bg-white px-3 py-2";
const cardClass = "rounded-2xl border border-sand-200 bg-white p-6 shadow-sm";

function toRows(items: { name: string; amount: number }[]): DeductionItem[] {
  return items.length ? items.map((item) => ({ name: item.name, amount: String(item.amount) })) : [{ name: "", amount: "" }];
}

const baht = (value: number) => `${formatMoney(value)} บาท`;

export default function SettlementForm({
  tenantId, deposit, previousMeter, rates, lastOccupants, outstandingBills, pendingCheckCount, settlement, slipUrl,
}: Props) {
  const router = useRouter();
  const closed = settlement?.status === "closed";

  const [finalMeter, setFinalMeter] = useState(settlement?.finalMeter != null ? String(settlement.finalMeter) : "");
  const [electricity, setElectricity] = useState(settlement ? String(settlement.electricity) : "");
  const [electricityEdited, setElectricityEdited] = useState(Boolean(settlement));
  const [water, setWater] = useState(settlement ? String(settlement.water) : String(suggestedWater(lastOccupants, rates.water)));
  const [items, setItems] = useState<DeductionItem[]>(toRows(settlement?.items ?? []));
  const [note, setNote] = useState(settlement?.note ?? "");
  const [refundedOn, setRefundedOn] = useState(bangkokDate());
  const [reference, setReference] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string | null>(settlement ? "loaded" : null);

  const outstandingTotal = useMemo(() => outstandingBills.reduce((sum, bill) => sum + bill.amount, 0), [outstandingBills]);
  const electricityNumber = Number(electricity) || 0;
  const waterNumber = Number(water) || 0;
  const { deductions, refund } = settlementTotals({
    deposit, electricity: electricityNumber, water: waterNumber, items: itemsTotal(items), outstandingBills: outstandingTotal,
  });

  // The figures as they would be saved; the transfer step is only offered for what is saved.
  const snapshot = JSON.stringify({ finalMeter, electricity: electricityNumber, water: waterNumber, items: items.filter((i) => i.name.trim() || i.amount), note });
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(settlement ? snapshot : null);
  const dirty = savedSnapshot !== snapshot;
  const refundChangedSinceSave = settlement != null && !dirty && Math.round(refund * 100) !== Math.round(settlement.refund * 100);

  function changeMeter(value: string) {
    setFinalMeter(value);
    if (!electricityEdited) setElectricity(String(electricityDeduction(previousMeter, value, rates.electricity)));
  }

  function updateItem(index: number, patch: Partial<DeductionItem>) {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function call(method: "PUT" | "POST" | "DELETE", body?: unknown) {
    const response = await fetch(`/api/tenants/${tenantId}/settlement`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(result.error || "ทำรายการไม่สำเร็จ");
    return result;
  }

  async function save() {
    setError("");
    if (hasInvalidDeduction(items)) {
      setError("รายการหักแต่ละแถวต้องมีชื่อและจำนวนเงินมากกว่า 0");
      return;
    }
    if (electricity !== "" && !(Number(electricity) >= 0)) return setError("ค่าไฟต้องเป็นตัวเลขที่ไม่ติดลบ");
    if (water !== "" && !(Number(water) >= 0)) return setError("ค่าน้ำต้องเป็นตัวเลขที่ไม่ติดลบ");

    setSaving(true);
    try {
      await call("PUT", {
        finalMeter: finalMeter === "" ? null : Number(finalMeter),
        electricityAmount: electricityNumber,
        waterAmount: waterNumber,
        items: items.filter((i) => i.name.trim() !== "").map((i) => ({ name: i.name.trim(), amount: Number(i.amount) })),
        note,
      });
      setSavedSnapshot(snapshot);
      setSaved(new Date().toISOString());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function closeSettlement() {
    setError("");
    const transfer = settlement ? settlement.refund > 0 : refund > 0;
    if (transfer) {
      if (!refundedOn) return setError("กรุณาใส่วันที่โอนคืน");
      if (!slipFile && reference.trim() === "") return setError("กรุณาแนบสลิปการโอนคืน (หรืออย่างน้อยใส่เลขอ้างอิง)");
    }

    setClosing(true);
    let slipPath = "";
    const supabase = createClient();
    try {
      if (transfer && slipFile) {
        const extension = slipFile.name.includes(".") ? slipFile.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "jpg";
        slipPath = `${tenantId}/${crypto.randomUUID()}.${extension || "jpg"}`;
        const { error: uploadError } = await supabase.storage.from("refund-slips").upload(slipPath, slipFile, {
          contentType: slipFile.type || undefined,
          upsert: false,
        });
        if (uploadError) throw new Error(`อัปโหลดสลิปไม่สำเร็จ: ${uploadError.message}`);
      }
      try {
        await call("POST", { expectedRefund: settlement?.refund, refundedOn: transfer ? refundedOn : "", reference, slipPath });
      } catch (e) {
        if (slipPath) await supabase.storage.from("refund-slips").remove([slipPath]);
        throw e;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ปิดยอดไม่สำเร็จ");
    } finally {
      setClosing(false);
    }
  }

  async function reopen() {
    if (!window.confirm("เปิดใบสรุปเพื่อแก้ไข? ข้อมูลการโอนคืนและสลิปที่บันทึกไว้จะถูกล้างออกจากใบสรุป (บิลที่หักจากมัดจำไปแล้วยังเป็นจ่ายแล้ว)")) return;
    setError("");
    try {
      await call("DELETE");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เปิดใบสรุปไม่สำเร็จ");
    }
  }

  if (closed && settlement) {
    return (
      <section className={cardClass}>
        <h2 className="text-lg font-semibold">ปิดยอดแล้ว</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="เงินมัดจำ" value={baht(deposit)} />
          <Row label="หักค่าไฟ" value={baht(settlement.electricity)} />
          <Row label="หักค่าน้ำ" value={baht(settlement.water)} />
          {settlement.items.map((item, index) => (
            <Row key={index} label={`หัก ${item.name}`} value={baht(item.amount)} />
          ))}
          {settlement.outstandingSaved > 0 && <Row label="หักบิลค้างชำระ" value={baht(settlement.outstandingSaved)} />}
          <Row
            label={settlement.refund >= 0 ? "คืนให้ผู้เช่า" : "ผู้เช่ายังค้างชำระ"}
            value={baht(Math.abs(settlement.refund))}
            strong
          />
          {settlement.refund > 0 && (
            <>
              <Row label="วันที่โอนคืน" value={settlement.refundedOn ?? "-"} />
              {settlement.reference && <Row label="เลขอ้างอิง" value={settlement.reference} />}
              {settlement.hasSlip && (
                <Row
                  label="สลิปการโอน"
                  value={
                    slipUrl ? (
                      <a href={slipUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">
                        ดูสลิป
                      </a>
                    ) : (
                      "เปิดสลิปไม่ได้ กรุณาโหลดหน้าใหม่"
                    )
                  }
                />
              )}
            </>
          )}
        </dl>
        {settlement.note && <p className="mt-4 rounded-lg bg-sand-50 p-3 text-sm text-sand-600">{settlement.note}</p>}
        {settlement.refund < 0 && (
          <p className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-900">
            เงินมัดจำไม่พอหัก ผู้เช่ายังค้าง {baht(-settlement.refund)} กรุณาติดตามเก็บจากผู้เช่าแยกต่างหาก
          </p>
        )}
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6">
          <button type="button" onClick={reopen} className={secondaryButton}>
            เปิดแก้ไขใบสรุป
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {pendingCheckCount > 0 && (
        <p className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          มีบิล {pendingCheckCount} ใบที่ผู้เช่าส่งสลิปแล้วแต่ยังไม่ได้ตรวจ กรุณาตรวจสลิปให้เสร็จก่อนปิดยอด
        </p>
      )}

      <section className={cardClass}>
        <h2 className="text-lg font-semibold">1. ค่าน้ำ ค่าไฟ ช่วงสุดท้าย</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            เลขมิเตอร์ไฟตอนย้ายออก
            <input type="number" inputMode="decimal" min="0" step="any" value={finalMeter} onChange={(e) => changeMeter(e.target.value)} className={`${input} mt-1`} />
            <span className="mt-1 block text-xs font-normal text-sand-500">
              {previousMeter !== null ? `เลขล่าสุดที่บิลไว้ ${previousMeter} • ` : "ไม่พบเลขมิเตอร์ก่อนหน้า กรอกค่าไฟเอง • "}
              หน่วยละ 7 บาท
            </span>
          </label>
          <label className="block text-sm font-medium">
            ค่าไฟที่หัก (บาท)
            <input
              type="number" inputMode="decimal" min="0" step="any" value={electricity}
              onChange={(e) => { setElectricity(e.target.value); setElectricityEdited(true); }}
              className={`${input} mt-1`}
            />
            <span className="mt-1 block text-xs font-normal text-sand-500">คำนวณจากเลขมิเตอร์ แก้ตัวเลขเองได้</span>
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            ค่าน้ำที่หัก (บาท)
            <input type="number" inputMode="decimal" min="0" step="any" value={water} onChange={(e) => setWater(e.target.value)} className={`${input} mt-1 sm:max-w-xs`} />
            <span className="mt-1 block text-xs font-normal text-sand-500">
              เริ่มต้น 150 บาทต่อคน{lastOccupants != null ? ` × ${lastOccupants} คน (จำนวนคนในบิลล่าสุด)` : ""} แก้ตัวเลขเองได้
            </span>
          </label>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold">2. ความเสียหายและค่าใช้จ่ายอื่น</h2>
        <p className="mt-1 text-sm text-sand-500">ตรวจห้องแล้วประเมินค่าซ่อม ค่าทำความสะอาด กุญแจหาย ฯลฯ ใส่ทีละรายการ</p>
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-[1fr_8rem_auto] gap-2">
              <input placeholder="รายการ เช่น ผนังมีรอย ทาสีใหม่" value={item.name} onChange={(e) => updateItem(index, { name: e.target.value })} className={input} />
              <input type="number" inputMode="decimal" min="0" step="any" placeholder="บาท" value={item.amount} onChange={(e) => updateItem(index, { amount: e.target.value })} className={input} />
              <button
                type="button"
                onClick={() => setItems((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : [{ name: "", amount: "" }]))}
                className="rounded-lg border border-sand-300 px-3 text-sand-500 hover:bg-sand-50"
                aria-label="ลบรายการ"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setItems((rows) => [...rows, { name: "", amount: "" }])} className={`${secondaryButton} mt-3`}>
          + เพิ่มรายการ
        </button>
        <label className="mt-6 block text-sm font-medium">
          หมายเหตุการตรวจห้อง
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${input} mt-1`} />
        </label>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold">3. บิลที่ยังค้างชำระ</h2>
        {outstandingBills.length === 0 ? (
          <p className="mt-3 text-sm text-sand-500">ไม่มีบิลค้างชำระ</p>
        ) : (
          <ul className="mt-3 divide-y divide-sand-100 text-sm">
            {outstandingBills.map((bill) => (
              <li key={bill.id} className="flex justify-between py-2">
                <span>บิลเดือน {formatThaiMonth(`${bill.year}-${String(bill.month).padStart(2, "0")}`)} <span className="text-sand-500">({statusLabel[bill.status] ?? bill.status})</span></span>
                <span className="font-medium">{baht(bill.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-sand-500">บิลที่ค้างจะถูกหักจากเงินมัดจำ และตัดเป็นจ่ายแล้วเมื่อปิดยอด</p>
      </section>

      <section className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
        <h2 className="text-lg font-semibold">สรุป</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="เงินมัดจำ" value={baht(deposit)} />
          <Row label="หักค่าไฟ" value={baht(electricityNumber)} />
          <Row label="หักค่าน้ำ" value={baht(waterNumber)} />
          <Row label="หักความเสียหาย/อื่นๆ" value={baht(itemsTotal(items))} />
          <Row label="หักบิลค้างชำระ" value={baht(outstandingTotal)} />
          <Row label="รวมหักทั้งหมด" value={baht(deductions)} />
          <Row label={refund >= 0 ? "ยอดคืนให้ผู้เช่า" : "ผู้เช่ายังค้างชำระ"} value={baht(Math.abs(refund))} strong />
        </dl>
        {refund < 0 && (
          <p className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-900">เงินมัดจำไม่พอหัก ผู้เช่ายังค้าง {baht(-refund)} (ต้องติดตามเก็บเอง)</p>
        )}
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={saving || (!dirty && saved !== null)} className={`${primaryButton} disabled:opacity-50`}>
            {saving ? "กำลังบันทึก..." : settlement || saved ? "บันทึกใบสรุปอีกครั้ง" : "บันทึกใบสรุป"}
          </button>
          {saved && !dirty && <span className="text-sm text-green-700">บันทึกแล้ว</span>}
          {dirty && saved !== null && <span className="text-sm text-orange-700">มีการแก้ไขที่ยังไม่ได้บันทึก</span>}
        </div>
      </section>

      {settlement && !dirty && (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold">4. {settlement.refund > 0 ? "โอนเงินมัดจำคืน" : "ปิดยอด"}</h2>
          {refundChangedSinceSave && (
            <p className="mt-3 rounded-lg bg-orange-50 p-3 text-sm text-orange-900">ยอดเปลี่ยนไปจากที่บันทึก (บิลค้างเปลี่ยน) กรุณาบันทึกใบสรุปใหม่ก่อน</p>
          )}
          {settlement.refund > 0 ? (
            <>
              <p className="mt-2 text-sm text-sand-600">โอนคืน <strong>{baht(settlement.refund)}</strong> ให้ผู้เช่า แล้วบันทึกหลักฐานการโอนที่นี่</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  วันที่โอนคืน
                  <input type="date" value={refundedOn} onChange={(e) => setRefundedOn(e.target.value)} className={`${input} mt-1`} />
                </label>
                <label className="block text-sm font-medium">
                  เลขอ้างอิงการโอน (ไม่บังคับถ้าแนบสลิป)
                  <input value={reference} onChange={(e) => setReference(e.target.value)} className={`${input} mt-1`} />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  สลิปการโอนคืน (รูปหรือ PDF ไม่เกิน 10 MB)
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)} className={`${input} mt-1`} />
                </label>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-sand-600">
              {settlement.refund < 0 ? `ไม่มีเงินคืน ผู้เช่ายังค้าง ${baht(-settlement.refund)}` : "ไม่มีเงินต้องคืน"} ปิดยอดได้โดยไม่ต้องบันทึกการโอน
            </p>
          )}
          <div className="mt-6">
            <button type="button" onClick={closeSettlement} disabled={closing || refundChangedSinceSave || pendingCheckCount > 0} className={`${primaryButton} disabled:opacity-50`}>
              {closing ? "กำลังบันทึก..." : settlement.refund > 0 ? "บันทึกการโอนคืนและปิดยอด" : "ปิดยอด"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-brand-200 pt-3 text-base font-bold" : ""}`}>
      <dt className={strong ? "" : "text-sand-600"}>{label}</dt>
      <dd className={strong ? "" : "font-medium"}>{value}</dd>
    </div>
  );
}
