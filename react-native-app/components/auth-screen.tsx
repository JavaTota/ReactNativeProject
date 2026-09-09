import { useState, useRef } from "react";
import { useSignIn, useSignUp } from "@clerk/expo";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Input, Type } from "./ui";
import { colors } from "@/constants/theme";

export function AuthScreen() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [mode, setMode] = useState<"login" | "signup" | "verify">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  async function run(action: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      const issue = e as { longMessage?: string; message?: string };
      setError(
        issue.longMessage ||
          issue.message ||
          "Unable to connect. Please try again.",
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function submit() {
    if (mode === "signup") {
      const result = await signUp.password({
        emailAddress: email.trim(),
        password,
      });
      if (result.error) throw result.error;
      setPassword("");
      setMode("verify");
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) throw sent.error;
      setNotice("Check your email for a verification code.");
    } else if (mode === "verify") {
      const result = await signUp.verifications.verifyEmailCode({
        code: code.trim(),
      });
      if (result.error) throw result.error;
      if (signUp.status !== "complete")
        throw new Error(
          "Your Clerk settings require additional signup details. Configure email and password signup with no additional required fields for this version.",
        );
      const finished = await signUp.finalize();
      if (finished.error) throw finished.error;
      setCode("");
    } else {
      const result = await signIn.password({
        emailAddress: email.trim(),
        password,
      });
      if (result.error) throw result.error;
      setPassword("");
      if (signIn.status !== "complete")
        throw new Error(
          "This account requires an additional verification step that this first login screen does not support yet.",
        );
      const finished = await signIn.finalize();
      if (finished.error) throw finished.error;
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 28,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 440,
              alignSelf: "center",
              gap: 18,
            }}
          >
            <Type weight="serif" size={44}>
              WeTravel
            </Type>
            <Type size={25} weight="serif">
              {mode === "verify"
                ? "Check your inbox"
                : mode === "signup"
                  ? "Your next chapter starts here"
                  : "Welcome back"}
            </Type>
            <Type tone="muted">
              {mode === "verify"
                ? `Enter the code sent to ${email}.`
                : "Plan your travels and collect the moments that matter."}
            </Type>
            {mode === "verify" ? (
              <Input
                accessibilityLabel="Email verification code"
                value={code}
                onChangeText={setCode}
                placeholder="Verification code"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                editable={!busy}
              />
            ) : (
              <>
                <Input
                  accessibilityLabel="Email address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!busy}
                />
                <Input
                  accessibilityLabel="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  editable={!busy}
                />
              </>
            )}
            {error ? (
              <Type accessibilityRole="alert" tone="accent">
                {error}
              </Type>
            ) : null}
            {notice ? (
              <Type accessibilityLiveRegion="polite">{notice}</Type>
            ) : null}
            <Button
              disabled={
                busy ||
                (mode === "verify" ? !code.trim() : !email.trim() || !password)
              }
              onPress={() => run(submit)}
            >
              {busy
                ? "Please wait…"
                : mode === "verify"
                  ? "Verify email"
                  : mode === "signup"
                    ? "Create account"
                    : "Log in"}
            </Button>
            {mode === "verify" ? (
              <Button
                secondary
                disabled={busy}
                onPress={() =>
                  run(async () => {
                    const result = await signUp.verifications.sendEmailCode();
                    if (result.error) throw result.error;
                    setNotice("A new code has been sent.");
                  })
                }
              >
                Resend code
              </Button>
            ) : null}
            <Button
              secondary
              disabled={busy}
              onPress={() => {
                setMode(mode === "login" ? "signup" : "login");
                setPassword("");
                setCode("");
                setError("");
                setNotice("");
              }}
            >
              {mode === "login"
                ? "New here? Create an account"
                : "Back to login"}
            </Button>
            {Platform.OS === "web" ? <View nativeID="clerk-captcha" /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
