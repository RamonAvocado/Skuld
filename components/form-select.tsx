"use client";

import { useState } from "react";
import { MenuSelect, type MenuSelectOption } from "@mimird/ui/components/menu-select";

// MenuSelect for plain <form action={serverAction}> forms: the pick rides along in a hidden input.
export function FormSelect({
  name,
  options,
  defaultValue,
  value: controlled,
  onValueChange,
  className = "h-8 justify-between text-sm",
  "aria-label": ariaLabel,
}: {
  name: string;
  options: MenuSelectOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const [own, setOwn] = useState(defaultValue ?? options[0]?.value ?? "");
  const value = controlled ?? own;
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <MenuSelect
        aria-label={ariaLabel}
        value={value}
        options={options}
        onValueChange={(v) => {
          setOwn(v);
          onValueChange?.(v);
        }}
        className={className}
      />
    </>
  );
}
