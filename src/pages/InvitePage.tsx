import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CircularTimer } from "@/components/ui/circular-timer";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { 
  Loader2, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  MessageCircle
} from "lucide-react";
import knowYouLogo from "@/assets/knowyou-admin-logo.png";

// DDDs inválidos do Brasil
const DDDS_INVALIDOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 23, 25, 26, 29, 30, 36, 39, 40, 50, 52, 56, 57, 58, 59, 60, 70, 72, 76, 78, 80, 90];

// Form schemas for each step
const addressSchema = z.object({
  phone: z.string()
    .min(14, "Telefone inválido")
    .refine((val) => {
      const numbers = val.replace(/\D/g, '');
      if (numbers.length !== 11) return false;
      const ddd = parseInt(numbers.substring(0, 2));
      return ddd >= 11 && ddd <= 99 && !DDDS_INVALIDOS.includes(ddd);
    }, "DDD inválido. Use um DDD válido do Brasil (ex: 11, 21, 31)."),
  addressCep: z.string().min(8, "CEP inválido"),
  addressStreet: z.string().min(3, "Rua é obrigatória"),
  addressNumber: z.string().min(1, "Número é obrigatório"),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().min(2, "Bairro é obrigatório"),
  addressCity: z.string().min(2, "Cidade é obrigatória"),
  addressState: z.string().length(2, "Estado inválido"),
});

