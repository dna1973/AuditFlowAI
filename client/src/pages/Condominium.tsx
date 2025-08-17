import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, FileText, Calendar, CheckCircle, Download, Trash2, Eye, AlertTriangle, Plus, Upload } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Link, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Condominium, Audit } from "@shared/schema";
import { useState, useRef } from "react";

const statusConfig = {
  pending: { label: "Pendente", className: "bg-yellow-500/10 text-yellow-600" },
  processing: { label: "Processando", className: "bg-blue-500/10 text-blue-600" },
  completed: { label: "Concluído", className: "bg-verde-accent/10 text-verde-accent" },
  error: { label: "Erro", className: "bg-red-500/10 text-red-600" },
};

export default function Condominium() {
  const [match, params] = useRoute("/condominium/:id");
  const condominiumId = params?.id;
  const { toast } = useToast();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: condominium } = useQuery<Condominium>({
    queryKey: ["/api/condominiums", condominiumId],
    enabled: !!condominiumId,
  });

  const { data: audits = [] } = useQuery<Audit[]>({
    queryKey: ["/api/condominiums", condominiumId, "audits"],
    enabled: !!condominiumId,
  });

  // Delete audit mutation
  const deleteAuditMutation = useMutation({
    mutationFn: async (auditId: string) => {
      return await apiRequest('DELETE', `/api/audits/${auditId}`);
    },
    onSuccess: (data) => {
      console.log("Audit deleted successfully:", data);
      
      // Invalidate all related queries to refresh the data immediately
      queryClient.invalidateQueries({ queryKey: ["/api/condominiums", condominiumId, "audits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/condominiums", condominiumId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/condominiums"] });
      
      // Force refetch of the audits list
      queryClient.refetchQueries({ queryKey: ["/api/condominiums", condominiumId, "audits"] });
      
      toast({ 
        title: "Sucesso", 
        description: `Prestação de contas excluída com sucesso! ${(data as any)?.deletedDocument ? 'Arquivo removido do storage.' : ''}`,
        duration: 3000
      });
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast({ 
        title: "Erro", 
        description: error.message || "Falha ao excluir prestação de contas",
        variant: "destructive",
        duration: 5000
      });
    },
  });

  // Upload audit mutation
  const uploadAuditMutation = useMutation({
    mutationFn: async ({ file, month, year }: { file: File; month: string; year: string }) => {
      setIsUploading(true);
      setUploadProgress(10);
      
      try {
        // Upload file directly to our backend with progress
        const formData = new FormData();
        formData.append('file', file);
        formData.append('condominiumId', condominiumId);
        formData.append('month', month);
        formData.append('year', year);
        
        const result = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          // Track upload progress
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded * 80) / event.total) + 10; // 10-90%
              setUploadProgress(progress);
            }
          });
          
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress(95);
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                reject(new Error('Resposta inválida do servidor'));
              }
            } else {
              reject(new Error(`Falha no upload: ${xhr.status} - ${xhr.responseText}`));
            }
          });
          
          xhr.addEventListener('error', () => {
            reject(new Error('Erro de conexão durante o upload'));
          });
          
          xhr.addEventListener('timeout', () => {
            reject(new Error('Timeout durante o upload (5 minutos)'));
          });
          
          xhr.open('POST', '/api/audits/upload');
          xhr.timeout = 300000; // 5 minutes timeout
          xhr.send(formData);
        });
        
        setUploadProgress(100);
        return result;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/condominiums", condominiumId, "audits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/condominiums", condominiumId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Sucesso",
        description: "Prestação de contas enviada com sucesso! A análise será iniciada em breve.",
        duration: 3000
      });
      
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setMonth("");
      setYear(new Date().getFullYear().toString());
      setUploadProgress(0);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Erro no Upload",
        description: error.message || "Falha ao enviar prestação de contas",
        variant: "destructive",
        duration: 5000
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos PDF",
          variant: "destructive",
          duration: 3000
        });
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "Erro",
          description: "O arquivo deve ter menos de 50MB",
          variant: "destructive",
          duration: 3000
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = () => {
    if (!selectedFile || !month || !year) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos e selecione um arquivo",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    uploadAuditMutation.mutate({ file: selectedFile, month, year });
  };

  const handleDownloadPdf = async (audit: Audit) => {
    if (!audit.documentPath) {
      toast({
        title: "Erro",
        description: "Documento não encontrado",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/audits/${audit.id}/download`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Falha no download');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = audit.fileName || `prestacao_contas_${audit.month}_${audit.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao fazer download do documento",
        variant: "destructive"
      });
    }
  };

  const handleViewReport = (auditId: string) => {
    window.open(`/audit-report/${auditId}`, '_blank');
  };

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
          <Button variant="ghost" className="flex items-center text-verde-accent hover:text-green-600 transition-colors duration-200 mb-4 p-0" data-testid="link-back-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </Link>
        <div className="flex justify-between items-start">
          <Header 
            title={condominium.name}
            subtitle="Visualize todas as prestações de contas e relatórios de auditoria"
          />
          
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-verde-accent hover:bg-green-600 text-white" data-testid="button-upload-document">
                <Plus className="w-4 h-4 mr-2" />
                Nova Prestação de Contas
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Upload de Prestação de Contas</DialogTitle>
                <DialogDescription>
                  Envie um arquivo PDF com a prestação de contas para análise automatizada.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="month" className="text-right">
                    Mês
                  </Label>
                  <Input
                    id="month"
                    placeholder="Ex: 01"
                    className="col-span-3"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    maxLength={2}
                    data-testid="input-month"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="year" className="text-right">
                    Ano
                  </Label>
                  <Input
                    id="year"
                    placeholder="Ex: 2025"
                    className="col-span-3"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    maxLength={4}
                    data-testid="input-year"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="file" className="text-right">
                    Arquivo PDF
                  </Label>
                  <div className="col-span-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-file"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                      data-testid="button-select-file"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {selectedFile ? selectedFile.name : "Selecionar arquivo"}
                    </Button>
                  </div>
                </div>
              </div>
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso do upload</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-gray-500 text-center">
                    {uploadProgress < 20 && "Preparando upload..."}
                    {uploadProgress >= 20 && uploadProgress < 80 && "Enviando arquivo..."}
                    {uploadProgress >= 80 && uploadProgress < 90 && "Processando..."}
                    {uploadProgress >= 90 && uploadProgress < 100 && "Criando auditoria..."}
                    {uploadProgress === 100 && "Concluído!"}
                  </p>
                </div>
              )}
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsUploadDialogOpen(false)}
                  disabled={isUploading}
                  data-testid="button-cancel-upload"
                >
                  {isUploading ? "Aguarde..." : "Cancelar"}
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleUploadSubmit}
                  disabled={isUploading || !selectedFile || !month || !year}
                  data-testid="button-submit-upload"
                >
                  {isUploading ? `Enviando ${uploadProgress}%` : "Enviar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
                        <div className="flex items-center space-x-2">
                          {/* Download PDF */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPdf(audit)}
                            disabled={!audit.documentPath}
                            className="h-8 w-8 p-0"
                            data-testid={`button-download-${audit.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          
                          {/* View Report */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReport(audit.id)}
                            disabled={audit.status !== 'completed'}
                            className="h-8 w-8 p-0"
                            data-testid={`button-view-report-${audit.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {/* Delete Audit */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={deleteAuditMutation.isPending}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-delete-${audit.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta prestação de contas de <strong>{audit.month}/{audit.year}</strong>?
                                  <br /><br />
                                  Esta ação não pode ser desfeita e todos os dados relacionados (incluindo relatórios de auditoria) serão permanentemente removidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-delete-${audit.id}`}>
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteAuditMutation.mutate(audit.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid={`button-confirm-delete-${audit.id}`}
                                >
                                  {deleteAuditMutation.isPending ? "Excluindo..." : "Excluir"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          
                          {/* Show error tooltip if needed */}
                          {audit.status === 'error' && (
                            <div className="flex items-center text-red-600">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                        </div>
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
