"use client";

import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import React, { useRef, useState, useEffect } from 'react';
import Button from './atoms/button';
import { signIn, useSession } from 'next-auth/react';
import google from '../../public/google.svg';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import InputForm from './ui/inputForm';

const SignInForm: React.FC = () => {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    if (user) {
      router.push('/profil');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const email = emailRef.current?.value;
      const password = passwordRef.current?.value;

      if (!email || !password) {
        setError(t('signin.errorRequiredFields'));
        return;
      }

      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push('/profil');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col lg:w-[600px] bg-white rounded-xl w-full h-full p-8 border-secondaryColor border-4 shadow-lg shadow-primaryColor/40 gap-3 lg:gap-6 text-sm lg:text-md"
    >
      <Link href="/inregistrare">
        <p className="text-primaryColor">
          {t('signin.noAccount')}{' '}
          <span className="font-semibold">{t('signin.toRegister')}</span>
        </p>
      </Link>

      {/* Autentificare cu Google */}
      <button
        type="button"
        onClick={() => signIn('google')}
        className="flex items-center justify-center border-2 border-primaryColor font-semibold py-2 transition duration-300 ease-in-out hover:bg-primaryColor hover:text-white"
      >
        <Image src={google} className="w-8 lg:w-12 h-auto" alt="Google Auth Logo" /> {t('signin.continueWithGoogle')}
      </button>

      {/* Email și parolă */}
      <div>
        <label className="font-semibold text-gray-500">{t('signin.email')}</label>
        <InputForm
          ref={emailRef}
          type="email"
          name="email"
          placeholder={t('signin.emailPlaceholder')}
        />
      </div>
      <div>
        <label className="font-semibold text-gray-500">{t('signin.password')}</label>
        <InputForm
          ref={passwordRef}
          type="password"
          name="password"
          placeholder={t('signin.passwordPlaceholder')}
        />
      </div>

      <Link href="/resetare-parola">
        <p className="text-primaryColor">{t('signin.forgotPassword')}</p>
      </Link>

      {/* Mesaj de eroare */}
      {error && <p className="text-red-500">{error}</p>}

      <Button
        type="submit"
        disabled={isLoading}
        className="border-2 border-primaryColor font-semibold py-2 transition duration-300 ease-in-out hover:bg-primaryColor hover:text-white"
      >
        {isLoading ? t('signin.processing') : t('signin.login')}
      </Button>
    </form>
  );
};

export default SignInForm;
