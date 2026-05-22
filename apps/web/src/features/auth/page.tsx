import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, Download, Loader2, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp, requestPasswordReset } from "@/lib/auth-client";
import { formatCRP } from "@/utils/format";

const loginSchema = z.object({
    email: z.string().min(1, "O email é obrigatório").email("Formato de email inválido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const forgotSchema = z.object({
    email: z.string().min(1, "O email é obrigatório").email("Formato de email inválido"),
});

const registerSchema = z.object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    crp: z.string().min(8, "CRP inválido (formato esperado: 00/000000)"),
    phone: z.string().min(10, "Telefone inválido"),
    city: z.string().min(2, "A cidade é obrigatória"),
    email: z.string().min(1, "O email é obrigatório").email("Formato de email inválido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ForgotFormValues = z.infer<typeof forgotSchema>;
type View = "auth" | "forgot" | "forgot-sent";

import { toast } from "sonner";

export function AuthPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<View>("auth");

    const {
        register: registerLogin,
        handleSubmit: handleSubmitLogin,
        formState: { errors: loginErrors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const {
        register: registerRegister,
        handleSubmit: handleSubmitRegister,
        setValue: setRegisterValue,
        watch: watchRegister,
        formState: { errors: registerErrors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            crp: "",
            phone: "",
            city: "",
            email: "",
            password: "",
        },
    });

    const crpWatch = watchRegister("crp");

    const {
        register: registerForgot,
        handleSubmit: handleSubmitForgot,
        formState: { errors: forgotErrors },
    } = useForm<ForgotFormValues>({
        resolver: zodResolver(forgotSchema),
        defaultValues: { email: "" },
    });

    const handleForgot = async (data: ForgotFormValues) => {
        setIsLoading(true);
        setError(null);

        const { error } = await requestPasswordReset({
            email: data.email,
            redirectTo: `${window.location.origin}/redefinir-senha`,
        });

        setIsLoading(false);

        if (error) {
            setError(error.message || "Erro ao solicitar redefinição de senha");
        } else {
            setView("forgot-sent");
        }
    };

    const handleLogin = async (data: LoginFormValues) => {
        setIsLoading(true);
        setError(null);

        const { error, data: sessionData } = await signIn.email({
            email: data.email,
            password: data.password,
        });

        setIsLoading(false);

        if (error) {
            setError(error.message || "Email ou senha incorretos");
            toast.error(error.message || "Email ou senha incorretos. Por favor, tente novamente.");
        } else {
            toast.success(`Boas-vindas de volta, Dr(a). ${sessionData?.user?.name || ""}!`);
            navigate("/agendamento");
        }
    };

    const handleRegister = async (data: RegisterFormValues) => {
        setIsLoading(true);
        setError(null);

        const { error } = await signUp.email({
            name: data.name,
            email: data.email,
            password: data.password,
            phone: data.phone,
            crp: data.crp,
            city: data.city,
        } as any);

        setIsLoading(false);

        if (error) {
            setError(error.message || "Erro ao criar conta");
            toast.error(error.message || "Houve um erro ao realizar o cadastro. Verifique os dados.");
        } else {
            toast.success("Conta criada com sucesso! Boas-vindas ao psy-manager.");
            navigate("/agendamento");
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <div className="mb-8 flex items-center gap-2">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                    <Brain className="size-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">psy-manager</h1>
            </div>

            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                {view === "forgot" ? (
                    <>
                        <CardHeader className="pb-4">
                            <button
                                type="button"
                                onClick={() => { setView("auth"); setError(null); }}
                                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
                            >
                                <ArrowLeft className="size-4" />
                                Voltar para o login
                            </button>
                            <h2 className="text-lg font-semibold">Recuperar senha</h2>
                            <p className="text-sm text-muted-foreground">
                                Informe seu email e enviaremos um link para redefinir sua senha.
                            </p>
                            {error && (
                                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md font-medium">
                                    {error}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmitForgot(handleForgot)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="forgot-email">Email</Label>
                                    <Input
                                        id="forgot-email"
                                        type="email"
                                        placeholder="psicologo@email.com"
                                        disabled={isLoading}
                                        {...registerForgot("email")}
                                    />
                                    {forgotErrors.email && (
                                        <p className="text-xs text-destructive">{forgotErrors.email.message}</p>
                                    )}
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    Enviar link de redefinição
                                </Button>
                            </form>
                        </CardContent>
                    </>
                ) : view === "forgot-sent" ? (
                    <>
                        <CardHeader className="pb-4">
                            <h2 className="text-lg font-semibold">Email enviado</h2>
                            <p className="text-sm text-muted-foreground">
                                Se esse email estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => { setView("auth"); setError(null); }}
                            >
                                Voltar para o login
                            </Button>
                        </CardContent>
                    </>
                ) : (
                    <Tabs defaultValue={searchParams.get("tab") === "register" ? "register" : "login"} className="w-full">
                        <CardHeader className="pb-4">
                            <TabsList className="grid w-full grid-cols-2 mb-2">
                                <TabsTrigger value="login">Entrar</TabsTrigger>
                                <TabsTrigger value="register">Cadastrar</TabsTrigger>
                            </TabsList>
                            {error && (
                                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-2 font-medium">
                                    {error}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <TabsContent value="login" className="mt-0">
                                <form onSubmit={handleSubmitLogin(handleLogin)} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="psicologo@email.com"
                                            disabled={isLoading}
                                            {...registerLogin("email")}
                                        />
                                        {loginErrors.email && (
                                            <p className="text-xs text-destructive">{loginErrors.email.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password">Senha</Label>
                                            <button
                                                type="button"
                                                onClick={() => { setView("forgot"); setError(null); }}
                                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                Esqueci minha senha
                                            </button>
                                        </div>
                                        <Input
                                            id="password"
                                            type="password"
                                            disabled={isLoading}
                                            {...registerLogin("password")}
                                        />
                                        {loginErrors.password && (
                                            <p className="text-xs text-destructive">{loginErrors.password.message}</p>
                                        )}
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                                        Entrar
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="register" className="mt-0">
                                <form onSubmit={handleSubmitRegister(handleRegister)} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-name">Nome Completo</Label>
                                        <Input
                                            id="reg-name"
                                            placeholder="João Silva"
                                            disabled={isLoading}
                                            {...registerRegister("name")}
                                        />
                                        {registerErrors.name && (
                                            <p className="text-xs text-destructive">{registerErrors.name.message}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="reg-crp">CRP</Label>
                                            <Input
                                                id="reg-crp"
                                                placeholder="00/000000"
                                                disabled={isLoading}
                                                value={crpWatch}
                                                onChange={(e) => {
                                                    setRegisterValue("crp", formatCRP(e.target.value), {
                                                        shouldValidate: true,
                                                    });
                                                }}
                                            />
                                            {registerErrors.crp && (
                                                <p className="text-xs text-destructive">{registerErrors.crp.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="reg-phone">Celular</Label>
                                            <Input
                                                id="reg-phone"
                                                placeholder="(00) 00000-0000"
                                                disabled={isLoading}
                                                {...registerRegister("phone")}
                                            />
                                            {registerErrors.phone && (
                                                <p className="text-xs text-destructive">{registerErrors.phone.message}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-city">Cidade / Estado</Label>
                                        <Input
                                            id="reg-city"
                                            placeholder="Curitiba - PR"
                                            disabled={isLoading}
                                            {...registerRegister("city")}
                                        />
                                        {registerErrors.city && (
                                            <p className="text-xs text-destructive">{registerErrors.city.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-email">Email</Label>
                                        <Input
                                            id="reg-email"
                                            type="email"
                                            placeholder="psicologo@email.com"
                                            disabled={isLoading}
                                            {...registerRegister("email")}
                                        />
                                        {registerErrors.email && (
                                            <p className="text-xs text-destructive">{registerErrors.email.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-password">Senha</Label>
                                        <Input
                                            id="reg-password"
                                            type="password"
                                            placeholder="********"
                                            disabled={isLoading}
                                            {...registerRegister("password")}
                                        />
                                        {registerErrors.password && (
                                            <p className="text-xs text-destructive">{registerErrors.password.message}</p>
                                        )}
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                                        Criar Conta
                                    </Button>
                                </form>
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                )}
            </Card>

            {import.meta.env.VITE_DESKTOP_DOWNLOAD_URL && (
                <a
                    href={import.meta.env.VITE_DESKTOP_DOWNLOAD_URL}
                    className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Download className="size-4" />
                    Baixar app para Windows
                </a>
            )}
        </div>
    );
}
