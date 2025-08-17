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

        {/* Login Form */}
        <Card className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 animate-slide-up">
          <CardContent className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white mb-2">Bem-vindo de volta</h2>
              <p className="text-gray-300">Entre em sua conta para continuar</p>
            </div>
            
            <form className="space-y-4">
              <div>
                <Label className="block text-sm font-medium text-gray-200 mb-2">Email</Label>
                <Input 
                  type="email" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-verde-accent" 
                  placeholder="seu@email.com"
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-200 mb-2">Senha</Label>
                <Input 
                  type="password" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-verde-accent" 
                  placeholder="••••••••"
                  data-testid="input-password"
                />
              </div>
              
              <Button 
                type="button" 
                onClick={handleLogin}
                className="w-full py-3 bg-verde-accent text-white font-semibold rounded-lg hover:bg-green-600 transform hover:scale-[1.02] transition-all duration-200"
                data-testid="button-login"
              >
                Entrar
              </Button>
            </form>

            <div className="mt-6 text-center">
              <a href="#" className="text-verde-accent hover:text-green-400 text-sm transition-colors">
                Esqueceu sua senha?
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
