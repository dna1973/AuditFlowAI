import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, FileText, Calendar, Users, TrendingUp, Search, Filter } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Condominium, InsertCondominium } from "@shared/schema";
import { insertCondominiumSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertCondominiumSchema.extend({
  name: z.string().min(1, "Nome é obrigatório"),
  address: z.string().min(1, "Endereço é obrigatório"),
  units: z.number().min(1, "Número de unidades deve ser maior que 0"),
  administrator: z.string().min(1, "Administrador é obrigatório"),
});

export default function Condominiums() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: condominiums = [], isLoading } = useQuery<Condominium[]>({
    queryKey: ["/api/condominiums"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      units: 0,
      administrator: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCondominium) => {
      const response = await fetch("/api/condominiums", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar condomínio");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/condominiums"] });
      toast({
        title: "Sucesso",
        description: "Condomínio criado com sucesso!",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar condomínio",
        variant: "destructive",
      });
    },
  });

  const filteredCondominiums = condominiums.filter((condominium) => {
    const matchesSearch = condominium.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         condominium.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || 
                         (filterStatus === "active" && condominium.isActive) ||
                         (filterStatus === "inactive" && !condominium.isActive);
    return matchesSearch && matchesFilter;
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate({
      ...values,
      ownerId: user?.id || "",
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-verde-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <Header 
          title="Condomínios" 
          subtitle="Gerencie todos os condomínios cadastrados no sistema" 
        />
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-verde-accent hover:bg-green-600" data-testid="button-add-condominium">
              <Plus className="w-4 h-4 mr-2" />
              Novo Condomínio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Novo Condomínio</DialogTitle>
              <DialogDescription>
                Cadastre um novo condomínio para começar a fazer auditorias
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Condomínio</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Residencial São Paulo" 
                          {...field}
                          data-testid="input-condominium-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Endereço completo do condomínio" 
                          {...field}
                          data-testid="input-condominium-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="units"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Unidades</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="Ex: 120"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-condominium-units"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="administrator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Administrador</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome do administrador responsável" 
                          {...field}
                          data-testid="input-condominium-administrator"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-condominium"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    className="bg-verde-accent hover:bg-green-600"
                    data-testid="button-save-condominium"
                  >
                    {createMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-condominiums"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mr-4">
                <Building2 className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Condomínios</p>
                <p className="text-2xl font-bold" data-testid="text-total-condominiums">
                  {condominiums.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-verde-accent/10 rounded-lg flex items-center justify-center mr-4">
                <Users className="w-6 h-6 text-verde-accent" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unidades Totais</p>
                <p className="text-2xl font-bold" data-testid="text-total-units">
                  {condominiums.reduce((sum, cond) => sum + cond.units, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mr-4">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Condomínios Ativos</p>
                <p className="text-2xl font-bold" data-testid="text-active-condominiums">
                  {condominiums.filter(c => c.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Condominiums Grid */}
      {filteredCondominiums.length === 0 ? (
        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum condomínio encontrado</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchTerm || filterStatus !== "all" 
                ? "Tente ajustar os filtros de busca" 
                : "Comece criando seu primeiro condomínio"}
            </p>
            {!searchTerm && filterStatus === "all" && (
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-verde-accent hover:bg-green-600"
                data-testid="button-create-first-condominium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Condomínio
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCondominiums.map((condominium) => (
            <Link key={condominium.id} href={`/condominium/${condominium.id}`}>
              <Card className="bg-light-card dark:bg-dark-card hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-verde-accent">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1" data-testid={`text-condominium-name-${condominium.id}`}>
                        {condominium.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {condominium.address}
                      </p>
                    </div>
                    <Badge 
                      variant={condominium.isActive ? "default" : "secondary"}
                      className={condominium.isActive ? "bg-verde-accent hover:bg-green-600" : ""}
                      data-testid={`badge-status-${condominium.id}`}
                    >
                      {condominium.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Unidades:</span>
                      <span className="font-medium" data-testid={`text-units-${condominium.id}`}>
                        {condominium.units}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Administrador:</span>
                      <span className="font-medium truncate ml-2" data-testid={`text-administrator-${condominium.id}`}>
                        {condominium.administrator}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center text-verde-accent">
                        <FileText className="w-4 h-4 mr-1" />
                        <span>Ver Detalhes</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span className="text-xs">
                          {condominium.createdAt ? new Date(condominium.createdAt).toLocaleDateString('pt-BR') : '--'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}