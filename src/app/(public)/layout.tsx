type PublicLayoutProps = {
  children: React.ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <main className='mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-4'>
      <div className='w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8'>
        {children}
      </div>
    </main>
  );
}
