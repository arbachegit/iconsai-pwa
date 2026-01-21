// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface ExtractedTable {
  headers: string[];
  rows: string[][];
  markdownTable: string;
}

const MAX_PAGES_PER_REQUEST = 15; // Non-imageless mode limit is 15 pages

// Get Google Cloud access token using service account
async function getAccessToken(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: expiry,
  };

  const base64url = (obj: any) => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  };

  const headerEncoded = base64url(header);
  const payloadEncoded = base64url(payload);
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  const pemContents = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwt = `${signatureInput}.${signatureEncoded}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

function tablesToMarkdown(tables: ExtractedTable[]): string {
  return tables.map((table, idx) => {
    let md = `\n### Tabela ${idx + 1}\n\n`;
    md += table.markdownTable;
    return md;
  }).join("\n");
}

function extractTablesFromResponse(document: any): ExtractedTable[] {
  const tables: ExtractedTable[] = [];
  
  if (!document.pages) return tables;

  for (const page of document.pages) {
    if (!page.tables) continue;

    for (const table of page.tables) {
      const extractedTable: ExtractedTable = {
        headers: [],
        rows: [],
        markdownTable: "",
      };

      if (table.headerRows && table.headerRows.length > 0) {
        for (const headerRow of table.headerRows) {
          const headerCells: string[] = [];
          if (headerRow.cells) {
            for (const cell of headerRow.cells) {
              const cellText = extractTextFromLayout(cell.layout, document.text);
              headerCells.push(cellText.trim());
            }
          }
          if (headerCells.length > 0) {
            extractedTable.headers = headerCells;
          }
        }
      }

      if (table.bodyRows) {
        for (const bodyRow of table.bodyRows) {
          const rowCells: string[] = [];
          if (bodyRow.cells) {
            for (const cell of bodyRow.cells) {
              const cellText = extractTextFromLayout(cell.layout, document.text);
              rowCells.push(cellText.trim());
            }
          }
          if (rowCells.length > 0) {
            extractedTable.rows.push(rowCells);
          }
        }
      }

      if (extractedTable.headers.length > 0 || extractedTable.rows.length > 0) {
        const headers = extractedTable.headers.length > 0 
          ? extractedTable.headers 
          : extractedTable.rows[0] || [];
        
        let markdown = "| " + headers.join(" | ") + " |\n";
        markdown += "| " + headers.map(() => "---").join(" | ") + " |\n";
        
        const dataRows = extractedTable.headers.length > 0 
          ? extractedTable.rows 
          : extractedTable.rows.slice(1);
        
        for (const row of dataRows) {
          while (row.length < headers.length) {
            row.push("");
          }
          markdown += "| " + row.join(" | ") + " |\n";
        }
        
        extractedTable.markdownTable = markdown;
        tables.push(extractedTable);
      }
    }
  }

  return tables;
}

function extractTextFromLayout(layout: any, fullText: string): string {
  if (!layout || !layout.textAnchor || !layout.textAnchor.textSegments) {
    return "";
  }

  let text = "";
  for (const segment of layout.textAnchor.textSegments) {
    const startIndex = parseInt(segment.startIndex || "0");
    const endIndex = parseInt(segment.endIndex || "0");
    text += fullText.substring(startIndex, endIndex);
  }
  return text;
}

// Process a batch of pages
async function processPageBatch(
  pdfBase64: string,
  processorName: string,
  location: string,
  accessToken: string,
  startPage: number,
  endPage: number
): Promise<{ text: string; tables: ExtractedTable[] }> {
  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  console.log(`Processing pages ${startPage}-${endPage}...`);

  const processResponse = await fetch(
    `https://${location}-documentai.googleapis.com/v1/${processorName}:process`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rawDocument: {
          content: pdfBase64,
          mimeType: "application/pdf",
        },
        skipHumanReview: true,
        processOptions: {
          individualPageSelector: {
            pages: pages,
          },
        },
      }),
    }
  );

  if (!processResponse.ok) {
    const errorText = await processResponse.text();
    console.error(`Document AI error for pages ${startPage}-${endPage}:`, errorText);
    throw new Error(`Document AI API error: ${processResponse.status} - ${errorText}`);
  }

  const result = await processResponse.json();
  const text = result.document?.text || "";
  const tables = extractTablesFromResponse(result.document);

  return { text, tables };
}

