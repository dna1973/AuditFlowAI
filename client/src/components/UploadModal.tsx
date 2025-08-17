import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { X, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UploadResult } from "@uppy/core";
import type { Condominium } from "@shared/schema";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const months = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const years = [
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
  { value: "2022", label: "2022" },
];

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedCondominium, setSelectedCondominium] = useState("");
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch condominiums
  const { data: condominiums = [] } = useQuery<Condominium[]>({
    queryKey: ["/api/condominiums"],
  });

  // Create audit mutation
  const createAuditMutation = useMutation({
    mutationFn: async (auditData: any) => {
      return await apiRequest("POST", "/api/audits", auditData);
    },
    onSuccess: async (response) => {
      const audit = await response.json();
      
      // Process the uploaded document
      if (uploadedFileUrl) {
        await apiRequest("POST", `/api/audits/${audit.id}/process`, {
          documentUrl: uploadedFileUrl,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/condominiums"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Upload realizado com sucesso",
        description: "O documento está sendo processado. Você será notificado quando a análise estiver pronta.",
        variant: "default",
      });
      
      handleClose();
    },
    onError: (error) => {
      console.error("Error creating audit:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível processar o upload. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload", {});
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error("Error getting upload parameters:", error);
      toast({
        title: "Erro",
        description: "Não foi possível obter os parâmetros de upload.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL as string;
      setUploadedFileUrl(uploadURL);
      
      toast({
        title: "Arquivo enviado",
        description: "Arquivo PDF enviado com sucesso. Preencha os dados restantes.",
        variant: "default",
      });
    }
  };

  const handleSubmit = () => {
    if (!selectedMonth || !selectedYear || !selectedCondominium || !uploadedFileUrl) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos e faça upload do documento PDF.",
        variant: "destructive",
      });
      return;
    }

    createAuditMutation.mutate({
      condominiumId: selectedCondominium,
      month: parseInt(selectedMonth),
      year: parseInt(selectedYear),
      status: "pending",
    });
  };

  const handleClose = () => {
    setSelectedMonth("");
    setSelectedYear("");
    setSelectedCondominium("");
    setUploadedFileUrl("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-gray-700/50 max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-white flex items-center justify-between">
            Novo Upload de Documento
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg"
              data-testid="button-close-modal"
            >
              <X className="w-5 h-5 text-white" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Area */}
          <div>
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={50 * 1024 * 1024} // 50MB
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="w-full"
            >
              <div className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center hover:border-verde-accent/50 transition-colors duration-200 bg-white/5">
                <UploadCloud className="w-12 h-12 text-white/70 mx-auto mb-4" />
                <p className="text-white font-medium mb-2">Arraste e solte o arquivo PDF aqui</p>
                <p className="text-white/70 text-sm mb-4">ou clique para selecionar</p>
                <div className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors duration-200 inline-block">
                  Selecionar Arquivo
                </div>
              </div>
            </ObjectUploader>
            
            {uploadedFileUrl && (
              <p className="text-verde-accent text-sm mt-2" data-testid="text-file-uploaded">
                ✓ Arquivo PDF enviado com sucesso
              </p>
            )}
          </div>

          {/* Reference Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium text-white mb-2">Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full bg-white/10 border-white/20 text-white" data-testid="select-month">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-sm font-medium text-white mb-2">Ano</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full bg-white/10 border-white/20 text-white" data-testid="select-year">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Condominium Selection */}
          <div>
            <Label className="block text-sm font-medium text-white mb-2">Condomínio</Label>
            <Select value={selectedCondominium} onValueChange={setSelectedCondominium}>
              <SelectTrigger className="w-full bg-white/10 border-white/20 text-white" data-testid="select-condominium">
                <SelectValue placeholder="Selecione o condomínio" />
              </SelectTrigger>
              <SelectContent>
                {condominiums.map((condo) => (
                  <SelectItem key={condo.id} value={condo.id}>
                    {condo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="flex-1 py-3 bg-white/20 text-white hover:bg-white/30"
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createAuditMutation.isPending}
              className="flex-1 py-3 bg-verde-accent text-white hover:bg-green-600"
              data-testid="button-start-analysis"
            >
              {createAuditMutation.isPending ? "Processando..." : "Iniciar Análise"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
