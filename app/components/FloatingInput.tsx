"use client"

import { InputHTMLAttributes, useState } from "react"

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function FloatingInput({ label, className = "", ...props }: FloatingInputProps) {
  const [focused, setFocused] = useState(false)
  const hasValue = props.value !== undefined && props.value !== ""
  const isFloating = focused || hasValue

  return (
    <div className="relative">
      <input
        {...props}
        onFocus={(e) => {
          setFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          props.onBlur?.(e)
        }}
        placeholder=""
        className={`peer w-full px-4 pt-6 pb-2 text-lg font-semibold text-center border-2 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none transition-colors ${
          focused
            ? "border-blue-500 dark:border-blue-500"
            : "border-zinc-300 dark:border-zinc-600"
        } ${className}`}
      />
      <label
        className={`absolute left-1/2 -translate-x-1/2 transition-all duration-200 pointer-events-none ${
          isFloating
            ? "top-1.5 text-xs font-medium text-blue-600 dark:text-blue-400"
            : "top-1/2 -translate-y-1/2 text-base text-zinc-400 dark:text-zinc-500"
        }`}
      >
        {label}
      </label>
    </div>
  )
}
