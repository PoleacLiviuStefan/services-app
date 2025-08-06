import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface AuthFormProps {
  isLogin: boolean;
  onSubmit: (data: any) => void;
  onToggleMode: () => void;
  isLoading?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({ 
  isLogin, 
  onSubmit, 
  onToggleMode, 
  isLoading = false 
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Șterge eroarea când utilizatorul începe să tasteze
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = t('auth.invalidEmail');
    }

    if (!formData.password) {
      newErrors.password = t('auth.passwordMinLength');
    }

    if (!isLogin) {
      if (!formData.firstName) {
        newErrors.firstName = t('auth.firstNameRequired');
      }
      if (!formData.lastName) {
        newErrors.lastName = t('auth.nameRequired');
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('auth.passwordMinLength');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6 text-primaryColor">
        {isLogin ? t('auth.signIn') : t('auth.signUp')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.email')}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
            placeholder={t('auth.email')}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        {/* Nume și prenume pentru înregistrare */}
        {!isLogin && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.firstName')}
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                  placeholder={t('auth.firstName')}
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('auth.lastName')}
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                  placeholder={t('auth.lastName')}
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Data nașterii */}
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.birthDate')}
              </label>
              <input
                type="date"
                id="birthDate"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
              />
            </div>

            {/* Gen */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.gender')}
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
              >
                <option value="">{t('common.select')}</option>
                <option value="male">Masculin</option>
                <option value="female">Feminin</option>
                <option value="other">Altul</option>
              </select>
            </div>
          </>
        )}

        {/* Parola */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.password')}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
            placeholder={t('auth.password')}
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
        </div>

        {/* Confirmă parola pentru înregistrare */}
        {!isLogin && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.confirmPassword')}
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
              placeholder={t('auth.confirmPassword')}
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>
        )}

        {/* Buton submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primaryColor text-white py-2 px-4 rounded-md hover:bg-primaryColor/90 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? t('common.loading') : (isLogin ? t('auth.signIn') : t('auth.signUp'))}
        </button>
      </form>

      {/* Toggle între login și register */}
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          {isLogin ? t('auth.noAccount') : t('auth.alreadyHaveAccount')}
        </p>
        <button
          onClick={onToggleMode}
          className="mt-2 text-primaryColor hover:text-primaryColor/80 font-medium"
        >
          {isLogin ? t('auth.toRegister') : t('auth.toLogin')}
        </button>
      </div>
    </div>
  );
};

export default AuthForm;
