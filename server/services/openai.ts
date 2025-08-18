import OpenAI from 'openai';
import type { AuditReport } from '@shared/schema';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface FinancialAnalysisInput {
  totalRevenue: number;
  totalExpenses: number;
  checkingAccountBalance: number;
  reserveFunds: number;
  totalUnits: number;
  paidUnits: number;
  defaultRate: number;
  mainExpenses: Array<{
    description: string;
    supplier: string;
    amount: number;
  }>;
  condominiumName: string;
  auditPeriod: string;
}

export class OpenAIAuditService {
  
  async generateExecutiveSummary(data: FinancialAnalysisInput): Promise<string> {
    try {
      const prompt = `
        Você é um auditor contábil especializado em condomínios. Analise os dados financeiros abaixo e crie um resumo executivo profissional em português:

        Condomínio: ${data.condominiumName}
        Período: ${data.auditPeriod}
        
        Dados Financeiros:
        - Receita Total: R$ ${data.totalRevenue.toLocaleString('pt-BR')}
        - Despesas Totais: R$ ${data.totalExpenses.toLocaleString('pt-BR')}
        - Saldo Conta Corrente: R$ ${data.checkingAccountBalance.toLocaleString('pt-BR')}
        - Fundo de Reserva: R$ ${data.reserveFunds.toLocaleString('pt-BR')}
        - Taxa de Inadimplência: ${data.defaultRate.toFixed(2)}% (${data.totalUnits - data.paidUnits} de ${data.totalUnits} unidades)
        
        Principais Despesas:
        ${data.mainExpenses.map(exp => `- ${exp.description}: R$ ${exp.amount.toLocaleString('pt-BR')}`).join('\n')}

        Gere um resumo executivo de 3-4 parágrafos destacando:
        1. Situação financeira geral
        2. Principais pontos de atenção
        3. Performance da inadimplência
        4. Comentários sobre as principais despesas
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.3
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating executive summary:', error);
      return 'Erro ao gerar resumo executivo. Verifique a conexão com OpenAI.';
    }
  }

  async generateFinancialAnalysis(data: FinancialAnalysisInput): Promise<string> {
    try {
      const balance = data.totalRevenue - data.totalExpenses;
      const prompt = `
        Como auditor contábil, analise detalhadamente a situação financeira do condomínio:

        ${data.condominiumName} - ${data.auditPeriod}
        
        Análise Financeira:
        - Receitas: R$ ${data.totalRevenue.toLocaleString('pt-BR')}
        - Despesas: R$ ${data.totalExpenses.toLocaleString('pt-BR')}
        - Resultado: R$ ${balance.toLocaleString('pt-BR')} (${balance >= 0 ? 'Superávit' : 'Déficit'})
        - Liquidez (Conta Corrente): R$ ${data.checkingAccountBalance.toLocaleString('pt-BR')}
        - Reservas: R$ ${data.reserveFunds.toLocaleString('pt-BR')}

        Forneça uma análise detalhada incluindo:
        1. Avaliação do resultado financeiro mensal
        2. Análise da liquidez e capacidade de pagamento
        3. Comentários sobre o fundo de reserva
        4. Recomendações para melhoria da gestão financeira
        5. Identificação de tendências ou riscos financeiros
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.3
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating financial analysis:', error);
      return 'Erro ao gerar análise financeira. Verifique a conexão com OpenAI.';
    }
  }

  async generateComplianceAnalysis(data: FinancialAnalysisInput): Promise<string> {
    try {
      const prompt = `
        Como auditor especializado em conformidade condominial, avalie os aspectos de conformidade:

        Condomínio: ${data.condominiumName}
        Período: ${data.auditPeriod}
        
        Indicadores de Conformidade:
        - Taxa de Inadimplência: ${data.defaultRate.toFixed(2)}%
        - Unidades em dia: ${data.paidUnits} de ${data.totalUnits}
        - Situação Financeira: ${data.totalRevenue >= data.totalExpenses ? 'Equilibrada' : 'Deficitária'}
        - Fundo de Reserva: R$ ${data.reserveFunds.toLocaleString('pt-BR')}

        Principais Despesas para Análise:
        ${data.mainExpenses.map(exp => `- ${exp.description}: R$ ${exp.amount.toLocaleString('pt-BR')}`).join('\n')}

        Analise a conformidade do condomínio considerando:
        1. Conformidade com normas de administração condominial
        2. Adequação dos níveis de inadimplência (ideal < 10%)
        3. Suficiência do fundo de reserva (recomendado 10-20% da receita mensal)
        4. Transparência e regularidade das despesas
        5. Cumprimento de obrigações legais e fiscais
        6. Recomendações específicas para melhorar conformidade
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.3
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating compliance analysis:', error);
      return 'Erro ao gerar análise de conformidade. Verifique a conexão com OpenAI.';
    }
  }

  async generateRecommendations(data: FinancialAnalysisInput): Promise<Array<{
    priority: 'Alta' | 'Média' | 'Baixa';
    finding: string;
    recommendation: string;
    responsible: string;
    deadline: string;
  }>> {
    try {
      const prompt = `
        Como consultor em gestão condominial, crie recomendações específicas baseadas nos dados:

        ${data.condominiumName} - ${data.auditPeriod}
        - Taxa de Inadimplência: ${data.defaultRate.toFixed(2)}%
        - Resultado Financeiro: R$ ${(data.totalRevenue - data.totalExpenses).toLocaleString('pt-BR')}
        - Fundo de Reserva: R$ ${data.reserveFunds.toLocaleString('pt-BR')}
        - Principais Despesas: ${data.mainExpenses.slice(0, 3).map(exp => exp.description).join(', ')}

        Retorne em formato JSON uma lista de 5-7 recomendações com:
        {
          "recommendations": [
            {
              "priority": "Alta|Média|Baixa",
              "finding": "Descrição do achado ou ponto de atenção",
              "recommendation": "Recomendação específica",
              "responsible": "Síndico|Administradora|Conselho|Assembleia",
              "deadline": "30 dias|60 dias|90 dias|120 dias"
            }
          ]
        }

        Priorize recomendações sobre:
        1. Redução da inadimplência (se > 10%)
        2. Controle de gastos principais
        3. Fortalecimento do fundo de reserva
        4. Melhorias na gestão financeira
        5. Transparência e comunicação
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"recommendations":[]}');
      return result.recommendations || [];
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [
        {
          priority: 'Alta' as const,
          finding: 'Erro na geração automática de recomendações',
          recommendation: 'Revisar configuração da integração com OpenAI',
          responsible: 'Administradora',
          deadline: '30 dias'
        }
      ];
    }
  }

  async enhanceAuditReport(report: Partial<AuditReport>, data: FinancialAnalysisInput): Promise<Partial<AuditReport>> {
    try {
      console.log('Generating AI-enhanced audit report...');
      
      const [summary, financialAnalysis, complianceAnalysis, recommendations] = await Promise.all([
        this.generateExecutiveSummary(data),
        this.generateFinancialAnalysis(data),
        this.generateComplianceAnalysis(data),
        this.generateRecommendations(data)
      ]);

      return {
        ...report,
        executiveSummary: summary,
        financialAnalysis,
        complianceAnalysis,
        recommendationsText: complianceAnalysis + '\n\nRecomendações específicas listadas na tabela de ações abaixo.',
        actionPlan: recommendations
      };
    } catch (error) {
      console.error('Error enhancing audit report:', error);
      return report;
    }
  }
}

export const openaiAuditService = new OpenAIAuditService();