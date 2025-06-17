import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <Card 
      className="w-[672px] min-h-[530px] border border-solid border-[var(--border-primary)] bg-[var(--bg-secondary)] rounded-lg" 
      style={{ boxShadow: 'var(--shadow-lg)' }}
    >
      <CardHeader className="p-6 pb-0">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="h-8 font-text-2xl-normal text-[length:var(--text-2xl-normal-font-size)] tracking-[var(--text-2xl-normal-letter-spacing)] leading-[var(--text-2xl-normal-line-height)] [font-style:var(--text-2xl-normal-font-style)] text-black">
            {title}
          </CardTitle>
          <CardDescription className="h-5 font-text-sm-normal text-[length:var(--text-sm-normal-font-size)] tracking-[var(--text-sm-normal-letter-spacing)] leading-[var(--text-sm-normal-line-height)] [font-style:var(--text-sm-normal-font-style)] text-[var(--text-secondary)]">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-6 flex flex-col gap-5">
        {children}
      </CardContent>
    </Card>
  );
} 