'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { CheckCircle2 } from 'lucide-react';

function LoginFormContent() {
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get('registered') === 'true';
  const registeredEmail = searchParams.get('email') || '';

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-muted/40 font-sans px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="text-center space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold tracking-tight">Sign in to TriageSync</CardTitle>
            <CardDescription className="text-sm">
              Welcome back! Please enter your details.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isRegistered && (
              <Alert className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <AlertDescription>
                  Account created successfully! Please sign in with your credentials.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email Address</Label>
                <Input
                  id="login-email"
                  type="email"
                  defaultValue={registeredEmail}
                  placeholder="name@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" className="w-full mt-2" size="lg">
                Sign In
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
          Loading...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
