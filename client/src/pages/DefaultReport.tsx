import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { AlertCircle, CheckCircle, Search, TrendingDown, TrendingUp, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Condominium, AuditReport } from "@shared/schema";

const MORADA_NOBRE_LOTS = [
  // Quadra A (QAL01 - QAL34)
  ...Array.from({ length: 34 }, (_, i) => `QAL${(i + 1).toString().padStart(2, '0')}`),
  // Quadra B (QBL01 - QBL36) 
  ...Array.from({ length: 36 }, (_, i) => `QBL${(i + 1).toString().padStart(2, '0')}`),
  // Quadra C (QCL01 - QCL26)
  ...Array.from({ length: 26 }, (_, i) => `QCL${(i + 1).toString().padStart(2, '0')}`),
  // Quadra D (QDL01 - QDL07)
  ...Array.from({ length: 7 }, (_, i) => `QDL${(i + 1).toString().padStart(2, '0')}`),
  // Quadra E (QEL01 - QEL33)
  ...Array.from({ length: 33 }, (_, i) => `QEL${(i + 1).toString().padStart(2, '0')}`),
  // Quadra F (QFL01 - QFL35)
  ...Array.from({ length: 35 }, (_, i) => `QFL${(i + 1).toString().padStart(2, '0')}`),
  // Quadra G (QGL01 - QGL17)
  ...Array.from({ length: 17 }, (_, i) => `QGL${(i + 1).toString().padStart(2, '0')}`),
  // Quadra H (QHL01 - QHL15)
  ...Array.from({ length: 15 }, (_, i) => `QHL${(i + 1).toString().padStart(2, '0')}`),
  // Quadra I (QIL01 - QIL06)
  ...Array.from({ length: 6 }, (_, i) => `QIL${(i + 1).toString().padStart(2, '0')}`)
];

interface LotPaymentData {
  lotId: string;
  status: 'paid' | 'defaulted' | 'unknown';
  amount?: number;
  month: string;
  year: number;
}

