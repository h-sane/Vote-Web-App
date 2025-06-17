
/**
 * Native biometric helper for Capacitor. 
 * DO NOT import this file into any TypeScript/React file at the top level! 
 * Only require it dynamically at runtime _inside_ a Capacitor/platform check.
 */
module.exports.authenticate = async function() {
  try {
    const { BiometricAuth } = await import('@capacitor/biometric-auth');
    const isAvailable = await BiometricAuth.checkBiometry();
    if (isAvailable.isAvailable) {
      const result = await BiometricAuth.authenticate({
        reason: "Authenticate using biometric.",
        title: "Biometric Required",
        subtitle: "Vote Secure Campus",
        description: "Scan your fingerprint or use Face ID to login or vote.",
        negativeText: "Cancel",
      });
      if (result.success) {
        // Return a stub hash for demonstration.
        return "native_biometric_verified";
      } else {
        throw new Error("Biometric authentication failed or cancelled.");
      }
    } else {
      throw new Error("Biometric authentication unavailable on this device.");
    }
  } catch (e) {
    throw new Error("Native biometric authentication failed: " + (e.message || e));
  }
};
