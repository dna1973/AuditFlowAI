import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Calendar, Building2, AlertTriangle, CheckCircle, Clock, Search, Filter, Eye } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import type { Audit, AuditReport, Condominium } from "@shared/schema";

interface AuditWithDetails extends Audit {
  condominium: Condominium;
  report?: AuditReport;
}

const statusConfig = {
  pending: { 
    label: "Pendente", 
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    icon: Clock
  },
  processing: { 
    label: "Processando", 
    className: "bg-blue-500/10 text-blue-600 border-blue-200",
    icon: Clock
  },
  completed: { 
    label: "Concluído", 
    className: "bg-verde-accent/10 text-verde-accent border-green-200",
    icon: CheckCircle
  },
  error: { 
    label: "Erro", 
    className: "bg-red-500/10 text-red-600 border-red-200",
    icon: AlertTriangle
  },
};

const priorityConfig = {
  baixa: { label: "Baixa", className: "bg-blue-100 text-blue-800" },
  media: { label: "Média", className: "bg-yellow-100 text-yellow-800" },
  alta: { label: "Alta", className: "bg-red-100 text-red-800" },
};

export default function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [condominiumFilter, setCondominiumFilter] = useState<string>("all");

  const { data: audits = [], isLoading } = useQuery<AuditWithDetails[]>({
    queryKey: ["/api/audits"],
  });

  const { data: condominiums = [] } = useQuery<Condominium[]>({
    queryKey: ["/api/condominiums"],
  });

  const filteredAudits = audits.filter((audit) => {
    const matchesSearch = audit.condominium.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audit.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || audit.status === statusFilter;
    const matchesCondominium = condominiumFilter === "all" || audit.condominiumId === condominiumFilter;
    return matchesSearch && matchesStatus && matchesCondominium;
  });

  const stats = {
    total: audits.length,
    completed: audits.filter(a => a.status === "completed").length,
    pending: audits.filter(a => a.status === "pending").length,
    processing: audits.filter(a => a.status === "processing").length,
    error: audits.filter(a => a.status === "error").length,
  };

  const downloadReport = async (auditId: string) => {
    try {
      const response = await fetch(`/api/audits/${auditId}/report/download`);
      if (!response.ok) throw new Error("Erro ao baixar relatório");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-auditoria-${auditId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erro ao baixar relatório:", error);
    }
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
      <Header 
        title="Relatórios de Auditoria" 
        subtitle="Visualize todos os relatórios de auditoria gerados pelo sistema" 
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-500/10 rounded-lg flex items-center justify-center mr-3">
                <FileText className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-xl font-bold" data-testid="text-total-audits">
                  {stats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-verde-accent/10 rounded-lg flex items-center justify-center mr-3">
                <CheckCircle className="w-5 h-5 text-verde-accent" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Concluídos</p>
                <p className="text-xl font-bold text-verde-accent" data-testid="text-completed-audits">
                  {stats.completed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mr-3">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Processando</p>
                <p className="text-xl font-bold text-blue-500" data-testid="text-processing-audits">
                  {stats.processing}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center mr-3">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Pendentes</p>
                <p className="text-xl font-bold text-yellow-500" data-testid="text-pending-audits">
                  {stats.pending}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center mr-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Erro</p>
                <p className="text-xl font-bold text-red-500" data-testid="text-error-audits">
                  {stats.error}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por condomínio ou arquivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-reports"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="completed">Concluídos</SelectItem>
            <SelectItem value="processing">Processando</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="error">Com Erro</SelectItem>
          </SelectContent>
        </Select>

        <Select value={condominiumFilter} onValueChange={setCondominiumFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-condominium">
            <Building2 className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Condomínio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Condomínios</SelectItem>
            {condominiums.map((condominium) => (
              <SelectItem key={condominium.id} value={condominium.id}>
                {condominium.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reports Table */}
      {filteredAudits.length === 0 ? (
        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum relatório encontrado</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || statusFilter !== "all" || condominiumFilter !== "all"
                ? "Tente ajustar os filtros de busca"
                : "Os relatórios aparecerão aqui após as auditorias serem processadas"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-light-card dark:bg-dark-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Condomínio</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Upload</TableHead>
                <TableHead>Problemas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAudits.map((audit) => {
                const config = statusConfig[audit.status as keyof typeof statusConfig] || statusConfig.pending;
                const IconComponent = config.icon;
                const issueCount = (audit.report?.findings as any[])?.length || 0;
                const highPriorityIssues = (audit.report?.findings as any[])?.filter((f: any) => f.severity === "alta").length || 0;

                return (
                  <TableRow key={audit.id} data-testid={`row-audit-${audit.id}`}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold">{audit.condominium.name}</p>
                        <p className="text-sm text-gray-500">{audit.condominium.address}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {String(audit.month).padStart(2, '0')}/{audit.year}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-48">
                        <p className="font-medium truncate" title={audit.fileName}>
                          {audit.fileName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(audit.fileSize / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${config.className} flex items-center w-fit`}>
                        <IconComponent className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {audit.uploadedAt ? new Date(audit.uploadedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : '--'}
                    </TableCell>
                    <TableCell>
                      {audit.status === "completed" ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${issueCount > 0 ? 'text-red-600' : 'text-verde-accent'}`}>
                            {issueCount} encontrados
                          </span>
                          {highPriorityIssues > 0 && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              {highPriorityIssues} alta prioridade
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {audit.status === "completed" && audit.report && (
                          <>
                            <Link href={`/audit-report/${audit.id}`}>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8"
                                data-testid={`button-view-report-${audit.id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            </Link>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8"
                              onClick={() => downloadReport(audit.id)}
                              data-testid={`button-download-report-${audit.id}`}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          </>
                        )}
                        {audit.status === "error" && (
                          <Badge variant="destructive" className="text-xs">
                            Falha na análise
                          </Badge>
                        )}
                        {(audit.status === "pending" || audit.status === "processing") && (
                          <Badge variant="secondary" className="text-xs">
                            Em andamento
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}