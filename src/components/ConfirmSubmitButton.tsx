"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  confirmMessage: string;
};

/** Submit button that asks for confirmation before the surrounding form posts. */
export default function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  ...props
}: Props) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return <button {...props} type="submit" onClick={handleClick} />;
}
