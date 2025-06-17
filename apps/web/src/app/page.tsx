"use client";

import { useEffect } from "react";
import { NavigationBar } from "@/components/NavigationBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, Shield, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { login, isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    // Check if this is an extension authentication request
    const urlParams = new URLSearchParams(window.location.search);
    const authSource = urlParams.get('auth_source');
    const extensionId = urlParams.get('extension_id');

    if (authSource === 'extension' && extensionId && !isAuthenticated && !isLoading) {
      // Store extension ID for callback
      localStorage.setItem('auth_extension_id', extensionId);
      
      // Automatically trigger authentication
      login();
    }
  }, [login, isAuthenticated, isLoading]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-white">
      <NavigationBar />
      
      <main className="flex flex-col items-center w-full flex-1">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center px-4 sm:px-8 md:px-16 py-16 md:py-24 text-center max-w-4xl">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-8 h-8 text-[var(--color-primary)]" />
            <h1 className="font-text-4xl-normal text-black text-[length:var(--text-4xl-normal-font-size)] tracking-[var(--text-4xl-normal-letter-spacing)] leading-[var(--text-4xl-normal-line-height)]">
              Infillo AI
            </h1>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-black mb-6 leading-tight">
            Fill forms in seconds,<br />not minutes
          </h2>
          
          <p className="font-text-lg-semibold text-[var(--text-secondary)] text-lg md:text-xl mb-8 max-w-2xl px-4">
            Infillo AI uses intelligent technology to help you complete any online form instantly. 
            Save your information once, use it everywhere.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/demo-forms">
              <Button className="h-12 px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-text-sm-medium flex items-center gap-2 w-full sm:w-auto">
                Try Demo Forms
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/information-records">
              <Button variant="outline" className="h-12 px-6 border-[var(--border-primary)] font-text-sm-medium w-full sm:w-auto">
                Get Started Free
              </Button>
            </Link>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="w-full px-4 sm:px-8 md:px-16 py-16 bg-[var(--bg-secondary)]">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-semibold text-center text-black mb-12">
              How Infillo AI Works
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <Card className="p-6 md:p-8 bg-white border-[var(--border-primary)] text-center">
                <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-4 mx-auto">
                  <span className="font-text-lg-semibold text-[var(--color-primary)]">1</span>
                </div>
                <h4 className="font-text-lg-semibold text-black mb-3">
                  Save Your Information
                </h4>
                <p className="font-text-sm-normal text-[var(--text-secondary)]">
                  Store your personal details, work history, and preferences securely in one place
                </p>
              </Card>

              {/* Step 2 */}
              <Card className="p-6 md:p-8 bg-white border-[var(--border-primary)] text-center">
                <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-4 mx-auto">
                  <span className="font-text-lg-semibold text-[var(--color-primary)]">2</span>
                </div>
                <h4 className="font-text-lg-semibold text-black mb-3">
                  AI Detects Forms
                </h4>
                <p className="font-text-sm-normal text-[var(--text-secondary)]">
                  Our AI automatically recognizes form fields and understands what information is needed
                </p>
              </Card>

              {/* Step 3 */}
              <Card className="p-6 md:p-8 bg-white border-[var(--border-primary)] text-center">
                <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-4 mx-auto">
                  <span className="font-text-lg-semibold text-[var(--color-primary)]">3</span>
                </div>
                <h4 className="font-text-lg-semibold text-black mb-3">
                  Fill Instantly
                </h4>
                <p className="font-text-sm-normal text-[var(--text-secondary)]">
                  Click once to fill entire forms with your information, perfectly formatted every time
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full px-4 sm:px-8 md:px-16 py-16">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-semibold text-center text-black mb-12">
              Why Choose Infillo AI
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <Clock className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-text-lg-semibold text-black mb-2">Save Hours Every Week</h4>
                  <p className="font-text-sm-normal text-[var(--text-secondary)]">
                    Stop typing the same information repeatedly. Fill any form in seconds, not minutes.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Shield className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-text-lg-semibold text-black mb-2">Your Data, Protected</h4>
                  <p className="font-text-sm-normal text-[var(--text-secondary)]">
                    Your information is encrypted and stored securely. You control what gets shared.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Sparkles className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-text-lg-semibold text-black mb-2">Smart Suggestions</h4>
                  <p className="font-text-sm-normal text-[var(--text-secondary)]">
                    AI learns from your preferences and suggests the best information for each field.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-text-lg-semibold text-black mb-2">Works Everywhere</h4>
                  <p className="font-text-sm-normal text-[var(--text-secondary)]">
                    Compatible with job applications, contact forms, registrations, and more.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full px-4 sm:px-8 md:px-16 py-16 md:py-20 bg-[var(--bg-secondary)]">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-semibold text-black mb-4">
              Ready to save time?
            </h3>
            <p className="font-text-lg-semibold text-[var(--text-secondary)] text-lg mb-8">
              Join thousands who fill forms faster with Infillo AI
            </p>
            <Link href="/demo-forms">
              <Button className="h-12 px-8 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-text-sm-medium">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
