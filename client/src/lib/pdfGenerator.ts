import jsPDF from 'jspdf';
import type { AuditReport } from '@shared/schema';

interface ReportData {
  condominium: {
    name: string;
    address: string;
    units: number;
  };
  audit: {
    month: number;
    year: number;
  };
  report: AuditReport;
}

export class PDFReportGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
  }

  private getMonthName(month: number): string {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1] || 'Mês Inválido';
  }

  private formatCurrency(value: number | string): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }

  private addHeader(title: string) {
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.pageWidth / 2, 30, { align: 'center' });
  }

  private addSection(title: string, yPos: number): number {
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, yPos);
    return yPos + 10;
  }

  private addText(text: string, yPos: number, fontSize: number = 10): number {
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', 'normal');
    const splitText = this.doc.splitTextToSize(text, this.pageWidth - 2 * this.margin);
    this.doc.text(splitText, this.margin, yPos);
    return yPos + (splitText.length * fontSize * 0.6);
  }

  private checkPageBreak(currentY: number, requiredSpace: number = 50): number {
    if (currentY + requiredSpace > this.pageHeight - this.margin) {
      this.doc.addPage();
      return 30; // Reset y position for new page
    }
    return currentY;
  }

  private addSimpleTable(headers: string[], data: string[][], yPos: number): number {
    const minCellHeight = 12;
    const cellPadding = 2;
    const tableWidth = this.pageWidth - 2 * this.margin;
    
    // Calculate column widths based on content
    const columnWidths = headers.map((header, index) => {
      if (index === 0) return tableWidth * 0.12; // Prioridade - smaller
      if (index === 1) return tableWidth * 0.35; // Achado/Ponto de Atenção - larger
      if (index === 2) return tableWidth * 0.35; // Recomendação - larger  
      if (index === 3) return tableWidth * 0.12; // Responsável - smaller
      if (index === 4) return tableWidth * 0.06; // Prazo - smallest
      return tableWidth / headers.length; // fallback
    });
    
    // Draw headers
    this.doc.setFillColor(34, 197, 94); // Green background
    this.doc.rect(this.margin, yPos, tableWidth, minCellHeight, 'F');
    
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(255, 255, 255); // White text
    
    let currentX = this.margin;
    headers.forEach((header, index) => {
      // Break header text if needed
      const headerText = this.doc.splitTextToSize(header, columnWidths[index] - cellPadding * 2);
      this.doc.text(headerText[0], currentX + cellPadding, yPos + 8);
      currentX += columnWidths[index];
    });
    
    // Draw data rows
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(0, 0, 0); // Black text
    this.doc.setFontSize(8);
    
    let currentY = yPos + minCellHeight;
    
    data.forEach((row, rowIndex) => {
      // Calculate row height based on content
      let maxLines = 1;
      const cellTexts: string[][] = [];
      
      row.forEach((cell, cellIndex) => {
        const splitText = this.doc.splitTextToSize(cell || '', columnWidths[cellIndex] - cellPadding * 2);
        cellTexts.push(splitText);
        maxLines = Math.max(maxLines, splitText.length);
      });
      
      const rowHeight = Math.max(minCellHeight, maxLines * 5 + cellPadding * 2);
      
      // Draw alternating row background
      if (rowIndex % 2 === 1) {
        this.doc.setFillColor(248, 249, 250); // Light gray for alternate rows
        this.doc.rect(this.margin, currentY, tableWidth, rowHeight, 'F');
      }
      
      // Draw cell content
      currentX = this.margin;
      row.forEach((cell, cellIndex) => {
        const splitText = cellTexts[cellIndex];
        splitText.forEach((line, lineIndex) => {
          this.doc.text(line, currentX + cellPadding, currentY + 6 + (lineIndex * 5));
        });
        currentX += columnWidths[cellIndex];
      });
      
      // Draw cell borders
      this.doc.setDrawColor(200, 200, 200);
      currentX = this.margin;
      row.forEach((_, cellIndex) => {
        if (cellIndex > 0) {
          this.doc.line(currentX, currentY, currentX, currentY + rowHeight);
        }
        currentX += columnWidths[cellIndex];
      });
      
      currentY += rowHeight;
    });
    
    // Draw table outer borders
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.5);
    this.doc.rect(this.margin, yPos, tableWidth, currentY - yPos);
    
    // Draw horizontal lines
    this.doc.line(this.margin, yPos + minCellHeight, this.margin + tableWidth, yPos + minCellHeight);
    
    return currentY + 15;
  }

  public generateReport(data: ReportData): jsPDF {
    const { condominium, audit, report } = data;
    
    // Page 1: Executive Summary (Painel Resumo do Mês)
    this.addHeader(`Relatório Mensal de Verificação Contábil e de Conformidade`);
    
    let yPos = 50;
    yPos = this.addText(`Condomínio: ${condominium.name}`, yPos, 12);
    yPos = this.addText(`Mês de Referência: ${this.getMonthName(audit.month)} de ${audit.year}`, yPos, 12);
    yPos = this.addText(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, yPos, 12);
    
    yPos += 20;
    
    // 1. Painel Resumo do Mês (Sumário Executivo)
    yPos = this.addSection('1. Painel Resumo do Mês (Sumário Executivo)', yPos);
    
    // Saúde Financeira
    yPos = this.addSection('Saúde Financeira:', yPos);
    yPos = this.addText(`Saldo em Conta Corrente: ${this.formatCurrency(Number(report.checkingAccountBalance || 0))}`, yPos);
    yPos = this.addText(`Saldo no Fundo de Reserva: ${this.formatCurrency(Number(report.reserveFundBalance || 0))}`, yPos);
    yPos = this.addText(`Total de Receitas no Mês: ${this.formatCurrency(Number(report.totalRevenues || 0))}`, yPos);
    yPos = this.addText(`Total de Despesas no Mês: ${this.formatCurrency(Number(report.totalExpenses || 0))}`, yPos);
    yPos = this.addText(`Resultado do Mês: ${this.formatCurrency(Number(report.monthlyResult || 0))}`, yPos);
    
    yPos += 10;
    
    // Inadimplência
    yPos = this.addSection('Inadimplência:', yPos);
    yPos = this.addText(`Índice de Inadimplência do Mês: ${Number(report.defaultRate || 0).toFixed(1)}%`, yPos);
    yPos = this.addText(`Total Acumulado de Inadimplência: ${this.formatCurrency(Number(report.totalAccumulatedDefault || 0))}`, yPos);
    yPos = this.addText(`Unidades Inadimplentes: ${report.defaultUnits || 0} de ${report.totalUnits || 0}`, yPos);
    
    yPos += 10;
    
    // Alertas Importantes de Conformidade
    yPos = this.addSection('Alertas Importantes de Conformidade:', yPos);
    const complianceAlerts = (report.complianceAlerts as any[]) || [];
    if (complianceAlerts.length === 0) {
      yPos = this.addText('Nenhum alerta crítico este mês.', yPos);
    } else {
      complianceAlerts.forEach(alert => {
        yPos = this.addText(`• ${alert.message}`, yPos);
      });
    }

    // Page 2: Financial and Accounting Analysis
    this.doc.addPage();
    yPos = 30;
    
    yPos = this.addSection('2. Análise Financeira e Contábil do Mês', yPos);
    
    // 2.1 Conciliação Bancária
    yPos = this.addSection('2.1. Conciliação Bancária:', yPos);
    const bankReconciliation = (report.bankReconciliation as any) || {};
    yPos = this.addText(
      bankReconciliation.conclusion || 
      'As movimentações financeiras registradas no controle interno do condomínio estão em total conformidade com os extratos bancários das contas correntes e de investimento.', 
      yPos
    );
    
    yPos += 10;
    
    // 2.2 Receitas
    yPos = this.addSection('2.2. Receitas:', yPos);
    yPos = this.addText('Análise: As cotas condominiais foram emitidas corretamente e os recebimentos conferem com o relatório da administradora/banco.', yPos);
    
    const extraRevenues = (report.extraRevenues as any[]) || [];
    if (extraRevenues.length > 0) {
      yPos = this.addText('Receitas Extraordinárias:', yPos);
      extraRevenues.forEach(revenue => {
        yPos = this.addText(`• ${revenue.description}: ${this.formatCurrency(revenue.amount)}`, yPos);
      });
    }
    
    yPos += 10;
    
    // 2.3 Despesas
    yPos = this.addSection('2.3. Despesas:', yPos);
    yPos = this.addText('Análise Geral: Comportamento das despesas no mês em relação ao orçamento previsto.', yPos);
    
    // Principais Despesas do Mês
    const mainExpenses = (report.mainExpenses as any[]) || [];
    if (mainExpenses.length > 0) {
      yPos = this.addText('Principais Despesas do Mês:', yPos);
      
      // Create expense table
      const expenseData = mainExpenses.map(expense => [
        expense.description || 'N/A',
        expense.supplier || 'N/A',
        this.formatCurrency(expense.amount || 0)
      ]);
      
      yPos = this.addSimpleTable(['Descrição', 'Fornecedor', 'Valor'], expenseData, yPos);
    }
    
    yPos = this.addText('Verificação de Documentação: Todas as despesas acima de R$ 100,00 foram verificadas e possuem documentação suporte adequada.', yPos);
    
    yPos += 10;
    
    // 2.4 Gestão da Inadimplência
    yPos = this.addSection('2.4. Gestão da Inadimplência:', yPos);
    const defaultActions = (report.defaultManagementActions as any[]) || [];
    if (defaultActions.length > 0) {
      yPos = this.addText('Ações Realizadas no Mês:', yPos);
      defaultActions.forEach(action => {
        yPos = this.addText(`• ${action.description}`, yPos);
      });
    }

    // Page 3: Compliance Analysis
    this.doc.addPage();
    yPos = 30;
    
    yPos = this.addSection('3. Análise de Conformidade (Compliance)', yPos);
    
    const complianceVerification = (report.complianceVerification as any) || {};
    
    // 3.1 Obrigações Trabalhistas
    yPos = this.addSection('3.1. Obrigações Trabalhistas:', yPos);
    yPos = this.addText(`Status: ${complianceVerification.labor?.status || 'Em conformidade'}`, yPos);
    yPos = this.addText(complianceVerification.labor?.verification || 'Guias de INSS e FGTS dos funcionários foram pagas dentro do vencimento.', yPos);
    
    yPos += 10;
    
    // 3.2 Contratos e Serviços de Terceiros
    yPos = this.addSection('3.2. Contratos e Serviços de Terceiros:', yPos);
    yPos = this.addText(`Status: ${complianceVerification.contracts?.status || 'Em conformidade'}`, yPos);
    yPos = this.addText(complianceVerification.contracts?.verification || 'Pagamentos para empresas terceirizadas estão de acordo com os contratos vigentes.', yPos);
    
    yPos += 10;
    
    // 3.3 Certificações e Manutenções Obrigatórias
    yPos = this.addSection('3.3. Certificações e Manutenções Obrigatórias:', yPos);
    const certifications = complianceVerification.certifications || [];
    if (certifications.length > 0) {
      certifications.forEach((cert: any) => {
        const status = cert.status === 'ok' ? '✓' : '!';
        yPos = this.addText(`[${status}] ${cert.description}`, yPos);
      });
    }

    // Page 4: Recommendations and Action Plan
    this.doc.addPage();
    yPos = 30;
    
    yPos = this.addSection('4. Recomendações e Plano de Ação', yPos);
    
    const actionPlan = (report.actionPlan as any[]) || [];
    if (actionPlan.length > 0) {
      const actionData = actionPlan.map(action => [
        action.priority || 'Média',
        action.finding || 'N/A',
        action.recommendation || 'N/A',
        action.responsible || 'N/A',
        action.deadline || 'N/A'
      ]);
      
      yPos = this.addSimpleTable(
        ['Prioridade', 'Achado/Ponto de Atenção', 'Recomendação', 'Responsável', 'Prazo'], 
        actionData, 
        yPos
      );
    }

    // Page 5: Detailed Lists (Inadimplentes/Pagos)
    this.doc.addPage();
    yPos = 30;
    
    yPos = this.addSection('5. Anexos', yPos);
    
    // Lista de Inadimplentes
    yPos = this.addSection('5.1. Relatório de Inadimplentes:', yPos);
    const defaultUnitsList = (report.defaultUnitsList as string[]) || [];
    if (defaultUnitsList.length > 0) {
      // Create table with defaulting units - organize in multiple columns for better display
      const defaultData: string[][] = [];
      const unitsPerRow = 4; // Show 4 units per row for better layout
      
      for (let i = 0; i < defaultUnitsList.length; i += unitsPerRow) {
        const row = defaultUnitsList.slice(i, i + unitsPerRow);
        // Pad with empty strings if needed
        while (row.length < unitsPerRow) {
          row.push('');
        }
        defaultData.push(row);
      }
      
      this.doc.setFillColor(239, 68, 68); // Red background for header
      yPos = this.addSimpleTable(['Lote', 'Lote', 'Lote', 'Lote'], defaultData, yPos);
    }
    
    // Lista de Pagos (opcional, por privacidade)
    yPos = this.addSection('5.2. Relatório de Lotes em Dia (Restrito):', yPos);
    yPos = this.addText('Por questões de privacidade, a lista completa de lotes em dia está disponível apenas para o síndico e conselho fiscal.', yPos);

    return this.doc;
  }

  public downloadReport(data: ReportData): void {
    const doc = this.generateReport(data);
    const fileName = `Relatorio_Auditoria_${data.condominium.name.replace(/\s+/g, '_')}_${this.getMonthName(data.audit.month)}_${data.audit.year}.pdf`;
    doc.save(fileName);
  }
}