import Link from "next/link";
import Icon from "@/components/Icon";
import { formatMoney, formatThaiDate } from "@/lib/format";
import { EmptyNote, InfoCard, InfoRows, primaryButton, secondaryButton } from "./InfoCard";

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
  const icon = <Icon name="file" className="h-5 w-5" />;
  const uploadHref = `/rooms/${roomCode}/contract/new`;

  if (!contract) {
    return (
      <InfoCard
        icon={icon}
        title="สัญญาเช่า"
        footer={
          <Link href={uploadHref} className={secondaryButton}>
            <Icon name="upload" className="h-4 w-4" /> Upload สัญญา
          </Link>
        }
      >
        <EmptyNote>ยังไม่มีสัญญาเช่า</EmptyNote>
      </InfoCard>
    );
  }

  return (
    <InfoCard
      icon={icon}
      title="สัญญาเช่า"
      footer={
        <>
          {contractUrl && (
            <a href={contractUrl} target="_blank" rel="noopener noreferrer" className={primaryButton}>
              <Icon name="eye" className="h-4 w-4" /> ดูสัญญา
            </a>
          )}
          <Link href={uploadHref} className={secondaryButton}>
            <Icon name="upload" className="h-4 w-4" /> Upload สัญญาใหม่
          </Link>
        </>
      }
    >
      <p className="mb-3 truncate text-base font-semibold">{contract.original_file_name || "สัญญาเช่า"}</p>
      <InfoRows
        rows={[
          { label: "เริ่มสัญญา", value: formatThaiDate(contract.contract_start) },
          { label: "สิ้นสุดสัญญา", value: formatThaiDate(contract.contract_end) },
          {
            label: "เงินประกัน",
            value: contract.deposit_amount != null ? `${formatMoney(contract.deposit_amount)} บาท` : "-",
          },
        ]}
      />
    </InfoCard>
  );
}
