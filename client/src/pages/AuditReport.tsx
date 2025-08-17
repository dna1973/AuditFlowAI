import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, DollarSign, TrendingDown, BarChart3, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useRoute } from "wouter";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { Audit, AuditReport, Condominium } from "@shared/schema";

interface ReportData {
  audit: Audit;
  report: AuditReport;
  condominium: Condominium;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

const severityConfig = {
  baixa: { label: "Baixa", className: "bg-orange-500 text-white", icon: Info },
  media: { label: "Média", className: "bg-yellow-500 text-white", icon: AlertCircle },
  alta: { label: "Alta", className: "bg-red-500 text-white", icon: AlertTriangle },
};

const typeConfig = {
  financeira: { label: "Financeira", className: "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200" },
  conformidade: { label: "Conformidade", className: "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200" },
};

export default function AuditReport() {
  const [match, params] = useRoute("/audit-report/:id");
  const auditId = params?.id;

  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ["/api/audits", auditId, "report"],
    enabled: !!auditId,
  });

  if (isLoading) {
    return <div>Carregando relatório...</div>;
  }

  if (!reportData) {
    return <div>Relatório não encontrado</div>;
  }

  const { audit, report, condominium } = reportData;
  const referenceDate = `${String(audit.month).padStart(2, '0')}/${audit.year}`;

  // Prepare chart data
  const expenseCategories = (report.expenseCategories as any[]) || [];
  const chartData = expenseCategories.map((category: any, index: number) => ({
    name: category.name,
    value: category.percentage,
    amount: category.amount,
    color: COLORS[index % COLORS.length],
  }));

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const renderTooltip = (props: any) => {
    if (props.active && props.payload && props.payload.length) {
      const data = props.payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(data.amount)} ({data.value}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/condominium/${condominium.id}`}>
          <a className="flex items-center text-verde-accent hover:text-green-600 transition-colors duration-200 mb-4" data-testid="link-back-condominium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Condomínio
          </a>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <Header 
              title="Relatório de Auditoria"
              subtitle={`${condominium.name} - ${referenceDate}`}
            />
          </div>
          <Button 
            className="px-4 py-2 bg-verde-accent text-white rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center"
            data-testid="button-download-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
        </div>
      </div>

      {/* Section 1: General Summary */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-6">Resumo Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-light-card dark:bg-dark-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Balanço Total</p>
                  <p className="text-2xl font-bold text-verde-accent" data-testid="text-total-balance">
                    {formatCurrency(report.totalBalance || 0)}
                  </p>
                  <p className="text-xs text-verde-accent mt-1">Saldo atual</p>
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
                  <p className="text-2xl font-bold text-red-500" data-testid="text-total-expenses">
                    {formatCurrency(report.totalExpenses || 0)}
                  </p>
                  <p className="text-xs text-red-500 mt-1">Gastos no período</p>
                </div>
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-light-card dark:bg-dark-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Maior Gasto do Mês</p>
                  <p className="text-2xl font-bold text-blue-500" data-testid="text-biggest-expense">
                    {formatCurrency(report.biggestExpense || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1" data-testid="text-biggest-expense-description">
                    {report.biggestExpenseDescription}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 2: Detailed Analysis */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-6">Análise Detalhada</h2>
        <Card className="bg-light-card dark:bg-dark-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">Distribuição de Despesas por Categoria</h3>
            
            {chartData.length > 0 ? (
              <>
                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {chartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={renderTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Expense Categories */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {chartData.map((category: any, index: number) => (
                    <div key={index} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg" data-testid={`category-${index}`}>
                      <div 
                        className="w-3 h-3 rounded-full mx-auto mb-2" 
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <p className="text-sm font-medium" data-testid={`category-name-${index}`}>
                        {category.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400" data-testid={`category-percentage-${index}`}>
                        {category.value}%
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Nenhuma categoria de despesa identificada
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Inconsistencies Found */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-6">Inconsistências Encontradas (Ressalvas)</h2>
        
        {!(report.inconsistencies as any[]) || (report.inconsistencies as any[]).length === 0 ? (
          <Card className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                Nenhuma Inconsistência Encontrada
              </h3>
              <p className="text-green-700 dark:text-green-400">
                Parabéns! A prestação de contas não apresentou inconsistências significativas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(report.inconsistencies as any[]).map((issue: any, index: number) => {
              const severityInfo = severityConfig[issue.severity as keyof typeof severityConfig];
              const typeInfo = typeConfig[issue.type as keyof typeof typeConfig];
              const SeverityIcon = severityInfo.icon;
              
              const cardColor = issue.severity === "alta" 
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                : issue.severity === "media"
                ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

              return (
                <Card key={index} className={`${cardColor} border`} data-testid={`inconsistency-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 mt-1 ${
                          issue.severity === "alta" ? "bg-red-500/10" :
                          issue.severity === "media" ? "bg-yellow-500/10" : "bg-orange-500/10"
                        }`}>
                          <SeverityIcon className={`w-5 h-5 ${
                            issue.severity === "alta" ? "text-red-500" :
                            issue.severity === "media" ? "text-yellow-500" : "text-orange-500"
                          }`} />
                        </div>
                        <div>
                          <h3 className={`font-semibold mb-2 ${
                            issue.severity === "alta" ? "text-red-800 dark:text-red-300" :
                            issue.severity === "media" ? "text-yellow-800 dark:text-yellow-300" : "text-orange-800 dark:text-orange-300"
                          }`} data-testid={`inconsistency-title-${index}`}>
                            {issue.title}
                          </h3>
                          <p className={`mb-3 ${
                            issue.severity === "alta" ? "text-red-700 dark:text-red-400" :
                            issue.severity === "media" ? "text-yellow-700 dark:text-yellow-400" : "text-orange-700 dark:text-orange-400"
                          }`} data-testid={`inconsistency-description-${index}`}>
                            {issue.description}
                          </p>
                          <div className="flex items-center space-x-4">
                            <Badge className={typeInfo.className} data-testid={`inconsistency-type-${index}`}>
                              {typeInfo.label}
                            </Badge>
                            <Badge className={severityInfo.className} data-testid={`inconsistency-severity-${index}`}>
                              {severityInfo.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Report Footer */}
      <Card className="bg-light-card dark:bg-dark-card">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Relatório gerado automaticamente pela IA do AuditFlow
            </p>
            <p className="text-xs text-gray-500">
              Data de geração: {new Date(audit.updatedAt || new Date()).toLocaleDateString('pt-BR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
