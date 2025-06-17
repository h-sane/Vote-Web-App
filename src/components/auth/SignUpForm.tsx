import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Fingerprint } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { biometricAuthenticate } from "@/hooks/useBiometric";

const SignUpForm = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    rollNumber: "",
    email: "",
    password: "",
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Require biometric scan for registration
      const fingerprintHash = await biometricAuthenticate();

      // Sign up user without email confirmation
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            roll_number: form.rollNumber,
          },
        },
      });

      if (error) throw error;
      if (data.user) {
        await supabase.from("users_biometrics").insert({
          user_id: data.user.id,
          fingerprint_hash: fingerprintHash,
          device_info: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        });

        toast({
          title: "Registration Successful",
          description: "Your registration is complete. You can now sign in.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div>
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          type="text"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="rollNumber">Roll Number</Label>
        <Input
          id="rollNumber"
          type="text"
          value={form.rollNumber}
          onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        <UserPlus className="w-4 h-4 mr-2" />
        {loading ? "Registering..." : "Register with Biometric"}
      </Button>
      <div className="text-center text-sm text-gray-600">
        <Fingerprint className="w-4 h-4 mx-auto mb-1" />
        Biometric registration required
      </div>
    </form>
  );
};

export default SignUpForm;
