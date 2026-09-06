"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  amount: number | string;
  billing_year: number;
  billing_month: number;
  note: string | null;
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

function getToday() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function categoryLabel(value: string) {
  return categories.find((category) => category.value === value)?.label || value;
}

function money(value: number | string) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function thaiDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${day}/${month}/${year + 543}`;
}

export default function ExpenseManager({
  initialExpenses,
  selectedPeriod,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expenseDate, setExpenseDate] = useState(getToday);
  const [period, setPeriod] = useState(selectedPeriod);
  const [category, setCategory] = useState("water");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function resetForm() {
    setEditingId(null);
    setExpenseDate(getToday());
    setPeriod(selectedPeriod);
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
    setCategory(expense.category);
    setAmount(String(expense.amount));
    setNote(expense.note || "");
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

    const values = {
      expense_date: expenseDate,
      category,
      amount: numericAmount,
      billing_year: billingYear,
      billing_month: billingMonth,
      note: note.trim() || null,
    };

    const result = editingId
      ? await supabase.from("expenses").update(values).eq("id", editingId)
      : await supabase.from("expenses").insert(values);

    setSaving(false);

    if (result.error) {
      setError(result.error.message || "บันทึกรายจ่ายไม่สำเร็จ");
      return;
    }

    resetForm();
    router.refresh();
  }

  async function deleteExpense(expense: Expense) {
    const confirmed = window.confirm(
      `ยืนยันลบ ${categoryLabel(expense.category)} ${money(expense.amount)} บาท?`
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

    if (editingId === expense.id) resetForm();
    router.refresh();
  }

  const total = initialExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="h-fit rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">
          {editingId ? "แก้ไขรายจ่าย" : "เพิ่มรายจ่ายจริง"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          ใช้เดือนบัญชีในการคำนวณกำไร/ขาดทุน
        </p>

        <form onSubmit={saveExpense} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">วันที่จ่าย *</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              className="w-full rounded-xl border px-4 py-3"
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
              onChange={(event) => setPeriod(event.target.value)}
              className="w-full rounded-xl border px-4 py-3"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">หมวดรายจ่าย *</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-xl border bg-white px-4 py-3"
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
              className="w-full rounded-xl border px-4 py-3 text-right"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">หมายเหตุ</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-24 w-full rounded-xl border px-4 py-3"
              placeholder="เช่น ค่าแรงทำความสะอาดประจำเดือน"
            />
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
              className="flex-1 rounded-xl bg-black px-4 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มรายจ่าย"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">รายการรายจ่ายเดือนนี้</h2>
            <p className="mt-1 text-sm text-gray-500">
              ทั้งหมด {initialExpenses.length} รายการ
            </p>
          </div>
          <p className="text-right">
            <span className="block text-sm text-gray-500">รวมรายจ่าย</span>
            <strong className="text-2xl text-red-700">{money(total)} บาท</strong>
          </p>
        </div>

        {initialExpenses.length === 0 ? (
          <div className="mt-8 rounded-xl bg-gray-50 p-8 text-center text-gray-500">
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
                  <p className="mt-1 text-sm text-gray-500">
                    {thaiDate(expense.expense_date)}
                    {expense.note ? ` · ${expense.note}` : ""}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 sm:mt-0">
                  <strong>{money(expense.amount)} บาท</strong>
                  <button
                    type="button"
                    onClick={() => editExpense(expense)}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
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
    </div>
  );
}
