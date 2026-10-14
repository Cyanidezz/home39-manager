import Link from "next/link";

export type RoomContract = {
  contract_start: string | null;
  contract_end: string | null;
  deposit_amount: number | string | null;
  original_file_name: string | null;
};

type Props = {
  roomCode: string;
  contract: RoomContract | undefined;
  contractUrl: string | null;
};

export default function ContractCard({ roomCode, contract, contractUrl }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">📄 สัญญาเช่า</h2>

      {contract ? (
        <div className="mt-5">
          <p className="font-medium">{contract.original_file_name || "สัญญาเช่า"}</p>

          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p>เริ่มสัญญา: {contract.contract_start || "-"}</p>
            <p>สิ้นสุดสัญญา: {contract.contract_end || "-"}</p>
            <p>
              เงินประกัน:{" "}
              {contract.deposit_amount != null
                ? `${Number(contract.deposit_amount).toLocaleString()} บาท`
                : "-"}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {contractUrl && (
              <a
                href={contractUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
              >
                👁 ดูสัญญา
              </a>
            )}

            <Link
              href={`/rooms/${roomCode}/contract/new`}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
            >
              ⬆ Upload สัญญาใหม่
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-slate-500">ยังไม่มีสัญญาเช่า</p>

          <Link
            href={`/rooms/${roomCode}/contract/new`}
            className="mt-4 inline-block rounded-lg border px-4 py-2 hover:bg-slate-50"
          >
            ⬆ Upload สัญญา
          </Link>
        </div>
      )}
    </section>
  );
}
