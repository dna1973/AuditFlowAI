import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, Building2, AlertTriangle, Upload } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadModal } from "@/components/UploadModal";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import type { Condominium } from "@shared/schema";

interface DashboardStats {
  completed: number;
  pending: number;
  condominiums: number;
  issues: number;
}

export default function Dashboard() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { user } = useAuth();

  // Fetch dashboard stats
  const { data: stats = { completed: 0, pending: 0, condominiums: 0, issues: 0 } } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Fetch condominiums
  const { data: condominiums = [] } = useQuery<Condominium[]>({
    queryKey: ["/api/condominiums"],
  });

  const firstName = user?.firstName || "Usuário";

  return (
    <div className="p-8">
      <Header 
        title="Dashboard" 
        subtitle={`Bem-vindo de volta, ${firstName}!`} 
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-light-card dark:bg-dark-card hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Relatórios Concluídos</p>
                <p className="text-2xl font-bold text-verde-accent" data-testid="text-completed-reports">
                  {stats.completed}
                </p>
              </div>
              <div className="w-12 h-12 bg-verde-accent/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-verde-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Análises Pendentes</p>
                <p className="text-2xl font-bold text-yellow-500" data-testid="text-pending-analyses">
                  {stats.pending}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Condomínios Ativos</p>
                <p className="text-2xl font-bold text-blue-500" data-testid="text-active-condominiums">
                  {stats.condominiums}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inconsistências</p>
                <p className="text-2xl font-bold text-red-500" data-testid="text-inconsistencies">
                  {stats.issues}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-verde-accent to-green-600 rounded-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Pronto para uma nova auditoria?</h2>
              <p className="opacity-90">Faça upload dos documentos e deixe nossa IA fazer a análise</p>
            </div>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-6 py-3 bg-white text-verde-accent font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-200 transform hover:scale-105"
              data-testid="button-new-upload"
            >
              <Upload className="w-5 h-5 inline mr-2" />
              Fazer Novo Upload
            </Button>
          </div>
        </div>
      </div>

      {/* Condominiums Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-6">Meus Condomínios</h2>
        
        {condominiums.length === 0 ? (
          <Card className="bg-light-card dark:bg-dark-card">
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Nenhum condomínio cadastrado ainda
              </p>
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-verde-accent text-white hover:bg-green-600"
                data-testid="button-add-first-condominium"
              >
                Começar primeira auditoria
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {condominiums.map((condo: any) => (
              <Link key={condo.id} href={`/condominium/${condo.id}`}>
                <a>
                  <Card className="bg-light-card dark:bg-dark-card hover:shadow-lg hover:border-verde-accent/30 transition-all duration-200 cursor-pointer group" data-testid={`card-condominium-${condo.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-verde-accent/10 transition-colors duration-200">
                          <Building2 className="w-6 h-6 text-blue-500 group-hover:text-verde-accent transition-colors duration-200" />
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          condo.status === "active" 
                            ? "bg-verde-accent/10 text-verde-accent" 
                            : "bg-gray-500/10 text-gray-500"
                        }`}>
                          {condo.status === "active" ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg mb-2" data-testid={`text-condominium-name-${condo.id}`}>
                        {condo.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3" data-testid={`text-condominium-cnpj-${condo.id}`}>
                        CNPJ: {condo.cnpj}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Última auditoria:</span>
                        <span className="font-medium">
                          {/* This would need to be calculated from audits data */}
                          --
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        )}
      </div>

      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </div>
  );
}
