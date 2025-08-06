"use client";
import Link from "next/link";
import { useTranslation } from '@/hooks/useTranslation';
import React, { useRef, useState, useEffect } from "react";
import Button from "./atoms/button";
import { signIn, useSession } from "next-auth/react";
import google from "../../public/google.svg";
import Image from "next/image";
import { useRouter } from "next/navigation";
import InputForm from "./ui/inputForm";
import { z } from "zod";


type SignUpData = {
  nume: string;
  prenume: string;
  email: string;
  parola: string;
  dataNasterii: string;
  gen: "masculin" | "feminin" | "altul";
  terms: boolean;
};

const SignUpForm: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const user = session?.user;

  // Zod schema with translation
  const signUpSchema = z.object({
    nume: z.string().min(1, t('signup.errorNameRequired')),
    prenume: z.string().min(1, t('signup.errorFirstNameRequired')),
    email: z.string().email(t('signup.errorEmailInvalid')),
    parola: z.string()
      .min(6, t('signup.errorPasswordLength'))
      .regex(/[A-Z]/, t('signup.errorPasswordUppercase'))
      .regex(/[^A-Za-z0-9]/, t('signup.errorPasswordSpecial')),
    dataNasterii: z
      .string()
      .refine((str) => {
        const dob = new Date(str);
        const today = new Date();
        today.setFullYear(today.getFullYear() - 18);
        return dob <= today;
      }, t('signup.errorAge18')),
    gen: z.enum(["masculin", "feminin", "altul"]),
    terms: z.literal(true, {
      errorMap: () => ({ message: t('signup.errorTerms') }),
    }),
  });

  const numeRef = useRef<HTMLInputElement>(null);
  const prenumeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const parolaRef = useRef<HTMLInputElement>(null);
  const dataNasteriiRef = useRef<HTMLInputElement>(null);
  const genRef = useRef<HTMLSelectElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof SignUpData, string>>
  >({});
  const [maxDate, setMaxDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Calculate max birthdate for 18+
  useEffect(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    setMaxDate(d.toISOString().split("T")[0]);
  }, []);

  // Redirect if already signed in
  useEffect(() => {
    if (user) router.push("/profil");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormErrors({});
    setIsLoading(true);

    // gather raw values
    const raw = {
      nume: numeRef.current?.value ?? "",
      prenume: prenumeRef.current?.value ?? "",
      email: emailRef.current?.value ?? "",
      parola: parolaRef.current?.value ?? "",
      dataNasterii: dataNasteriiRef.current?.value ?? "",
      gen: (genRef.current?.value as SignUpData["gen"]) ?? "masculin",
      terms: termsRef.current?.checked ?? false,
    };

    // validate
    const result = signUpSchema.safeParse(raw);
    if (!result.success) {
      const errs: typeof formErrors = {};
      for (const issue of result.error.issues) {
        errs[issue.path[0] as keyof SignUpData] = issue.message;
      }
      setFormErrors(errs);
      setIsLoading(false);
      return;
    }

    try {
      // send to API
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      const json = await res.json();
      if (res.ok) {
        const signin = await signIn("credentials", {
          redirect: false,
          email: result.data.email,
          password: result.data.parola,
        });
        if (!signin?.error) {
          router.push("/profil");
        } else {
          setError(t('signup.errorAuthAfterRegister'));
        }
      } else {
        // display backend validation errors
        if (json.errors) {
          setFormErrors(json.errors);
        } else if (json.error) {
          setError(json.error);
        } else {
          setError(t('signup.errorRegister'));
        }
      }
    } catch (e: any) {
      setError(t('signup.errorNetwork'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col lg:w-[600px] bg-white rounded-xl h-full p-8 border-secondaryColor border-4 shadow-lg shadow-primaryColor/40 gap-3 lg:gap-6 text-sm lg:text-md"
    >
      <Link href="/autentificare">
        <p className="text-primaryColor">
          {t('signup.alreadyHaveAccount')}{' '}
          <span className="font-semibold">{t('signup.toLogin')}</span>
        </p>
      </Link>

      <button
        type="button"
        onClick={() => signIn("google")}
        className="flex items-center justify-center border-2 border-primaryColor font-semibold py-2 transition duration-300 ease-in-out hover:bg-primaryColor hover:text-white"
      >
        <Image src={google} alt="Google logo" className="w-6 h-auto mr-2" />
        {t('signup.continueWithGoogle')}
      </button>

      {/* Name */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="font-semibold text-gray-500">{t('signup.lastName')}</label>
          <InputForm ref={numeRef} name="nume" placeholder={t('signup.lastNamePlaceholder')} />
          {formErrors.nume && (
            <p className="text-red-500 text-sm">{formErrors.nume}</p>
          )}
        </div>
        <div className="flex flex-col">
          <label className="font-semibold text-gray-500">{t('signup.firstName')}</label>
          <InputForm ref={prenumeRef} name="prenume" placeholder={t('signup.firstNamePlaceholder')} />
          {formErrors.prenume && (
            <p className="text-red-500 text-sm">{formErrors.prenume}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="flex flex-col">
        <label className="font-semibold text-gray-500">{t('signup.email')}</label>
        <InputForm
          ref={emailRef}
          type="email"
          name="email"
          placeholder={t('signup.emailPlaceholder')}
        />
        {formErrors.email && (
          <p className="text-red-500 text-sm">{formErrors.email}</p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col">
        <label className="font-semibold text-gray-500">{t('signup.password')}</label>
        <InputForm
          ref={parolaRef}
          type="password"
          name="parola"
          placeholder={t('signup.passwordPlaceholder')}
        />
        {formErrors.parola && (
          <p className="text-red-500 text-sm">{formErrors.parola}</p>
        )}
      </div>

      {/* Birthdate */}
      <div className="flex flex-col">
        <label className="font-semibold text-gray-500">{t('signup.birthdate')}</label>
        <InputForm
          ref={dataNasteriiRef}
          type="date"
          name="dataNasterii"
          max={maxDate}
        />
        {formErrors.dataNasterii && (
          <p className="text-red-500 text-sm">{formErrors.dataNasterii}</p>
        )}
      </div>

      {/* Gender */}
      <div className="flex flex-col">
        <label className="font-semibold text-gray-500">{t('signup.gender')}</label>
        <select
          ref={genRef}
          name="gen"
          defaultValue="masculin"
          className="w-full h-9 lg:h-14 p-2 lg:p-4 border-2 border-primaryColor focus:outline-none rounded-lg bg-white"
        >
          <option value="masculin">{t('signup.genderMale')}</option>
          <option value="feminin">{t('signup.genderFemale')}</option>
          <option value="altul">{t('signup.genderOther')}</option>
        </select>
        {formErrors.gen && (
          <p className="text-red-500 text-sm">{formErrors.gen}</p>
        )}
      </div>

      {/* Terms */}
      <div className="flex items-center space-x-2">
        <input
          ref={termsRef}
          name="terms"
          type="checkbox"
          className="h-4 w-4"
        />
        <p className="font-thin text-gray-500">
          {t('signup.agreeWith')}{' '}
          <Link
            href="/termeni-si-conditii"
            className="text-primaryColor font-semibold"
          >
            {t('signup.termsAndConditions')}
          </Link>
        </p>
      </div>
      {formErrors.terms && (
        <p className="text-red-500 text-sm">{formErrors.terms}</p>
      )}

      {/* API or auth error */}
      {error && <p className="text-red-500">{error}</p>}

      <Button
        type="submit"
        disabled={isLoading}
        className="border-2 border-primaryColor font-semibold py-2 transition duration-300 ease-in-out hover:bg-primaryColor hover:text-white"
      >
        {isLoading ? t('signup.processing') : t('signup.continue')}
      </Button>
    </form>
  );
};

export default SignUpForm;
