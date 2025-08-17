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
        console.error("PDF extraction error:", err);
        reject(err);
        return;
      }
      
      if (!data) {
        console.error("No data extracted from PDF");
        reject(new Error("No data extracted from PDF"));
        return;
      }
      
      console.log(`PDF has ${data.pages.length} pages`);
      
      // Extract text from all pages
      const text = data.pages
        .map(page => 
          page.content
            .map(item => item.str)
            .join(' ')
        )
        .join('\n');
      
      console.log(`Extracted text length: ${text.length} characters`);
      console.log("First 500 characters of extracted text:", text.substring(0, 500));
      
      resolve(text);
    });
  });
}

function truncateText(text: string, maxTokens: number = 25000): string {
  // Estimate tokens (rough approximation: 1 token = 4 characters)
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  
  console.log(`Truncating text from ${text.length} to ${maxChars} characters`);
  return text.substring(0, maxChars) + "\n\n[DOCUMENTO TRUNCADO DEVIDO AO TAMANHO]";
}

export async function analyzeCondominiumAccounts(pdfText: string): Promise<AuditAnalysis> {
  console.log("Starting AI analysis...");
  
  if (!pdfText || pdfText.trim().length === 0) {
    console.error("PDF text is empty or undefined");
    throw new Error("Texto extraído do PDF está vazio");
  }

  // Truncate text to fit within token limits
  const truncatedText = truncateText(pdfText);
  console.log("Text truncated for analysis, final length:", truncatedText.length);
  
  const prompt = `
    Você é um auditor especializado em prestações de contas de condomínios. Analise o seguinte documento de prestação de contas e forneça uma análise detalhada.

    IMPORTANTE: Extraia os valores numéricos reais do documento. Procure por:
    - Saldos bancários e financeiros
    - Receitas (taxas condominiais, receitas extraordinárias)
    - Despesas operacionais (manutenção, limpeza, segurança, energia, água, etc.)
    - Comprovantes de pagamento e notas fiscais

    Documento para análise:
    ${truncatedText}

    Por favor, forneça uma análise completa no seguinte formato JSON:
    {
      "totalBalance": number, // Balanço total em reais (valor numérico)
      "totalExpenses": number, // Total de despesas em reais (valor numérico)
      "biggestExpense": number, // Maior gasto individual em reais (valor numérico)
      "biggestExpenseDescription": string, // Descrição do maior gasto
      "expenseCategories": [
        {
          "name": string, // Nome da categoria (ex: "Manutenção", "Limpeza", "Segurança")
          "amount": number, // Valor gasto na categoria (valor numérico)
          "percentage": number // Percentual do total (valor numérico)
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
      "summary": string // Resumo geral da análise com valores específicos
    }

    Instruções específicas:
    1. SEMPRE extraia valores numéricos reais do documento, nunca use zeros
    2. Se não conseguir encontrar valores específicos, estime baseado no contexto
    3. Identifique discrepâncias matemáticas, comprovantes ausentes, gastos atípicos
    4. Categorize as despesas em grupos lógicos (manutenção, limpeza, segurança, etc.)
    5. Calcule percentuais com precisão baseado nos valores encontrados
    6. Seja específico nas descrições das inconsistências
    7. Use apenas valores numéricos (ex: 1500.50, não "R$ 1.500,50")
    8. Se o documento contém tabelas ou listas de valores, some-os corretamente
  `;

  try {
    console.log("Sending request to OpenAI...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é um auditor especializado em prestações de contas de condomínios. Sua tarefa é extrair valores numéricos reais do documento e nunca retornar zeros. Responda sempre em JSON válido no formato solicitado."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4000
    });

    const rawResponse = response.choices[0].message.content || "{}";
    console.log("OpenAI response received, parsing JSON...");
    console.log("Raw AI response:", rawResponse);

    const result = JSON.parse(rawResponse);
    console.log("Parsed AI result:", JSON.stringify(result, null, 2));
    
    // Validate and ensure required fields with meaningful defaults only if truly needed
    if (result.totalBalance === undefined || result.totalBalance === null) {
      console.warn("totalBalance missing from AI response");
      result.totalBalance = 0;
    }
    if (result.totalExpenses === undefined || result.totalExpenses === null) {
      console.warn("totalExpenses missing from AI response");
      result.totalExpenses = 0;
    }
    if (result.biggestExpense === undefined || result.biggestExpense === null) {
      console.warn("biggestExpense missing from AI response");
      result.biggestExpense = 0;
    }
    if (!result.biggestExpenseDescription) {
      result.biggestExpenseDescription = "Não identificado no documento";
    }
    if (!result.expenseCategories) {
      result.expenseCategories = [];
    }
    if (!result.inconsistencies) {
      result.inconsistencies = [];
    }
    if (!result.summary) {
      result.summary = "Análise do documento de prestação de contas concluída";
    }

    console.log("Final analysis result:", {
      totalBalance: result.totalBalance,
      totalExpenses: result.totalExpenses,
      biggestExpense: result.biggestExpense,
      categoriesCount: result.expenseCategories.length,
      inconsistenciesCount: result.inconsistencies.length
    });

    return result as AuditAnalysis;
  } catch (error) {
    console.error("Error analyzing PDF with OpenAI:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    throw new Error(`Falha na análise do documento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}
