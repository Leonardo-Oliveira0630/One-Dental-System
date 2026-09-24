"use client";
import { Card, CardContent, CardHeader } from "./card";
import { SparklesComp } from "./sparkles";
import { TimelineContent } from "./timeline-animation";
import { VerticalCutReveal } from "./vertical-cut-reveal";
import { cn } from "../../lib/utils";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { useRef, useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SubscriptionPlan } from "../../types";
import { getDetailedPlanFeatures, PlanFeatureItem, isPlanPrivate } from "../../utils/planFeatures";
import { Check, X, Lock, Sparkles } from "lucide-react";

interface PricingProps {
  plans: SubscriptionPlan[];
  selectedPlanId: string;
  onSelectPlan: (id: string) => void;
  title?: string;
  subtitle?: string;
  regType?: string;
}

export default function PricingSection({ plans, selectedPlanId, onSelectPlan, title, subtitle, regType }: PricingProps) {
  const { t, i18n } = useTranslation();
  const [isYearly, setIsYearly] = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);

  const displayTitle = title || t('admin.pricing.chooseYourPlan', 'Escolha seu plano');
  const displaySubtitle = subtitle || t('admin.pricing.plansCreatedForYou', 'Planos criados para o seu momento.');

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      const aIsFree = (a.price || 0) === 0 || a.name?.toLowerCase().includes('grátis') || a.name?.toLowerCase().includes('gratuito');
      const bIsFree = (b.price || 0) === 0 || b.name?.toLowerCase().includes('grátis') || b.name?.toLowerCase().includes('gratuito');
      if (aIsFree && !bIsFree) return -1;
      if (!aIsFree && bIsFree) return 1;
      return (a.price || 0) - (b.price || 0);
    });
  }, [plans]);

  useEffect(() => {
    if (sortedPlans.length > 0 && !selectedPlanId) {
        onSelectPlan(sortedPlans[0].id);
    }
  }, [sortedPlans, selectedPlanId, onSelectPlan]);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.2,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  return (
    <div
      className="relative w-full bg-slate-950 overflow-hidden rounded-3xl"
      ref={pricingRef}
    >
      <TimelineContent
        animationNum={4}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="absolute top-0 h-full w-full overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)] "
      >
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#3a3a3a01_1px,transparent_1px)] bg-[size:70px_80px] "></div>
        <SparklesComp
          density={1200}
          direction="bottom"
          speed={1}
          color="#4f46e5"
          className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
        />
      </TimelineContent>

      <article className="text-center mb-6 pt-12 max-w-3xl mx-auto space-y-2 relative z-50">
        <h2 className="text-3xl font-medium text-white">
          <VerticalCutReveal
            splitBy="words"
            staggerDuration={0.1}
            staggerFrom="first"
            reverse={true}
            containerClassName="justify-center"
            transition={{
              type: "spring",
              stiffness: 250,
              damping: 40,
              delay: 0,
            }}
          >
            {displayTitle}
          </VerticalCutReveal>
        </h2>

        <TimelineContent
          as="p"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="text-slate-400"
        >
          {displaySubtitle}
        </TimelineContent>

        <div className="flex justify-center mt-6">
          <div className="bg-slate-900/80 p-1 rounded-xl flex border border-slate-800">
              <button 
                  onClick={() => setIsYearly(false)}
                  className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${!isYearly ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                  {t('admin.pricing.monthly', 'Mensal')}
              </button>
              <button 
                  onClick={() => setIsYearly(true)}
                  className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${isYearly ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                  {t('admin.pricing.yearly', 'Anual')} <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-md leading-none">{t('admin.pricing.discountBadge', 'Desconto')}</span>
              </button>
          </div>
        </div>
      </article>

      <div
        className="absolute top-0 left-[10%] right-[10%] w-[80%] h-full z-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at center, #206ce8 0%, transparent 60%)`,
          opacity: 0.2,
          mixBlendMode: "screen",
        }}
      />

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl gap-4 py-6 px-4 mx-auto relative z-10`}>
        {sortedPlans.map((plan, index) => {
          const isSelected = selectedPlanId === plan.id;
          const features = getDetailedPlanFeatures(plan, regType, (key, defVal, opts) => String(t(key, { defaultValue: defVal, ...opts })));
          const isExclusive = isPlanPrivate(plan);
          
          let displayPrice = plan.price;
          const annualDiscount = plan.annualDiscountPercent || 0;
          let oldPrice = null;
          
          if (isYearly && annualDiscount > 0) {
            oldPrice = displayPrice;
            displayPrice = displayPrice * (1 - (annualDiscount / 100));
          }

          return (
            <TimelineContent
              key={plan.id}
              as="div"
              animationNum={1 + index}
              timelineRef={pricingRef}
              customVariants={revealVariants}
              className="h-full"
            >
              <Card
                className={`relative text-white border transition-all duration-300 cursor-pointer h-full flex flex-col ${
                  isSelected
                    ? "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 shadow-[0px_0px_30px_0px_#4f46e5] border-indigo-500 scale-[1.02] z-20"
                    : isExclusive
                    ? "bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-amber-500/40 hover:border-amber-400 z-10"
                    : "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-800 hover:border-slate-600 z-10"
                }`}
                onClick={() => onSelectPlan(plan.id)}
              >
                {isYearly && annualDiscount > 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full whitespace-nowrap shadow-sm z-30">
                      {t('admin.pricing.savePercent', { percent: annualDiscount, defaultValue: `Economize ${annualDiscount}%` })}
                  </div>
                )}
                {isExclusive && (
                  <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-br-xl shadow-md z-30 flex items-center gap-1">
                    <Lock size={10} className="stroke-[3]" /> {t('admin.pricing.exclusiveForYou', 'EXCLUSIVO PARA VOCÊ')}
                  </div>
                )}
                {Boolean(plan.trialDays && plan.trialDays > 0) && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-sm z-30">
                    {t('admin.pricing.daysFree', { days: plan.trialDays, defaultValue: `${plan.trialDays} DIAS GRÁTIS` })}
                  </div>
                )}
                <CardHeader className="text-left pb-4 pt-6 mt-2">
                  <div className="flex justify-between">
                    <h3 className="text-xl font-bold uppercase tracking-wider text-slate-300 mb-2">{plan.name}</h3>
                  </div>
                  {oldPrice && (
                    <span className="text-[10px] font-bold text-slate-400 line-through">
                        {t('admin.pricing.fromPrice', { price: oldPrice.toFixed(2), defaultValue: `De R$ ${oldPrice.toFixed(2)}/mês` })}
                    </span>
                  )}
                  <div className="flex items-baseline">
                    <span className="text-3xl font-semibold">
                      {displayPrice === 0 ? t('admin.pricing.free', 'Grátis') : "R$ "}
                      {displayPrice > 0 && (
                        <NumberFlow
                          format={{
                            currency: "BRL",
                          }}
                          value={displayPrice}
                          className="text-3xl font-semibold inline-block"
                        />
                      )}
                    </span>
                    {displayPrice > 0 && (
                      <span className="text-slate-400 ml-1 text-sm">
                        {t('admin.pricing.perMonth', '/mês')}
                      </span>
                    )}
                  </div>
                  {isYearly && displayPrice > 0 && (
                    <div className="text-[10px] font-bold text-indigo-400 mt-1">
                        {t('admin.pricing.billedAnnually', { price: (displayPrice * 12).toFixed(2), defaultValue: `Cobrado R$ ${(displayPrice * 12).toFixed(2)} ao ano` })}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0 flex-1 flex flex-col">
                  <button
                    className={`w-full mb-6 p-3 text-sm font-bold rounded-xl transition-colors ${
                      isSelected
                        ? "bg-gradient-to-t from-indigo-600 to-blue-500 shadow-lg shadow-indigo-900/50 border border-indigo-400 text-white"
                        : "bg-slate-800 border border-slate-700 text-white hover:bg-slate-700"
                    }`}
                  >
                    {isSelected ? t('admin.pricing.selected', 'Selecionado') : t('admin.pricing.selectPlan', 'Selecionar Plano')}
                  </button>

                  <div className="space-y-3 pt-4 border-t border-slate-700/50 mt-auto">
                    <ul className="space-y-2.5">
                      {features.map((feature, featureIndex) => (
                        <li
                          key={featureIndex}
                          className={`flex items-start gap-2 text-xs sm:text-sm ${
                            !feature.included ? 'opacity-40 line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {feature.included ? (
                            <span className={`h-4 w-4 mt-0.5 rounded-full flex items-center justify-center shrink-0 ${
                              feature.highlight ? 'bg-indigo-500 text-white' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              <Check size={10} strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="h-4 w-4 mt-0.5 rounded-full flex items-center justify-center shrink-0 bg-red-500/20 text-red-400">
                              <X size={10} strokeWidth={3} />
                            </span>
                          )}
                          <span className={`leading-tight ${feature.highlight ? 'font-bold text-white' : ''}`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TimelineContent>
          );
        })}
      </div>
    </div>
  );
}
