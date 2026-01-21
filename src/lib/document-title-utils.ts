/**
 * Document Title Utilities
 * Functions to detect unintelligible filenames and generate readable titles
 */

import { supabase } from "@/integrations/supabase/client";

export interface TitleExtractionResult {
  title: string;
  source: 'metadata' | 'filename' | 'ai' | 'first_lines';
  confidence: number;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
}

// Auto-detected problems (why the original title was unreadable)
export type OriginalTitleProblem = 
  | 'numeric'        // >50% digits
  | 'hash'           // Looks like hexadecimal hash
  | 'uuid'           // Contains UUID pattern
  | 'unreadable'     // Less than 3 readable characters
  | 'technical'      // Generic pattern (doc_123, file-xyz)
  | 'mixed_pattern'; // Mixed pattern without meaning

// Complete rename reasons (includes manual actions)
export type RenameReason = 
  | OriginalTitleProblem           // Auto-detected
  | 'approved_ai_suggestion'       // Admin approved AI suggestion
  | 'manual_edit'                  // Admin edited manually
  | 'auto_metadata'                // Came from PDF metadata
  | 'auto_first_lines'             // Came from first lines
  | 'bulk_rename'                  // Bulk rename operation
  | 'merged_documents';            // Document merge

export interface TitleApprovalResult {
  success: boolean;
  error?: string;
}

/**
 * Detects WHY a filename needs to be renamed
 * Returns the specific problem with the original title
 */
export function detectRenameReason(filename: string): OriginalTitleProblem | null {
  const cleanTitle = filename.replace(/\.(pdf|docx?|txt|xlsx?|pptx?|csv|rtf|odt)$/i, '').trim();
  
  if (cleanTitle.length === 0) return 'unreadable';
  
  // 1. Check for UUID pattern
  if (/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(cleanTitle)) {
    return 'uuid';
  }
  
  // 2. Check for hash pattern (16+ hex chars)
  if (/^[a-f0-9]{16,}$/i.test(cleanTitle.replace(/[^a-z0-9]/gi, ''))) {
    return 'hash';
  }
  
  // 3. Check numeric ratio
  const numericRatio = (cleanTitle.match(/\d/g) || []).length / cleanTitle.length;
  if (numericRatio > 0.5) {
    return 'numeric';
  }
  
  // 4. Check for technical patterns
  const technicalPattern = /^(doc|file|scan|img|pdf|download|document|arquivo|upload|temp|tmp|copy|copia)[-_]?[a-z0-9]+$/i;
  if (technicalPattern.test(cleanTitle)) {
    return 'technical';
  }
  
  // 5. Check for mixed pattern without meaning
  const mixedPattern = /^[a-z0-9]{1,3}[-_][a-z0-9]+[-_][a-z0-9]+$/i;
  if (mixedPattern.test(cleanTitle)) {
    return 'mixed_pattern';
  }
  
  // 6. Check readable characters
  const readableChars = cleanTitle.replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, '').trim();
  if (readableChars.length < 3) {
    return 'unreadable';
  }
  
  return null; // Title is fine, no renaming needed
}

/**
 * Approves or edits a document title with full audit trail
 * @param docId The document ID
 * @param newTitle The new title to set
 * @param reason The reason for the title change
 * @returns Success status and any error message
 */
