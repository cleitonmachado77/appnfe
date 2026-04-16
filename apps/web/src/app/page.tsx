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

    if (perfil === 'ADMIN' || perfil === 'USUARIO') {
      router.replace('/admin');
    } else if (perfil === 'SUPER_ADMIN') {
      router.replace('/super-admin');
    } else {
      router.replace('/entregador');
    }
  }, [router]);

  return null;
}
