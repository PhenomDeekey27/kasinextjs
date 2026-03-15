"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Login failed");
      }

      toast({
        title: "Success",
        description: "Logged in successfully",
        variant: "default",
      });

      const redirectTo = searchParams.get("redirectTo") || "/admin/dashboard";
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
      toast({
        title: "Login Failed",
        description: err.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-2 text-center pt-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.jpeg"
              alt="J Tourism logo"
              width={56}
              height={56}
              className="w-14 h-14 rounded-full object-cover border-2 border-blue-100"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
          <CardDescription>
            Enter your credentials to manage J Tourism bookings.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@jtourism.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="pb-8">
            <Button
              className="w-full bg-slate-900 hover:bg-slate-800 h-12 text-md"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