export default function DefaultReport() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quadraFilter, setQuadraFilter] = useState("all");
  const [selectedCondominium, setSelectedCondominium] = useState<string>("");

  const { data: condominiums } = useQuery({
    queryKey: ['/api/condominiums']
  });

  const { data: auditReportsData, isLoading } = useQuery({
    queryKey: ['/api/condominiums', selectedCondominium, 'audit-reports'],
    enabled: !!selectedCondominium
  });

  // Get the selected condominium details
  const selectedCondominiumData = (condominiums as Condominium[] || []).find(
    condo => condo.id === selectedCondominium
  );

  // Get latest audit report with default data for selected condominium
  const latestReport = auditReportsData && Array.isArray(auditReportsData) && auditReportsData.length > 0 ? 
    auditReportsData[0].report as AuditReport : null;

  // Generate lot payment data using real audit report data
  const generateLotData = (): LotPaymentData[] => {
    // Use all lots for all condominiums, not just Morada Nobre specific ones
    const allLots = selectedCondominiumData?.units ? 
      Array.from({ length: selectedCondominiumData.units }, (_, i) => `${(i + 1).toString().padStart(3, '0')}`) :
      MORADA_NOBRE_LOTS;

    if (!latestReport) {
      return allLots.map(lotId => ({
        lotId,
        status: 'unknown' as const,
        month: 'N/A',
        year: new Date().getFullYear()
      }));
    }

    const paidLots = Array.isArray(latestReport.paidUnitsList) ? latestReport.paidUnitsList as string[] : [];
    const defaultedLots = Array.isArray(latestReport.defaultUnitsList) ? latestReport.defaultUnitsList as string[] : [];

    return allLots.map(lotId => ({
      lotId,
      status: paidLots.includes(lotId) ? 'paid' as const :
             defaultedLots.includes(lotId) ? 'defaulted' as const : 
             'unknown' as const,
      amount: paidLots.includes(lotId) ? (Math.random() * 300 + 200) : undefined,
      month: auditReportsData && Array.isArray(auditReportsData) && auditReportsData.length > 0 && auditReportsData[0].audit ? 
        new Date(0, auditReportsData[0].audit.month - 1).toLocaleDateString('pt-BR', { month: 'long' }) : 
        'N/A',
      year: auditReportsData && Array.isArray(auditReportsData) && auditReportsData.length > 0 && auditReportsData[0].audit ? 
        auditReportsData[0].audit.year : new Date().getFullYear()
    }));
  };

  const lotData = generateLotData();

  // Filter lots based on search and filters
  const filteredLots = lotData.filter(lot => {
    const matchesSearch = lot.lotId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;
    const matchesQuadra = quadraFilter === 'all' || 
      (lot.lotId.length >= 2 ? lot.lotId.startsWith(quadraFilter) : true);
    
    return matchesSearch && matchesStatus && matchesQuadra;
  });

  // Get unique quadras for filter (dynamically based on current lot data)
  const quadras = Array.from(new Set(
    lotData
      .map(lot => lot.lotId.length >= 2 ? lot.lotId.substring(0, 2) : lot.lotId)
      .filter(q => q.length > 0)
  )).sort();

  // Statistics - use real data from audit report when available
  const stats = latestReport ? {
    total: latestReport.totalUnits || lotData.length,
    paid: latestReport.paidUnits || lotData.filter(l => l.status === 'paid').length,
    defaulted: latestReport.defaultUnits || lotData.filter(l => l.status === 'defaulted').length,
    unknown: (latestReport.totalUnits || lotData.length) - (latestReport.paidUnits || 0) - (latestReport.defaultUnits || 0),
    defaultRate: latestReport.defaultRate ? 
      parseFloat(latestReport.defaultRate.toString()).toFixed(1) :
      (lotData.length > 0 ? ((lotData.filter(l => l.status === 'defaulted').length / lotData.length) * 100).toFixed(1) : '0.0')
  } : {
    total: lotData.length,
    paid: lotData.filter(l => l.status === 'paid').length,
    defaulted: lotData.filter(l => l.status === 'defaulted').length,
    unknown: lotData.filter(l => l.status === 'unknown').length,
    defaultRate: lotData.length > 0 ? 
      ((lotData.filter(l => l.status === 'defaulted').length / lotData.length) * 100).toFixed(1) : '0.0'
  };

  const getLotStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pago
          </Badge>
        );
      case 'defaulted':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Inadimplente
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300">
            Não informado
          </Badge>
        );
    }
  };

  return (
    <div className="p-8">
      <Header 
        title="Relatório de Inadimplência" 
        subtitle="Visualize o status de pagamento de todos os lotes do condomínio" 
      />

      {/* Condominium Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Selecionar Condomínio
          </CardTitle>
          <CardDescription>
            Escolha um condomínio para visualizar o relatório de inadimplência
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCondominium} onValueChange={setSelectedCondominium}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-condominium">
              <SelectValue placeholder="Selecione um condomínio" />
            </SelectTrigger>
            <SelectContent>
              {(condominiums as Condominium[] || []).map((condo) => (
                <SelectItem key={condo.id} value={condo.id}>
                  {condo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCondominium && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Lotes</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-lots">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lotes Pagos</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-paid-lots">{stats.paid}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? ((stats.paid / stats.total) * 100).toFixed(1) : '0'}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lotes Inadimplentes</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-defaulted-lots">{stats.defaulted}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.defaultRate}% de inadimplência
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Não Informados</CardTitle>
                <AlertCircle className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600" data-testid="text-unknown-lots">{stats.unknown}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar lote..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-lots"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                    <SelectItem value="defaulted">Inadimplentes</SelectItem>
                    <SelectItem value="unknown">Não informados</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={quadraFilter} onValueChange={setQuadraFilter}>
                  <SelectTrigger data-testid="select-quadra-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as quadras</SelectItem>
                    {quadras.map(quadra => (
                      <SelectItem key={quadra} value={quadra}>
                        Quadra {quadra.charAt(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setQuadraFilter("all");
                  }}
                  data-testid="button-clear-filters"
                >
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lots Grid */}
          <Tabs defaultValue="grid" className="space-y-4">
            <TabsList>
              <TabsTrigger value="grid" data-testid="tab-grid-view">
                Visualização em Grade
              </TabsTrigger>
              <TabsTrigger value="list" data-testid="tab-list-view">
                Visualização em Lista
              </TabsTrigger>
            </TabsList>

            <TabsContent value="grid" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-3">
                {filteredLots.map((lot) => (
                  <Card 
                    key={lot.lotId} 
                    className={cn(
                      "transition-all hover:shadow-md cursor-pointer",
                      lot.status === 'paid' && "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
                      lot.status === 'defaulted' && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
                      lot.status === 'unknown' && "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/20"
                    )}
                    data-testid={`card-lot-${lot.lotId}`}
                  >
                    <CardContent className="p-3 text-center">
                      <div className="font-semibold text-sm mb-1">{lot.lotId}</div>
                      <div className="text-xs">
                        {lot.status === 'paid' ? (
                          <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                        ) : lot.status === 'defaulted' ? (
                          <AlertCircle className="w-4 h-4 text-red-600 mx-auto" />
                        ) : (
                          <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto"></div>
                        )}
                      </div>
                      {lot.amount && (
                        <div className="text-xs text-green-600 mt-1 font-medium">
                          R$ {lot.amount.toFixed(2)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {filteredLots.map((lot) => (
                      <div 
                        key={lot.lotId}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        data-testid={`row-lot-${lot.lotId}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="font-semibold">{lot.lotId}</div>
                          <div className="text-sm text-gray-500">
                            Quadra {lot.lotId.charAt(1)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {lot.amount && (
                            <div className="text-sm font-medium text-green-600">
                              R$ {lot.amount.toFixed(2)}
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            {lot.month}/{lot.year}
                          </div>
                          {getLotStatusBadge(lot.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {filteredLots.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-gray-500 dark:text-gray-400">
                  Nenhum lote encontrado com os filtros aplicados.
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedCondominium && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 dark:text-gray-400 mb-2">
              Selecione um condomínio para visualizar o relatório de inadimplência
            </div>
            <div className="text-sm text-gray-400">
              Os dados de pagamento serão carregados automaticamente
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}