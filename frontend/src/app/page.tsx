'use client';

import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ArrowRight, LayoutDashboard, LogIn, ShieldAlert } from "lucide-react";

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-muted/40 font-sans px-4 py-8">
      <main className="max-w-md w-full space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="mx-auto size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-1">
              <ShieldAlert className="size-6" />
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight">
              TriageSync
            </CardTitle>
            <CardDescription className="text-sm">
              Intelligent incident triaging and resource scheduling system.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 pt-2">
            {isAuthenticated && user ? (
              <Link href="/dashboard" className="block w-full">
                <Button size="lg" className="w-full">
                  <LayoutDashboard className="mr-2 size-4" />
                  Go to Dashboard ({user.name})
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/register" className="block w-full">
                  <Button size="lg" className="w-full">
                    Get Started
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
                <Link href="/login" className="block w-full">
                  <Button variant="outline" size="lg" className="w-full">
                    <LogIn className="mr-2 size-4" />
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
