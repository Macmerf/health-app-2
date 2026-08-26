'use client';

import React, { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Check } from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { ZBadge } from '@/shared/ui/ZBadge';
import { usePaymentStore } from '../store';
import { usePayment } from './usePayment';
import { YookassaWidget } from './YookassaWidget';
import { useRouterStore } from '@/shared/lib/stores';
import { texts } from '@/shared/constants/texts';
import { FOREVER_EXPIRES_AT } from '@/shared/constants/plans';
import type { SubscriptionPlan } from '@/shared/schemas';

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
  const startTrialServer = usePaymentStore((s) => s.startTrialServer);
  const syncFromServer = usePaymentStore((s) => s.syncFromServer);
  const [trialLoading, setTrialLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('month');
  // Состояние виджета: токен создаётся при клике «Оплатить».
  const [widget, setWidget] = useState<{ confirmationToken: string; paymentId: string | null } | null>(null);
  const { createPayment, processing } = usePayment();
  const back = useRouterStore((s) => s.back);

  // Подписка на результат, а не на ссылку функции — для мгновенного обновления статуса.
  const premium = usePaymentStore((s) => s.isPremium());
  const showTrial = !entitlement.trialUsed;
  const isForever = entitlement.expiresAt === FOREVER_EXPIRES_AT;

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

  const handlePay = async (plan: SubscriptionPlan) => {
    const result = await createPayment(plan);
    // null — dev-режим (подписка уже активирована) или ошибка (toast уже показан).
    if (result) {
      setWidget(result);
    }
  };

  const handleWidgetSuccess = () => {
    setWidget(null);
  };

  const handleWidgetCancel = () => {
    setWidget(null);
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    await syncFromServer();
    setCheckingStatus(false);
  };

  // Режим оплаты: показываем виджет ЮKassa вместо списка функций
  if (widget) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {texts.paywall.paymentTitle}
            </p>
            <ZButton variant="ghost" size="sm" onClick={handleWidgetCancel}>
              {texts.common.back}
            </ZButton>
          </div>
          <ZCard>
            <YookassaWidget
              confirmationToken={widget.confirmationToken}
              paymentId={widget.paymentId}
              onSuccess={handleWidgetSuccess}
              onCancel={handleWidgetCancel}
            />
          </ZCard>
          <p className="text-xs text-muted-foreground text-center">
            {texts.paywall.widgetNote}
          </p>
        </div>
      </div>
    );
  }

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

        {/* Тарифы */}
        {!isForever && (
          <motion.div variants={item} className="space-y-2">
            {texts.paywall.plans.map((plan) => {
              const active = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  aria-pressed={active}
                  className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                    active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{plan.title}</span>
                    {plan.note && <span className="text-xs text-muted-foreground">{plan.note}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{plan.price}</span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        active ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                      }`}
                    >
                      {active && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}

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

          {!premium && !showTrial && !isForever && (
            <>
              <ZButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => handlePay(selectedPlan)}
                loading={processing}
              >
                {texts.paywall.payNow} {texts.paywall.plans.find((p) => p.id === selectedPlan)?.price}
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

          {/* Продление активной подписки — дни добавляются к текущему сроку */}
          {premium && !isForever && (
            <>
              <ZButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => handlePay(selectedPlan)}
                loading={processing}
              >
                {texts.paywall.extendNow} {texts.paywall.plans.find((p) => p.id === selectedPlan)?.price}
              </ZButton>
              <ZButton
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={back}
              >
                {texts.common.close}
              </ZButton>
            </>
          )}

          {premium && isForever && (
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
          className="text-center text-xs text-muted-foreground pb-2"
        >
          {texts.paywall.noPressure}
        </motion.p>

        {/* Ссылка на оферту */}
        <motion.p variants={item} className="text-center text-xs text-muted-foreground pb-4">
          {texts.paywall.termsNote}{' '}
          <a
            href="/oferta"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary transition-colors"
          >
            «Публичная оферта ЗаботаPsy+»
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}
