import { ErrorIcon } from "./icons";

interface ErrorMessageProps {
    message?: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
    if (!message) return null;

    return (
        <div className="mt-1 flex items-start gap-1.5 text-[11px] leading-4 text-red-500">
            <span className="mt-[1px] shrink-0"><ErrorIcon /></span>
            <span>{message}</span>
        </div>
    );
}
