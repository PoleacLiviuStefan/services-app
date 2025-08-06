'use client';
import React from "react";
import FaqQuestion from "./FaqQuestion";
import { useTranslation } from "@/hooks/useTranslation";

const FaqClient = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-8 w-full px-4 py-8  text-primaryColor">
        <div>
            <h3 className="font-bold text-xl">{t('faq.title')}</h3>
        </div>
        <div>
      <FaqQuestion
        title={t('faq.howToSchedule.question')}
        answer={
          <p className="flex flex-col">
            <ul>
              <li>{t('faq.howToSchedule.step1')}</li>
              <li>{t('faq.howToSchedule.step2')}</li>
              <li>{t('faq.howToSchedule.step3')}</li>
              <li>{t('faq.howToSchedule.step4')}</li>
              <li>{t('faq.howToSchedule.step5')}</li>
              <li>{t('faq.howToSchedule.step6')}</li>
            </ul>
            <span>{t('faq.howToSchedule.invoice')}</span>
            <span>{t('faq.howToSchedule.zoomLink')}</span>
            <span>{t('faq.howToSchedule.confirmation')}</span>
            <span>{t('faq.howToSchedule.note1')}</span>
            <span>{t('faq.howToSchedule.note2')}</span>
          </p>
        }
      />

      <FaqQuestion
        title={t('faq.trust.question')}
        answer={
          <p className="flex flex-col">
            {t('faq.trust.answer')}
          </p>
        }
      />
      
      <FaqQuestion
        title={t('faq.practices.question')}
        answer={
          <>
            <p>{t('faq.practices.intro')}</p>
            <p><span className="font-bold">Tarotul</span> - {t('faq.practices.tarot')}</p>
            <p><span className="font-bold">Astrologia</span> - {t('faq.practices.astrology')}</p>
            <p><span className="font-bold">Theta Healing / Terapie energetică</span> - {t('faq.practices.theta')}</p>
            <p><span className="font-bold">Numerologia</span> - {t('faq.practices.numerology')}</p>
            <p><span className="font-bold">Coaching spiritual / Consiliere</span> - {t('faq.practices.coaching')}</p>
            <p><span className="font-bold">Psihoterapia</span> - {t('faq.practices.psychotherapy')}</p>
          </>
        }
      />
      
      <FaqQuestion
        title={t('faq.payment.question')}
        answer={
          <p>{t('faq.payment.answer')}</p>
        }
      />
      
      <FaqQuestion
        title={t('faq.cancellation.question')}
        answer={
          <p>{t('faq.cancellation.answer')}</p>
        }
      />
      
      <FaqQuestion
        title={t('faq.specificTopic.question')}
        answer={
          <p>{t('faq.specificTopic.answer')}</p>
        }
      />
      
      <FaqQuestion
        title={t('faq.giftSession.question')}
        answer={
          <p>{t('faq.giftSession.answer')}</p>
        }
      />
      
      <FaqQuestion
        title={t('faq.belief.question')}
        answer={
          <p>{t('faq.belief.answer')}</p>
        }
      />
      </div>
    </div>
  );
};

export default FaqClient;
