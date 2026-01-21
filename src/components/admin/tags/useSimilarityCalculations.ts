import { useState, useEffect, useRef } from "react";
import { calculateSimilarity } from "@/lib/string-similarity";
import { logger } from "@/lib/logger";
import type { 
  Tag, 
  OrphanedTag, 
  DuplicateGroup, 
  SemanticDuplicate, 
  SimilarChildPair, 
  SimilarChildGroup 
} from "@/types/tag";

// Re-export types for backward compatibility
export type { OrphanedTag, DuplicateGroup, SemanticDuplicate, SimilarChildPair, SimilarChildGroup };

// Debounce delay for similarity calculations (ms)
const SIMILARITY_DEBOUNCE_MS = 500;
// Max tags to process in one chunk
const CHUNK_SIZE = 20;

/**
 * Optimized hook for similarity calculations with async processing and debounce.
 * Eliminates O(n²) blocking calculations that caused UI latency.
 */
export function useSimilarityCalculations(
  allTags: Tag[] | undefined,
  parentTags: Tag[],
  childTagsMap: Record<string, Tag[]>
) {
  // State for calculated results
  const [duplicateParentTags, setDuplicateParentTags] = useState<DuplicateGroup[]>([]);
  const [semanticDuplicates, setSemanticDuplicates] = useState<SemanticDuplicate[]>([]);
  const [similarChildTagsPerParent, setSimilarChildTagsPerParent] = useState<SimilarChildGroup[]>([]);
  const [orphanedTags, setOrphanedTags] = useState<OrphanedTag[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Refs for debounce and cancellation
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const calculationIdRef = useRef(0);

  // Calculate exact duplicates (fast, synchronous - O(n))
  useEffect(() => {
    if (!parentTags.length) {
      setDuplicateParentTags([]);
      return;
    }

    const duplicates = parentTags.reduce((acc, tag) => {
      const existing = acc.find((item) => item.tag_name === tag.tag_name);
      if (existing) {
        existing.count += 1;
        existing.ids.push(tag.id);
      } else {
        acc.push({ tag_name: tag.tag_name, count: 1, ids: [tag.id] });
      }
      return acc;
    }, [] as DuplicateGroup[]).filter((item) => item.count > 1);

    setDuplicateParentTags(duplicates);
  }, [parentTags]);

  // Calculate orphaned tags (fast, synchronous - O(n))
  useEffect(() => {
    if (!allTags) {
      setOrphanedTags([]);
      return;
    }

    const orphans = allTags
      .filter(tag => {
        if (!tag.parent_tag_id) return false;
        const parentExists = parentTags.some(p => p.id === tag.parent_tag_id);
        return !parentExists && tag.created_at;
      })
      .map(tag => ({
        id: tag.id,
        tag_name: tag.tag_name,
        tag_type: tag.tag_type,
        confidence: tag.confidence,
        source: tag.source,
        document_id: tag.document_id,
        parent_tag_id: tag.parent_tag_id,
        created_at: tag.created_at || new Date().toISOString(),
      }));

    setOrphanedTags(orphans);
  }, [allTags, parentTags]);

  // Async calculation for semantic duplicates (expensive O(n²) operation)
  useEffect(() => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!parentTags.length) {
      setSemanticDuplicates([]);
      setSimilarChildTagsPerParent([]);
      setIsCalculating(false);
      return;
    }

    // Increment calculation ID to track cancellation
    const currentCalcId = ++calculationIdRef.current;

    // Debounce the expensive calculation
    debounceTimerRef.current = setTimeout(async () => {
      setIsCalculating(true);
      
      try {
        // Calculate semantic duplicates in chunks
        const semanticResults = await calculateSemanticDuplicatesAsync(
          parentTags,
          currentCalcId,
          calculationIdRef
        );
        
        // Only update if this calculation wasn't cancelled
        if (calculationIdRef.current === currentCalcId) {
          setSemanticDuplicates(semanticResults);
        }

        // Calculate similar children in chunks
        const childResults = await calculateSimilarChildrenAsync(
          parentTags,
          childTagsMap,
          currentCalcId,
          calculationIdRef
        );

        // Only update if this calculation wasn't cancelled
        if (calculationIdRef.current === currentCalcId) {
          setSimilarChildTagsPerParent(childResults);
          setIsCalculating(false);
        }
      } catch (error) {
        logger.error("[useSimilarityCalculations] Error in async calculation:", error);
        setIsCalculating(false);
      }
    }, SIMILARITY_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [parentTags, childTagsMap]);

  // Total count of child duplicates (derived)
  const totalChildDuplicates = similarChildTagsPerParent.reduce(
    (sum, p) => sum + p.pairs.length, 
    0
  );

  return {
    duplicateParentTags,
    semanticDuplicates,
    similarChildTagsPerParent,
    totalChildDuplicates,
    orphanedTags,
    isCalculating,
  };
}

/**
 * Async chunked calculation of semantic duplicates
 * Processes tags in small chunks with yielding to prevent UI blocking
 */
async function calculateSemanticDuplicatesAsync(
  parentTags: Tag[],
  calcId: number,
  calcIdRef: React.MutableRefObject<number>
): Promise<SemanticDuplicate[]> {
  const results: SemanticDuplicate[] = [];
  const uniqueTagNames = [...new Set(parentTags.map(t => t.tag_name))];
  
  // Limit to first 100 unique tags for performance
  const limitedTags = uniqueTagNames.slice(0, 100);
  
  let processedPairs = 0;
  const totalPairs = (limitedTags.length * (limitedTags.length - 1)) / 2;

  for (let i = 0; i < limitedTags.length; i++) {
    // Check if calculation was cancelled
    if (calcIdRef.current !== calcId) {
      return results;
    }

    for (let j = i + 1; j < limitedTags.length; j++) {
      const similarityPct = calculateSimilarity(limitedTags[i], limitedTags[j]);
      const similarity = similarityPct / 100;
      
      // Consider similar if >= 70% match but not exact
      if (similarity >= 0.7 && similarity < 1) {
        const tag1Ids = parentTags.filter(t => t.tag_name === limitedTags[i]).map(t => t.id);
        const tag2Ids = parentTags.filter(t => t.tag_name === limitedTags[j]).map(t => t.id);
        results.push({
          tag1: limitedTags[i],
          tag2: limitedTags[j],
          similarity,
          ids: [...tag1Ids, ...tag2Ids],
        });
      }

      processedPairs++;

      // Yield to main thread every CHUNK_SIZE pairs
      if (processedPairs % CHUNK_SIZE === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Async chunked calculation of similar children within parents
 */
async function calculateSimilarChildrenAsync(
  parentTags: Tag[],
  childTagsMap: Record<string, Tag[]>,
  calcId: number,
  calcIdRef: React.MutableRefObject<number>
): Promise<SimilarChildGroup[]> {
  const results: SimilarChildGroup[] = [];
  
  // Limit to first 50 parents for performance
  const limitedParents = parentTags.slice(0, 50);
  
  for (let idx = 0; idx < limitedParents.length; idx++) {
    // Check if calculation was cancelled
    if (calcIdRef.current !== calcId) {
      return results;
    }

    const parent = limitedParents[idx];
    const children = childTagsMap[parent.id] || [];
    
    // Skip if too few or too many children
    if (children.length < 2 || children.length > 50) continue;
    
    const pairs: SimilarChildPair[] = [];
    
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        const similarityPct = calculateSimilarity(children[i].tag_name, children[j].tag_name);
        const similarity = similarityPct / 100;
        
        // Consider similar if >= 60% match but not exact
        if (similarity >= 0.6 && similarity < 1) {
          pairs.push({
            tag1: children[i].tag_name,
            tag2: children[j].tag_name,
            id1: children[i].id,
            id2: children[j].id,
            similarity,
          });
        }
      }
    }
    
    if (pairs.length > 0) {
      pairs.sort((a, b) => b.similarity - a.similarity);
      results.push({
        parentId: parent.id,
        parentName: parent.tag_name,
        pairs: pairs.slice(0, 10),
      });
    }

    // Yield to main thread every few parents
    if ((idx + 1) % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return results;
}
