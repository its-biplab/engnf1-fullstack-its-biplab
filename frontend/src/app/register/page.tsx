'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/lib/api';
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
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  general?: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateField = (field: 'name' | 'email' | 'password', value: string): string | undefined => {
    if (field === 'name') {
      const trimmed = value.trim();
      if (!trimmed) return 'Name is required';
      if (trimmed.length < 2) return 'Name must be at least 2 characters';
      if (trimmed.length > 50) return 'Name cannot exceed 50 characters';
    }

    if (field === 'email') {
      const trimmed = value.trim();
      if (!trimmed) return 'Email is required';
      if (trimmed.length > 254) return 'Email cannot exceed 254 characters';
      if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address';
    }

    if (field === 'password') {
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Password must be at least 8 characters long';
      if (value.length > 64) return 'Password cannot exceed 64 characters';
      if (!PASSWORD_REGEX.test(value)) {
        return 'Password must contain at least one letter and one number';
      }
    }

    return undefined;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name as keyof typeof touched]) {
      const errorMsg = validateField(name as 'name' | 'email' | 'password', value);
      setErrors((prev) => ({ ...prev, [name]: errorMsg, general: undefined }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errorMsg = validateField(name as 'name' | 'email' | 'password', value);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setTouched({ name: true, email: true, password: true });

    const nameError = validateField('name', formData.name);
    const emailError = validateField('email', formData.email);
    const passwordError = validateField('password', formData.password);

    if (nameError || emailError || passwordError) {
      setErrors({
        name: nameError,
        email: emailError,
        password: passwordError,
      });
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage(null);

    const result = await registerUser({
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
    });

    setIsSubmitting(false);

    if (result.error) {
      setErrors({ general: result.error.message });
      return;
    }

    if (result.user) {
      setSuccessMessage('Registration successful! Redirecting to login...');
      setTimeout(() => {
        router.push(`/login?registered=true&email=${encodeURIComponent(result.user?.email || '')}`);
      }, 1200);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col justify-center items-center bg-muted/40 font-sans px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="text-center space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
            <CardDescription className="text-sm">
              Sign up for TriageSync to start managing tickets and resources
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* General Error Alert */}
            {errors.general && (
              <Alert variant="destructive" className="border-destructive/50">
                <AlertCircle className="size-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {successMessage && (
              <Alert className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Name Input */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Jane Doe"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.name}
                />
                {errors.name ? (
                  <p className="text-xs text-destructive">{errors.name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">2 to 50 characters</p>
                )}
              </div>

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
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email}
                />
                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Must be a valid email format</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.password}
                />
                {errors.password ? (
                  <p className="text-xs text-destructive">{errors.password}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    8 to 64 characters, at least 1 letter and 1 number
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button type="submit" disabled={isSubmitting} className="w-full mt-2" size="lg">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t py-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
