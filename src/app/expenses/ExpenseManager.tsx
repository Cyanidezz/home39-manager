"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bangkokDate, formatMoney, formatThaiDateShort } from "@/lib/format";
import { removeExpenseReceipt, uploadExpenseReceipt } from "@/lib/expenseReceipt";
import Icon from "@/components/Icon";
import ReceiptDialog from "./ReceiptDialog";

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  amount: number | string;
  billing_year: number | null;
  billing_month: number | null;
  note: string | null;
  receipt_path: string | null;
};

type Props = {
  initialExpenses: Expense[];
  selectedPeriod: string;
};

const categories = [
  { value: "water", label: "ค่าน้ำประปา" },
  { value: "electricity", label: "ค่าไฟฟ้า" },
  { value: "cleaning", label: "ค่าจ้างแม่บ้าน/ทำความสะอาด" },
  { value: "electrical_repair", label: "ค่าซ่อมไฟ" },
  { value: "maintenance", label: "ค่าซ่อมบำรุง" },
  { value: "internet", label: "ค่าอินเทอร์เน็ต" },
  { value: "tax", label: "ภาษี/ค่าธรรมเนียม" },
  { value: "other", label: "ค่าใช้จ่ายอื่น" },
];

function categoryLabel(value: string) {
  return categories.find((category) => category.value === value)?.label || value;
}

