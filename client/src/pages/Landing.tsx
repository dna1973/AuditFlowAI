import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-grafite via-gray-900 to-grafite">
      <div className="w-full max-w-md">
        {/* Logo and Brand */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-verde-accent rounded-xl mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">AuditFlow</h1>
          <p className="text-gray-300">Auditoria Automatizada de Condomínios</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 animate-slide-up">
          <CardContent className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white mb-2">Acesso Seguro</h2>
              <p className="text-gray-300">Entre com sua conta Replit para continuar</p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <ShieldCheck className="h-5 w-5 text-blue-400 mt-0.5" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-300">Login Seguro com Replit</h3>
                    <div className="mt-2 text-sm text-blue-200">
                      <p>• Não precisa criar nova conta</p>
                      <p>• Use suas credenciais do Replit</p>
                      <p>• Autenticação criptografada</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                type="button" 
                onClick={handleLogin}
                className="w-full py-3 bg-verde-accent text-white font-semibold rounded-lg hover:bg-green-600 transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                data-testid="button-login"
              >
                <ShieldCheck className="w-5 h-5" />
                Entrar com Replit
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Primeira vez usando? Será redirecionado para criar conta Replit
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
