-- Add sentiment analysis columns to conversation_history
ALTER TABLE conversation_history 
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS sentiment_label TEXT DEFAULT 'neutral';

-- Create index for better query performance on sentiment filtering
CREATE INDEX IF NOT EXISTS idx_conversation_history_sentiment 
ON conversation_history(sentiment_label);

CREATE INDEX IF NOT EXISTS idx_conversation_history_created_at 
ON conversation_history(created_at DESC);