import OpenAI from "openai";
import { PDFExtract } from "pdf.js-extract";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

interface ExpenseCategory {
  name: string;
  amount: number;
  percentage: number;
}

interface Inconsistency {
  title: string;
  description: string;
  type: "financeira" | "conformidade";
  severity: "baixa" | "media" | "alta";
}

interface AuditAnalysis {
  totalBalance: number;
  totalExpenses: number;
  biggestExpense: number;
  biggestExpenseDescription: string;
  expenseCategories: ExpenseCategory[];
  inconsistencies: Inconsistency[];
  summary: string;
}

export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  const pdfExtract = new PDFExtract();
  
  return new Promise((resolve, reject) => {
    pdfExtract.extractBuffer(pdfBuffer, {}, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!data) {
        reject(new Error("No data extracted from PDF"));
        return;
      }
      
      // Extract text from all pages
      const text = data.pages
        .map(page => 
          page.content
            .map(item => item.str)
            .join(' ')
        )
        .join('\n');
      
      resolve(text);
    });
  });
}

export async function analyzeCondominiumAccounts(pdfText: string): Promise<AuditAnalysis> {
  const prompt = `
    Você é um auditor especializado em prestações de contas de condomínios. Analise o seguinte documento de prestação de contas e forneça uma análise detalhada.

    Documento para análise:
    ${pdfText}

    Por favor, forneça uma análise completa no seguinte formato JSON:
    {
      "totalBalance": number, // Balanço total em reais
      "totalExpenses": number, // Total de despesas em reais
      "biggestExpense": number, // Maior gasto individual em reais
      "biggestExpenseDescription": string, // Descrição do maior gasto
      "expenseCategories": [
        {
          "name": string, // Nome da categoria (ex: "Manutenção", "Limpeza", "Segurança")
          "amount": number, // Valor gasto na categoria
          "percentage": number // Percentual do total
        }
      ],
      "inconsistencies": [
        {
          "title": string, // Título da inconsistência
          "description": string, // Descrição detalhada
          "type": "financeira" | "conformidade", // Tipo da inconsistência
          "severity": "baixa" | "media" | "alta" // Nível de criticidade
        }
      ],
      "summary": string // Resumo geral da análise
    }

    Instruções específicas:
    1. Identifique discrepâncias matemáticas, comprovantes ausentes, gastos atípicos
    2. Categorize as despesas em grupos lógicos (manutenção, limpeza, segurança, etc.)
    3. Calcule percentuais com precisão
    4. Seja específico nas descrições das inconsistências
    5. Use valores monetários em reais (sem formatação)
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é um auditor especializado em prestações de contas de condomínios. Responda sempre em JSON válido no formato solicitado."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and ensure required fields
    if (!result.totalBalance) result.totalBalance = 0;
    if (!result.totalExpenses) result.totalExpenses = 0;
    if (!result.biggestExpense) result.biggestExpense = 0;
    if (!result.biggestExpenseDescription) result.biggestExpenseDescription = "Não identificado";
    if (!result.expenseCategories) result.expenseCategories = [];
    if (!result.inconsistencies) result.inconsistencies = [];
    if (!result.summary) result.summary = "Análise concluída";

    return result as AuditAnalysis;
  } catch (error) {
    console.error("Error analyzing PDF with OpenAI:", error);
    throw new Error("Falha na análise do documento. Tente novamente.");
  }
}
