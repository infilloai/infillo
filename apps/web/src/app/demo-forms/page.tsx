"use client";

import { useState } from "react";
import { NavigationBar } from "@/components/NavigationBar";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactForm } from "@/components/forms/ContactForm";
import { JobForm } from "@/components/forms/JobForm";
import { BankingForm } from "@/components/forms/BankingForm";
import { ShippingForm } from "@/components/forms/ShippingForm";
import { FORM_TABS, PAGE_CONTENT, LAYOUT } from "@/lib/constants";

export default function DemoForms() {
  const [activeTab, setActiveTab] = useState<string>(FORM_TABS.CONTACT);

  return (
    <div className="flex flex-col w-full min-h-screen bg-white">
      <NavigationBar />
      <main className={`flex justify-center w-full ${LAYOUT.PADDING.PAGE} flex-1 bg-[var(--bg-main)]`}>
        <div className="flex flex-col w-[672px] items-center gap-6">
          <PageHeader 
            title={PAGE_CONTENT.HOME.title}
            description={PAGE_CONTENT.HOME.description}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[642px]">
            <TabsList className="w-full h-10 p-1 bg-[var(--bg-tertiary)] gap-2 rounded-md">
              <TabsTrigger 
                value={FORM_TABS.CONTACT} 
                className="h-8 px-3 rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-shadow-xs data-[state=active]:text-[var(--text-primary)] data-[state=inactive]:text-[var(--text-secondary)] font-text-sm-medium text-[length:var(--text-sm-medium-font-size)] tracking-[var(--text-sm-medium-letter-spacing)] leading-[var(--text-sm-medium-line-height)]"
              >
                Contact Information
              </TabsTrigger>
              <TabsTrigger 
                value={FORM_TABS.JOB} 
                className="h-8 px-3 rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-shadow-xs data-[state=active]:text-[var(--text-primary)] data-[state=inactive]:text-[var(--text-secondary)] font-text-sm-medium text-[length:var(--text-sm-medium-font-size)] tracking-[var(--text-sm-medium-letter-spacing)] leading-[var(--text-sm-medium-line-height)]"
              >
                Job Application
              </TabsTrigger>
              <TabsTrigger 
                value={FORM_TABS.BANKING} 
                className="h-8 px-3 rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-shadow-xs data-[state=active]:text-[var(--text-primary)] data-[state=inactive]:text-[var(--text-secondary)] font-text-sm-medium text-[length:var(--text-sm-medium-font-size)] tracking-[var(--text-sm-medium-letter-spacing)] leading-[var(--text-sm-medium-line-height)]"
              >
                Banking Information
              </TabsTrigger>
              <TabsTrigger 
                value={FORM_TABS.SHIPPING} 
                className="h-8 px-3 rounded-sm data-[state=active]:bg-white data-[state=active]:shadow-shadow-xs data-[state=active]:text-[var(--text-primary)] data-[state=inactive]:text-[var(--text-secondary)] font-text-sm-medium text-[length:var(--text-sm-medium-font-size)] tracking-[var(--text-sm-medium-letter-spacing)] leading-[var(--text-sm-medium-line-height)]"
              >
                Shipping Information
              </TabsTrigger>
            </TabsList>

            <TabsContent value={FORM_TABS.CONTACT} className="mt-6">
              <ContactForm />
            </TabsContent>

            <TabsContent value={FORM_TABS.JOB} className="mt-6">
              <JobForm />
            </TabsContent>

            <TabsContent value={FORM_TABS.BANKING} className="mt-6">
              <BankingForm />
            </TabsContent>

            <TabsContent value={FORM_TABS.SHIPPING} className="mt-6">
              <ShippingForm />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
} 