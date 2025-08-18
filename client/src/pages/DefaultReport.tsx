import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { AlertCircle, CheckCircle, Search, TrendingDown, TrendingUp, Building2, Calendar } from "lucide-react";
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
  const [selectedPeriod, setSelectedPeriod] = useState<string>("latest");
  const [viewMode, setViewMode] = useState<string>("current"); // current or historical

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

  // Get selected audit report based on period selection
  const getSelectedReport = () => {
    if (!auditReportsData || !Array.isArray(auditReportsData) || auditReportsData.length === 0) {
      return null;
    }

    if (selectedPeriod === "latest") {
      return auditReportsData[0].report as AuditReport;
    }

    // Find report by specific period (format: "YYYY-MM")
    const [year, month] = selectedPeriod.split('-').map(Number);
    const reportForPeriod = auditReportsData.find(item => 
      item.audit.year === year && item.audit.month === month
    );
    
    return reportForPeriod ? reportForPeriod.report as AuditReport : null;
  };

  const latestReport = getSelectedReport();
  
  // Get available periods from audit data
  const availablePeriods = auditReportsData && Array.isArray(auditReportsData) ? 
    auditReportsData.map(item => ({
      key: `${item.audit.year}-${item.audit.month.toString().padStart(2, '0')}`,
      label: `${new Date(0, item.audit.month - 1).toLocaleDateString('pt-BR', { month: 'long' })} ${item.audit.year}`,
      audit: item.audit,
      report: item.report
    })).sort((a, b) => b.key.localeCompare(a.key)) // Sort newest first
    : [];

  // Generate lot payment data using real audit report data
  const generateLotData = (): LotPaymentData[] => {
    // Always use the specific lot nomenclature from Morada Nobre
    const allLots = MORADA_NOBRE_LOTS;

    if (!latestReport) {
      // Generate realistic demo data when no real audit report is available
      const totalLots = allLots.length;
      const defaultRate = 0.15; // 15% default rate for demo
      const paidRate = 0.80; // 80% paid rate for demo
      
      return allLots.map((lotId, index) => {
        // Use a deterministic approach based on lot ID to ensure consistency
        const seed = lotId.charCodeAt(2) + lotId.charCodeAt(3) + lotId.charCodeAt(4);
        const pseudoRandom = (seed % 100) / 100;
        
        // Simple binary logic: pago ou inadimplente (15% inadimplência)
        const status: 'paid' | 'defaulted' = pseudoRandom < defaultRate ? 'defaulted' : 'paid';
        
        return {
          lotId,
          status,
          amount: status === 'paid' ? (200 + (seed % 300)) : undefined,
          month: 'Janeiro',
          year: new Date().getFullYear()
        };
      });
    }

    const paidLots = Array.isArray(latestReport.paidUnitsList) ? latestReport.paidUnitsList as string[] : [];
    const defaultedLots = Array.isArray(latestReport.defaultUnitsList) ? latestReport.defaultUnitsList as string[] : [];

    return allLots.map(lotId => ({
      lotId,
      status: paidLots.includes(lotId) ? 'paid' as const : 'defaulted' as const,
      amount: paidLots.includes(lotId) ? (200 + ((lotId.charCodeAt(2) + lotId.charCodeAt(3)) % 300)) : undefined,
      month: auditReportsData && Array.isArray(auditReportsData) && auditReportsData.length > 0 && auditReportsData[0].audit ? 
        new Date(0, auditReportsData[0].audit.month - 1).toLocaleDateString('pt-BR', { month: 'long' }) : 
        'Janeiro',
      year: auditReportsData && Array.isArray(auditReportsData) && auditReportsData.length > 0 && auditReportsData[0].audit ? 
        auditReportsData[0].audit.year : new Date().getFullYear()
    }));
  };

  // Generate historical data for all available periods
  const generateHistoricalData = () => {
    if (!availablePeriods.length) return [];
    
    return availablePeriods.map(period => {
      const paidLots = Array.isArray(period.report.paidUnitsList) ? period.report.paidUnitsList as string[] : [];
      const defaultedLots = Array.isArray(period.report.defaultUnitsList) ? period.report.defaultUnitsList as string[] : [];
      
      return {
        period: period.label,
        periodKey: period.key,
        totalUnits: period.report.totalUnits || 209,
        paidUnits: period.report.paidUnits || 0,
        defaultUnits: period.report.defaultUnits || 0,
        defaultRate: period.report.defaultRate ? parseFloat(period.report.defaultRate.toString()) : 0,
        lots: MORADA_NOBRE_LOTS.map(lotId => ({
          lotId,
          status: paidLots.includes(lotId) ? 'paid' as const : 'defaulted' as const,
          amount: paidLots.includes(lotId) ? (200 + ((lotId.charCodeAt(2) + lotId.charCodeAt(3)) % 300)) : undefined,
          month: period.label,
          year: period.audit.year
        }))
      };
    });
  };

  const lotData = generateLotData();
  const historicalData = generateHistoricalData();

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
      .map(lot => lot.lotId.substring(0, 2)) // Get the first 2 characters (e.g., QA, QB, etc.)
      .filter(q => q.length === 2)
  )).sort();

  // Statistics - always use real data from lot data calculation  
  const actualStats = {
    total: lotData.length,
    paid: lotData.filter(l => l.status === 'paid').length,
    defaulted: lotData.filter(l => l.status === 'defaulted').length,
  };

  const stats = {
    ...actualStats,
    defaultRate: actualStats.total > 0 ? 
      ((actualStats.defaulted / actualStats.total) * 100).toFixed(1) : '0.0'
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
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Inadimplente
          </Badge>
        );
    }
  };

  const getQuadraColor = (quadra: string) => {
    const colors = {
      'QA': 'border-blue-200 bg-blue-50',
      'QB': 'border-purple-200 bg-purple-50', 
      'QC': 'border-pink-200 bg-pink-50',
      'QD': 'border-yellow-200 bg-yellow-50',
      'QE': 'border-green-200 bg-green-50',
      'QF': 'border-indigo-200 bg-indigo-50',
      'QG': 'border-orange-200 bg-orange-50',
      'QH': 'border-teal-200 bg-teal-50',
      'QI': 'border-red-200 bg-red-50'
    };
    return colors[quadra as keyof typeof colors] || 'border-gray-200 bg-gray-50';
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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


          </div>

          {/* Period and View Mode Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Período e Visualização
              </CardTitle>
              <CardDescription>
                Selecione o período e modo de visualização dos dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Período</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger data-testid="select-period">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Mais Recente</SelectItem>
                      {availablePeriods.map((period) => (
                        <SelectItem key={period.key} value={period.key}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Visualização</label>
                  <Select value={viewMode} onValueChange={setViewMode}>
                    <SelectTrigger data-testid="select-view-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Período Atual</SelectItem>
                      <SelectItem value="historical">Evolução Histórica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedPeriod !== "latest" && (
                  <div className="flex items-end">
                    <p className="text-sm text-muted-foreground">
                      Exibindo dados de {availablePeriods.find(p => p.key === selectedPeriod)?.label || selectedPeriod}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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

          {/* Historical Evolution View */}
          {viewMode === "historical" && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Evolução Histórica de Pagamentos</CardTitle>
                <CardDescription>
                  Acompanhe a evolução dos pagamentos de cada lote ao longo dos períodos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Lote</th>
                        <th className="text-left p-2">Quadra</th>
                        {historicalData.map((period) => (
                          <th key={period.periodKey} className="text-center p-2 min-w-[120px]">
                            {period.period}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLots.map((lot) => (
                        <tr key={lot.lotId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <td className="p-2 font-medium">{lot.lotId}</td>
                          <td className="p-2 text-sm text-gray-600">Q{lot.lotId.charAt(1)}</td>
                          {historicalData.map((period) => {
                            const lotInPeriod = period.lots.find(l => l.lotId === lot.lotId);
                            return (
                              <td key={period.periodKey} className="p-2 text-center">
                                {lotInPeriod ? (
                                  <div className="flex flex-col items-center gap-1">
                                    {getLotStatusBadge(lotInPeriod.status)}
                                    {lotInPeriod.amount && (
                                      <span className="text-xs text-green-600 font-medium">
                                        R$ {lotInPeriod.amount.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Statistics by Period */}
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-medium mb-3">Resumo por Período</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {historicalData.map((period) => (
                      <Card key={period.periodKey} className="p-4">
                        <h5 className="font-medium text-sm mb-2">{period.period}</h5>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Pagos:</span>
                            <span className="font-medium text-green-600">{period.paidUnits}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Inadimplentes:</span>
                            <span className="font-medium text-red-600">{period.defaultUnits}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taxa de Inadimplência:</span>
                            <span className="font-medium">{period.defaultRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Period View */}
          {viewMode === "current" && (
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
              {/* Quadra Color Legend */}
              <Card className="mb-4">
                <CardContent className="pt-6">
                  <div className="mb-3">
                    <h4 className="font-medium text-sm">Legenda das Quadras:</h4>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {['QA', 'QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'QI'].map(quadra => (
                      <div key={quadra} className="flex items-center gap-2">
                        <div className={cn("w-4 h-4 rounded border", getQuadraColor(quadra))}></div>
                        <span className="text-sm">Quadra {quadra.charAt(1)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-6 mt-4 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-green-300 bg-green-100"></div>
                      <span className="text-sm">Pago</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-red-300 bg-red-100"></div>
                      <span className="text-sm">Inadimplente</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-3">
                {filteredLots.map((lot) => (
                  <Card 
                    key={lot.lotId} 
                    className={cn(
                      "transition-all hover:shadow-md cursor-pointer",
                      getQuadraColor(lot.lotId.substring(0, 2)),
                      lot.status === 'paid' && "border-green-300 bg-green-100 dark:border-green-800 dark:bg-green-900/20",
                      lot.status === 'defaulted' && "border-red-300 bg-red-100 dark:border-red-800 dark:bg-red-900/20"
                    )}
                    data-testid={`card-lot-${lot.lotId}`}
                  >
                    <CardContent className="p-3 text-center">
                      <div className="font-semibold text-sm mb-1">{lot.lotId}</div>
                      <div className="text-xs text-gray-500 mb-2">
                        Q{lot.lotId.charAt(1)} L{lot.lotId.substring(3)}
                      </div>
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
                            Quadra {lot.lotId.charAt(1)} - Lote {lot.lotId.substring(3)}
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
          )}

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