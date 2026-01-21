// Optimized sub-components for TagsManagementTab
export { VirtualizedTagsTable } from "./VirtualizedTagsTable";
export { TagFilters } from "./TagFilters";
export { TagUnificationSuggestionsModal } from "./TagUnificationSuggestionsModal";
export { BulkMergeConfirmationModal } from "./BulkMergeConfirmationModal";

// New extracted components (Phase 3 refactoring)
export { TagDeleteConfirmModal } from "./TagDeleteConfirmModal";
export { TagBulkDeleteModal } from "./TagBulkDeleteModal";
export { TagEditDialog } from "./TagEditDialog";

// Hooks
export { useTagsData } from "./useTagsData";
export { useSimilarityCalculations } from "./useSimilarityCalculations";
export { useTagMutations } from "./useTagMutations";

// Types
export * from "./types";
