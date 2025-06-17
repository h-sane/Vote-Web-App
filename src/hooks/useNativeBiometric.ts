
import { useState } from "react";

export function useNativeBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);

  const checkAvailability = async () => {
    try {
      const { BiometricAuth } = await import("@capacitor/biometric-auth");
      const isAvailableResult = await BiometricAuth.checkBiometry();
      setIsAvailable(isAvailableResult.isAvailable || false);
      return isAvailableResult.isAvailable;
    } catch {
      setIsAvailable(false);
      return false;
    }
  };

  const verifyBiometric = async (): Promise<boolean> => {
    try {
      const { BiometricAuth } = await import("@capacitor/biometric-auth");
      const result = await BiometricAuth.authenticate({
        reason: "Authenticate to continue voting.",
        title: "Biometric Authentication",
        subtitle: "Vote Secure Campus",
        description: "Use your fingerprint or Face ID to continue.",
        negativeText: "Cancel",
      });
      return !!result.success;
    } catch (err) {
      return false;
    }
  };

  return { checkAvailability, verifyBiometric, isAvailable };
}
