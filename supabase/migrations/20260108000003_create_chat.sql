-- PriceWaze Real-time Chat System
-- Enables messaging between buyers, sellers, and agents

-- Conversations Table
CREATE TABLE IF NOT EXISTS pricewaze_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES pricewaze_properties(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, buyer_id, seller_id) -- One conversation per property per buyer-seller pair
);

-- Messages Table
CREATE TABLE IF NOT EXISTS pricewaze_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES pricewaze_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'file', 'offer_link', 'visit_link'
  metadata JSONB, -- For images, files, links, etc.
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON pricewaze_conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON pricewaze_conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_property_id ON pricewaze_conversations(property_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON pricewaze_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON pricewaze_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON pricewaze_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON pricewaze_messages(conversation_id, created_at DESC);

-- RLS Policies
ALTER TABLE pricewaze_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricewaze_messages ENABLE ROW LEVEL SECURITY;

-- Conversations Policies
CREATE POLICY "Users can view their own conversations"
  ON pricewaze_conversations FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create conversations"
  ON pricewaze_conversations FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can update their own conversations"
  ON pricewaze_conversations FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Messages Policies
CREATE POLICY "Users can view messages in their conversations"
  ON pricewaze_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_conversations
      WHERE id = conversation_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON pricewaze_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM pricewaze_conversations
      WHERE id = conversation_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages (mark as read)"
  ON pricewaze_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pricewaze_conversations
      WHERE id = conversation_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pricewaze_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_message_at
CREATE TRIGGER update_conversation_last_message
  AFTER INSERT ON pricewaze_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON pricewaze_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

-- Enable Realtime for messages (this is done via Supabase dashboard, but documented here)
-- In Supabase Dashboard: Go to Database > Replication > Enable for pricewaze_messages

-- Comments
COMMENT ON TABLE pricewaze_conversations IS 'Chat conversations between buyers and sellers about properties';
COMMENT ON TABLE pricewaze_messages IS 'Individual messages in conversations';