export default function ExpenseManager({
  initialExpenses,
  selectedPeriod,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expenseDate, setExpenseDate] = useState(bangkokDate);
  const [period, setPeriod] = useState(selectedPeriod);
  // Until the owner picks a month by hand, the accounting month follows the payment date.
  const [periodTouched, setPeriodTouched] = useState(false);
  const [category, setCategory] = useState("water");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Optional proof photo: a newly chosen file, and whether the saved one should be dropped.
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [viewing, setViewing] = useState<Expense | null>(null);

  function resetForm() {
    setReceiptFile(null);
    setExistingReceipt(null);
    setRemoveReceipt(false);
    setFileInputKey((key) => key + 1);
    setEditingId(null);
    setExpenseDate(bangkokDate());
    setPeriod(selectedPeriod);
    setPeriodTouched(false);
    setCategory("water");
    setAmount("");
    setNote("");
    setError("");
  }

  function editExpense(expense: Expense) {
    setEditingId(expense.id);
    setExpenseDate(expense.expense_date);
    setPeriod(
      `${expense.billing_year}-${String(expense.billing_month).padStart(2, "0")}`
    );
    setPeriodTouched(true);
    setCategory(expense.category);
    setAmount(String(expense.amount));
    setNote(expense.note || "");
    setExistingReceipt(expense.receipt_path);
    setRemoveReceipt(false);
    setReceiptFile(null);
    setFileInputKey((key) => key + 1);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const numericAmount = Number(amount);
    const [billingYear, billingMonth] = period.split("-").map(Number);

    if (
      !expenseDate ||
      !billingYear ||
      !billingMonth ||
      !category ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("กรุณากรอกวันที่ เดือนบัญชี หมวด และจำนวนเงินให้ถูกต้อง");
      return;
    }

    setSaving(true);

    // The photo goes up first, so an expense never points at a file that is not there.
    let newReceiptPath: string | null = null;
    if (receiptFile) {
      try {
        newReceiptPath = await uploadExpenseReceipt(supabase, receiptFile);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "อัปโหลดรูปหลักฐานไม่สำเร็จ");
        setSaving(false);
        return;
      }
    }

    const values = {
      expense_date: expenseDate,
      category,
      amount: numericAmount,
      billing_year: billingYear,
      billing_month: billingMonth,
      note: note.trim() || null,
      ...(newReceiptPath ? { receipt_path: newReceiptPath } : removeReceipt ? { receipt_path: null } : {}),
    };

    const result = editingId
      ? await supabase.from("expenses").update(values).eq("id", editingId)
      : await supabase.from("expenses").insert(values);

    setSaving(false);

    if (result.error) {
      if (newReceiptPath) await removeExpenseReceipt(supabase, newReceiptPath);
      setError(result.error.message || "บันทึกรายจ่ายไม่สำเร็จ");
      return;
    }

    // The replaced or removed photo is no longer referenced.
    if (existingReceipt && (newReceiptPath || removeReceipt)) await removeExpenseReceipt(supabase, existingReceipt);

    resetForm();
    router.refresh();
  }

  async function deleteExpense(expense: Expense) {
    const confirmed = window.confirm(
      `ยืนยันลบ ${categoryLabel(expense.category)} ${formatMoney(expense.amount)} บาท?`
    );
    if (!confirmed) return;

    setDeletingId(expense.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expense.id);

    setDeletingId(null);

    if (deleteError) {
      setError(deleteError.message || "ลบรายจ่ายไม่สำเร็จ");
      return;
    }

    if (expense.receipt_path) await removeExpenseReceipt(supabase, expense.receipt_path);

    if (editingId === expense.id) resetForm();
    router.refresh();
  }

  const total = initialExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="h-fit min-w-0 rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          {editingId ? "แก้ไขรายจ่าย" : "เพิ่มรายจ่ายจริง"}
        </h2>
        <p className="mt-1 text-sm text-sand-500">
          ใช้เดือนบัญชีในการคำนวณกำไร/ขาดทุน
        </p>

        <form onSubmit={saveExpense} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">วันที่จ่าย *</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(event) => {
                const value = event.target.value;
                setExpenseDate(value);
                if (!periodTouched && /^\d{4}-\d{2}-\d{2}$/.test(value)) setPeriod(value.slice(0, 7));
              }}
              className="w-full rounded-xl border border-sand-200 px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              เดือนที่นำไปคำนวณ *
            </label>
            <input
              type="month"
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value);
                setPeriodTouched(true);
              }}
              aria-describedby="period-hint"
              className="w-full rounded-xl border border-sand-200 px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              required
            />
            <p id="period-hint" className="mt-2 text-xs text-sand-500">
              กำหนดว่ารายจ่ายนี้นับเข้ากำไร/ขาดทุนของเดือนไหน (ปกติตรงกับเดือนของวันที่จ่าย)
              {expenseDate && period && expenseDate.slice(0, 7) !== period && (
                <span className="mt-1 block font-semibold text-amber-700">
                  เดือนนี้ต่างจากเดือนของวันที่จ่าย
                </span>
              )}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">หมวดรายจ่าย *</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">จำนวนเงิน *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-xl border border-sand-200 px-4 py-3 text-right outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">หมายเหตุ</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-24 w-full rounded-xl border border-sand-200 px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="เช่น ค่าแรงทำความสะอาดประจำเดือน"
            />
          </div>

          <div>
            <label htmlFor="receipt" className="mb-2 block text-sm font-medium">
              รูปหลักฐาน <span className="font-normal text-sand-500">(ไม่บังคับ)</span>
            </label>
            {existingReceipt && !removeReceipt && !receiptFile && (
              <p className="mb-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-sand-600"><Icon name="paperclip" /> มีรูปหลักฐานแนบอยู่</span>
                <button type="button" onClick={() => setRemoveReceipt(true)} className="font-semibold text-red-600 hover:underline">เอารูปออก</button>
              </p>
            )}
            {removeReceipt && (
              <p className="mb-2 text-sm text-orange-700">
                จะเอารูปเดิมออกเมื่อบันทึก{" "}
                <button type="button" onClick={() => setRemoveReceipt(false)} className="font-semibold underline">ยกเลิก</button>
              </p>
            )}
            <input
              key={fileInputKey}
              id="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-300 file:px-4 file:py-2 file:font-semibold file:text-brand-950 hover:file:bg-brand-400"
            />
            <p className="mt-2 text-xs text-sand-500">รูปจะถูกย่อให้เล็กลงอัตโนมัติก่อนอัปโหลด</p>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="flex-1 rounded-xl border px-4 py-3 font-medium disabled:opacity-50"
              >
                ยกเลิก
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-brand-300 px-4 py-3 font-semibold text-brand-950 hover:bg-brand-400 disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มรายจ่าย"}
            </button>
          </div>
        </form>
      </section>

      <section className="min-w-0 rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">รายการรายจ่ายเดือนนี้</h2>
            <p className="mt-1 text-sm text-sand-500">
              ทั้งหมด {initialExpenses.length} รายการ
            </p>
          </div>
          <p className="text-right">
            <span className="block text-sm text-sand-500">รวมรายจ่าย</span>
            <strong className="text-2xl text-red-700">{formatMoney(total)} บาท</strong>
          </p>
        </div>

        {initialExpenses.length === 0 ? (
          <div className="mt-8 rounded-xl bg-sand-50 p-8 text-center text-sand-500">
            ยังไม่มีรายจ่ายในเดือนนี้
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {initialExpenses.map((expense) => (
              <div
                key={expense.id}
                className="rounded-xl border p-4 sm:flex sm:items-center sm:justify-between sm:gap-4"
              >
                <div>
                  <p className="font-semibold">{categoryLabel(expense.category)}</p>
                  <p className="mt-1 text-sm text-sand-500">
                    {formatThaiDateShort(expense.expense_date)}
                    {expense.note ? ` · ${expense.note}` : ""}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 sm:mt-0">
                  <strong className="whitespace-nowrap">{formatMoney(expense.amount)} บาท</strong>
                  {expense.receipt_path && (
                    <button
                      type="button"
                      onClick={() => setViewing(expense)}
                      className="whitespace-nowrap rounded-lg border px-3 py-2 text-sm text-brand-800 hover:bg-brand-50"
                    >
                      <Icon name="paperclip" /> หลักฐาน
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => editExpense(expense)}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-sand-50"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteExpense(expense)}
                    disabled={deletingId === expense.id}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === expense.id ? "กำลังลบ..." : "ลบ"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {viewing?.receipt_path && (
        <ReceiptDialog
          path={viewing.receipt_path}
          title={`${categoryLabel(viewing.category)} ${formatMoney(viewing.amount)} บาท`}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
