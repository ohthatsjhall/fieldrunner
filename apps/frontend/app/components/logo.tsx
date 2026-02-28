import Image from 'next/image';

export function Logo({ size = 'default' }: { size?: 'default' | 'lg' }) {
  const imgSize = size === 'lg' ? 40 : 28;
  const textClass = size === 'lg' ? 'text-3xl' : 'text-2xl';

  return (
    <div className="flex items-center gap-0.5">
      <Image src="/fr-logo.svg" alt="" width={imgSize} height={imgSize} priority />
      <span className={`font-title ${textClass}`}>
        <span className="text-primary">Field</span>
        <span className="text-secondary">runner</span>
      </span>
    </div>
  );
}
