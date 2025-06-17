interface PageHeaderProps {
  title: string;
  description: string;
  centered?: boolean;
}

export function PageHeader({ title, description, centered = true }: PageHeaderProps) {
  return (
    <section className={`flex flex-col gap-3 w-full ${centered ? 'items-center' : ''}`}>
      <h1 className={`font-text-4xl-normal text-black text-[length:var(--text-4xl-normal-font-size)] tracking-[var(--text-4xl-normal-letter-spacing)] leading-[var(--text-4xl-normal-line-height)] [font-style:var(--text-4xl-normal-font-style)] ${centered ? 'text-center' : ''}`}>
        {title}
      </h1>
      <p className={`font-text-sm-normal text-[var(--text-secondary)] text-[length:var(--text-sm-normal-font-size)] tracking-[var(--text-sm-normal-letter-spacing)] leading-[var(--text-sm-normal-line-height)] [font-style:var(--text-sm-normal-font-style)] ${centered ? 'text-center' : ''}`}>
        {description}
      </p>
    </section>
  );
} 