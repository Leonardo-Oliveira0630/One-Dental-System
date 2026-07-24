"use client";
import { Card, CardContent, CardHeader } from "./card";
import { SparklesComp } from "./sparkles";
import { TimelineContent } from "./timeline-animation";
import { VerticalCutReveal } from "./vertical-cut-reveal";
import { cn } from "../../lib/utils";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { SubscriptionPlan } from "../../types";

interface PricingProps {
  plans: SubscriptionPlan[];
  selectedPlanId: string;
  onSelectPlan: (id: string) => void;
  title?: string;
  subtitle?: string;
  regType?: string;
}

export default function PricingSection({ plans, selectedPlanId, onSelectPlan, title = "Escolha seu plano", subtitle = "Planos criados para o seu momento.", regType }: PricingProps) {
  const [isYearly, setIsYearly] = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
        onSelectPlan(plans[0].id);
    }
  }, [plans, selectedPlanId, onSelectPlan]);

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

  const getFeaturesList = (plan: SubscriptionPlan) => {
    const list = [];
    if (regType === 'LAB' && plan.features.isLabFreeStoreOnly) {
        list.push("Receber Pedidos Online Grátis", "Acesso ao App dos Dentistas Grátis");
        return list;
    }
    
    if (plan.features.maxUsers === 999999) list.push("Usuários Ilimitados");
    else list.push(`Até ${plan.features.maxUsers} usuários`);
    
    if (plan.features.maxJobsPerMonth === 999999) list.push("Pedidos Ilimitados");
    else list.push(`Até ${plan.features.maxJobsPerMonth} pedidos/mês`);
    
    if (plan.features.maxDentists === 999999) list.push("Clientes Ilimitados");
    else list.push(`Até ${plan.features.maxDentists} clientes`);
    
    list.push(`${plan.features.maxStorageGB}GB de Armazenamento`);
    
    if (plan.features.hasStoreModule) list.push("Módulo de Loja Online");
    if (plan.whatsappModulePrice !== undefined) list.push(`Módulo WhatsApp (+R$${plan.whatsappModulePrice.toFixed(2)})`);
    
    return list;
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
            {title}
          </VerticalCutReveal>
        </h2>

        <TimelineContent
          as="p"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="text-slate-400"
        >
          {subtitle}
        </TimelineContent>
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
        {plans.map((plan, index) => {
          const isSelected = selectedPlanId === plan.id;
          const features = getFeaturesList(plan);
          const popular = plan.price > 0 && plan.price < 200; // Just to highlight a middle plan visually

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
                    : "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-800 hover:border-slate-600 z-10"
                }`}
                onClick={() => onSelectPlan(plan.id)}
              >
                {plan.trialDays && plan.trialDays > 0 && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-sm z-30">
                    {plan.trialDays} DIAS GRÁTIS
                  </div>
                )}
                <CardHeader className="text-left pb-4">
                  <div className="flex justify-between">
                    <h3 className="text-xl font-bold uppercase tracking-wider text-slate-300 mb-2">{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-semibold">
                      {plan.price === 0 ? "Grátis" : "R$ "}
                      {plan.price > 0 && (
                        <NumberFlow
                          format={{
                            currency: "BRL",
                          }}
                          value={plan.price}
                          className="text-3xl font-semibold inline-block"
                        />
                      )}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-slate-400 ml-1 text-sm">
                        /mês
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0 flex-1 flex flex-col">
                  <button
                    className={`w-full mb-6 p-3 text-sm font-bold rounded-xl transition-colors ${
                      isSelected
                        ? "bg-gradient-to-t from-indigo-600 to-blue-500 shadow-lg shadow-indigo-900/50 border border-indigo-400 text-white"
                        : "bg-slate-800 border border-slate-700 text-white hover:bg-slate-700"
                    }`}
                  >
                    {isSelected ? "Selecionado" : "Selecionar Plano"}
                  </button>

                  <div className="space-y-3 pt-4 border-t border-slate-700/50 mt-auto">
                    <ul className="space-y-2.5">
                      {features.map((feature, featureIndex) => (
                        <li
                          key={featureIndex}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="h-2 w-2 mt-1.5 bg-indigo-400 rounded-full shrink-0"></span>
                          <span className="text-slate-300 leading-tight">{feature}</span>
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
