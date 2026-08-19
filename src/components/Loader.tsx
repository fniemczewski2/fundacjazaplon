
export default function Loader({ size = 40 }: Readonly<{ size?: number }>) {
  return (
    <div className="flex items-center justify-center w-full py-12">
      <output
        className="animate-spin rounded-full border-4 border-brand border-t-transparent dark:border-accent-orange dark:border-t-transparent block"
        style={{ width: size, height: size }}
        aria-label="Wczytywanie…"
      />
    </div>
  );
}
