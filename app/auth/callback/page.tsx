import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthCallbackPage = () => {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.push('/auth/login');
        }, 2000); // 2 saniye bekle
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1 style={{ color: '#16a34a', fontWeight: 700, fontSize: 28 }}>E-posta Onaylandı</h1>
            <p style={{ marginTop: 16, fontSize: 18 }}>Hesabınız başarıyla onaylandı. Giriş yapabilirsiniz.</p>
            <p style={{ marginTop: 24, color: '#888' }}>Giriş sayfasına yönlendiriliyorsunuz...</p>
        </div>
    );
};

export default AuthCallbackPage; 