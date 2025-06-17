
import CryptoJS from "crypto-js";

// Only handle native plugin inside an isolated require, never at top level!
export async function biometricAuthenticate(): Promise<string> {
  // Check for Capacitor environment and use native biometrics if present
  const isCapacitor = !!(window && (window as any).Capacitor);

  if (isCapacitor) {
    try {
      // Only require the nativeBiometricAuth.js helper here; never import!
      // This is pure JS and NOT bundled in web builds
      const nativeBiometric = require("./nativeBiometricAuth.js");
      return await nativeBiometric.authenticate();
    } catch (e: any) {
      throw new Error("Native biometric authentication failed: " + e.message);
    }
  }
  // If not in Capacitor/mobile, fall back to WebAuthn/Web
  if (!window.PublicKeyCredential) {
    throw new Error("No biometric hardware available");
  }
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  const options: PublicKeyCredentialRequestOptions = {
    challenge,
    timeout: 60000,
    userVerification: "required",
    rpId: window.location.hostname
    // Note: authenticatorSelection is not allowed here (spec limitation).
  };

  const assertion = await navigator.credentials.get({ publicKey: options }) as PublicKeyCredential;
  if (assertion && assertion.response) {
    const authData = (assertion.response as AuthenticatorAssertionResponse).authenticatorData;
    const buffer = authData
      ? new Uint8Array(authData)
      : new Uint8Array((assertion.response as any).clientDataJSON);
    const hash = CryptoJS.SHA256(Array.from(buffer).toString()).toString();
    return hash;
  }
  throw new Error("Unexpected biometric authentication problem");
}
