
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { LogIn } from "lucide-react";
import { biometricAuthenticate } from "@/hooks/useBiometric";

const SignInForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;

      if (data.user) {
        // Require biometric auth
        const scannedHash = await biometricAuthenticate();
        const { data: storedBiometric, error: biometricError } = await supabase
          .from('users_biometrics')
          .select('fingerprint_hash')
          .eq('user_id', data.user.id)
          .single();

        if (biometricError || !storedBiometric)
          throw new Error('No biometric data found. Please register first.');
        if (storedBiometric.fingerprint_hash !== scannedHash) {
          await supabase.auth.signOut();
          throw new Error('Fingerprint did not match. Access denied.');
        }

        toast({
          title: "Login Successful",
          description: "Welcome to Vote Secure Campus!",
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div>
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        <LogIn className="w-4 h-4 mr-2" />
        {loading ? "Signing In..." : "Sign In with Biometric"}
      </Button>
    </form>
  );
};

export default SignInForm;
