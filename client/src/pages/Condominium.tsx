import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Calendar, CheckCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link, useRoute } from "wouter";
import type { Condominium, Audit } from "@shared/schema";

const statusConfig = {
  pending: { label: "Pendente", className: "bg-yellow-500/10 text-yellow-600" },
  processing: { label: "Processando", className: "bg-blue-500/10 text-blue-600" },
  completed: { label: "Concluído", className: "bg-verde-accent/10 text-verde-accent" },
  error: { label: "Erro", className: "bg-red-500/10 text-red-600" },
};

export default function Condominium() {
  const [match, params] = useRoute("/condominium/:id");
  const condominiumId = params?.id;

  const { data: condominium } = useQuery<Condominium>({
    queryKey: ["/api/condominiums", condominiumId],
    enabled: !!condominiumId,
  });

  const { data: audits = [] } = useQuery<Audit[]>({
    queryKey: ["/api/condominiums", condominiumId, "audits"],
    enabled: !!condominiumId,
  });

  if (!condominium) {
    return <div>Carregando...</div>;
  }

  const completedAudits = audits.filter((audit) => audit.status === "completed").length;
  const lastAudit = audits[0];
  const lastAuditDate = lastAudit 
    ? `${String(lastAudit.month).padStart(2, '0')}/${lastAudit.year}`
    : "--";

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/">
          <a className="flex items-center text-verde-accent hover:text-green-600 transition-colors duration-200 mb-4" data-testid="link-back-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </a>
        </Link>
        <Header 
          title={condominium.name}
          subtitle="Visualize todas as prestações de contas e relatórios de auditoria"
        />
      </div>

      {/* Condominium Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Auditorias</p>
                <p className="text-2xl font-bold text-blue-500" data-testid="text-total-audits">
                  {audits.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Última Auditoria</p>
                <p className="text-2xl font-bold text-verde-accent" data-testid="text-last-audit">
                  {lastAuditDate}
                </p>
              </div>
              <div className="w-12 h-12 bg-verde-accent/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-verde-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status Geral</p>
                <p className="text-2xl font-bold text-verde-accent" data-testid="text-general-status">
                  {completedAudits > 0 ? "Em Dia" : "Pendente"}
                </p>
              </div>
              <div className="w-12 h-12 bg-verde-accent/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-verde-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audits Table */}
      <Card className="bg-light-card dark:bg-dark-card">
        <CardContent className="p-6">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h2 className="text-xl font-semibold">Prestações de Contas</h2>
          </div>
          
          {audits.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Nenhuma prestação de contas encontrada para este condomínio.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês/Ano de Referência</TableHead>
                  <TableHead>Data de Upload</TableHead>
                  <TableHead>Status da Análise</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit: any) => {
                  const status = statusConfig[audit.status as keyof typeof statusConfig];
                  const referenceDate = `${String(audit.month).padStart(2, '0')}/${audit.year}`;
                  const uploadDate = new Date(audit.createdAt).toLocaleDateString('pt-BR');
                  
                  return (
                    <TableRow key={audit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50" data-testid={`row-audit-${audit.id}`}>
                      <TableCell className="font-medium" data-testid={`text-audit-period-${audit.id}`}>
                        {referenceDate}
                      </TableCell>
                      <TableCell data-testid={`text-audit-upload-date-${audit.id}`}>
                        {uploadDate}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.className} data-testid={`badge-audit-status-${audit.id}`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {audit.status === "completed" ? (
                          <Link href={`/audit-report/${audit.id}`}>
                            <a className="text-verde-accent hover:text-green-600 font-medium text-sm" data-testid={`link-view-report-${audit.id}`}>
                              Ver Relatório
                            </a>
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-sm">
                            {audit.status === "error" ? "Erro na análise" : "Aguardando..."}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