export async function approveOrEditTitle(
  docId: string,
  newTitle: string,
  reason: RenameReason
): Promise<TitleApprovalResult> {
  try {
    const { error } = await supabase
      .from("documents")
      .update({
        ai_title: newTitle.trim().substring(0, 80),
        title_was_renamed: true,
        renamed_at: new Date().toISOString(),
        rename_reason: reason,
        needs_title_review: false
      })
      .eq("id", docId);

    if (error) {
      console.error('Error approving title:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in approveOrEditTitle:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Restores the original filename as the document title
 * @param docId The document ID
 * @returns Success status and any error message
 */
export async function restoreOriginalTitle(docId: string): Promise<TitleApprovalResult> {
  try {
    // First, get the original_title
    const { data: doc, error: fetchError } = await supabase
      .from("documents")
      .select("original_title, filename")
      .eq("id", docId)
      .single();

    if (fetchError || !doc) {
      return { success: false, error: 'Document not found' };
    }

    const originalTitle = doc.original_title || doc.filename;

    const { error } = await supabase
      .from("documents")
      .update({
        ai_title: null,
        title_was_renamed: false,
        renamed_at: null,
        rename_reason: null,
        needs_title_review: false,
        title_source: 'filename'
      })
      .eq("id", docId);

    if (error) {
      console.error('Error restoring title:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in restoreOriginalTitle:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Detects if a filename needs to be renamed (is unintelligible)
 * Returns TRUE if:
 * - Title is majority numeric (>50% numbers)
 * - Title contains hashes or UUIDs
 * - Title has less than 3 readable characters
 * - Title contains only special characters and numbers
 * - Title follows patterns like: "doc_123456", "file-xyz-789", etc.
 */
export function needsRenaming(filename: string): boolean {
  // Remove file extension before analysis
  const cleanTitle = filename.replace(/\.(pdf|docx?|txt|xlsx?|pptx?|csv|rtf|odt)$/i, '').trim();
  
  if (cleanTitle.length === 0) return true;
  
  // Calculate ratio of numeric characters
  const numericRatio = (cleanTitle.match(/\d/g) || []).length / cleanTitle.length;
  
  // Check for UUID pattern
  const hasUUID = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(cleanTitle);
  
  // Check for hash pattern (16+ hex chars)
  const hasHash = /^[a-f0-9]{16,}$/i.test(cleanTitle.replace(/[^a-z0-9]/gi, ''));
  
  // Count readable characters (letters and accented chars)
  const readableChars = cleanTitle.replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, '').trim();
  
  // Check for technical/generic filename patterns
  const technicalPattern = /^(doc|file|scan|img|pdf|download|document|arquivo|upload|temp|tmp|copy|copia)[-_]?[a-z0-9]+$/i.test(cleanTitle);
  
  // Check for patterns like "123_abc" or "abc-123-xyz"
  const mixedPattern = /^[a-z0-9]{1,3}[-_][a-z0-9]+[-_][a-z0-9]+$/i.test(cleanTitle);
  
  return (
    numericRatio > 0.5 || 
    hasUUID || 
    hasHash || 
    readableChars.length < 3 || 
    technicalPattern ||
    mixedPattern
  );
}

/**
 * Generates a concise title from a document summary
 * @param summary The AI-generated summary of the document
 * @returns A title (max 80 chars) extracted from the summary
 */
export function generateTitleFromSummary(summary: string): string {
  if (!summary || summary.trim().length === 0) {
    return '';
  }

  // Remove common introductory phrases in Portuguese
  let title = summary
    .replace(/^(este|o|a|os|as)\s+(documento|texto|artigo|livro|estudo|relatório|análise|manual|guia)\s*/i, '')
    .replace(/^(apresenta|explora|discute|aborda|descreve|trata|examina|analisa)\s*/i, '')
    .replace(/^(sobre|acerca de|a respeito de)\s*/i, '')
    .trim();
  
  // Get first sentence (up to period, exclamation, or question mark)
  const firstSentence = title.split(/[.!?]/)[0].trim();
  
  // If first sentence is too short, try to get more context
  if (firstSentence.length < 20 && title.length > firstSentence.length) {
    const secondSentence = title.split(/[.!?]/)[1]?.trim();
    if (secondSentence) {
      title = `${firstSentence}. ${secondSentence}`;
    } else {
      title = firstSentence;
    }
  } else {
    title = firstSentence;
  }
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Truncate if too long (max 80 chars)
  if (title.length > 80) {
    // Try to break at a word boundary
    const truncated = title.substring(0, 77);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 50) {
      return truncated.substring(0, lastSpace) + '...';
    }
    return truncated + '...';
  }
  
  return title || summary.substring(0, 80);
}

/**
 * Validates if a title is meaningful and readable
 * @param title The title to validate
 * @returns true if the title is meaningful
 */
export function isValidTitle(title: string): boolean {
  if (!title || title.trim().length < 5) return false;
  
  const readableChars = title.replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, '').trim();
  return readableChars.length >= 5;
}

/**
 * Extracts the first meaningful lines from document text that could serve as a title
 * @param text The full document text
 * @returns A potential title from the first lines, or null if none found
 */
export function extractFirstMeaningfulLines(text: string): string | null {
  const lines = text.split('\n').filter(l => l.trim().length > 10);
  const firstLine = lines[0]?.trim();
  
  // Verify if first line looks like a title
  if (firstLine && firstLine.length >= 5 && firstLine.length <= 100) {
    // Skip if it starts with page number, date, etc.
    if (!/^(\d+|página|page|\d{2}\/\d{2}|sumário|índice|table of contents)/i.test(firstLine)) {
      // Clean up common artifacts
      const cleaned = firstLine
        .replace(/^\d+\s*[-–—]\s*/, '') // Remove leading page numbers
        .replace(/\s*[-–—]\s*\d+$/, '') // Remove trailing page numbers
        .trim();
      
      if (cleaned.length >= 5 && !needsRenaming(cleaned)) {
        return cleaned;
      }
    }
  }
  
  // Try second line if first didn't work
  const secondLine = lines[1]?.trim();
  if (secondLine && secondLine.length >= 5 && secondLine.length <= 100) {
    if (!/^(\d+|página|page|\d{2}\/\d{2})/i.test(secondLine)) {
      const cleaned = secondLine.replace(/^\d+\s*[-–—]\s*/, '').trim();
      if (cleaned.length >= 5 && !needsRenaming(cleaned)) {
        return cleaned;
      }
    }
  }
  
  return null;
}

/**
 * Calls the AI edge function to generate a title from document text
 * @param textSample The first ~2000 chars of the document
 * @returns The AI-generated title
 */
export async function generateTitleWithAI(textSample: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-document-title', {
      body: {
        textSample: textSample.slice(0, 2000)
      }
    });
    
    if (error) {
      console.error('Error generating title with AI:', error);
      return '';
    }
    
    return data?.title || '';
  } catch (error) {
    console.error('Error calling generate-document-title:', error);
    return '';
  }
}

/**
 * Extracts a readable title using a hierarchical approach:
 * 1. PDF metadata title (if readable)
 * 2. Filename (if readable)
 * 3. First meaningful lines from text
 * 4. AI-generated title as fallback
 * 
 * @param text The full document text
 * @param filename The original filename
 * @param pdfMetadata Optional PDF metadata
 * @returns The extracted title with source and confidence
 */
export async function extractReadableTitle(
  text: string,
  filename: string,
  pdfMetadata?: PDFMetadata
): Promise<TitleExtractionResult> {
  // 1. Try PDF metadata title first (highest confidence)
  if (pdfMetadata?.title && pdfMetadata.title.trim().length > 3) {
    const metaTitle = pdfMetadata.title.trim();
    if (!needsRenaming(metaTitle) && isValidTitle(metaTitle)) {
      return {
        title: metaTitle.substring(0, 80),
        source: 'metadata',
        confidence: 0.95
      };
    }
  }
  
  // 2. If filename is readable, use it
  const cleanFilename = filename.replace(/\.(pdf|docx?|txt|xlsx?|pptx?|csv|rtf|odt)$/i, '').trim();
  if (!needsRenaming(filename) && isValidTitle(cleanFilename)) {
    return {
      title: cleanFilename.substring(0, 80),
      source: 'filename',
      confidence: 0.9
    };
  }
  
  // 3. Try to extract from first meaningful lines
  const firstLines = extractFirstMeaningfulLines(text);
  if (firstLines && isValidTitle(firstLines)) {
    return {
      title: firstLines.substring(0, 80),
      source: 'first_lines',
      confidence: 0.7
    };
  }
  
  // 4. Fall back to AI generation
  const aiTitle = await generateTitleWithAI(text.slice(0, 2000));
  if (aiTitle && aiTitle.length > 0) {
    return {
      title: aiTitle.substring(0, 80),
      source: 'ai',
      confidence: 0.85
    };
  }
  
  // Last resort: use the filename even if not ideal
  return {
    title: cleanFilename.substring(0, 80) || 'Documento sem título',
    source: 'filename',
    confidence: 0.3
  };
}