// Get total page count by processing just page 1 with minimal options
async function getPageCount(
  pdfBase64: string,
  processorName: string,
  location: string,
  accessToken: string
): Promise<number> {
  // Try to get page count from a quick single-page process
  const processResponse = await fetch(
    `https://${location}-documentai.googleapis.com/v1/${processorName}:process`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rawDocument: {
          content: pdfBase64,
          mimeType: "application/pdf",
        },
        skipHumanReview: true,
        processOptions: {
          individualPageSelector: {
            pages: [1],
          },
        },
      }),
    }
  );

  if (!processResponse.ok) {
    // If we can't get page count, estimate from base64 size
    // Average PDF page is ~100KB in base64
    const estimatedPages = Math.ceil(pdfBase64.length / 100000);
    console.log(`Could not get exact page count, estimated: ${estimatedPages}`);
    return Math.min(estimatedPages, 500); // Cap at 500 pages
  }

  const result = await processResponse.json();
  
  // Document AI returns total pages in the document info
  // We need to parse the raw PDF to get actual page count
  // For now, estimate based on the error message pattern or default handling
  
  // The actual page count might be in result.document.pages array for processed pages
  // but not the total. We'll use a different approach - process in batches until we get empty results
  
  return -1; // Signal that we need to process iteratively
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const projectId = Deno.env.get("GOOGLE_CLOUD_PROJECT_ID");
    const location = Deno.env.get("GOOGLE_CLOUD_LOCATION") || "us";
    const credentialsJson = Deno.env.get("GOOGLE_CLOUD_CREDENTIALS");

    if (!projectId || !credentialsJson) {
      throw new Error("Missing Google Cloud configuration");
    }

    const credentials = JSON.parse(credentialsJson);
    const { pdf_base64, filename, max_pages } = await req.json();

    if (!pdf_base64) {
      throw new Error("Missing pdf_base64 in request body");
    }

    // Allow caller to limit max pages (default 150 for reasonable processing time)
    const maxPagesToProcess = max_pages || 150;

    console.log(`Processing PDF with Document AI: ${filename} (max ${maxPagesToProcess} pages)`);

    const accessToken = await getAccessToken(credentials);

    const processorEndpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors`;

    const listResponse = await fetch(processorEndpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const processorsList = await listResponse.json();
    console.log("Available processors:", JSON.stringify(processorsList, null, 2));

    let processorName = "";
    if (processorsList.processors && processorsList.processors.length > 0) {
      const formParser = processorsList.processors.find(
        (p: any) => p.type === "FORM_PARSER_PROCESSOR" || p.type === "DOCUMENT_OCR_PROCESSOR"
      );
      processorName = formParser?.name || processorsList.processors[0].name;
    }

    if (!processorName) {
      return new Response(
        JSON.stringify({
          error: "No Document AI processor found",
          instructions: "Please create a processor in Google Cloud Console: Cloud Console > Document AI > Create Processor > Select 'Document OCR' or 'Form Parser'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Using processor: ${processorName}`);

    // Process in batches of MAX_PAGES_PER_REQUEST
    let allText = "";
    let allTables: ExtractedTable[] = [];
    let currentPage = 1;
    let consecutiveEmptyBatches = 0;
    let totalPagesProcessed = 0;

    while (currentPage <= maxPagesToProcess && consecutiveEmptyBatches < 2) {
      const endPage = Math.min(currentPage + MAX_PAGES_PER_REQUEST - 1, maxPagesToProcess);
      
      try {
        const batchResult = await processPageBatch(
          pdf_base64,
          processorName,
          location,
          accessToken,
          currentPage,
          endPage
        );

        if (batchResult.text.trim().length === 0) {
          consecutiveEmptyBatches++;
          console.log(`Empty batch for pages ${currentPage}-${endPage}, consecutive empty: ${consecutiveEmptyBatches}`);
        } else {
          consecutiveEmptyBatches = 0;
          allText += (allText ? "\n\n" : "") + `--- Páginas ${currentPage}-${endPage} ---\n\n` + batchResult.text;
          allTables = [...allTables, ...batchResult.tables];
          totalPagesProcessed = endPage;
        }

        console.log(`Batch ${currentPage}-${endPage} complete: ${batchResult.text.length} chars, ${batchResult.tables.length} tables`);
      } catch (error) {
        // If we get a page limit error, it means we've reached the end
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("PAGE_LIMIT_EXCEEDED") || errorMessage.includes("out of range")) {
          console.log(`Reached end of document at page ${currentPage}`);
          break;
        }
        // For other errors, try to continue with next batch
        console.error(`Error processing batch ${currentPage}-${endPage}:`, errorMessage);
        consecutiveEmptyBatches++;
      }

      currentPage = endPage + 1;
      
      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (allText.trim().length === 0) {
      throw new Error("No text could be extracted from the document");
    }

    // Combine text with table markdown
    let enrichedText = allText;
    if (allTables.length > 0) {
      enrichedText += "\n\n## DADOS TABULARES EXTRAÍDOS\n";
      enrichedText += tablesToMarkdown(allTables);
    }

    const wordCount = enrichedText.split(/\s+/).filter(Boolean).length;

    console.log(`Document AI processing complete: ${totalPagesProcessed} pages, ${wordCount} words, ${allTables.length} tables`);

    return new Response(
      JSON.stringify({
        success: true,
        text: enrichedText,
        tables: allTables,
        statistics: {
          wordCount,
          tableCount: allTables.length,
          totalTableRows: allTables.reduce((sum, t) => sum + t.rows.length, 0),
          pagesProcessed: totalPagesProcessed,
          originalTextLength: allText.length,
          enrichedTextLength: enrichedText.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in extract-pdf-document-ai:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
