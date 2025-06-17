import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { HTMLInputTypeAttribute } from "react";

interface FormFieldProps {
  id: string;
  label: string;
  placeholder: string;
  type?: HTMLInputTypeAttribute | 'textarea' | 'select' | 'file';
  className?: string;
  rows?: number;
  options?: string[];
  accept?: string;
}

export function FormField({ 
  id, 
  label, 
  placeholder, 
  type = "text", 
  className = "", 
  rows = 3,
  options = [],
  accept
}: FormFieldProps) {
  const labelClassName = "h-5 font-text-sm-medium text-[length:var(--text-sm-medium-font-size)] tracking-[var(--text-sm-medium-letter-spacing)] leading-[var(--text-sm-medium-line-height)] [font-style:var(--text-sm-medium-font-style)] text-[var(--text-primary)]";
  
  const renderInput = () => {
    const baseClassName = "bg-white border border-solid border-[var(--border-primary)] rounded-md font-text-sm-normal text-[var(--text-secondary)] placeholder:text-[var(--text-secondary)]";
    const inputStyle = { padding: '8px 8px 8px 12px' };

    switch (type) {
      case 'textarea':
        return (
          <Textarea
            id={id}
            placeholder={placeholder}
            rows={rows}
            className={`${baseClassName} min-h-[80px] resize-y`}
            style={inputStyle}
          />
        );
      
      case 'select':
        return (
          <Select
            id={id}
            className={`${baseClassName} h-10`}
            style={inputStyle}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        );
      
      case 'file':
        return (
          <Input
            id={id}
            type="file"
            accept={accept}
            className={`${baseClassName} h-10 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100`}
            style={inputStyle}
          />
        );
      
      default:
        return (
          <Input
            id={id}
            type={type}
            placeholder={placeholder}
            className={`${baseClassName} h-10`}
            style={inputStyle}
          />
        );
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Label htmlFor={id} className={labelClassName}>
        {label}
      </Label>
      {renderInput()}
    </div>
  );
} 