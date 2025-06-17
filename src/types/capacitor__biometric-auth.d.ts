
declare module '@capacitor/biometric-auth' {
  export const BiometricAuth: {
    checkBiometry(): Promise<{ isAvailable: boolean; biometryType?: string }>;
    authenticate(options: {
      reason?: string;
      title?: string;
      subtitle?: string;
      description?: string;
      negativeText?: string;
    }): Promise<{ success: boolean }>;
  };
}
