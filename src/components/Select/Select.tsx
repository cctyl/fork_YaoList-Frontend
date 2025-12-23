import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import './Select.scss'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  searchable?: boolean
}

export default function Select({ value, options, onChange, placeholder, className, searchable = false }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selectRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)
  
  const filteredOptions = search
    ? options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setIsOpen(true)
  }

  if (searchable) {
    return (
      <div className={`custom-select custom-select--searchable ${className || ''}`} ref={selectRef}>
        <input
          ref={inputRef}
          type="text"
          className={`custom-select__search-input ${isOpen ? 'custom-select__search-input--open' : ''}`}
          value={search}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={selectedOption?.label || placeholder}
        />
        
        {isOpen && (
          <div className="custom-select__dropdown">
            <div className="custom-select__options">
              {filteredOptions.length === 0 ? (
                <div className="custom-select__empty">无匹配结果</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`custom-select__option ${option.value === value ? 'custom-select__option--selected' : ''}`}
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                      setSearch('')
                    }}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`custom-select ${className || ''}`} ref={selectRef}>
      <button
        type="button"
        className={`custom-select__trigger ${isOpen ? 'custom-select__trigger--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDown size={16} className="custom-select__arrow" />
      </button>
      
      {isOpen && (
        <div className="custom-select__dropdown">
          <div className="custom-select__options">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`custom-select__option ${option.value === value ? 'custom-select__option--selected' : ''}`}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
