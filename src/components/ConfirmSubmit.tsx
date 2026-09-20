"use client";

import { useFormStatus } from "react-dom";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string };

/** Submit button that asks for confirmation before submitting its parent form. */
export function ConfirmSubmit({ message, children, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      {...rest}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