const passwordSchema = z.object({
  password: z.string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve ter uma letra maiúscula")
    .regex(/[a-z]/, "Deve ter uma letra minúscula")
    .regex(/[0-9]/, "Deve ter um número"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type AddressFormData = z.infer<typeof addressSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface Invitation {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  expires_at: string;
}

const TIMER_DURATION = 120; // 2 minutes in seconds

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<"loading" | "form" | "verification" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<"email" | "sms" | "whatsapp">("email");
  const [maskedDestination, setMaskedDestination] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [canResend, setCanResend] = useState(false);
  const [formData, setFormData] = useState<AddressFormData & PasswordFormData | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  // Form hooks
  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      phone: "",
      addressCep: "",
      addressStreet: "",
      addressNumber: "",
      addressComplement: "",
      addressNeighborhood: "",
      addressCity: "",
      addressState: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setStep("error");
        setErrorMessage("Token inválido");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_invitations")
          .select("*")
          .eq("token", token)
          .single();

        if (error || !data) {
          setStep("error");
          setErrorMessage("Convite não encontrado");
          return;
        }

        // Check if expired
        if (new Date(data.expires_at) < new Date()) {
          setStep("error");
          setErrorMessage("Este convite expirou");
          return;
        }

        // Check if already completed
        if (data.status === "completed") {
          setStep("error");
          setErrorMessage("Este convite já foi utilizado");
          return;
        }

        // Redirect to PWA register if has APP access ONLY (no platform access)
        if (data.has_app_access && !data.has_platform_access) {
          navigate(`/pwa-register/${token}`);
          return;
        }

        setInvitation(data as Invitation);
        setStep("form");
        
        // Pre-fill phone from invitation if available
        if (data.phone) {
          // Format phone from +5511999999999 to (11) 99999-9999
          const phoneDigits = data.phone.replace(/\D/g, '');
          const localPhone = phoneDigits.startsWith('55') ? phoneDigits.slice(2) : phoneDigits;
          if (localPhone.length === 11) {
            const formatted = `(${localPhone.slice(0, 2)}) ${localPhone.slice(2, 7)}-${localPhone.slice(7)}`;
            addressForm.setValue("phone", formatted);
          }
        }
        
        // Track link opened via edge function (notifies admin on first open)
        try {
          await supabase.functions.invoke("track-invitation-open", {
            body: { token, source: "platform" },
          });
        } catch (trackError) {
          console.log("Track open error (non-blocking):", trackError);
        }
      } catch (err) {
        setStep("error");
        setErrorMessage("Erro ao validar convite");
      }
    };

    validateToken();
  }, [token]);

  // Timer countdown
  useEffect(() => {
    if (step !== "verification" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Fetch address from CEP
  const fetchAddressFromCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      addressForm.setValue("addressStreet", data.logradouro || "");
      addressForm.setValue("addressNeighborhood", data.bairro || "");
      addressForm.setValue("addressCity", data.localidade || "");
      addressForm.setValue("addressState", data.uf || "");
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  // Format phone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Format CEP
  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  // Submit form and request verification code
  const handleFormSubmit = async () => {
    // Validate both forms
    const addressValid = await addressForm.trigger();
    const passwordValid = await passwordForm.trigger();

    if (!addressValid || !passwordValid) return;

    const addressData = addressForm.getValues();
    const passwordData = passwordForm.getValues();

    setFormData({ ...addressData, ...passwordData });
    setIsLoading(true);

    try {
      // Convert phone to international format
      const phoneNumbers = addressData.phone.replace(/\D/g, "");
      const internationalPhone = `+55${phoneNumbers}`;

      const { data, error } = await supabase.functions.invoke("send-invitation-verification", {
        body: {
          token,
          phone: internationalPhone,
          addressCep: addressData.addressCep,
          addressStreet: addressData.addressStreet,
          addressNumber: addressData.addressNumber,
          addressComplement: addressData.addressComplement,
          addressNeighborhood: addressData.addressNeighborhood,
          addressCity: addressData.addressCity,
          addressState: addressData.addressState,
          password: passwordData.password,
          verificationMethod,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMaskedDestination(data.maskedDestination);
      setTimeLeft(TIMER_DURATION);
      setCanResend(false);
      setStep("verification");
    } catch (err: any) {
      const errorMessage = err.message || "Erro ao enviar código";
      
      // Se erro de WhatsApp, oferecer fallback para email
      if (verificationMethod === "whatsapp" && 
          (errorMessage.includes("WhatsApp") || errorMessage.includes("Twilio"))) {
        toast.error(
          <div className="flex flex-col gap-2">
            <p className="font-medium">Não foi possível enviar por WhatsApp</p>
            <p className="text-sm opacity-80">{errorMessage}</p>
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => {
                setVerificationMethod("email");
                toast.dismiss();
                setTimeout(() => handleFormSubmit(), 100);
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Tentar por Email
            </Button>
          </div>,
          { duration: 15000 }
        );
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP code
  const handleVerifyCode = async () => {
    if (otpValue.length !== 6 || !formData) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-invitation-code", {
        body: {
          token,
          code: otpValue,
          password: formData.password,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setStep("success");
      toast.success("Cadastro concluído!");
    } catch (err: any) {
      toast.error(err.message || "Código inválido");
      setOtpValue("");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-invitation-code", {
        body: { token },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMaskedDestination(data.maskedDestination);
      setTimeLeft(TIMER_DURATION);
      setCanResend(false);
      setOtpValue("");
      toast.success("Código reenviado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao reenviar código");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (otpValue.length === 6 && step === "verification") {
      handleVerifyCode();
    }
  }, [otpValue]);

  // Password strength indicator
  const password = passwordForm.watch("password");
  const passwordStrength = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const strengthCount = Object.values(passwordStrength).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <img src={knowYouLogo} alt="KnowYOU" className="h-12 mx-auto mb-4" />
          <CardTitle className="text-2xl">
            {step === "loading" && "Carregando..."}
            {step === "form" && "Complete seu cadastro"}
            {step === "verification" && "Verificação"}
            {step === "success" && "Cadastro Concluído!"}
            {step === "error" && "Ops!"}
          </CardTitle>
          <CardDescription>
            {step === "form" && invitation && (
              <>Olá <strong>{invitation.name}</strong>, preencha os dados abaixo</>
            )}
            {step === "verification" && (
              <>Digite o código enviado para <strong>{maskedDestination}</strong></>
            )}
            {step === "success" && "Você já pode fazer login"}
            {step === "error" && errorMessage}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Loading */}
          {step === "loading" && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Form Step */}
          {step === "form" && invitation && (
            <div className="space-y-6">
              {/* Email (readonly) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input value={invitation.email} disabled className="bg-muted" />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone *
                </Label>
                <Input
                  placeholder="(11) 99999-9999"
                  {...addressForm.register("phone", {
                    onChange: (e) => {
                      e.target.value = formatPhone(e.target.value);
                    },
                  })}
                />
                {addressForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {addressForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço *
                </Label>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <Input
                      placeholder="CEP"
                      {...addressForm.register("addressCep", {
                        onChange: (e) => {
                          e.target.value = formatCep(e.target.value);
                          if (e.target.value.replace(/\D/g, "").length === 8) {
                            fetchAddressFromCep(e.target.value);
                          }
                        },
                      })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="Rua"
                      disabled={cepLoading}
                      {...addressForm.register("addressStreet")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="Número"
                    {...addressForm.register("addressNumber")}
                  />
                  <div className="col-span-2">
                    <Input
                      placeholder="Complemento (opcional)"
                      {...addressForm.register("addressComplement")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="Bairro"
                    disabled={cepLoading}
                    {...addressForm.register("addressNeighborhood")}
                  />
                  <Input
                    placeholder="Cidade"
                    disabled={cepLoading}
                    {...addressForm.register("addressCity")}
                  />
                  <Input
                    placeholder="UF"
                    maxLength={2}
                    className="uppercase"
                    disabled={cepLoading}
                    {...addressForm.register("addressState")}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Senha *
                </Label>

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Crie uma senha forte"
                    {...passwordForm.register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Password strength */}
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strengthCount
                            ? strengthCount <= 1
                              ? "bg-red-500"
                              : strengthCount <= 2
                              ? "bg-orange-500"
                              : strengthCount <= 3
                              ? "bg-yellow-500"
                              : "bg-emerald-500"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-1 ${passwordStrength.length ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {passwordStrength.length ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Mínimo 8 caracteres
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.upper ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {passwordStrength.upper ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Uma letra maiúscula
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.lower ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {passwordStrength.lower ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Uma letra minúscula
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.number ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {passwordStrength.number ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Um número
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme a senha"
                    {...passwordForm.register("confirmPassword")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Verification method */}
              <div className="space-y-3">
                <Label>Receber código de verificação via:</Label>
                <RadioGroup
                  value={verificationMethod}
                  onValueChange={(v) => setVerificationMethod(v as "email" | "sms" | "whatsapp")}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="email" id="email" />
                    <Label htmlFor="email" className="flex items-center gap-1 cursor-pointer">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="sms" id="sms" />
                    <Label htmlFor="sms" className="flex items-center gap-1 cursor-pointer">
                      <MessageCircle className="h-4 w-4" />
                      SMS
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="whatsapp" id="whatsapp" />
                    <Label htmlFor="whatsapp" className="flex items-center gap-1 cursor-pointer">
                      <Phone className="h-4 w-4" />
                      WhatsApp
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleFormSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Verification Step */}
          {step === "verification" && (
            <div className="space-y-6">
              {/* Method badge */}
              <div className="flex justify-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  verificationMethod === 'email' 
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {verificationMethod === 'email' ? (
                    <>
                      <Mail className="h-4 w-4" />
                      Enviado por Email
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4" />
                      Enviado por WhatsApp
                    </>
                  )}
                </div>
              </div>

              {/* Timer with urgency */}
              <div className="flex justify-center">
                <div className={timeLeft <= 30 ? 'animate-pulse' : ''}>
                  <CircularTimer timeLeft={timeLeft} totalTime={TIMER_DURATION} size={140} />
                </div>
              </div>

              {/* Larger OTP fields */}
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                  disabled={isLoading || timeLeft === 0}
                  className="gap-3"
                >
                  <InputOTPGroup className="gap-2">
                    <InputOTPSlot index={0} className="w-11 h-14 sm:w-12 sm:h-16 text-xl sm:text-2xl font-bold border-2 border-cyan-500 rounded-lg focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30 transition-colors" />
                    <InputOTPSlot index={1} className="w-11 h-14 sm:w-12 sm:h-16 text-xl sm:text-2xl font-bold border-2 border-cyan-500 rounded-lg focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30 transition-colors" />
                    <InputOTPSlot index={2} className="w-11 h-14 sm:w-12 sm:h-16 text-xl sm:text-2xl font-bold border-2 border-cyan-500 rounded-lg focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30 transition-colors" />
                    <InputOTPSlot index={3} className="w-11 h-14 sm:w-12 sm:h-16 text-xl sm:text-2xl font-bold border-2 border-cyan-500 rounded-lg focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30 transition-colors" />
                    <InputOTPSlot index={4} className="w-11 h-14 sm:w-12 sm:h-16 text-xl sm:text-2xl font-bold border-2 border-cyan-500 rounded-lg focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30 transition-colors" />
                    <InputOTPSlot index={5} className="w-11 h-14 sm:w-12 sm:h-16 text-xl sm:text-2xl font-bold border-2 border-cyan-500 rounded-lg focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30 transition-colors" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Loading feedback */}
              {isLoading && (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Verificando...</span>
                </div>
              )}

              {/* Expired message */}
              {timeLeft === 0 && !isLoading && (
                <div className="text-center text-destructive text-sm font-medium">
                  Código expirado. Reenvie para continuar.
                </div>
              )}

              {/* Action buttons - always visible */}
              <div className="flex flex-col gap-3">
                {/* Resend button - always visible */}
                <Button
                  variant={canResend ? "default" : "outline"}
                  onClick={handleResendCode}
                  disabled={!canResend || isLoading}
                  className="w-full"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {canResend 
                    ? "Reenviar código" 
                    : `Reenviar em ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`
                  }
                </Button>

                {/* Back button */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep("form");
                    setOtpValue("");
                    setTimeLeft(TIMER_DURATION);
                    setCanResend(false);
                  }}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar e editar dados
                </Button>
              </div>

              {/* Help tip */}
              <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <p className="font-medium mb-1">Não recebeu o código?</p>
                <p>
                  {verificationMethod === 'email' 
                    ? 'Verifique sua pasta de spam ou lixo eletrônico.'
                    : 'Verifique se seu WhatsApp está ativo e conectado.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Sua conta foi criada com sucesso. Use o email e senha que você cadastrou para acessar a plataforma.
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => navigate("/admin/login")}
              >
                Ir para Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Error Step */}
          {step === "error" && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>

              <Button
                variant="outline"
                onClick={() => navigate("/")}
              >
                Voltar para o início
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
