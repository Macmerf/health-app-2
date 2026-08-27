'use client';

import Link from 'next/link';
import { CloudUpload } from 'lucide-react';
import { useAuth } from '@/shared/lib/auth-context';

/**
 * Ненавязчивое предложение создать аккаунт.
 * Показывается только неавторизованным пользователям.
 * Авторизация необязательна — это просто способ сохранить данные
 * и перенести их на другое устройство.
 */
export function AuthSuggestion() {
  const { user, loading } = useAuth();

  if (loading || user) return null;

  return (
    <div className='rounded-2xl border border-primary/20 bg-primary/5 p-4'>
      <div className='flex items-start gap-3'>
        <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 text-primary shrink-0'>
          <CloudUpload size={22} strokeWidth={1.5} />
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium text-foreground'>
            Сохранить данные в аккаунте
          </p>
          <p className='text-xs text-muted-foreground mt-1 leading-relaxed'>
            Твои записи хранятся только на этом устройстве. Создай бесплатный
            аккаунт, чтобы сохранить их и открыть на любом другом устройстве.
          </p>
        </div>
      </div>

      <div className='mt-3 flex flex-col gap-1.5'>
        <Link
          href='/register'
          className='inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-base font-medium transition-colors duration-200 hover:bg-primary/90'
        >
          Создать аккаунт
        </Link>
        <Link
          href='/login'
          className='inline-flex items-center justify-center rounded-xl font-medium text-foreground text-sm px-4 py-1.5 text-center transition-colors duration-200 hover:bg-muted'
        >
          У меня уже есть аккаунт
        </Link>
      </div>
    </div>
  );
}