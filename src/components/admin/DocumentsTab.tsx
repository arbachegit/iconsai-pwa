import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, Trash2, RefreshCw, FileCode, CheckCircle2, XCircle, Clock, Download, Edit, ArrowUpDown, X, Plus, Search, Boxes, Package, BookOpen, Lightbulb, HelpCircle, Heart, GraduationCap, Eye, Settings2, AlertTriangle, RotateCcw, Table2 as TableIcon, Brain, Tags, TrendingUp, Sparkles, Hash, Shuffle } from "lucide-react";
import { formatDateTime } from "@/lib/date-utils";
import { DocumentTagEnrichmentModal, SelectedTag } from "./DocumentTagEnrichmentModal";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { RagFlowDiagram } from "./RagFlowDiagram";
import { extractReadableTitle, detectRenameReason, type PDFMetadata } from "@/lib/document-title-utils";

// Configure PDF.js worker with local bundle
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PDFExtractionResult {
  text: string;
  metadata: PDFMetadata;
}

interface FileUploadStatus {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'waiting' | 'extracting' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  targetChat: string | null;
  details: string;
  totalChunks?: number;
  documentId?: string;
  error?: string;
}
export const DocumentsTab = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Filter and sort states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [readabilityFilter, setReadabilityFilter] = useState<string>("all");
  const [showOnlyRenamed, setShowOnlyRenamed] = useState(false);
  const [sortField, setSortField] = useState<"created_at" | "filename" | "total_chunks" | "status" | "readability_score">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Tag editing states
  const [editingTagsDoc, setEditingTagsDoc] = useState<any>(null);
  const [newParentTag, setNewParentTag] = useState("");
  const [newChildTag, setNewChildTag] = useState("");
  const [selectedParentForChild, setSelectedParentForChild] = useState<string | null>(null);

  // Chunk visualization states
  const [viewChunksDoc, setViewChunksDoc] = useState<any>(null);

  // Bulk export states
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkReprocessing, setIsBulkReprocessing] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [statusInfoDoc, setStatusInfoDoc] = useState<any>(null);
  const [showUploadStatus, setShowUploadStatus] = useState(true);

  // Duplicate detection states
  const [duplicateInfo, setDuplicateInfo] = useState<{
    newFileName: string;
    existingFileName: string;
    existingDocId: string;
    newDocId: string;
    similarityScore?: number;
    newTextPreview?: string;
    existingTextPreview?: string;
  } | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Text preview before processing states
  const [previewFiles, setPreviewFiles] = useState<Array<{
    file: File;
    extractedText: string;
    charCount: number;
    wordCount: number;
    validRatio: number;
    letterCount: number;
  }>>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const extractionAbortRef = useRef(false);
  const [extractionProgress, setExtractionProgress] = useState<{
    currentFile: number;
    totalFiles: number;
    fileName: string;
    currentPage: number;
    totalPages: number;
  } | null>(null);
  const [fileToRemove, setFileToRemove] = useState<number | null>(null);
  const [queueFileToRemove, setQueueFileToRemove] = useState<number | null>(null);

  // Tag enrichment modal state
  const [tagEnrichmentModal, setTagEnrichmentModal] = useState<{
    open: boolean;
    fileIndex: number;
    fileName: string;
  } | null>(null);
  const [fileEnrichments, setFileEnrichments] = useState<Map<number, {
    selectedTags: SelectedTag[];
    additionalContext: string;
  }>>(new Map());

  // Document AI OCR toggle
  const [useDocumentAI, setUseDocumentAI] = useState(false);

  // ML Suggestion approval state
  const [pendingMLSuggestion, setPendingMLSuggestion] = useState<{
    fileName: string;
    suggestedChat: string;
    confidence: number;
    pattern: string;
    fileId: string;
    documentId?: string;
    extractedText: string;
    onAccept: () => void;
    onReject: (correctedChat: string) => void;
  } | null>(null);
  const [mlRejectionChat, setMlRejectionChat] = useState<string>("general");

  // Retry with custom validation parameters
  const [retryDoc, setRetryDoc] = useState<any>(null);
  const [retryParams, setRetryParams] = useState({
    minTextLength: 50,
    validCharRatio: 0.5,
    minLetterCount: 30
  });

  // Function to highlight text differences between two strings
  const highlightTextDifferences = (text1: string, text2: string): { highlighted1: React.ReactNode; highlighted2: React.ReactNode } => {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    const set1 = new Set(words1.map(w => w.toLowerCase()));
    const set2 = new Set(words2.map(w => w.toLowerCase()));
    
    const highlighted1 = words1.map((word, idx) => {
      const isUnique = !set2.has(word.toLowerCase());
      return (
        <span key={idx}>
          {isUnique ? (
            <span className="bg-green-500/30 text-green-300 px-0.5 rounded">{word}</span>
          ) : (
            word
          )}{' '}
        </span>
      );
    });
    
    const highlighted2 = words2.map((word, idx) => {
      const isUnique = !set1.has(word.toLowerCase());
      return (
        <span key={idx}>
          {isUnique ? (
            <span className="bg-amber-500/30 text-amber-300 px-0.5 rounded">{word}</span>
          ) : (
            word
          )}{' '}
        </span>
      );
    });
    
    return { highlighted1, highlighted2 };
  };

  // RAG Info Modal state
  const [showRagInfoModal, setShowRagInfoModal] = useState(false);

  // Tags modal state
  const [tagsModalDoc, setTagsModalDoc] = useState<any>(null);

  // Manual insertion modal state
  const [insertionModalDoc, setInsertionModalDoc] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch documents
  const {
    data: documents,
    isLoading
  } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("documents").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data;
    }
  });

  // Extract text from PDF with improved OCR handling and progress callback
  const extractTextFromPDF = async (
    file: File,
    onProgress?: (page: number, total: number) => void,
    abortRef?: React.MutableRefObject<boolean>
  ): Promise<PDFExtractionResult> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;
    
    // Extract PDF metadata
    let pdfMetadata: PDFMetadata = {};
    try {
      const metadata = await pdf.getMetadata();
      const info = (metadata?.info || {}) as Record<string, unknown>;
      pdfMetadata = {
        title: typeof info.Title === 'string' ? info.Title : undefined,
        author: typeof info.Author === 'string' ? info.Author : undefined,
        subject: typeof info.Subject === 'string' ? info.Subject : undefined,
        creator: typeof info.Creator === 'string' ? info.Creator : undefined,
      };
    } catch (e) {
      console.log('Could not extract PDF metadata:', e);
    }
    
    let fullText = "";
    const totalPages = pdf.numPages;
    
    for (let i = 1; i <= totalPages; i++) {
      // Check for cancellation at each page
      if (abortRef?.current) {
        break;
      }
      
      // Report progress
      onProgress?.(i, totalPages);
      
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Improved text reconstruction with better spacing
      let lastY: number | null = null;
      const pageLines: string[] = [];
      let currentLine = "";
      
      textContent.items.forEach((item: any) => {
        if (item.str) {
          // Detect line breaks based on Y position
          const itemY = item.transform?.[5];
          if (lastY !== null && itemY !== undefined && Math.abs(itemY - lastY) > 5) {
            if (currentLine.trim()) {
              pageLines.push(currentLine.trim());
            }
            currentLine = "";
          }
          currentLine += item.str + " ";
          lastY = itemY;
        }
      });
      
      if (currentLine.trim()) {
        pageLines.push(currentLine.trim());
      }
      
      fullText += pageLines.join("\n") + "\n\n";
    }
    
    // Clean up extra whitespace while preserving structure
    const cleanedText = fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
    
    return {
      text: cleanedText,
      metadata: pdfMetadata
    };
  };

  // Get ML-suggested chat based on filename pattern matching
  const getMLSuggestedChat = async (filename: string): Promise<{ chat: string; confidence: number; pattern: string } | null> => {
    // Extract pattern from filename
    const filenamePattern = filename
      .toLowerCase()
      .replace(/\.pdf$/i, '')
      .replace(/[0-9]+/g, '')
      .replace(/[-_]/g, ' ')
      .split(' ')
      .filter(w => w.length > 2)
      .slice(0, 3)
      .join(' ')
      .trim();
    
    if (filenamePattern.length <= 3) return null;

    // Query chat_routing_rules for matching patterns with high confidence
    const { data: rules, error } = await supabase
      .from("chat_routing_rules")
      .select("*")
      .gte("confidence", 0.6) // Only apply rules with >= 60% confidence
      .order("confidence", { ascending: false });
    
    if (error || !rules || rules.length === 0) return null;

    // Find best matching rule
    for (const rule of rules) {
      const rulePattern = rule.document_filename_pattern.toLowerCase();
      const patternWords = rulePattern.split(' ');
      const filenameWords = filenamePattern.split(' ');
      
      // Check if pattern matches (all pattern words found in filename)
      const matches = patternWords.every(pw => 
        filenameWords.some(fw => fw.includes(pw) || pw.includes(fw))
      );
      
      if (matches) {
        return {
          chat: rule.corrected_chat,
          confidence: rule.confidence || 0.6,
          pattern: rule.document_filename_pattern
        };
      }
    }

    return null;
  };

  // Extract text from PDF using Google Document AI (for tables)
  const extractTextWithDocumentAI = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const { data, error } = await supabase.functions.invoke('extract-pdf-document-ai', {
      body: {
        pdf_base64: base64,
        filename: file.name
      }
    });

    if (error) {
      console.error('Document AI error:', error);
      throw new Error(`Document AI failed: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Document AI processing failed');
    }
    
    return data.text;
  };

  // Poll document status
  const pollDocumentStatus = async (documentId: string, fileId: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const {
        data,
        error
      } = await supabase.from('documents').select('status, target_chat, total_chunks, error_message').eq('id', documentId).single();
      if (error || attempts >= maxAttempts) {
        clearInterval(poll);
        setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
          ...s,
          status: 'failed',
          progress: 100,
          details: error?.message || 'Timeout ao aguardar processamento'
        } : s));
        return;
      }
      if (data?.status === 'completed') {
        clearInterval(poll);
        setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
          ...s,
          status: 'completed',
          progress: 100,
          targetChat: data.target_chat,
          totalChunks: data.total_chunks,
          details: `Processado com sucesso em ${data.total_chunks} chunks`
        } : s));
      } else if (data?.status === 'failed') {
        clearInterval(poll);
        setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
          ...s,
          status: 'failed',
          progress: 100,
          details: `Falha: ${data.error_message || 'Erro desconhecido'}`
        } : s));
      } else {
        // Still processing
        setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
          ...s,
          progress: Math.min(s.progress + 2, 90),
          details: 'Processando documento...'
        } : s));
      }
    }, 2000);
  };

  // Upload and process documents with real-time status
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (selectedFiles.length === 0) throw new Error("Nenhum arquivo selecionado");
      setUploading(true);

      // Initialize status for all files
      const initialStatuses: FileUploadStatus[] = selectedFiles.map((file, idx) => ({
        id: `file-${Date.now()}-${idx}`,
        fileName: file.name,
        fileSize: file.size,
        status: 'waiting',
        progress: 0,
        targetChat: null,
        details: 'Na fila'
      }));
      setUploadStatuses(initialStatuses);
      setShowUploadStatus(true);
      try {
        const documentsData: Array<{
          document_id: string;
          full_text: string;
          title: string;
          fileId: string;
          preSelectedTags: Array<{
            id: string;
            name: string;
            type: 'parent' | 'child';
            parentId?: string | null;
            parentName?: string | null;
          }>;
          additionalContext: string;
        }> = [];

        // Process each file
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const fileId = initialStatuses[i].id;
          try {
            // Phase 1: Extracting
            setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
              ...s,
              status: 'extracting',
              progress: 10,
              details: useDocumentAI ? 'Extraindo com Google Document AI (tabelas)...' : 'Extraindo texto do PDF...'
            } : s));
            
            let extractedText: string;
            let pdfMetadata: PDFMetadata = {};
            
            if (useDocumentAI) {
              extractedText = await extractTextWithDocumentAI(file);
            } else {
              const pdfResult = await extractTextFromPDF(file);
              extractedText = pdfResult.text;
              pdfMetadata = pdfResult.metadata;
            }
            
            if (extractedText.length < 100) {
              setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
                ...s,
                status: 'failed',
                progress: 100,
                details: 'Texto muito curto (mínimo 100 caracteres)'
              } : s));
              continue;
            }

            // Phase 2: Generate readable title using hierarchical approach
            setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
              ...s,
              status: 'uploading',
              progress: 25,
              details: 'Gerando título legível...'
            } : s));
            
            const titleResult = await extractReadableTitle(extractedText, file.name, pdfMetadata);
            
            setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
              ...s,
              progress: 35,
              details: `Título: ${titleResult.title} (${titleResult.source})`
            } : s));

            // Check ML suggestions for chat routing
            const mlSuggestion = await getMLSuggestedChat(file.name);
            let finalChat = "general";
            let mlDecision: 'accepted' | 'rejected' | null = null;
            
            if (mlSuggestion && mlSuggestion.confidence >= 0.7) {
              // Show ML suggestion modal for high confidence suggestions
              const userDecision = await new Promise<{ accepted: boolean; correctedChat?: string }>((resolve) => {
                setPendingMLSuggestion({
                  fileName: file.name,
                  suggestedChat: mlSuggestion.chat,
                  confidence: mlSuggestion.confidence,
                  pattern: mlSuggestion.pattern,
                  fileId: fileId,
                  extractedText: extractedText,
                  onAccept: () => resolve({ accepted: true }),
                  onReject: (correctedChat: string) => resolve({ accepted: false, correctedChat })
                });
              });

              if (userDecision.accepted) {
                finalChat = mlSuggestion.chat;
                mlDecision = 'accepted';
                setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
                  ...s,
                  progress: 40,
                  details: `✅ ML aceito: ${mlSuggestion.chat}`
                } : s));
              } else {
                finalChat = userDecision.correctedChat || "general";
                mlDecision = 'rejected';
                setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
                  ...s,
                  progress: 40,
                  details: `❌ ML rejeitado → ${finalChat}`
                } : s));
                
                // Update ML rule with rejection feedback
                await supabase.rpc('increment_chat_routing_rule_count', {
                  p_filename_pattern: mlSuggestion.pattern,
                  p_suggested_chat: mlSuggestion.chat,
                  p_corrected_chat: finalChat
                });
              }
            } else if (mlSuggestion) {
              // Auto-apply lower confidence suggestions without modal
              finalChat = mlSuggestion.chat;
              setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
                ...s,
                progress: 40,
                details: `ML sugeriu: ${mlSuggestion.chat} (${Math.round(mlSuggestion.confidence * 100)}%)`
              } : s));
              toast.info(`🤖 ML aplicou "${mlSuggestion.chat}" para "${file.name}"`);
            } else {
              setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
                ...s,
                progress: 40,
                details: 'Criando registro no banco...'
              } : s));
            }

            // Detect WHY the title needs renaming (if it does)
            const originalProblem = detectRenameReason(file.name);
            const wasRenamed = titleResult.source !== 'filename';

            const {
              data: documents,
              error: docError
            } = await supabase.from("documents").insert([{
              filename: file.name,
              original_title: file.name, // Always preserve the original filename
              original_text: extractedText,
              text_preview: extractedText.substring(0, 500),
              status: "pending",
              target_chat: finalChat,
              // Title fields with full audit trail
              ai_title: wasRenamed ? titleResult.title : null,
              needs_title_review: titleResult.source === 'ai',
              title_source: titleResult.source,
              title_was_renamed: wasRenamed,
              renamed_at: wasRenamed ? new Date().toISOString() : null,
              rename_reason: originalProblem // 'numeric' | 'hash' | 'uuid' | 'unreadable' | 'technical' | 'mixed_pattern' | null
            }]).select();
            const document = documents?.[0];
            if (docError || !document) {
              setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
                ...s,
                status: 'failed',
                progress: 100,
                details: 'Erro ao criar registro'
              } : s));
              continue;
            }

            // Log ML decision if applicable
            if (mlDecision && mlSuggestion) {
              await supabase.from("document_routing_log").insert({
                document_id: document.id,
                document_name: file.name,
                original_category: mlSuggestion.chat,
                final_category: finalChat,
                action_type: mlDecision === 'accepted' ? 'ml_accepted' : 'ml_rejected',
                session_id: `admin-${Date.now()}`,
                scope_changed: mlDecision === 'rejected',
                metadata: {
                  ml_suggestion: true,
                  ml_confidence: mlSuggestion.confidence,
                  ml_pattern: mlSuggestion.pattern,
                  decision: mlDecision
                }
              });
            }

            // Phase 3: Processing
            setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
              ...s,
              status: 'processing',
              progress: 60,
              details: 'Aguardando processamento...',
              documentId: document.id
            } : s));
            // Get enrichment data if available
            const enrichment = fileEnrichments.get(i);
            
            documentsData.push({
              document_id: document.id,
              full_text: extractedText,
              title: file.name,
              fileId: fileId,
              // Include enrichment data
              preSelectedTags: enrichment?.selectedTags.map(t => ({
                id: t.id,
                name: t.name,
                type: t.type,
                parentId: t.parentId,
                parentName: t.parentName
              })) || [],
              additionalContext: enrichment?.additionalContext || ""
            });
          } catch (error: any) {
            setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
              ...s,
              status: 'failed',
              progress: 100,
              details: `Erro: ${error.message}`
            } : s));
          }
        }
        if (documentsData.length === 0) {
          throw new Error("Nenhum documento válido para processar");
        }

        // Send to bulk processing
        const {
          data: processResult,
          error: processError
        } = await supabase.functions.invoke("process-bulk-document", {
          body: {
            documents_data: documentsData.map(d => ({
              document_id: d.document_id,
              full_text: d.full_text,
              title: d.title,
              preSelectedTags: d.preSelectedTags,
              additionalContext: d.additionalContext
            }))
          }
        });
        if (processError) throw processError;

        // Process results immediately - handle failures and duplicates
        const failedDocIds = new Set<string>();
        const duplicateDocIds = new Set<string>();
        
        if (processResult?.results) {
          // Update UI immediately for failed documents
          const failures = processResult.results.filter((r: any) => r.status === "failed");
          failures.forEach((fail: any) => {
            failedDocIds.add(fail.document_id);
            const docData = documentsData.find(d => d.document_id === fail.document_id);
            if (docData) {
              setUploadStatuses(prev => prev.map(s => s.id === docData.fileId ? {
                ...s,
                status: 'failed',
                progress: 100,
                details: `❌ ${fail.error || 'Erro desconhecido'}`,
                error: fail.error
              } : s));
            }
          });
          
          // Show toast for failures
          if (failures.length > 0) {
            toast.error(`${failures.length} documento(s) falharam na validação`);
          }

          // Check for duplicates
          const duplicates = processResult.results.filter((r: any) => r.status === "duplicate");
          if (duplicates.length > 0) {
            const dup = duplicates[0];
            duplicateDocIds.add(dup.document_id);
            const newDoc = documentsData.find(d => d.document_id === dup.document_id);
            if (newDoc) {
              setUploadStatuses(prev => prev.map(s => s.id === newDoc.fileId ? {
                ...s,
                status: 'failed',
                progress: 100,
                details: `⚠️ Duplicata: ${dup.existing_filename}`
              } : s));
              
              // Fetch existing document text preview
              const { data: existingDoc } = await supabase
                .from("documents")
                .select("text_preview, original_text")
                .eq("id", dup.existing_doc_id)
                .single();
              
              // Fetch new document text preview
              const { data: newDocData } = await supabase
                .from("documents")
                .select("text_preview, original_text")
                .eq("id", dup.document_id)
                .single();
              
              setDuplicateInfo({
                newFileName: newDoc.title,
                existingFileName: dup.existing_filename || "Documento existente",
                existingDocId: dup.existing_doc_id,
                newDocId: dup.document_id,
                similarityScore: dup.similarity_score,
                newTextPreview: newDocData?.text_preview || newDocData?.original_text?.substring(0, 1000) || "",
                existingTextPreview: existingDoc?.text_preview || existingDoc?.original_text?.substring(0, 1000) || ""
              });
              setShowComparison(false);
              toast.warning("Documento duplicado detectado!");
              return; // Stop processing to show modal
            }
          }
        }

        // Start polling ONLY for documents that didn't fail or get marked as duplicates
        documentsData.forEach((doc) => {
          if (!failedDocIds.has(doc.document_id) && !duplicateDocIds.has(doc.document_id)) {
            pollDocumentStatus(doc.document_id, doc.fileId);
          }
        });
        
        // (audit logging handled server-side)

        
        toast.success(`${documentsData.length} documento(s) enviado(s) para processamento!`);
      } catch (error: any) {
        console.error("Erro ao processar documentos:", error);
        toast.error(`Erro: ${error.message}`);
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"]
      });
      setSelectedFiles([]);
    },
    onError: (error: any) => {
      console.error("Erro ao processar documento:", error);
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Delete document
  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const {
        error
      } = await supabase.from("documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"]
      });
      toast.success("Documento deletado");
      setSelectedDoc(null);
    }
  });

  // Reprocess failed document
  const reprocessMutation = useMutation({
    mutationFn: async (docId: string) => {
      // 1. Fetch document
      const {
        data: doc,
        error: fetchError
      } = await supabase.from("documents").select("*").eq("id", docId).single();
      if (fetchError) throw fetchError;

      // 2. Clear old data
      await supabase.from("document_chunks").delete().eq("document_id", docId);
      await supabase.from("document_tags").delete().eq("document_id", docId);

      // 3. Reset status
      await supabase.from("documents").update({
        status: "pending",
        error_message: null
      }).eq("id", docId);

      // 4. Reprocess
      const {
        error: processError
      } = await supabase.functions.invoke("process-bulk-document", {
        body: {
          documents_data: [{
            document_id: docId,
            full_text: doc.original_text,
            title: doc.filename
          }]
        }
      });
      if (processError) throw processError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"]
      });
      toast.success("Documento reprocessado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao reprocessar: ${error.message}`);
    }
  });

  // Generate documentation
  const generateDocsMutation = useMutation({
    mutationFn: async () => {
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-documentation');
      if (error) throw error;
      return data;
    },
    onSuccess: data => {
      toast.success(`Documentação gerada: ${data.version}`);
      queryClient.invalidateQueries({
        queryKey: ['documentation-versions']
      });
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar documentação: ${error.message}`);
    }
  });

  // Handle duplicate - Discard new document
  const handleDiscardDuplicate = async () => {
    if (!duplicateInfo) return;
    try {
      await supabase.from("documents").delete().eq("id", duplicateInfo.newDocId);
      toast.info("Documento descartado com sucesso");
      setDuplicateInfo(null);
      queryClient.invalidateQueries({
        queryKey: ["documents"]
      });
    } catch (error: any) {
      toast.error(`Erro ao descartar: ${error.message}`);
    }
  };

  // Handle duplicate - Replace existing document
  const handleReplaceDuplicate = async () => {
    if (!duplicateInfo) return;
    setIsReplacing(true);
    try {
      // 1. Delete old document and ALL its related data
      await supabase.from("document_chunks").delete().eq("document_id", duplicateInfo.existingDocId);
      await supabase.from("document_tags").delete().eq("document_id", duplicateInfo.existingDocId);
      await supabase.from("document_versions").delete().eq("document_id", duplicateInfo.existingDocId);
      await supabase.from("document_routing_log").delete().eq("document_id", duplicateInfo.existingDocId);
      await supabase.from("documents").delete().eq("id", duplicateInfo.existingDocId);

      // 2. Clean up any partial data from the new document (if processing started)
      await supabase.from("document_chunks").delete().eq("document_id", duplicateInfo.newDocId);
      await supabase.from("document_tags").delete().eq("document_id", duplicateInfo.newDocId);
      await supabase.from("document_versions").delete().eq("document_id", duplicateInfo.newDocId);

      // 3. Get new document data
      const { data: newDoc, error: fetchError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", duplicateInfo.newDocId)
        .single();
      
      if (fetchError || !newDoc) {
        throw new Error("Documento novo não encontrado");
      }

      // 4. Validate original_text exists
      if (!newDoc.original_text || newDoc.original_text.length < 100) {
        throw new Error("Texto original não disponível para reprocessamento");
      }

      // 5. Reset status and clear content_hash to avoid duplicate detection
      await supabase.from("documents").update({
        status: "pending",
        content_hash: null,
        error_message: null
      }).eq("id", duplicateInfo.newDocId);

      // 6. Trigger reprocessing
      const { error: processError } = await supabase.functions.invoke("process-bulk-document", {
        body: {
          documents_data: [{
            document_id: newDoc.id,
            full_text: newDoc.original_text,
            title: newDoc.filename
          }]
        }
      });
      
      if (processError) throw processError;
      
      toast.success("Documento substituído com sucesso!");
      setDuplicateInfo(null);
      queryClient.invalidateQueries({
        queryKey: ["documents"]
      });
    } catch (error: any) {
      toast.error(`Erro ao substituir: ${error.message}`);
    } finally {
      setIsReplacing(false);
    }
  };

  // Handle bulk delete selected documents
  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const docsToDelete = Array.from(selectedDocs);
      
      // Get document info before deleting (for audit log)
      const docsInfo = documents?.filter(d => selectedDocs.has(d.id))
        .map(d => ({ id: d.id, filename: d.filename, target_chat: d.target_chat })) || [];
      
      for (const docId of docsToDelete) {
        // Delete all related data first
        await supabase.from("document_chunks").delete().eq("document_id", docId);
        await supabase.from("document_tags").delete().eq("document_id", docId);
        await supabase.from("document_versions").delete().eq("document_id", docId);
        await supabase.from("document_routing_log").delete().eq("document_id", docId);
        // Delete document
        await supabase.from("documents").delete().eq("id", docId);
      }
      
      // (audit logging handled server-side)

      
      toast.success(`${docsToDelete.length} documento(s) excluído(s) com sucesso`);
      setSelectedDocs(new Set());
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (error: any) {
      toast.error(`Erro ao excluir: ${error.message}`);
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  // Reprocess selected documents
  const handleBulkReprocess = async () => {
    setIsBulkReprocessing(true);
    try {
      const docsToReprocess = documents?.filter(d => selectedDocs.has(d.id) && (d.status === "failed" || d.status === "pending")) || [];
      for (const doc of docsToReprocess) {
        await reprocessMutation.mutateAsync(doc.id);
      }
      toast.success(`${docsToReprocess.length} documento(s) reprocessado(s)`);
      setSelectedDocs(new Set());
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsBulkReprocessing(false);
    }
  };

  // Reprocess ALL pending/failed documents
  const handleReprocessAllPendingFailed = async () => {
    const pendingFailed = documents?.filter(d => d.status === "failed" || d.status === "pending") || [];
    if (pendingFailed.length === 0) {
      toast.info("Nenhum documento pendente ou falhado encontrado");
      return;
    }
    setIsBulkReprocessing(true);
    try {
      for (const doc of pendingFailed) {
        await reprocessMutation.mutateAsync(doc.id);
      }
      toast.success(`${pendingFailed.length} documento(s) reprocessado(s)`);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsBulkReprocessing(false);
    }
  };

  // Check if document is stuck in processing
  const isStuck = (doc: any) => {
    if (doc.status !== "processing") return false;
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    return new Date(doc.updated_at).getTime() < twoMinutesAgo;
  };

  // Fetch last documentation version
  const {
    data: lastDocVersion
  } = useQuery({
    queryKey: ["documentation-versions"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("documentation_versions").select("*").order("created_at", {
        ascending: false
      }).limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Fetch tags for selected document
  const {
    data: tags
  } = useQuery({
    queryKey: ["document-tags", selectedDoc?.id],
    enabled: !!selectedDoc,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("document_tags").select("*").eq("document_id", selectedDoc.id).order("tag_type", {
        ascending: true
      });
      if (error) throw error;
      return data;
    }
  });

  // Fetch tags for editing document
  const {
    data: editingTags,
    refetch: refetchEditingTags
  } = useQuery({
    queryKey: ["document-tags-editing", editingTagsDoc?.id],
    enabled: !!editingTagsDoc,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("document_tags").select("*").eq("document_id", editingTagsDoc.id).order("tag_type", {
        ascending: true
      });
      if (error) throw error;
      return data;
    }
  });

  // Fetch all tags for quick access in table
  const {
    data: allTags
  } = useQuery({
    queryKey: ["all-document-tags"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("document_tags").select("*");
      if (error) throw error;
      return data;
    }
  });

  // Helper: Get top parent tag for a document
  const getTopParentTag = useCallback((documentId: string) => {
    if (!allTags) return null;
    const docTags = allTags.filter(t => t.document_id === documentId && t.tag_type === "parent");
    if (docTags.length === 0) return null;

    // Return tag with highest confidence
    return docTags.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
  }, [allTags]);

  // Fetch chunks for viewing
  const {
    data: chunks,
    isLoading: chunksLoading
  } = useQuery({
    queryKey: ["document-chunks", viewChunksDoc?.id],
    enabled: !!viewChunksDoc,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("document_chunks").select("*").eq("document_id", viewChunksDoc.id).order("chunk_index", {
        ascending: true
      });
      if (error) throw error;
      return data;
    }
  });

  // RAG Metrics query
  const {
    data: metrics
  } = useQuery({
    queryKey: ["rag-quick-metrics"],
    queryFn: async () => {
      const {
        data: docs
      } = await supabase.from("documents").select("status, target_chat");
      const {
        count: chunks
      } = await supabase.from("document_chunks").select("*", {
        count: "exact",
        head: true
      });
      return {
        totalDocs: docs?.length || 0,
        totalChunks: chunks || 0,
        completed: docs?.filter(d => d.status === "completed").length || 0,
        failed: docs?.filter(d => d.status === "failed").length || 0,
        health: docs?.filter(d => d.target_chat === "health").length || 0,
        study: docs?.filter(d => d.target_chat === "study").length || 0,
        general: docs?.filter(d => d.target_chat === "general").length || 0
      };
    }
  });
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfFiles = files.filter(f => f.type === "application/pdf");
    if (pdfFiles.length === 0) {
      toast.error("Por favor, selecione arquivo(s) PDF");
    } else {
      setSelectedFiles(pdfFiles);
      setUploadStatuses([]);
    }
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(f => f.type === "application/pdf");
    if (pdfFiles.length === 0) {
      toast.error("Por favor, arraste arquivo(s) PDF");
    } else {
      setSelectedFiles(pdfFiles);
      setUploadStatuses([]);
    }
  }, []);

  // Analyze text quality
  const analyzeTextQuality = (text: string) => {
    const validChars = text.match(/[\p{L}\p{N}\s.,;:!?'"()\-–—]/gu)?.length || 0;
    const letterCount = text.match(/\p{L}/gu)?.length || 0;
    return {
      charCount: text.length,
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      validRatio: text.length > 0 ? validChars / text.length : 0,
      letterCount
    };
  };

  // Extract and preview files before processing
  const handlePreviewExtraction = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setIsExtracting(true);
    extractionAbortRef.current = false;
    
    const previews: typeof previewFiles = [];
    const totalFiles = selectedFiles.length;
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Update progress with initial page info
      setExtractionProgress({
        currentFile: i + 1,
        totalFiles,
        fileName: file.name,
        currentPage: 0,
        totalPages: 0
      });
      
      // Check if cancelled
      if (extractionAbortRef.current) {
        break;
      }
      
      try {
        const pdfResult = await extractTextFromPDF(
          file,
          (currentPage, totalPages) => {
            setExtractionProgress(prev => prev ? {
              ...prev,
              currentPage,
              totalPages
            } : null);
          },
          extractionAbortRef
        );
        const analysis = analyzeTextQuality(pdfResult.text);
        previews.push({
          file,
          extractedText: pdfResult.text,
          ...analysis
        });
      } catch (error: any) {
        previews.push({
          file,
          extractedText: `Erro na extração: ${error.message}`,
          charCount: 0,
          wordCount: 0,
          validRatio: 0,
          letterCount: 0
        });
      }
    }
    
    setPreviewFiles(previews);
    setExtractionProgress(null);
    if (!extractionAbortRef.current && previews.length > 0) {
      setShowPreviewModal(true);
    }
    setIsExtracting(false);
  }, [selectedFiles, extractTextFromPDF]);

  // Cancel extraction
  const handleCancelExtraction = useCallback(() => {
    extractionAbortRef.current = true;
    setExtractionProgress(null);
    setIsExtracting(false);
    toast.info("Extração cancelada");
  }, []);

  // Remove file from preview (with confirmation)
  const handleRemovePreviewFile = useCallback(() => {
    if (fileToRemove === null) return;
    setPreviewFiles(prev => {
      const newPreviews = prev.filter((_, i) => i !== fileToRemove);
      if (newPreviews.length === 0) {
        setShowPreviewModal(false);
      }
      return newPreviews;
    });
    setFileToRemove(null);
    toast.info("Arquivo removido do preview");
  }, [fileToRemove]);

  // Retry failed document with custom validation parameters
  const retryWithParamsMutation = useMutation({
    mutationFn: async ({ docId, params }: { docId: string; params: typeof retryParams }) => {
      const { data: doc, error: fetchError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", docId)
        .single();
      if (fetchError) throw fetchError;

      // Clear old data
      await supabase.from("document_chunks").delete().eq("document_id", docId);
      await supabase.from("document_tags").delete().eq("document_id", docId);

      // Reset status
      await supabase.from("documents").update({
        status: "pending",
        error_message: null
      }).eq("id", docId);

      // Reprocess with custom validation params
      const { error: processError } = await supabase.functions.invoke("process-bulk-document", {
        body: {
          documents_data: [{
            document_id: docId,
            full_text: doc.original_text,
            title: doc.filename
          }],
          validation_params: {
            min_text_length: params.minTextLength,
            valid_char_ratio: params.validCharRatio,
            min_letter_count: params.minLetterCount
          }
        }
      });
      if (processError) throw processError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento reprocessado com parâmetros ajustados!");
      setRetryDoc(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao reprocessar: ${error.message}`);
    }
  });

  const downloadAsPDF = useCallback((doc: any) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;

      // Title
      pdf.setFontSize(16);
      pdf.text(doc.filename, margin, 20);

      // Document text
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(doc.original_text || doc.text_preview || "Sem conteúdo", maxWidth);
      let y = 35;
      lines.forEach((line: string) => {
        if (y > 280) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, margin, y);
        y += 5;
      });
      pdf.save(`${doc.filename.replace('.pdf', '')}_exportado.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao exportar PDF: ${error.message}`);
    }
  }, []);

  // Add tag mutation
  const addTagMutation = useMutation({
    mutationFn: async ({
      documentId,
      tagName,
      tagType,
      parentTagId
    }: {
      documentId: string;
      tagName: string;
      tagType: string;
      parentTagId?: string | null;
    }) => {
      const {
        error
      } = await supabase.from("document_tags").insert({
        document_id: documentId,
        tag_name: tagName,
        tag_type: tagType,
        parent_tag_id: parentTagId,
        source: "admin",
        confidence: 1.0
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchEditingTags();
      queryClient.invalidateQueries({
        queryKey: ["document-tags"]
      });
      toast.success("Tag adicionada");
    }
  });

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      // First remove child tags if it's a parent
      await supabase.from("document_tags").delete().eq("parent_tag_id", tagId);
      // Then remove the tag
      await supabase.from("document_tags").delete().eq("id", tagId);
    },
    onSuccess: () => {
      refetchEditingTags();
      queryClient.invalidateQueries({
        queryKey: ["document-tags"]
      });
      toast.success("Tag removida");
    }
  });

  // Export selected documents as ZIP
  const exportSelectedAsZip = useCallback(async () => {
    if (selectedDocs.size === 0) {
      toast.error("Nenhum documento selecionado");
      return;
    }
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const docs = documents?.filter(d => selectedDocs.has(d.id)) || [];
      for (const doc of docs) {
        // Generate PDF for each document
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        const maxWidth = pageWidth - margin * 2;

        // Title
        pdf.setFontSize(16);
        pdf.text(doc.filename, margin, 20);

        // Document text
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(doc.original_text || doc.text_preview || "Sem conteúdo", maxWidth);
        let y = 35;
        lines.forEach((line: string) => {
          if (y > 280) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(line, margin, y);
          y += 5;
        });

        // Add to ZIP
        const pdfBlob = pdf.output('blob');
        zip.file(`${doc.filename.replace('.pdf', '')}_exportado.pdf`, pdfBlob);
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({
        type: 'blob'
      });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentos_exportados_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${docs.length} documento(s) exportados com sucesso!`);
      setSelectedDocs(new Set());
    } catch (error: any) {
      toast.error(`Erro ao exportar: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [selectedDocs, documents]);

  // Filtered and sorted documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents || [];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => d.filename?.toLowerCase().includes(query) || d.original_text?.toLowerCase().includes(query) || d.text_preview?.toLowerCase().includes(query) || d.ai_summary?.toLowerCase().includes(query));
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    // Readability filter
    if (readabilityFilter !== "all") {
      if (readabilityFilter === "high") {
        filtered = filtered.filter(d => d.readability_score !== null && d.readability_score >= 0.8);
      } else if (readabilityFilter === "medium") {
        filtered = filtered.filter(d => d.readability_score !== null && d.readability_score >= 0.5 && d.readability_score < 0.8);
      } else if (readabilityFilter === "low") {
        filtered = filtered.filter(d => d.readability_score !== null && d.readability_score < 0.5);
      } else if (readabilityFilter === "unscored") {
        filtered = filtered.filter(d => d.readability_score === null);
      }
    }

    // Title renamed filter
    if (showOnlyRenamed) {
      filtered = filtered.filter(d => d.title_was_renamed === true);
    }

    // Sorting
    filtered = [...filtered].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortField === "created_at") {
        const aVal = a.created_at;
        const bVal = b.created_at;
        return (new Date(aVal).getTime() - new Date(bVal).getTime()) * direction;
      }
      if (sortField === "filename") {
        return (a.filename || "").localeCompare(b.filename || "") * direction;
      }
      if (sortField === "total_chunks") {
        return ((a.total_chunks || 0) - (b.total_chunks || 0)) * direction;
      }
      if (sortField === "status") {
        return (a.status || "").localeCompare(b.status || "") * direction;
      }
      if (sortField === "readability_score") {
        return ((a.readability_score || 0) - (b.readability_score || 0)) * direction;
      }
      return 0;
    });
    return filtered;
  }, [documents, statusFilter, readabilityFilter, showOnlyRenamed, sortField, sortDirection, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil((filteredDocuments?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = filteredDocuments?.slice(startIndex, endIndex) || [];

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, readabilityFilter, searchQuery]);

  // Toggle document selection
  const toggleDocSelection = useCallback((docId: string) => {
    setSelectedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  }, []);

  // Select all filtered documents
  const selectAllFiltered = useCallback(() => {
    if (selectedDocs.size === filteredDocuments?.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocuments?.map(d => d.id) || []));
    }
  }, [filteredDocuments, selectedDocs.size]);
  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1); // Reset pagination
  };
  const getStatusIcon = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'waiting':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
  };
  const getStatusBadgeVariant = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  const getChatBadgeColor = (chat: string | null) => {
    switch (chat?.toUpperCase()) {
      case 'HEALTH':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'STUDY':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'BOTH':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'GENERAL':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'ECONOMIA':
        return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
      default:
        return '';
    }
  };
  const parentTags = tags?.filter(t => t.tag_type === "parent") || [];
  const childTags = tags?.filter(t => t.tag_type === "child") || [];
  const editingParentTags = editingTags?.filter(t => t.tag_type === "parent") || [];
  const editingChildTags = editingTags?.filter(t => t.tag_type === "child") || [];

  // Manual insertion mutation
  const manualInsertMutation = useMutation({
    mutationFn: async ({
      docId,
      targetChat
    }: {
      docId: string;
      targetChat: string;
    }) => {
      // 1. Atualizar documento
      const {
        error
      } = await supabase.from("documents").update({
        is_inserted: true,
        inserted_in_chat: targetChat,
        inserted_at: new Date().toISOString(),
        redirected_from: 'general',
        target_chat: targetChat
      }).eq("id", docId);
      if (error) throw error;

      // 2. Registrar log de roteamento
      const {
        data: doc
      } = await supabase.from("documents").select("filename, target_chat").eq("id", docId).single();
      await supabase.from("document_routing_log").insert({
        document_id: docId,
        document_name: doc?.filename || 'Documento',
        original_category: doc?.target_chat || 'general',
        final_category: targetChat,
        action_type: 'manual_redirect',
        session_id: `admin-${Date.now()}`,
        scope_changed: true,
        disclaimer_shown: true,
        metadata: {
          manual_insertion: true,
          admin_action: true
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"]
      });
      toast.success("Documento inserido no chat com sucesso!");
      setInsertionModalDoc(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao inserir: ${error.message}`);
    }
  });

  // Mutation para alterar destino do chat inserido com aprendizado de máquina
  const updateInsertedChatMutation = useMutation({
    mutationFn: async ({
      docId,
      newChat,
      previousChat
    }: {
      docId: string;
      newChat: string;
      previousChat: string;
    }) => {
      const { error } = await supabase.from("documents").update({
        inserted_in_chat: newChat
      }).eq("id", docId);
      if (error) throw error;

      // Buscar dados do documento para extrair padrão do nome
      const { data: doc } = await supabase.from("documents").select("filename, target_chat").eq("id", docId).single();
      
      // Salvar regra de aprendizado de máquina para roteamento de chat
      // Extrair padrão do nome do arquivo (primeiras palavras significativas)
      if (doc?.filename) {
        const filenamePattern = doc.filename
          .toLowerCase()
          .replace(/\.pdf$/i, '')
          .replace(/[0-9]+/g, '')
          .replace(/[-_]/g, ' ')
          .split(' ')
          .filter(w => w.length > 2)
          .slice(0, 3)
          .join(' ')
          .trim();
        
        if (filenamePattern.length > 3) {
          // Usar a function do banco para criar/incrementar regra
          await supabase.rpc('increment_chat_routing_rule_count', {
            p_filename_pattern: filenamePattern,
            p_suggested_chat: previousChat,
            p_corrected_chat: newChat
          });
        }
      }

      // Registrar log de alteração
      await supabase.from("document_routing_log").insert({
        document_id: docId,
        document_name: doc?.filename || 'Documento',
        original_category: previousChat,
        final_category: newChat,
        action_type: 'chat_change',
        session_id: `admin-${Date.now()}`,
        scope_changed: true,
        disclaimer_shown: false,
        metadata: {
          chat_change: true,
          admin_action: true,
          previous_chat: previousChat,
          new_chat: newChat,
          ml_rule_created: true
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Destino atualizado! Regra de aprendizado criada.");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar destino: ${error.message}`);
    }
  });
  return <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Documentos RAG</h2>
          
          {/* RAG Info Button com círculo, ícone Lightbulb e pulsing dot */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setShowRagInfoModal(true)} className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 hover:from-amber-500/30 hover:to-yellow-500/30 transition-all duration-300 group">
                  <Lightbulb className="h-5 w-5 text-amber-500 group-hover:text-amber-400 transition-colors" />
                  
                  {/* Green pulsing dot - posicionado na parte externa do círculo */}
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Resumo da Engenharia RAG</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-muted-foreground mt-2">
          Gerencie documentos para o sistema de Recuperação Aumentada por Geração
        </p>
      </div>

      {/* RAG Metrics Summary */}
      {metrics && <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Boxes className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Resumo RAG</h3>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-primary">{metrics.totalDocs}</div>
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                <FileText className="h-4 w-4" />
                Documentos
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-primary">{metrics.totalChunks}</div>
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                <Package className="h-4 w-4" />
                Chunks
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-green-600">{metrics.totalDocs > 0 ? Math.round(metrics.completed / metrics.totalDocs * 100) : 0}%</div>
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                <CheckCircle2 className="h-4 w-4" />
                Sucesso
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-destructive">{metrics.failed}</div>
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                <XCircle className="h-4 w-4" />
                Falhas
              </div>
            </div>
          </div>
          <div className="flex gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                <Heart className="h-3.5 w-3.5 mr-1" />
                Health: {metrics.health}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                <GraduationCap className="h-3.5 w-3.5 mr-1" />
                Study: {metrics.study}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                <FileText className="h-3.5 w-3.5 mr-1" />
                General: {metrics.general}
              </Badge>
            </div>
          </div>
        </Card>}

      {/* Documentation Generation Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Documentação Automática</h3>
            <p className="text-sm text-muted-foreground">
              Gerar/atualizar documentação técnica do sistema
            </p>
          </div>
          <Button onClick={() => generateDocsMutation.mutate()} disabled={generateDocsMutation.isPending}>
            {generateDocsMutation.isPending ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </> : <>
                <FileCode className="mr-2 h-4 w-4" />
                Gerar Documentação
              </>}
          </Button>
        </div>
        
        {lastDocVersion && <div className="mt-4 text-sm text-muted-foreground">
            Última versão: {lastDocVersion.version} - {new Date(lastDocVersion.created_at).toLocaleDateString()}
          </div>}
      </Card>

      {/* Upload Section with Drag-and-Drop */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">
              Upload de Documentos PDF - Auto-categorização via IA
            </label>
            
            {/* Drag and Drop Zone */}
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={cn("relative border-2 border-dashed rounded-lg p-12 text-center transition-colors", isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50", uploading && "opacity-50 pointer-events-none")}>
              <div className="flex flex-col items-center gap-4">
                <Upload className={cn("h-12 w-12 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className="text-lg font-medium mb-1">
                    📄 Arraste arquivos PDF aqui
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">ou</p>
                  <Button variant="outline" size="lg" onClick={() => document.getElementById('file-input')?.click()} disabled={uploading}>
                    Escolher Arquivos
                  </Button>
                  <input id="file-input" type="file" accept=".pdf" multiple onChange={handleFileSelect} className="hidden" disabled={uploading} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Aceita múltiplos PDFs • Auto-categorização via IA
                </p>
                <p className="text-xs text-cyan-400/80 mt-2">
                  💡 Após selecionar arquivos, use "Preview do Texto" para visualizar antes de processar
                </p>
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 && <div className="space-y-2">
              <p className="text-sm font-medium">{selectedFiles.length} arquivo(s) selecionado(s):</p>
              {selectedFiles.map((file, idx) => <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm flex-1 truncate">{file.name}</span>
                  <Badge variant="outline">{(file.size / 1024).toFixed(2)} KB</Badge>
                  
                  {/* Enrichment indicator */}
                  {fileEnrichments.has(idx) && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                      <Tags className="h-3 w-3 mr-1" />
                      {fileEnrichments.get(idx)?.selectedTags.length}
                    </Badge>
                  )}
                  
                  {/* Tag enrichment button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTagEnrichmentModal({ open: true, fileIndex: idx, fileName: file.name })}
                    disabled={uploading || isExtracting}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                    title="Enriquecer com tags"
                  >
                    <Tags className="h-4 w-4" />
                  </Button>
                  
                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQueueFileToRemove(idx)}
                    disabled={uploading || isExtracting}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>)}
            </div>}

          {/* Document AI Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-400/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TableIcon className="h-4 w-4 text-blue-400" />
                <span className="font-medium">Google Document AI</span>
                <Badge variant="outline" className="text-xs bg-blue-500/20 border-blue-400/50">OCR Avançado</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Extração precisa de tabelas e dados estruturados. Recomendado para PDFs com tabelas complexas.
              </p>
            </div>
            <Switch
              checked={useDocumentAI}
              onCheckedChange={setUseDocumentAI}
            />
          </div>

          <div className="flex gap-3">
            {isExtracting ? (
              <div className="flex-1 flex flex-col gap-2">
                <Button 
                  variant="destructive" 
                  onClick={handleCancelExtraction}
                  className="w-full"
                  size="lg"
                >
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelar {extractionProgress && `(${extractionProgress.currentFile}/${extractionProgress.totalFiles})`}
                </Button>
                
                {/* Detailed progress indicator */}
                {extractionProgress && (
                  <div className="text-xs text-muted-foreground text-center space-y-1">
                    <div className="truncate max-w-[200px] mx-auto">
                      📄 {extractionProgress.fileName}
                    </div>
                    {extractionProgress.totalPages > 0 && (
                      <div className="flex items-center gap-2 justify-center">
                        <Progress 
                          value={(extractionProgress.currentPage / extractionProgress.totalPages) * 100} 
                          className="w-32 h-1"
                        />
                        <span>Pág. {extractionProgress.currentPage}/{extractionProgress.totalPages}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Button 
                variant="outline" 
                onClick={handlePreviewExtraction} 
                disabled={selectedFiles.length === 0 || uploading}
                className="flex-1"
                size="lg"
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview do Texto
              </Button>
            )}
            
            <Button onClick={() => uploadMutation.mutate()} disabled={selectedFiles.length === 0 || uploading} className="flex-1" size="lg">
              {uploading ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </> : <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar e Processar
                </>}
            </Button>
          </div>
        </div>
      </Card>

      {/* Real-time Upload Status Table */}
      {uploadStatuses.length > 0 && showUploadStatus && <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Status de Upload</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUploadStatus(false)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Nome do Arquivo</TableHead>
                <TableHead className="w-[12%]">Status</TableHead>
                <TableHead className="w-[40%]">Progresso</TableHead>
                <TableHead className="w-[18%]">Chat Destino</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploadStatuses.map(fileStatus => <TableRow key={fileStatus.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(fileStatus.status)}
                      <span className="truncate">{fileStatus.fileName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(fileStatus.status)}>
                      {fileStatus.status === 'waiting' && 'Aguardando'}
                      {fileStatus.status === 'extracting' && 'Extraindo'}
                      {fileStatus.status === 'uploading' && 'Enviando'}
                      {fileStatus.status === 'processing' && 'Processando'}
                      {fileStatus.status === 'completed' && 'Concluído'}
                      {fileStatus.status === 'failed' && 'Falhou'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {fileStatus.status !== 'completed' && fileStatus.status !== 'failed' ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 space-y-1">
                          <Progress value={fileStatus.progress} className="h-2" />
                          <span className="text-xs text-muted-foreground">{fileStatus.progress}%</span>
                        </div>
                        <span className="text-xs text-primary font-medium whitespace-nowrap animate-pulse">
                          {fileStatus.details}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {fileStatus.progress}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {fileStatus.targetChat ? <Badge variant="outline" className={getChatBadgeColor(fileStatus.targetChat)}>
                        {fileStatus.targetChat === 'health' && (
                          <span className="flex items-center gap-1.5">
                            <Heart className="h-3.5 w-3.5" />
                            HEALTH
                          </span>
                        )}
                        {fileStatus.targetChat === 'study' && (
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5" />
                            STUDY
                          </span>
                        )}
                        {fileStatus.targetChat === 'both' && (
                          <span className="flex items-center gap-1.5">
                            <Boxes className="h-3.5 w-3.5" />
                            BOTH
                          </span>
                        )}
                        {fileStatus.targetChat === 'general' && (
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            GENERAL
                          </span>
                        )}
                        {fileStatus.targetChat === 'economia' && (
                          <span className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5" />
                            ECONOMIA
                          </span>
                        )}
                      </Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </Card>}

      {/* Documents Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Documentos</h3>
          
          {/* Search and Filters */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <DebouncedInput placeholder="Buscar por nome, conteúdo ou resumo..." value={searchQuery} onChange={setSearchQuery} delay={300} className="pl-10" />
            </div>
            
            {/* Filters Row */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="completed">Completo</SelectItem>
                    <SelectItem value="failed">Falha</SelectItem>
                    <SelectItem value="processing">Processando</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Legibilidade</Label>
                <Select value={readabilityFilter} onValueChange={setReadabilityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        Alta (≥80%)
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                        Média (50-79%)
                      </span>
                    </SelectItem>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                        Baixa (&lt;50%)
                      </span>
                    </SelectItem>
                    <SelectItem value="unscored">Sem pontuação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Renamed filter toggle */}
              <div className="flex items-center gap-2 self-end pb-1">
                <Switch 
                  id="renamed-filter"
                  checked={showOnlyRenamed}
                  onCheckedChange={setShowOnlyRenamed}
                />
                <Label htmlFor="renamed-filter" className="text-sm cursor-pointer whitespace-nowrap">
                  Apenas otimizados
                </Label>
              </div>
              
              <Button variant="outline" onClick={() => {
              setStatusFilter("all");
              setReadabilityFilter("all");
              setShowOnlyRenamed(false);
              setSearchQuery("");
              setSortField("created_at");
              setSortDirection("desc");
            }}>
                <X className="mr-2 h-4 w-4" />
                Limpar Filtros
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={handleReprocessAllPendingFailed} disabled={isBulkReprocessing}>
                      {isBulkReprocessing ? <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Reprocessando...
                        </> : <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reprocessar Pendentes/Falhados
                        </>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Reprocessar todos os documentos com status pendente ou falhado</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Bulk Actions Bar */}
          {selectedDocs.size > 0 && <div className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <span className="text-sm font-medium">
                {selectedDocs.size} documento(s) selecionado(s)
              </span>
              <Button variant="default" size="sm" onClick={exportSelectedAsZip} disabled={isExporting}>
                {isExporting ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </> : <>
                    <Package className="mr-2 h-4 w-4" />
                    Exportar ZIP
                  </>}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleBulkReprocess} disabled={isBulkReprocessing}>
                {isBulkReprocessing ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reprocessando...
                  </> : <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reprocessar Selecionados
                  </>}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDocs(new Set())}>
                Limpar Seleção
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </> : <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Selecionados
                  </>}
              </Button>
            </div>}

          {/* Bulk Delete Confirmation Dialog */}
          <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Confirmar Exclusão
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>Você está prestes a excluir <strong>{selectedDocs.size} documento(s)</strong>.</p>
                  <p>Esta ação é <strong>irreversível</strong> e removerá permanentemente:</p>
                  <ul className="list-disc list-inside mt-2 text-sm">
                    <li>Os documentos selecionados</li>
                    <li>Todos os chunks e embeddings</li>
                    <li>Tags e metadados associados</li>
                    <li>Histórico de versões</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir {selectedDocs.size} Documento(s)
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        
        {isLoading ? <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div> : filteredDocuments && filteredDocuments.length > 0 ? <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox checked={selectedDocs.size === filteredDocuments.length && filteredDocuments.length > 0} onCheckedChange={selectAllFiltered} />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("filename")}>
                  <div className="flex items-center gap-2">
                    Nome
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "filename" && "text-primary")} />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("status")}>
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "status" && "text-primary")} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Estado atual do processamento do documento</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    TAG Principal
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Categoria principal identificada pela IA</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Estado
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Estado de implementação: ready, needs_review, incomplete</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("total_chunks")}>
                  <div className="flex items-center gap-2">
                    Chunks
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "total_chunks" && "text-primary")} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Quantidade de fragmentos do documento para busca RAG</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("readability_score")}>
                  <div className="flex items-center gap-2">
                    Legibilidade
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "readability_score" && "text-primary")} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Percentual de qualidade e clareza do texto extraído do documento.</p>
                          <p className="text-xs mt-1">🟢 80-100%: Alta | 🔵 60-79%: Boa | 🟡 40-59%: Moderada | 🔴 0-39%: Baixa</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("created_at")}>
                  <div className="flex items-center gap-2">
                    Data
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "created_at" && "text-primary")} />
                  </div>
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDocuments.map(doc => <TableRow key={doc.id} className="hover:bg-muted/50">
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedDocs.has(doc.id)} onCheckedChange={() => toggleDocSelection(doc.id)} />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="cursor-pointer text-primary hover:underline">
                          <span className="flex items-center gap-2 flex-wrap">
                            {doc.ai_title || doc.filename}
                            {doc.ai_title && doc.needs_title_review && (
                              <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-500">
                                IA
                              </Badge>
                            )}
                            {doc.title_was_renamed && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant="secondary" 
                                      className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 cursor-help"
                                    >
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      Otimizado
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[280px]">
                                    <div className="space-y-1">
                                      <p className="text-sm font-medium">Título original:</p>
                                      <p className="text-xs text-muted-foreground break-all">
                                        {doc.original_title || doc.filename}
                                      </p>
                                      {doc.renamed_at && (
                                        <p className="text-xs text-muted-foreground">
                                          Renomeado em: {formatDateTime(doc.renamed_at)}
                                        </p>
                                      )}
                                      {doc.rename_reason && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          {doc.rename_reason === 'hash' || doc.rename_reason === 'uuid' || doc.rename_reason === 'numeric' ? (
                                            <Hash className="h-3 w-3" />
                                          ) : doc.rename_reason === 'technical' ? (
                                            <Settings2 className="h-3 w-3" />
                                          ) : doc.rename_reason === 'mixed_pattern' ? (
                                            <Shuffle className="h-3 w-3" />
                                          ) : doc.rename_reason === 'approved_ai_suggestion' ? (
                                            <Brain className="h-3 w-3" />
                                          ) : doc.rename_reason === 'manual_edit' ? (
                                            <Edit className="h-3 w-3" />
                                          ) : (
                                            <AlertTriangle className="h-3 w-3" />
                                          )}
                                          <span>
                                            {doc.rename_reason === 'numeric' ? 'Título era numérico' :
                                             doc.rename_reason === 'hash' ? 'Título era hash' :
                                             doc.rename_reason === 'uuid' ? 'Título era UUID' :
                                             doc.rename_reason === 'technical' ? 'Título era técnico' :
                                             doc.rename_reason === 'unreadable' ? 'Título era ilegível' :
                                             doc.rename_reason === 'mixed_pattern' ? 'Título era misto' :
                                             doc.rename_reason === 'manual_edit' ? 'Editado manualmente' :
                                             doc.rename_reason === 'approved_ai_suggestion' ? 'Sugestão IA aprovada' :
                                             doc.rename_reason}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </span>
                          {doc.ai_title && (
                            <span className="block text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                              {doc.filename}
                            </span>
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-96 p-4" side="right">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate flex items-center gap-2">
                              {doc.ai_title || doc.filename}
                              {doc.title_was_renamed && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                >
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Otimizado
                                </Badge>
                              )}
                            </h4>
                            {doc.ai_title && (
                              <p className="text-xs text-muted-foreground truncate">{doc.filename}</p>
                            )}
                          </div>
                          {doc.ai_title && doc.needs_title_review && (
                            <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-500 shrink-0">
                              Título sugerido pela IA
                            </Badge>
                          )}
                        </div>
                        
                        {/* Resumo AI */}
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Resumo</p>
                          <ScrollArea className="h-32">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {doc.ai_summary || "Resumo não disponível"}
                            </p>
                          </ScrollArea>
                        </div>
                        
                        {/* Status atual */}
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="outline">{doc.target_chat}</Badge>
                          {doc.is_inserted && <Badge className="bg-green-500">Inserido em {doc.inserted_in_chat}</Badge>}
                        </div>
                        
                        {/* Botoes de acao - apenas se nao estiver inserido */}
                        {!doc.is_inserted && <div className="grid grid-cols-4 gap-2">
                            <Button size="sm" variant="outline" onClick={() => manualInsertMutation.mutate({
                        docId: doc.id,
                        targetChat: 'health'
                      })} className="flex items-center gap-2" disabled={manualInsertMutation.isPending}>
                              <Heart className="h-4 w-4 text-red-500" />
                              Health
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => manualInsertMutation.mutate({
                        docId: doc.id,
                        targetChat: 'study'
                      })} className="flex items-center gap-2" disabled={manualInsertMutation.isPending}>
                              <GraduationCap className="h-4 w-4 text-blue-500" />
                              Study
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => manualInsertMutation.mutate({
                        docId: doc.id,
                        targetChat: 'both'
                      })} className="flex items-center gap-2" disabled={manualInsertMutation.isPending}>
                              <Boxes className="h-4 w-4 text-emerald-500" />
                              Both
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => manualInsertMutation.mutate({
                        docId: doc.id,
                        targetChat: 'economia'
                      })} className="flex items-center gap-2" disabled={manualInsertMutation.isPending}>
                              <TrendingUp className="h-4 w-4 text-teal-500" />
                              Economia
                            </Button>
                          </div>}
                        
                        {/* Link para detalhes completos */}
                        
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>
                    <Badge variant={isStuck(doc) ? "destructive" : doc.status === "completed" ? "default" : doc.status === "failed" ? "destructive" : "secondary"}>
                      {isStuck(doc) ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          TRAVADO
                        </span>
                      ) : doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>
                    <Button variant="ghost" size="sm" onClick={e => {
                  e.stopPropagation();
                  setTagsModalDoc(doc);
                }} className="h-auto p-1">
                      {(() => {
                    const topTag = getTopParentTag(doc.id);
                    return topTag ? <Badge variant="secondary" className="text-xs">
                            {topTag.tag_name}
                          </Badge> : <span className="text-xs text-muted-foreground">—</span>;
                  })()}
                    </Button>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {doc.implementation_status && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusInfoDoc(doc)}
                        className="h-auto p-0"
                      >
                        <Badge 
                          variant={doc.implementation_status === "ready" ? "default" : doc.implementation_status === "needs_review" ? "secondary" : "outline"}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {doc.implementation_status}
                        </Badge>
                      </Button>
                    )}
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>{doc.total_chunks}</TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>
                    {doc.readability_score !== null ? <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${doc.readability_score >= 0.8 ? 'bg-green-500' : doc.readability_score >= 0.6 ? 'bg-blue-500' : doc.readability_score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <span className={`font-medium ${doc.readability_score >= 0.8 ? 'text-green-500' : doc.readability_score >= 0.6 ? 'text-blue-500' : doc.readability_score >= 0.4 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {Math.round(doc.readability_score * 100)}%
                        </span>
                      </div> : <Badge variant="outline" className="text-xs flex items-center gap-1">
                        {doc.is_readable ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Legível
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Ilegível
                          </>
                        )}
                      </Badge>}
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={e => {
                              e.stopPropagation();
                              downloadAsPDF(doc);
                            }}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">Baixar documento como PDF</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {(doc.status === "failed" || doc.status === "pending") && <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={e => {
                                e.stopPropagation();
                                reprocessMutation.mutate(doc.id);
                              }} disabled={reprocessMutation.isPending}>
                                <RefreshCw className={cn("h-4 w-4", reprocessMutation.isPending && "animate-spin")} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">Reprocessar documento</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={e => {
                                e.stopPropagation();
                                setRetryParams({ minTextLength: 50, validCharRatio: 0.5, minLetterCount: 30 });
                                setRetryDoc(doc);
                              }}>
                                <Settings2 className="h-4 w-4 text-amber-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">Reprocessar com parâmetros ajustados</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={e => {
                              e.stopPropagation();
                              deleteMutation.mutate(doc.id);
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">Deletar documento permanentemente</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table> : <div className="text-center py-8 text-muted-foreground">
            Nenhum documento encontrado
          </div>}
        
        {/* Pagination Controls */}
        {filteredDocuments && filteredDocuments.length > 0 && <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, filteredDocuments.length)} de {filteredDocuments.length} documentos
                </p>
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Por página:</Label>
                  <Select value={itemsPerPage.toString()} onValueChange={v => {
                  setItemsPerPage(Number(v));
                  setCurrentPage(1);
                }}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {totalPages > 1 && <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                    </PaginationItem>
                    
                    {Array.from({
                  length: totalPages
                }, (_, i) => i + 1).filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1).map((page, idx, arr) => <>
                          {idx > 0 && arr[idx - 1] !== page - 1 && <PaginationItem key={`ellipsis-${page}`}>
                              <PaginationEllipsis />
                            </PaginationItem>}
                          <PaginationItem key={page}>
                            <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </>)}
                    
                    <PaginationItem>
                      <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>}
            </div>
          </div>}
        </div>
      </Card>

      {/* Document Details */}
      {selectedDoc && <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{selectedDoc.filename}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">{selectedDoc.target_chat || "não categorizado"}</Badge>
                  {selectedDoc.implementation_status && <Badge variant={selectedDoc.implementation_status === "ready" ? "default" : selectedDoc.implementation_status === "needs_review" ? "secondary" : "outline"}>
                      {selectedDoc.implementation_status}
                    </Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedDoc.total_words} palavras • {selectedDoc.total_chunks} chunks
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewChunksDoc(selectedDoc)}>
                  <Boxes className="h-4 w-4 mr-2" />
                  Ver Chunks
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingTagsDoc(selectedDoc)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Tags
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDoc(null)}>
                  Fechar
                </Button>
              </div>
            </div>

            {selectedDoc.ai_summary && <div>
                <h4 className="font-medium mb-2">Resumo (Auto-gerado)</h4>
                <p className="text-sm text-muted-foreground">{selectedDoc.ai_summary}</p>
              </div>}

            {parentTags.length > 0 && <div>
                <h4 className="font-medium mb-2">Tags</h4>
                <div className="space-y-2">
                  {parentTags.map(parent => <div key={parent.id}>
                      <Badge className="mb-1">{parent.tag_name}</Badge>
                      <div className="ml-4 flex flex-wrap gap-1">
                        {childTags.filter(c => c.parent_tag_id === parent.id).map(child => <Badge key={child.id} variant="outline" className="text-xs">
                              {child.tag_name}
                            </Badge>)}
                      </div>
                    </div>)}
                </div>
              </div>}

            {selectedDoc.text_preview && <div>
                <h4 className="font-medium mb-2">Preview</h4>
                <p className="text-sm text-muted-foreground font-mono bg-muted p-3 rounded">
                  {selectedDoc.text_preview}...
                </p>
              </div>}

            {/* Similar Documents Section */}
            <div>
              <h4 className="font-medium mb-2">📊 Documentos Similares</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Baseado em tags compartilhadas e conteúdo semântico
              </p>
              <div className="space-y-2">
                {documents?.filter(d => d.id !== selectedDoc.id && d.status === "completed" && d.target_chat === selectedDoc.target_chat).slice(0, 5).map(doc => <div key={doc.id} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setSelectedDoc(doc)}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{doc.filename}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.total_chunks} chunks
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {doc.target_chat}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>)}
                {documents?.filter(d => d.id !== selectedDoc.id && d.status === "completed" && d.target_chat === selectedDoc.target_chat).length === 0 && <p className="text-sm text-muted-foreground italic">
                    Nenhum documento similar encontrado
                  </p>}
              </div>
            </div>
          </div>
        </Card>}

      {/* Tag Editing Dialog */}
      {editingTagsDoc && <Dialog open={!!editingTagsDoc} onOpenChange={open => !open && setEditingTagsDoc(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Tags - {editingTagsDoc.filename}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Parent Tags Section */}
              <div>
                <h4 className="font-semibold mb-3">📂 CATEGORIAS PRINCIPAIS</h4>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 min-h-[60px]">
                  {editingParentTags.map(tag => <Badge key={tag.id} className="flex items-center gap-2 px-3 py-1">
                      {tag.tag_name}
                      <button onClick={() => removeTagMutation.mutate(tag.id)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>)}
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Nova categoria" value={newParentTag} onChange={e => setNewParentTag(e.target.value)} onKeyPress={e => {
                if (e.key === 'Enter' && newParentTag.trim()) {
                  addTagMutation.mutate({
                    documentId: editingTagsDoc.id,
                    tagName: newParentTag.trim(),
                    tagType: "parent"
                  });
                  setNewParentTag("");
                }
              }} />
                  <Button size="sm" onClick={() => {
                if (newParentTag.trim()) {
                  addTagMutation.mutate({
                    documentId: editingTagsDoc.id,
                    tagName: newParentTag.trim(),
                    tagType: "parent"
                  });
                  setNewParentTag("");
                }
              }} disabled={!newParentTag.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Child Tags Section */}
              <div>
                <h4 className="font-semibold mb-3">🏷️ TAGS (por categoria)</h4>
                {editingParentTags.length === 0 ? <p className="text-sm text-muted-foreground italic">
                    Adicione categorias principais primeiro
                  </p> : <div className="space-y-4">
                    {editingParentTags.map(parent => <div key={parent.id} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-2">{parent.tag_name}:</div>
                        <div className="flex flex-wrap gap-2 mb-2 min-h-[40px]">
                          {editingChildTags.filter(c => c.parent_tag_id === parent.id).map(child => <Badge key={child.id} variant="outline" className="flex items-center gap-2 text-xs px-2 py-1">
                                {child.tag_name}
                                <button onClick={() => removeTagMutation.mutate(child.id)} className="hover:text-destructive">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>)}
                        </div>
                        <div className="flex gap-2">
                          <Input placeholder="Nova tag" value={selectedParentForChild === parent.id ? newChildTag : ""} onFocus={() => setSelectedParentForChild(parent.id)} onChange={e => setNewChildTag(e.target.value)} onKeyPress={e => {
                    if (e.key === 'Enter' && newChildTag.trim()) {
                      addTagMutation.mutate({
                        documentId: editingTagsDoc.id,
                        tagName: newChildTag.trim(),
                        tagType: "child",
                        parentTagId: parent.id
                      });
                      setNewChildTag("");
                    }
                  }} className="text-sm" />
                          <Button size="sm" onClick={() => {
                    if (newChildTag.trim() && selectedParentForChild === parent.id) {
                      addTagMutation.mutate({
                        documentId: editingTagsDoc.id,
                        tagName: newChildTag.trim(),
                        tagType: "child",
                        parentTagId: parent.id
                      });
                      setNewChildTag("");
                    }
                  }} disabled={!newChildTag.trim() || selectedParentForChild !== parent.id}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>)}
                  </div>}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
            setEditingTagsDoc(null);
            setNewParentTag("");
            setNewChildTag("");
            setSelectedParentForChild(null);
          }}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}

      {/* Chunk Visualization Dialog */}
      {viewChunksDoc && <Dialog open={!!viewChunksDoc} onOpenChange={open => !open && setViewChunksDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Chunks do Documento - {viewChunksDoc.filename}</DialogTitle>
            </DialogHeader>
            
            {chunksLoading ? <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div> : chunks && chunks.length > 0 ? <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4">
                  {chunks.map((chunk, idx) => <Card key={chunk.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Chunk #{chunk.chunk_index + 1}</Badge>
                          <Badge variant="secondary">{chunk.word_count} palavras</Badge>
                          {chunk.embedding ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              ✓ Embedding
                            </Badge> : <Badge variant="destructive">
                              ✗ Sem Embedding
                            </Badge>}
                        </div>
                      </div>
                      
                      <div className="text-sm bg-muted p-3 rounded font-mono max-h-[200px] overflow-y-auto">
                        {chunk.content.substring(0, 300)}
                        {chunk.content.length > 300 && "..."}
                      </div>
                      
                      {chunk.metadata && typeof chunk.metadata === 'object' && Object.keys(chunk.metadata).length > 0 && <div className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium">Metadata:</span> {JSON.stringify(chunk.metadata, null, 2)}
                        </div>}
                    </Card>)}
                </div>
              </ScrollArea> : <div className="text-center py-8 text-muted-foreground">
                Nenhum chunk encontrado para este documento
              </div>}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewChunksDoc(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
      
      {/* Duplicate Detection Modal */}
      {duplicateInfo && <Dialog open={!!duplicateInfo} onOpenChange={() => { setDuplicateInfo(null); setShowComparison(false); }}>
          <DialogContent className={cn("transition-all duration-300", showComparison ? "max-w-4xl" : "max-w-lg")}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                ⚠️ Documento Duplicado Detectado
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">
                O arquivo <strong className="text-primary">{duplicateInfo.newFileName}</strong> possui conteúdo {duplicateInfo.similarityScore ? `${duplicateInfo.similarityScore}% similar` : "idêntico"} ao documento existente:
              </p>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{duplicateInfo.existingFileName}</p>
                  {duplicateInfo.similarityScore && (
                    <Badge variant="secondary">
                      {duplicateInfo.similarityScore}% similar
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Toggle comparison button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowComparison(!showComparison)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                <FileText className="h-4 w-4 mr-2" />
                {showComparison ? "Ocultar comparação" : "Ver comparação lado-a-lado"}
              </Button>
              
              {/* Side-by-side comparison with highlighted differences */}
              {showComparison && (() => {
                const { highlighted1, highlighted2 } = highlightTextDifferences(
                  duplicateInfo.newTextPreview || "",
                  duplicateInfo.existingTextPreview || ""
                );
                return (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3 h-3 bg-green-500/30 rounded"></span>
                        Texto exclusivo do novo
                      </span>
                      <span className="inline-flex items-center gap-1 ml-4">
                        <span className="w-3 h-3 bg-amber-500/30 rounded"></span>
                        Texto exclusivo do existente
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                            Novo
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">{duplicateInfo.newFileName}</span>
                        </div>
                        <ScrollArea className="h-[250px] rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                          <div className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                            {duplicateInfo.newTextPreview ? highlighted1 : "Preview não disponível"}
                          </div>
                        </ScrollArea>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                            Existente
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">{duplicateInfo.existingFileName}</span>
                        </div>
                        <ScrollArea className="h-[250px] rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                          <div className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                            {duplicateInfo.existingTextPreview ? highlighted2 : "Preview não disponível"}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              <p className="text-sm text-muted-foreground">
                O que deseja fazer?
              </p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleDiscardDuplicate} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Excluir Inserção
              </Button>
              <Button variant="destructive" onClick={handleReplaceDuplicate} className="flex-1" disabled={isReplacing}>
                {isReplacing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Substituindo...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Substituir Existente
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}

      {/* RAG Engineering Info Modal */}
      <Dialog open={showRagInfoModal} onOpenChange={setShowRagInfoModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <Lightbulb className="h-6 w-6 text-amber-500" />
              Resumo da Engenharia RAG Implementada e Siglas
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 text-sm">
            {/* Introdução */}
            <p className="text-muted-foreground leading-relaxed">
              O sistema de <strong>Geração Aumentada por Recuperação (RAG, Retrieval-Augmented Generation)</strong> foi construído como uma <em>Biblioteca Digital Inteligente e Auto-organizada</em> com foco em estabilidade e qualidade de dados.
            </p>
            
            {/* Fase 1 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                <span className="bg-primary/10 p-1 rounded">📥</span>
                Fase 1: Ingestão de Dados de Alta Qualidade (ETL - Extract, Transform, Load)
              </h3>
              <p className="text-muted-foreground">
                A fase de ingestão garante a qualidade dos dados antes da indexação, usando inteligência e automação.
              </p>
              
              <div className="grid gap-4 pl-4 border-l-2 border-primary/30">
                <div>
                  <h4 className="font-medium text-amber-500">🛡️ Prevenção de Corrupção</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    A extração do texto de PDFs é feita no <strong>Frontend (navegador)</strong> usando <code className="bg-muted px-1 rounded">pdfjs-dist</code>, uma prática de segurança crucial para evitar a corrupção de caracteres.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-500">🤖 Validação Inteligente</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    O sistema usa o <strong>SLM (Small Language Model - KnowYOU)</strong> para classificar automaticamente o contexto (<Badge variant="outline" className="text-xs">HEALTH</Badge>, <Badge variant="outline" className="text-xs">STUDY</Badge> - as suas IAs inseridas no sistema) e verifica a legibilidade do documento antes de prosseguir.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-green-500">✂️ Chunking Otimizado</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    O texto é fragmentado em partes de <strong>750 palavras</strong> com <strong>180 palavras de sobreposição</strong>, otimizando a recuperação do contexto.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-purple-500">🔢 Indexação Vetorial</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    Cada fragmento é convertido em um vetor (<strong>Embedding</strong>) e indexado no Postgres com a extensão <code className="bg-muted px-1 rounded">pgvector</code> para busca semântica.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-red-500">🔄 Estabilidade Ativa (Cleanup)</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    Um <strong>Cron Job</strong> (agendador de tarefas) verifica documentos travados no status 'processing' e os reclassifica como 'pending' automaticamente, permitindo o reprocessamento e garantindo a estabilidade.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Fase 2 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                <span className="bg-primary/10 p-1 rounded">🔍</span>
                Fase 2: Recuperação Segura e Fundamentada (Retrieval)
              </h3>
              <p className="text-muted-foreground">
                A fase de busca é projetada para precisão e rastreabilidade.
              </p>
              
              <div className="grid gap-4 pl-4 border-l-2 border-primary/30">
                <div>
                  <h4 className="font-medium text-cyan-500">🔗 Busca Híbrida</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    A pesquisa é feita combinando <strong>similaridade vetorial</strong> (buscando significado) com filtros por <strong>Metadados</strong> (<code className="bg-muted px-1 rounded">target_chat</code> e <code className="bg-muted px-1 rounded">Tags</code>) para garantir que a resposta venha apenas do contexto relevante (ex: apenas documentos de 'Health' para o Chat Health).
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-emerald-500">📚 Geração Fundamentada</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    O <strong>LLM (Gemini 3.0)</strong> e/ou o <strong>SLM (KnowYOU)</strong> são forçados a usar os chunks de contexto recuperados para fundamentar a resposta, prevenindo "alucinações" e garantindo a precisão.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-orange-500">📊 Observabilidade</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    O sistema registra logs de <strong>Latência</strong> e <strong>Taxa de Sucesso</strong> das buscas para o Dashboard de <strong>RAG (Retrieval-Augmented Generation) Analytics</strong>.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Infográfico */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3 text-center">📈 Fluxo RAG - Infográfico Interativo</h4>
              <RagFlowDiagram />
            </div>
            
            {/* Glossário de Siglas */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">📖 Glossário de Siglas</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><strong>RAG</strong> - Retrieval-Augmented Generation</div>
                <div><strong>ETL</strong> - Extract, Transform, Load</div>
                <div><strong>LLM</strong> - Large Language Model</div>
                <div><strong>SLM</strong> - Small Language Model</div>
                <div><strong>Embedding</strong> - Representação vetorial de texto</div>
                <div><strong>Chunk</strong> - Fragmento de documento</div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRagInfoModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tags Modal */}
      <Dialog open={!!tagsModalDoc} onOpenChange={open => !open && setTagsModalDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>🏷️ Tags de "{tagsModalDoc?.filename}"</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-96">
            {(() => {
            const docTags = allTags?.filter(t => t.document_id === tagsModalDoc?.id) || [];
            const parents = docTags.filter(t => t.tag_type === "parent");
            const children = docTags.filter(t => t.tag_type === "child");
            return <div className="space-y-4">
                  {parents.length > 0 ? parents.map(parent => <div key={parent.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="text-sm">{parent.tag_name}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.round((parent.confidence || 0) * 100)}% confiança
                          </span>
                        </div>
                        <div className="ml-4 flex flex-wrap gap-1">
                          {children.filter(c => c.parent_tag_id === parent.id).map(child => <Badge key={child.id} variant="outline" className="text-xs">
                              {child.tag_name} ({Math.round((child.confidence || 0) * 100)}%)
                            </Badge>)}
                        </div>
                      </div>) : <p className="text-center text-muted-foreground">Nenhuma tag encontrada</p>}
                </div>;
          })()}
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagsModalDoc(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Inserção Manual */}
      <Dialog open={!!insertionModalDoc} onOpenChange={open => !open && setInsertionModalDoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir Documento em Chat</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              "{insertionModalDoc?.filename}" está categorizado como <Badge>General</Badge>
            </p>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm">Escolha em qual chat este documento será inserido:</p>
            
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" className="h-20 flex-col gap-2 border-red-500/30 hover:border-red-500 hover:bg-red-500/10" onClick={() => manualInsertMutation.mutate({
              docId: insertionModalDoc?.id,
              targetChat: 'health'
            })} disabled={manualInsertMutation.isPending}>
                <Heart className="h-6 w-6 text-red-500" />
                <span className="font-medium">Health</span>
                <span className="text-xs text-muted-foreground">Saúde</span>
              </Button>
              
              <Button variant="outline" className="h-20 flex-col gap-2 border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/10" onClick={() => manualInsertMutation.mutate({
              docId: insertionModalDoc?.id,
              targetChat: 'study'
            })} disabled={manualInsertMutation.isPending}>
                <BookOpen className="h-6 w-6 text-blue-500" />
                <span className="font-medium">Study</span>
                <span className="text-xs text-muted-foreground">Estudo</span>
              </Button>
              
              <Button variant="outline" className="h-20 flex-col gap-2 border-teal-500/30 hover:border-teal-500 hover:bg-teal-500/10" onClick={() => manualInsertMutation.mutate({
              docId: insertionModalDoc?.id,
              targetChat: 'economia'
            })} disabled={manualInsertMutation.isPending}>
                <TrendingUp className="h-6 w-6 text-teal-500" />
                <span className="font-medium">Economia</span>
                <span className="text-xs text-muted-foreground">Finanças</span>
              </Button>
            </div>
            
            <div className="border-t pt-4">
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setInsertionModalDoc(null)}>
                Manter como General (não inserir)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Text Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Preview do Texto Extraído
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Revise a qualidade da extração antes de processar
            </p>
          </DialogHeader>
          
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {previewFiles.map((preview, idx) => {
                const isValid = preview.charCount >= 50 && preview.validRatio >= 0.5 && preview.letterCount >= 30;
                return (
                  <Card key={idx} className={cn(
                    "p-4",
                    isValid ? "border-green-500/30" : "border-red-500/30"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{preview.file.name}</span>
                        {isValid ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Válido
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Pode falhar
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFileToRemove(idx)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                      <div className="p-2 bg-muted rounded text-center">
                        <div className="font-bold">{preview.charCount.toLocaleString()}</div>
                        <div className="text-muted-foreground">caracteres</div>
                      </div>
                      <div className="p-2 bg-muted rounded text-center">
                        <div className="font-bold">{preview.wordCount.toLocaleString()}</div>
                        <div className="text-muted-foreground">palavras</div>
                      </div>
                      <div className={cn(
                        "p-2 rounded text-center",
                        preview.validRatio >= 0.5 ? "bg-green-500/10" : "bg-red-500/10"
                      )}>
                        <div className="font-bold">{Math.round(preview.validRatio * 100)}%</div>
                        <div className="text-muted-foreground">chars válidos</div>
                      </div>
                      <div className={cn(
                        "p-2 rounded text-center",
                        preview.letterCount >= 30 ? "bg-green-500/10" : "bg-red-500/10"
                      )}>
                        <div className="font-bold">{preview.letterCount.toLocaleString()}</div>
                        <div className="text-muted-foreground">letras</div>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-32 rounded border bg-muted/30 p-2">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {preview.extractedText.substring(0, 2000)}
                        {preview.extractedText.length > 2000 && "..."}
                      </pre>
                    </ScrollArea>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
          
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Fechar
            </Button>
            <Button 
              onClick={() => {
                setShowPreviewModal(false);
                uploadMutation.mutate();
              }} 
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Processar {previewFiles.length} arquivo(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retry with Custom Parameters Modal */}
      <Dialog open={!!retryDoc} onOpenChange={open => !open && setRetryDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Reprocessar com Parâmetros Ajustados
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              "{retryDoc?.filename}" falhou na validação. Ajuste os parâmetros para tentar novamente.
            </p>
          </DialogHeader>
          
          {retryDoc?.error_message && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-red-400">{retryDoc.error_message}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Tamanho mínimo do texto</Label>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{retryParams.minTextLength} chars</span>
              </div>
              <Slider
                value={[retryParams.minTextLength]}
                onValueChange={([value]) => setRetryParams(p => ({ ...p, minTextLength: value }))}
                min={10}
                max={200}
                step={10}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Documentos com menos caracteres serão rejeitados</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Proporção de caracteres válidos</Label>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{Math.round(retryParams.validCharRatio * 100)}%</span>
              </div>
              <Slider
                value={[retryParams.validCharRatio * 100]}
                onValueChange={([value]) => setRetryParams(p => ({ ...p, validCharRatio: value / 100 }))}
                min={20}
                max={90}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Textos com muitos caracteres especiais ou corrompidos serão rejeitados</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Mínimo de letras</Label>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{retryParams.minLetterCount} letras</span>
              </div>
              <Slider
                value={[retryParams.minLetterCount]}
                onValueChange={([value]) => setRetryParams(p => ({ ...p, minLetterCount: value }))}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Documentos sem texto substantivo (só números/símbolos) serão rejeitados</p>
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Dica:</strong> Reduza os valores se o documento for uma digitalização de baixa qualidade ou conter muitas tabelas/gráficos.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setRetryDoc(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => retryWithParamsMutation.mutate({ docId: retryDoc.id, params: retryParams })}
              disabled={retryWithParamsMutation.isPending}
            >
              {retryWithParamsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reprocessando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reprocessar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for removing file from preview */}
      <AlertDialog open={fileToRemove !== null} onOpenChange={(open) => !open && setFileToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover arquivo do preview?</AlertDialogTitle>
            <AlertDialogDescription>
              {fileToRemove !== null && previewFiles[fileToRemove] && (
                <>
                  O arquivo <strong>{previewFiles[fileToRemove].file.name}</strong> será removido da lista de preview. Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemovePreviewFile}
              className="bg-red-500 hover:bg-red-600"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Queue file removal confirmation */}
      <AlertDialog open={queueFileToRemove !== null} onOpenChange={(open) => !open && setQueueFileToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover arquivo da fila?</AlertDialogTitle>
            <AlertDialogDescription>
              {queueFileToRemove !== null && selectedFiles[queueFileToRemove] && (
                <>O arquivo <strong>{selectedFiles[queueFileToRemove].name}</strong> será removido da fila de upload.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (queueFileToRemove !== null) {
                  setSelectedFiles(prev => {
                    const newFiles = prev.filter((_, i) => i !== queueFileToRemove);
                    if (newFiles.length === 0) {
                      toast.info("Todos os arquivos removidos");
                    } else {
                      toast.info("Arquivo removido da fila");
                    }
                    return newFiles;
                  });
                  setQueueFileToRemove(null);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Info Modal */}
      <Dialog open={!!statusInfoDoc} onOpenChange={() => setStatusInfoDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {statusInfoDoc?.implementation_status === "ready" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              Status: {statusInfoDoc?.implementation_status?.toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          
          {statusInfoDoc?.implementation_status === "ready" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ✅ Este documento foi processado com sucesso!
              </p>
              <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                <h4 className="font-medium text-green-500 mb-2">O que funcionou:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Texto extraído corretamente</li>
                  <li>• Chunks gerados: {statusInfoDoc?.total_chunks || 0}</li>
                  <li>• Legibilidade: {statusInfoDoc?.readability_score ? 
                    `${Math.round(statusInfoDoc.readability_score * 100)}%` : 'N/A'}</li>
                  <li>• Tags classificadas pela IA</li>
                  <li>• Embeddings vetoriais indexados</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ⚠️ Este documento precisa de revisão manual.
              </p>
              <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30">
                <h4 className="font-medium text-amber-500 mb-2">Motivos possíveis:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Baixa legibilidade do texto ({statusInfoDoc?.readability_score ? 
                    `${Math.round(statusInfoDoc.readability_score * 100)}%` : 'N/A'})</li>
                  <li>• Poucos chunks gerados ({statusInfoDoc?.total_chunks || 0})</li>
                  <li>• Erro na classificação automática</li>
                  {statusInfoDoc?.error_message && (
                    <li className="text-red-400">• Erro: {statusInfoDoc.error_message}</li>
                  )}
                </ul>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Sugestão:</strong> Revise o documento original e considere 
                  reprocessar com parâmetros ajustados ou usar OCR avançado para PDFs escaneados.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusInfoDoc(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ML Suggestion Approval Modal */}
      <Dialog open={!!pendingMLSuggestion} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-cyan-400" />
              Sugestão ML Detectada
            </DialogTitle>
          </DialogHeader>
          
          {pendingMLSuggestion && (
            <div className="space-y-4">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-sm mb-2">
                  O sistema ML identificou um padrão para:
                </p>
                <p className="font-medium truncate">{pendingMLSuggestion.fileName}</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Chat sugerido:</span>
                <Badge className={pendingMLSuggestion.suggestedChat === 'health' 
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }>
                  {pendingMLSuggestion.suggestedChat === 'health' ? (
                    <><Heart className="h-3 w-3 mr-1" /> Health</>
                  ) : (
                    <><GraduationCap className="h-3 w-3 mr-1" /> Study</>
                  )}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Confiança:</span>
                <span className="font-medium text-green-400">
                  {Math.round(pendingMLSuggestion.confidence * 100)}%
                </span>
              </div>

              <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                <strong>Padrão detectado:</strong> "{pendingMLSuggestion.pattern}"
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Se rejeitar, qual é o chat correto?</p>
                <Select value={mlRejectionChat} onValueChange={setMlRejectionChat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="health">
                      <span className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-purple-400" /> Health
                      </span>
                    </SelectItem>
                    <SelectItem value="study">
                      <span className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-blue-400" /> Study
                      </span>
                    </SelectItem>
                    <SelectItem value="general">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" /> General
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (pendingMLSuggestion) {
                  pendingMLSuggestion.onReject(mlRejectionChat);
                  setPendingMLSuggestion(null);
                  setMlRejectionChat("general");
                }
              }}
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <X className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button 
              onClick={() => {
                if (pendingMLSuggestion) {
                  pendingMLSuggestion.onAccept();
                  setPendingMLSuggestion(null);
                  setMlRejectionChat("general");
                }
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aceitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Tag Enrichment Modal */}
      {tagEnrichmentModal && (
        <DocumentTagEnrichmentModal
          open={tagEnrichmentModal.open}
          onOpenChange={(open) => {
            if (!open) setTagEnrichmentModal(null);
          }}
          fileName={tagEnrichmentModal.fileName}
          fileIndex={tagEnrichmentModal.fileIndex}
          initialTags={fileEnrichments.get(tagEnrichmentModal.fileIndex)?.selectedTags}
          initialContext={fileEnrichments.get(tagEnrichmentModal.fileIndex)?.additionalContext}
          onSave={(data) => {
            setFileEnrichments(prev => {
              const newMap = new Map(prev);
              newMap.set(tagEnrichmentModal.fileIndex, data);
              return newMap;
            });
            setTagEnrichmentModal(null);
          }}
        />
      )}
    </div>;
};

export default DocumentsTab;