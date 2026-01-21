import { useMemo } from "react";
import type { Tag } from "@/types/tag";

interface UseTagsDataProps {
  allTags: Tag[] | undefined;
  filterSource: string;
  filterChat: string;
  filterConfidence: string;
  searchTagName: string;
  sortColumn: "tag_name" | "confidence" | "target_chat";
  sortDirection: "asc" | "desc";
  currentPage: number;
  itemsPerPage: number;
}

export function useTagsData({
  allTags,
  filterSource,
  filterChat,
  filterConfidence,
  searchTagName,
  sortColumn,
  sortDirection,
  currentPage,
  itemsPerPage,
}: UseTagsDataProps) {
  // Memoize parent tags
  const parentTags = useMemo(() => {
    return allTags?.filter((t) => !t.parent_tag_id) || [];
  }, [allTags]);

  // Memoize child tags map
  const childTagsMap = useMemo(() => {
    return allTags?.reduce((acc, tag) => {
      if (tag.parent_tag_id) {
        if (!acc[tag.parent_tag_id]) {
          acc[tag.parent_tag_id] = [];
        }
        acc[tag.parent_tag_id].push(tag);
      }
      return acc;
    }, {} as Record<string, Tag[]>) || {};
  }, [allTags]);

  // Filter by source and chat
  const filteredParentTags = useMemo(() => {
    return parentTags.filter((t) => {
      const sourceMatch = filterSource === "all" || t.source === filterSource;
      const chatMatch = filterChat === "all" || t.target_chat === filterChat;
      return sourceMatch && chatMatch;
    });
  }, [parentTags, filterSource, filterChat]);

  // Apply confidence filter and search (including child tags)
  const confidenceFilteredTags = useMemo(() => {
    const searchLower = searchTagName.toLowerCase().trim();
    
    return filteredParentTags.filter((parentTag) => {
      // Check if parent tag matches search
      const parentMatch = !searchTagName.trim() || 
        parentTag.tag_name.toLowerCase().includes(searchLower);
      
      // Check if any child tag matches search
      const childTags = childTagsMap[parentTag.id] || [];
      const childMatch = childTags.some(child => 
        child.tag_name.toLowerCase().includes(searchLower)
      );
      
      // Show parent if it matches OR if any child matches
      if (!searchTagName.trim() || parentMatch || childMatch) {
        // Apply confidence filter
        if (filterConfidence === "all") return true;
        const conf = parentTag.confidence ?? 0;
        switch (filterConfidence) {
          case "high": return conf >= 0.7;
          case "medium": return conf >= 0.5 && conf < 0.7;
          case "low": return conf < 0.5;
          default: return true;
        }
      }
      
      return false;
    });
  }, [filteredParentTags, childTagsMap, searchTagName, filterConfidence]);

  // Sort tags
  const sortedParentTags = useMemo(() => {
    return [...confidenceFilteredTags].sort((a, b) => {
      if (sortColumn === "tag_name") {
        const comparison = a.tag_name.localeCompare(b.tag_name);
        return sortDirection === "asc" ? comparison : -comparison;
      } else if (sortColumn === "confidence") {
        const aConf = a.confidence ?? 0;
        const bConf = b.confidence ?? 0;
        return sortDirection === "asc" ? aConf - bConf : bConf - aConf;
      } else if (sortColumn === "target_chat") {
        const aChat = a.target_chat || "";
        const bChat = b.target_chat || "";
        const comparison = aChat.localeCompare(bChat);
        return sortDirection === "asc" ? comparison : -comparison;
      }
      return 0;
    });
  }, [confidenceFilteredTags, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedParentTags.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedParentTags = useMemo(() => {
    return sortedParentTags.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedParentTags, startIndex, itemsPerPage]);

  // Child tags count
  const childTagsCount = useMemo(() => {
    return Object.values(childTagsMap).reduce((sum, arr) => sum + arr.length, 0);
  }, [childTagsMap]);

  // Document count per tag name - O(n) single-pass algorithm
  const documentCountByTagName = useMemo(() => {
    if (!allTags?.length) return {};
    
    // Single pass: collect unique document IDs per tag name
    const docSetsByTag = new Map<string, Set<string>>();
    
    for (const tag of allTags) {
      const existing = docSetsByTag.get(tag.tag_name);
      if (existing) {
        existing.add(tag.document_id);
      } else {
        docSetsByTag.set(tag.tag_name, new Set([tag.document_id]));
      }
    }
    
    // Convert to count map
    const countMap: Record<string, number> = {};
    docSetsByTag.forEach((docs, tagName) => {
      countMap[tagName] = docs.size;
    });
    
    return countMap;
  }, [allTags]);

  return {
    parentTags,
    childTagsMap,
    sortedParentTags,
    paginatedParentTags,
    totalPages,
    childTagsCount,
    documentCountByTagName,
  };
}
