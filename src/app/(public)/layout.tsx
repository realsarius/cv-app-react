type PublicLayoutProps = {
  children: React.ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <main className='mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-8'>
      <div className='w-full rounded-lg border border-stone-300 bg-white p-8 shadow-sm sm:p-10'>
        {children}
      </div>
    </main>
  );
}
