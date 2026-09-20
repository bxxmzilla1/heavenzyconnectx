"use client";

import { useFormStatus } from "react-dom";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingText?: string;
};

export function SubmitButton({ children, pendingText = "Saving…", className = "btn btn-primary", ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} {...rest}>
      {pending ? pendingText : children}
    </button>
  );
}
