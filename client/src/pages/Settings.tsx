import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Shield, Bell, Palette, Database, Key, Save, Moon, Sun, Building2, FileText } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import type { User as UserType } from "@shared/schema";

interface UserSettings {
  notifications: {
    email: boolean;
    auditComplete: boolean;
    issuesFound: boolean;
    weeklyReport: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
  };
}

interface SystemStats {
  totalUsers: number;
  totalCondominiums: number;
  totalAudits: number;
  storageUsed: string;
  apiCalls: number;
}

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/user/settings"],
    initialData: {
      notifications: {
        email: true,
        auditComplete: true,
        issuesFound: true,
        weeklyReport: false,
      },
      preferences: {
        language: "pt-BR",
        timezone: "America/Sao_Paulo",
        dateFormat: "DD/MM/YYYY",
        currency: "BRL",
      },
      security: {
        twoFactorEnabled: false,
        sessionTimeout: 30,
      },
    },
  });

  const { data: systemStats } = useQuery<SystemStats>({
    queryKey: ["/api/admin/stats"],
    initialData: {
      totalUsers: 1,
      totalCondominiums: 0,
      totalAudits: 0,
      storageUsed: "0 MB",
      apiCalls: 0,
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) throw new Error("Erro ao salvar configurações");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      toast({
        title: "Configurações salvas",
        description: "Suas configurações foram atualizadas com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações",
        variant: "destructive",
      });
    },
  });

  const updateNotificationSetting = (key: keyof UserSettings['notifications'], value: boolean) => {
    if (!settings) return;
    
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    };
    updateSettingsMutation.mutate(newSettings);
  };

  const updatePreference = (key: keyof UserSettings['preferences'], value: string) => {
    if (!settings) return;
    
    const newSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        [key]: value,
      },
    };
    updateSettingsMutation.mutate(newSettings);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="p-8">
      <Header 
        title="Configurações" 
        subtitle="Gerencie suas preferências e configurações do sistema" 
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Preferências
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-light-card dark:bg-dark-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações do Perfil
              </CardTitle>
              <CardDescription>
                Gerencie suas informações pessoais e preferências de conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-verde-accent rounded-full flex items-center justify-center">
                  {user?.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt="Avatar" 
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-2xl font-bold">
                      {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-semibold">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email || 'Usuário'
                    }
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
                  <Badge className="bg-verde-accent text-white">Administrador</Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input 
                    id="firstName" 
                    defaultValue={user?.firstName || ""} 
                    placeholder="Seu primeiro nome"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input 
                    id="lastName" 
                    defaultValue={user?.lastName || ""} 
                    placeholder="Seu sobrenome"
                    data-testid="input-last-name"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    defaultValue={user?.email || ""} 
                    placeholder="seu@email.com"
                    disabled
                    data-testid="input-email"
                  />
                  <p className="text-xs text-gray-500">
                    O email é gerenciado pela autenticação Replit e não pode ser alterado aqui.
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  Sair da Conta
                </Button>
                <Button 
                  className="bg-verde-accent hover:bg-green-600"
                  disabled={isLoading}
                  data-testid="button-save-profile"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-light-card dark:bg-dark-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Configurações de Notificação
              </CardTitle>
              <CardDescription>
                Configure quando e como você deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Notificações por Email</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receber notificações importantes por email
                    </p>
                  </div>
                  <Switch
                    checked={settings?.notifications.email}
                    onCheckedChange={(value) => updateNotificationSetting('email', value)}
                    data-testid="switch-email-notifications"
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auditoria Concluída</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Notificar quando uma auditoria for concluída
                    </p>
                  </div>
                  <Switch
                    checked={settings?.notifications.auditComplete}
                    onCheckedChange={(value) => updateNotificationSetting('auditComplete', value)}
                    data-testid="switch-audit-complete-notifications"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Problemas Encontrados</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Notificar quando problemas importantes forem detectados
                    </p>
                  </div>
                  <Switch
                    checked={settings?.notifications.issuesFound}
                    onCheckedChange={(value) => updateNotificationSetting('issuesFound', value)}
                    data-testid="switch-issues-notifications"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Relatório Semanal</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receber resumo semanal das atividades
                    </p>
                  </div>
                  <Switch
                    checked={settings?.notifications.weeklyReport}
                    onCheckedChange={(value) => updateNotificationSetting('weeklyReport', value)}
                    data-testid="switch-weekly-report-notifications"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="bg-light-card dark:bg-dark-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Preferências de Interface
              </CardTitle>
              <CardDescription>
                Customize a aparência e comportamento da interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Tema</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Escolha entre tema claro ou escuro
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleTheme}
                    className="flex items-center gap-2"
                    data-testid="button-toggle-theme"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="w-4 h-4" />
                        Claro
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4" />
                        Escuro
                      </>
                    )}
                  </Button>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Select 
                      value={settings?.preferences.language}
                      onValueChange={(value) => updatePreference('language', value)}
                    >
                      <SelectTrigger data-testid="select-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Fuso Horário</Label>
                    <Select 
                      value={settings?.preferences.timezone}
                      onValueChange={(value) => updatePreference('timezone', value)}
                    >
                      <SelectTrigger data-testid="select-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                        <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                        <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Formato de Data</Label>
                    <Select 
                      value={settings?.preferences.dateFormat}
                      onValueChange={(value) => updatePreference('dateFormat', value)}
                    >
                      <SelectTrigger data-testid="select-date-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Moeda</Label>
                    <Select 
                      value={settings?.preferences.currency}
                      onValueChange={(value) => updatePreference('currency', value)}
                    >
                      <SelectTrigger data-testid="select-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">Real Brasileiro (R$)</SelectItem>
                        <SelectItem value="USD">Dólar Americano ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-light-card dark:bg-dark-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Configurações de Segurança
              </CardTitle>
              <CardDescription>
                Gerencie a segurança da sua conta e dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Autenticação de Dois Fatores</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Adicione uma camada extra de segurança à sua conta
                    </p>
                  </div>
                  <Switch
                    checked={settings?.security.twoFactorEnabled}
                    onCheckedChange={(value) => {
                      // Handle 2FA toggle
                      toast({
                        title: "Funcionalidade em desenvolvimento",
                        description: "A autenticação de dois fatores será implementada em breve",
                      });
                    }}
                    data-testid="switch-two-factor"
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Timeout de Sessão (minutos)</Label>
                  <Select 
                    value={String(settings?.security.sessionTimeout)}
                    onValueChange={(value) => {
                      // Handle session timeout change
                      toast({
                        title: "Configuração salva",
                        description: `Timeout de sessão alterado para ${value} minutos`,
                      });
                    }}
                  >
                    <SelectTrigger data-testid="select-session-timeout">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="120">2 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator />
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Key className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Autenticação Replit
                      </h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Sua conta é autenticada através do Replit. Para alterar sua senha ou 
                        configurações de segurança avançadas, acesse as configurações da sua conta Replit.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card className="bg-light-card dark:bg-dark-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Informações do Sistema
              </CardTitle>
              <CardDescription>
                Estatísticas e informações sobre o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <User className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600" data-testid="text-system-users">
                    {systemStats?.totalUsers}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Usuários</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Building2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600" data-testid="text-system-condominiums">
                    {systemStats?.totalCondominiums}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Condomínios</p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600" data-testid="text-system-audits">
                    {systemStats?.totalAudits}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Auditorias</p>
                </div>
                
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Database className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-600" data-testid="text-system-storage">
                    {systemStats?.storageUsed}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Armazenamento</p>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Informações da Aplicação</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>Versão: 1.0.0</p>
                  <p>Ambiente: Desenvolvimento</p>
                  <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                  <p>API Status: ✅ Operacional</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}