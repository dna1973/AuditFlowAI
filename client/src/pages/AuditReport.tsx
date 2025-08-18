import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, XCircle, TrendingUp, DollarSign, Users, UserCheck, Download } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link, useRoute } from "wouter";
import { PDFReportGenerator } from "@/lib/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import type { AuditReport } from "@shared/schema";

const severityConfig = {
  baixa: { label: "Baixa", className: "bg-yellow-500/10 text-yellow-600", icon: AlertTriangle },
  media: { label: "Média", className: "bg-orange-500/10 text-orange-600", icon: AlertTriangle },
  alta: { label: "Alta", className: "bg-red-500/10 text-red-600", icon: XCircle },
};

export default function AuditReport() {
  const [match, params] = useRoute("/audit-report/:id");
  const auditId = params?.id;
  const { toast } = useToast();

  const { data: reportData, isLoading } = useQuery<{audit: any, report: AuditReport, condominium: any}>({
    queryKey: ["/api/audits", auditId, "report"],
    enabled: !!auditId,
  });

  const report = reportData?.report;
  const audit = reportData?.audit;
  const condominium = reportData?.condominium;

  const handleDownloadPDF = () => {
    if (!report || !audit || !condominium) {
      toast({
        title: "Erro",
        description: "Dados insuficientes para gerar o relatório PDF",
        variant: "destructive"
      });
      return;
    }

    try {
      const pdfGenerator = new PDFReportGenerator();
      pdfGenerator.downloadReport({
        condominium,
        audit,
        report
      });
      
      toast({
        title: "Sucesso",
        description: "Relatório PDF baixado com sucesso",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar o relatório PDF",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-verde-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Carregando relatório de auditoria...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8">
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Relatório não encontrado</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            O relatório de auditoria solicitado não foi encontrado ou ainda não foi processado.
          </p>
          <Link href="/">
            <Button>Voltar ao Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const inconsistencies = (report.inconsistencies as any[]) || [];
  const expenseCategories = (report.expenseCategories as any[]) || [];
  const findings = (report.findings as any[]) || [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="flex items-center text-verde-accent hover:text-green-600 transition-colors duration-200 mb-4 p-0" data-testid="link-back-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <Header 
            title="Relatório de Auditoria"
            subtitle="Análise detalhada da prestação de contas"
          />
          <Button 
            onClick={handleDownloadPDF}
            className="bg-verde-accent hover:bg-green-600 text-white"
            data-testid="button-download-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF Completo
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Balanço Total</p>
                <p className="text-2xl font-bold text-verde-accent" data-testid="text-total-balance">
                  R$ {Number(report.totalBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-verde-accent/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-verde-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Despesas</p>
                <p className="text-2xl font-bold text-red-600" data-testid="text-total-expenses">
                  R$ {Number(report.totalExpenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inadimplência</p>
                <p className="text-2xl font-bold text-orange-600" data-testid="text-default-rate">
                  {report.defaultRate ? `${Number(report.defaultRate).toFixed(1)}%` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {report.defaultUnits || 0} de {report.totalUnits || 0} lotes
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inconsistências</p>
                <p className="text-2xl font-bold text-red-600" data-testid="text-inconsistencies-count">
                  {inconsistencies.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inadimplência Details */}
      {report.totalUnits && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-light-card dark:bg-dark-card">
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <UserCheck className="w-5 h-5 mr-2" />
                Lotes Adimplentes ({report.paidUnits || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                {report.paidUnits && report.paidUnits > 0 ? 
                  `${report.paidUnits} lotes adimplentes identificados` : 
                  'Dados não disponíveis no documento analisado'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="bg-light-card dark:bg-dark-card">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <Users className="w-5 h-5 mr-2" />
                Lotes Inadimplentes ({report.defaultUnits || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                {report.defaultUnits && report.defaultUnits > 0 ? 
                  `${report.defaultUnits} lotes inadimplentes identificados` : 
                  'Todos os lotes estão adimplentes'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expense Categories */}
      {expenseCategories.length > 0 && (
        <Card className="bg-light-card dark:bg-dark-card mb-8">
          <CardHeader>
            <CardTitle>Categorias de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expenseCategories.map((category: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{category.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {category.percentage}%
                        </span>
                        <span className="font-medium">
                          R$ {Number(category.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <Progress value={category.percentage} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inconsistencies */}
      {inconsistencies.length > 0 && (
        <Card className="bg-light-card dark:bg-dark-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
              Inconsistências Encontradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inconsistencies.map((inconsistency: any, index: number) => {
                const severityInfo = severityConfig[inconsistency.severity as keyof typeof severityConfig];
                const Icon = severityInfo?.icon || AlertTriangle;
                
                return (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{inconsistency.title}</h4>
                      <Badge className={severityInfo?.className || "bg-gray-500/10 text-gray-600"}>
                        <Icon className="w-3 h-3 mr-1" />
                        {severityInfo?.label || inconsistency.severity}
                      </Badge>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      {inconsistency.description}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {inconsistency.type === 'financeira' ? 'Financeira' : 'Conformidade'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Summary */}
      {report.aiAnalysis && (
        <Card className="bg-light-card dark:bg-dark-card mb-8">
          <CardHeader>
            <CardTitle>Resumo da Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {report.aiAnalysis}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Biggest Expense */}
      {report.biggestExpense && report.biggestExpenseDescription && (
        <Card className="bg-light-card dark:bg-dark-card">
          <CardHeader>
            <CardTitle>Maior Despesa Identificada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-lg">{report.biggestExpenseDescription}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Valor da despesa</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-600">
                  R$ {Number(report.biggestExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}