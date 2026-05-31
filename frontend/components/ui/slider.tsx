import * as React from 'react'

interface SliderProps {
  defaultValue?: number[]
  max?: number
  min?: number
  step?: number
  onValueChange?: (value: number[]) => void
  className?: string
}

export function Slider({
  defaultValue = [0],
  max = 100,
  min = 0,
  step = 1,
  onValueChange,
  className = ''
}: SliderProps) {
  const [value, setValue] = React.useState(defaultValue[0])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setValue(val)
    if (onValueChange) {
      onValueChange([val])
    }
  }

  return (
    <div className={`relative flex w-full touch-none select-none items-center ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
      />
    </div>
  )
}
