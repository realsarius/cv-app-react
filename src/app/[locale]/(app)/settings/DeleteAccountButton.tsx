'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';

type DeleteAccountButtonProps = {
  confirmMessage: string;
  label: string;
  pendingLabel: string;
  errorMessage: string;
};

export function DeleteAccountButton({
  confirmMessage,
  label,
  pendingLabel,
  errorMessage,
}: DeleteAccountButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('DELETE_ACCOUNT_FAILED');
      }

      router.replace('/login');
      router.refresh();
    } catch {
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className='space-y-2'>
      <button
        type='button'
        onClick={handleDelete}
        disabled={isDeleting}
        className='rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60'
      >
        {isDeleting ? pendingLabel : label}
      </button>
      {error ? <p className='text-sm text-red-700'>{error}</p> : null}
    </div>
  );
}

