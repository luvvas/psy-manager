import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthShell } from "./components/auth-shell";
import { LoginForm } from "./components/login-form";
import { RegisterForm } from "./components/register-form";
import { ForgotPasswordForm } from "./components/forgot-password-form";

type View = "auth" | "forgot" | "forgot-sent";

export function AuthPage() {
    const [searchParams] = useSearchParams();
    const [view, setView] = useState<View>("auth");
    const backToLogin = () => setView("auth");

    if (view === "forgot") {
        return (
            <AuthShell>
                <CardHeader className="pb-4">
                    <button
                        type="button"
                        onClick={backToLogin}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
                    >
                        <ArrowLeft className="size-4" />
                        Voltar para o login
                    </button>
                    <h2 className="text-lg font-semibold">Recuperar senha</h2>
                    <p className="text-sm text-muted-foreground">
                        Informe seu email e enviaremos um link para redefinir sua senha.
                    </p>
                </CardHeader>
                <CardContent>
                    <ForgotPasswordForm onSent={() => setView("forgot-sent")} />
                </CardContent>
            </AuthShell>
        );
    }

    if (view === "forgot-sent") {
        return (
            <AuthShell>
                <CardHeader className="pb-4">
                    <h2 className="text-lg font-semibold">Email enviado</h2>
                    <p className="text-sm text-muted-foreground">
                        Se esse email estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
                    </p>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="w-full" onClick={backToLogin}>
                        Voltar para o login
                    </Button>
                </CardContent>
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            <Tabs defaultValue={searchParams.get("tab") === "register" ? "register" : "login"} className="w-full">
                <CardHeader className="pb-4">
                    <TabsList className="grid w-full grid-cols-2 mb-2">
                        <TabsTrigger value="login">Entrar</TabsTrigger>
                        <TabsTrigger value="register">Cadastrar</TabsTrigger>
                    </TabsList>
                </CardHeader>
                <CardContent>
                    <TabsContent value="login" className="mt-0">
                        <LoginForm onForgotPassword={() => setView("forgot")} />
                    </TabsContent>
                    <TabsContent value="register" className="mt-0">
                        <RegisterForm />
                    </TabsContent>
                </CardContent>
            </Tabs>
        </AuthShell>
    );
}
