-- Initial schema for auction system
-- PostgreSQL with ACID transactions for bid handling

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Auctions table
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(50) NOT NULL,  -- References DynamoDB user ID
  title VARCHAR(200) NOT NULL,
  description TEXT,
  start_price DECIMAL(10,2) NOT NULL CHECK (start_price >= 0),
  reserve_price DECIMAL(10,2) CHECK (reserve_price IS NULL OR reserve_price >= start_price),
  current_price DECIMAL(10,2) NOT NULL CHECK (current_price >= start_price),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL CHECK (end_time > start_time),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  winner_id VARCHAR(50),  -- Set when auction completes
  bid_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bids table
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL,  -- References DynamoDB user ID
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_auctions_user_id ON auctions(user_id);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_end_time ON auctions(end_time) WHERE status = 'active';
CREATE INDEX idx_bids_auction_id ON bids(auction_id);
CREATE INDEX idx_bids_user_id ON bids(user_id);
CREATE INDEX idx_bids_created_at ON bids(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_auctions_updated_at
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE auctions IS 'Auction listings with ACID transaction support for concurrent bidding';
COMMENT ON TABLE bids IS 'Bid history for auctions';
COMMENT ON COLUMN auctions.user_id IS 'DynamoDB user ID from social media system';
COMMENT ON COLUMN auctions.reserve_price IS 'Minimum price for sale (null = no reserve)';
COMMENT ON COLUMN auctions.status IS 'Auction lifecycle: pending -> active -> completed/cancelled';
COMMENT ON COLUMN bids.user_id IS 'DynamoDB user ID from social media system';
