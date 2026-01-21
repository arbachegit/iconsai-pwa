-- Create table for deterministic analysis of user questions
CREATE TABLE public.deterministic_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversation_history(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  chat_type TEXT NOT NULL,
  original_message TEXT NOT NULL,
  classification TEXT NOT NULL CHECK (classification IN ('deterministic', 'non-deterministic')),
  analysis_reason TEXT,
  refactored_version TEXT,
  question_type TEXT CHECK (question_type IN ('binary', 'data_retrieval', 'quantitative', 'selective', 'definition', NULL)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.deterministic_analysis ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_deterministic_classification ON public.deterministic_analysis(classification);
CREATE INDEX idx_deterministic_chat_type ON public.deterministic_analysis(chat_type);
CREATE INDEX idx_deterministic_question_type ON public.deterministic_analysis(question_type);
CREATE INDEX idx_deterministic_created_at ON public.deterministic_analysis(created_at DESC);

-- RLS Policies
CREATE POLICY "Admins can manage deterministic analysis"
ON public.deterministic_analysis
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert deterministic analysis"
ON public.deterministic_analysis
FOR INSERT
WITH CHECK (true);