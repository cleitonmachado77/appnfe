'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getPerfil } from '@/lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const perfil = getPerfil();

    if (!token) {
      router.replace('/login');
      return;
    }

    if (perfil === 'ADMIN') {
      router.replace('/admin');
    } else {
      router.replace('/entregador');
    }
  }, [router]);

  return null;
}
