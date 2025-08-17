import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Users, 
  Shield, 
  Edit, 
  Trash2, 
  UserPlus, 
  Building,
  MapPin,
  Search
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, UserCondominium, AuditReport } from "@shared/schema";

// Form schemas
const userFormSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  email: z.string().email("Email inválido"),
  role: z.enum(["user", "manager", "admin"]),
  quadra: z.string().optional(),
  lote: z.string().optional(),
});

const userCondominiumFormSchema = z.object({
  userId: z.string().min(1, "Usuário é obrigatório"),
  condominiumId: z.string().min(1, "Condomínio é obrigatório"),
  quadra: z.string().min(1, "Quadra é obrigatória"),
  lote: z.string().min(1, "Lote é obrigatório"),
  role: z.enum(["inquilino", "proprietario"]),
});

interface UserWithAssociations extends User {
  condominiums?: UserCondominium[];
}

export default function AdminPanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isAssociationDialogOpen, setIsAssociationDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Fetch all users with associations
  const { data: users = [], isLoading: usersLoading } = useQuery<UserWithAssociations[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch all audit reports for management
  const { data: auditReports = [], isLoading: reportsLoading } = useQuery<AuditReport[]>({
    queryKey: ["/api/admin/audit-reports"],
  });

  // Fetch condominiums for associations
  const { data: condominiums = [] } = useQuery({
    queryKey: ["/api/condominiums"],
  });

  // Create/Update user mutation
  const userMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof userFormSchema> & { id?: string }) => {
      const endpoint = userData.id ? `/api/admin/users/${userData.id}` : '/api/admin/users';
      const method = userData.id ? 'PATCH' : 'POST';
      return await apiRequest(method, endpoint, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsUserDialogOpen(false);
      setSelectedUser(null);
      toast({ title: "Sucesso", description: "Usuário salvo com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao salvar usuário", variant: "destructive" });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Sucesso", description: "Usuário excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao excluir usuário", variant: "destructive" });
    }
  });

  // User-Condominium association mutation
  const associationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userCondominiumFormSchema>) => {
      return await apiRequest('POST', '/api/admin/user-condominiums', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsAssociationDialogOpen(false);
      toast({ title: "Sucesso", description: "Associação criada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao criar associação", variant: "destructive" });
    }
  });

  // Delete audit report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return await apiRequest('DELETE', `/api/admin/audit-reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-reports"] });
      toast({ title: "Sucesso", description: "Relatório excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao excluir relatório", variant: "destructive" });
    }
  });

  // Forms
  const userForm = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "user",
      quadra: "",
      lote: "",
    },
  });

  const associationForm = useForm<z.infer<typeof userCondominiumFormSchema>>({
    resolver: zodResolver(userCondominiumFormSchema),
    defaultValues: {
      userId: "",
      condominiumId: "",
      quadra: "",
      lote: "",
      role: "inquilino",
    },
  });

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = (
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    userForm.reset({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role as any,
      quadra: user.quadra || "",
      lote: user.lote || "",
    });
    setIsUserDialogOpen(true);
  };

  const handleNewUser = () => {
    setSelectedUser(null);
    userForm.reset();
    setIsUserDialogOpen(true);
  };

  const onUserSubmit = (data: z.infer<typeof userFormSchema>) => {
    userMutation.mutate(selectedUser ? { ...data, id: selectedUser.id } : data);
  };

  const onAssociationSubmit = (data: z.infer<typeof userCondominiumFormSchema>) => {
    associationMutation.mutate(data);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="p-8">
      <Header 
        title="Painel Administrativo" 
        subtitle="Gerencie usuários, associações e relatórios" 
      />

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="associations">
            <Building className="w-4 h-4 mr-2" />
            Associações
          </TabsTrigger>
          <TabsTrigger value="reports">
            <Shield className="w-4 h-4 mr-2" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-role-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os perfis</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="manager">Gestor</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleNewUser} data-testid="button-new-user">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>

          <div className="grid gap-4">
            {usersLoading ? (
              <div className="text-center py-8">Carregando usuários...</div>
            ) : (
              filteredUsers.map((user) => (
                <Card key={user.id} className="bg-light-card dark:bg-dark-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg" data-testid={`text-user-name-${user.id}`}>
                            {user.firstName} {user.lastName}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400" data-testid={`text-user-email-${user.id}`}>
                            {user.email}
                          </p>
                          {user.quadra && user.lote && (
                            <div className="flex items-center gap-2 mt-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Quadra {user.quadra}, Lote {user.lote}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getRoleBadgeColor(user.role)} data-testid={`badge-user-role-${user.id}`}>
                          {user.role === 'admin' ? 'Administrador' : 
                           user.role === 'manager' ? 'Gestor' : 'Usuário'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteUserMutation.mutate(user.id)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Associations Tab */}
        <TabsContent value="associations" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isAssociationDialogOpen} onOpenChange={setIsAssociationDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-association">
                  <Building className="w-4 h-4 mr-2" />
                  Nova Associação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Associar Usuário a Condomínio</DialogTitle>
                  <DialogDescription>
                    Associe um usuário a um condomínio específico com quadra e lote.
                  </DialogDescription>
                </DialogHeader>
                <Form {...associationForm}>
                  <form onSubmit={associationForm.handleSubmit(onAssociationSubmit)} className="space-y-4">
                    <FormField
                      control={associationForm.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuário</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-user">
                                <SelectValue placeholder="Selecione um usuário" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName} - {user.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={associationForm.control}
                      name="condominiumId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condomínio</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-condominium">
                                <SelectValue placeholder="Selecione um condomínio" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(condominiums as any[]).map((condo: any) => (
                                <SelectItem key={condo.id} value={condo.id}>
                                  {condo.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={associationForm.control}
                        name="quadra"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quadra</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: A, B, 1, 2..." {...field} data-testid="input-quadra" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={associationForm.control}
                        name="lote"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lote</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 1, 2, 101..." {...field} data-testid="input-lote" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={associationForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Função</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-association-role">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="inquilino">Inquilino</SelectItem>
                              <SelectItem value="proprietario">Proprietário</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={associationMutation.isPending}
                        data-testid="button-save-association"
                      >
                        Salvar Associação
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAssociationDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="text-center py-8 text-gray-500">
            Funcionalidade em desenvolvimento - Lista de associações de usuários
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Relatórios de Auditoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="text-center py-8">Carregando relatórios...</div>
              ) : auditReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum relatório encontrado
                </div>
              ) : (
                <div className="space-y-4">
                  {auditReports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium" data-testid={`text-report-id-${report.id}`}>
                          Relatório {report.id}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Data: {new Date(report.createdAt || new Date()).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteReportMutation.mutate(report.id)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-report-${report.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Form Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
          </DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={userForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome" {...field} data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={userForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sobrenome</FormLabel>
                      <FormControl>
                        <Input placeholder="Sobrenome" {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-role">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="manager">Gestor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={userForm.control}
                  name="quadra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quadra (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: A, B, 1, 2..." {...field} data-testid="input-user-quadra" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={userForm.control}
                  name="lote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lote (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 1, 2, 101..." {...field} data-testid="input-user-lote" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={userMutation.isPending}
                  data-testid="button-save-user"
                >
                  {selectedUser ? 'Atualizar' : 'Criar'} Usuário
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsUserDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}