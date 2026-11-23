'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2, LogIn } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isRegistered = searchParams.get('registered') === 'true';
  const prefillEmail = searchParams.get('email') || '';

  const [formData, setFormData] = useState({
    email: prefillEmail,
    password: '',
  });

  const [touched, setTouched] = useState({
    email: !!prefillEmail,
    password: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const validateField = (field: 'email' | 'password', value: string): string | undefined => {
    if (field === 'email') {
      const trimmed = value.trim();
      if (!trimmed) return 'Email is required';
      if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address';
    }

    if (field === 'password') {
      if (!value) return 'Password is required';
    }

    return undefined;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name as keyof typeof touched]) {
      const errorMsg = validateField(name as 'email' | 'password', value);
      setErrors((prev) => ({ ...prev, [name]: errorMsg, general: undefined }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errorMsg = validateField(name as 'email' | 'password', value);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setTouched({ email: true, password: true });

    const emailError = validateField('email', formData.email);
    const passwordError = validateField('password', formData.password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const result = await loginUser({
      email: formData.email.trim(),
      password: formData.password,
    });

    setIsSubmitting(false);

    if (result.error) {
      setErrors({ general: result.error.message });
      return;
    }

    if (result.token) {
      setLoginSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 800);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-muted/40 font-sans px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="text-center space-y-1 pb-4">
            <div className="mx-auto size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-1">
              <LogIn className="size-5" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Sign in to TriageSync
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your email and password to access your workspace
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Newly Registered Notice */}
            {isRegistered && !loginSuccess && (
              <Alert className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <AlertDescription>
                  Registration completed! Please sign in with your credentials.
                </AlertDescription>
              </Alert>
            )}

            {/* General Error Alert */}
            {errors.general && (
              <Alert variant="destructive" className="border-destructive/50">
                <AlertCircle className="size-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Login Success Notification */}
            {loginSuccess && (
              <Alert className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <AlertDescription>
                  Authenticated successfully! Redirecting to dashboard...
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="jane@example.com"
                  disabled={isSubmitting || loginSuccess}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  disabled={isSubmitting || loginSuccess}
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || loginSuccess}
                className="w-full mt-2"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t py-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create account
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center font-sans text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
