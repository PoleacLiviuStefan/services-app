"use client";

import Link from 'next/link';
import React, { useRef, useState } from 'react';
import Button from './atoms/button';
import { signIn, useSession } from 'next-auth/react';
import google from '../../public/google.svg';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import InputForm from './ui/inputForm';

const SignUpForm = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  // Creăm referințe pentru fiecare câmp
  const numeRef = useRef<HTMLInputElement>(null);
  const prenumeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const parolaRef = useRef<HTMLInputElement>(null);
  const dataNasteriiRef = useRef<HTMLInputElement>(null);
  const genRef = useRef<HTMLSelectElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");

  // Dacă utilizatorul este deja autentificat, îl redirecționăm
  if (user) {
    router.push('/profil');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (termsRef.current && !termsRef.current.checked) {
      setError("Trebuie să acceptați termenii și condițiile.");
      return;
    }

    // Construim obiectul formData din valorile ref-urilor
    const formData = {
      nume: numeRef.current?.value || "",
      prenume: prenumeRef.current?.value || "",
      email: emailRef.current?.value || "",
      parola: parolaRef.current?.value || "",
      dataNasterii: dataNasteriiRef.current?.value || "",
      gen: genRef.current?.value || "masculin",
      terms: termsRef.current?.checked || false,
    };

    // Trimiterea datelor către API pentru înregistrare
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      // Dacă înregistrarea reușește, autentifică utilizatorul automat
      const signInResponse = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.parola,
      });

      if (!signInResponse?.error) {
        router.push("/profil");
      } else {
        setError("Autentificare eșuată după înregistrare.");
      }
    } else {
      const data = await res.json();
      setError(data.error || "A apărut o eroare la înregistrare.");
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className='flex flex-col lg:w-[600px] bg-white rounded-xl h-full p-8 border-secondaryColor border-4 shadow-lg shadow-primaryColor/40 gap-3 lg:gap-6 text-sm lg:text-md'
    >
      <Link href="/autentificare">
        <p className='text-primaryColor'>
          Aveți deja un cont? <span className='font-semibold'>Spre Autentificare</span>
        </p>
      </Link>
      
      {/* Buton de autentificare cu Google */}
      <button
        type="button"
        onClick={() => signIn('google')}
        className="flex items-center justify-center border-2 border-primaryColor font-semibold py-2 transition duration-300 ease-in-out hover:bg-primaryColor hover:text-white"
      >
        <Image src={google} alt="Google logo" className='w-12 h-auto' /> CONTINUARE CU GOOGLE 
      </button>

      <div className='grid grid-cols-2 gap-4'>
        <div className='flex flex-col'>
          <label className='font-semibold text-gray-500 text-md'>Nume</label>
          <InputForm ref={numeRef} name="nume" placeholder='Numele de familie' />
        </div>
        <div className='flex flex-col'>
          <label className='font-semibold text-gray-500 text-md'>Prenume</label>
          <InputForm ref={prenumeRef} name="prenume" placeholder='Prenumele' />
        </div>
      </div>

      <div>
        <label className='font-semibold text-gray-500'>Email</label>
        <InputForm ref={emailRef} type="email" name="email" placeholder='Completați cu email-ul' />
      </div>

      <div>
        <label className='font-semibold text-gray-500'>Parolă</label>
        <InputForm ref={parolaRef} type="password" name="parola" placeholder='Parola (minim 6 caractere)' />
      </div>

      <div>
        <label className='font-semibold text-gray-500'>Data Nașterii</label>
        <InputForm ref={dataNasteriiRef} type="date" name="dataNasterii" />
      </div>

      <div className='flex flex-col'>
        <label className='font-semibold text-gray-500'>Gen</label>
        <select ref={genRef} name="gen" defaultValue="masculin" className='w-full h-9 lg:h-14 p-2 lg:p-4 border-2 border-primaryColor focus:outline-none rounded-lg bg-white'>
          <option value="masculin">Masculin</option>
          <option value="feminin">Feminin</option>
          <option value="altul">Altul</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <input ref={termsRef} name="terms" type="checkbox" className="h-4 w-4" />
        <p className='font-thin text-gray-500'>
          Apăsând pe acest câmp, sunteți de acord cu 
          <Link href="/termeni-si-conditii" className='text-primaryColor font-semibold'> Termenii și Condițiile</Link>
        </p>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      <Button type="submit" className='border-2 border-primaryColor font-semibold py-2 transition duration-300 ease-in-out hover:bg-primaryColor hover:text-white'>
        CONTINUARE
      </Button>
    </form>
  );
};

export default SignUpForm;
