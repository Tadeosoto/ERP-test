type ListSearchInputProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  matchCount?: number;
  totalCount?: number;
};

export function ListSearchInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  hint,
  matchCount,
  totalCount,
}: ListSearchInputProps) {
  const showCount =
    value.trim().length > 0 && matchCount !== undefined && totalCount !== undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-base font-medium text-zinc-800">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="min-h-12 w-full rounded-2xl border border-orange-100 bg-white px-4 text-base shadow-sm placeholder:text-zinc-400 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200"
      />
      {hint && <p className="text-sm text-zinc-500">{hint}</p>}
      {showCount && (
        <p className="text-sm font-medium text-teal-800">
          {matchCount === 0
            ? "Ningún resultado"
            : `${matchCount} de ${totalCount} resultado${matchCount === 1 ? "" : "s"}`}
        </p>
      )}
    </div>
  );
}
