'use client';

import React, { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { ZSegmentedControl } from '@/shared/ui/ZSegmentedControl';
import { ZBadge } from '@/shared/ui/ZBadge';
import { usePaymentStore } from '../store';
import { usePayment } from './usePayment';
import { useRouterStore } from '@/shared/lib/stores';
import { texts } from '@/shared/constants/texts';
import type { PaymentMethod } from '@/shared/schemas';

const PAYMENT_OPTIONS = [
  { value: 'yookassa_card' as PaymentMethod, label: texts.paywall.yookassaCard },
  { value: 'sbp' as PaymentMethod, label: texts.paywall.sbp },
  { value: 'manual_transfer' as PaymentMethod, label: texts.paywall.manualTransfer },
];

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] as const } },
};

export function PaywallScreen() {
  const entitlement = usePaymentStore((s) => s.entitlement);
  const isPremium = usePaymentStore((s) => s.isPremium);
  const startTrialServer = usePaymentStore((s) => s.startTrialServer);
  const syncFromServer = usePaymentStore((s) => s.syncFromServer);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('yookassa_card');
  const [trialLoading, setTrialLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const { initiatePayment, processing } = usePayment();
  const back = useRouterStore((s) => s.back);

  const premium = isPremium();
  const showTrial = !entitlement.trialUsed;

  const handleStartTrial = async () => {
    setTrialLoading(true);
    const ok = await startTrialServer();
    setTrialLoading(false);
    if (ok) {
      back();
    } else {
      // Если сеть недоступна — не оставляем пользователя в тупике,
      // показываем уведомление, базовый функционал всё равно доступен.
      alert(texts.paywall.trialError);
    }
  };

  const handlePay = () => {
    initiatePayment(selectedMethod);
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    await syncFromServer();
    setCheckingStatus(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <motion.div
        className="flex-1 px-4 pb-8 space-y-6 overflow-y-auto"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Подписка активна */}
        {premium && (
          <motion.div variants={item} className="flex justify-center pt-4">
            <ZBadge variant="primary" className="text-sm px-4 py-1.5">
              {texts.paywall.subscribed}
            </ZBadge>
          </motion.div>
        )}

        {/* Бесплатные функции */}
        <motion.div variants={item}>
          <p className="text-center text-sm text-muted-foreground">
            {texts.paywall.freeNote}
          </p>
        </motion.div>

        {/* Список премиум-функций */}
        <motion.div variants={item} className="space-y-2">
          {texts.paywall.features.map((feature, i) => (
            <ZCard key={i} variant="default" className="flex items-start gap-3 py-3 px-4">
              <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
                <Check size={12} className="text-primary" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-foreground leading-snug">
                  {feature.title}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </span>
              </div>
            </ZCard>
          ))}
        </motion.div>

        {/* Цена */}
        <motion.div variants={item} className="text-center">
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={20} className="text-primary" strokeWidth={1.5} />
            <span className="text-2xl font-bold text-foreground">
              {texts.paywall.price}
            </span>
          </div>
        </motion.div>

        {/* Способ оплаты */}
        <motion.div variants={item} className="space-y-3">
          <p className="text-sm font-medium text-foreground text-center">
            {texts.paywall.paymentMethod}
          </p>
          <div className="w-full">
            <ZSegmentedControl
              options={PAYMENT_OPTIONS}
              value={selectedMethod}
              onChange={setSelectedMethod}
              ariaLabel={texts.paywall.paymentMethod}
            />
          </div>
        </motion.div>

        {/* Кнопки */}
        <motion.div variants={item} className="space-y-3">
          {!premium && showTrial && (
            <>
              <ZButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleStartTrial}
                loading={trialLoading}
              >
                {texts.paywall.startTrial}
              </ZButton>
              <p className="text-center text-xs text-muted-foreground">
                {texts.paywall.trialNote}
              </p>
            </>
          )}

          {!premium && !showTrial && (
            <>
              <ZButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handlePay}
                loading={processing}
              >
                {texts.paywall.payNow} {texts.paywall.price}
              </ZButton>
              <ZButton
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleCheckStatus}
                loading={checkingStatus}
              >
                {texts.paywall.checkStatus}
              </ZButton>
            </>
          )}

          {premium && (
            <ZButton
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={back}
            >
              {texts.common.close}
            </ZButton>
          )}
        </motion.div>

        {/* Без давления */}
        <motion.p
          variants={item}
          className="text-center text-xs text-muted-foreground pb-4"
        >
          {texts.paywall.noPressure}
        </motion.p>
      </motion.div>
    </div>
  );
}
