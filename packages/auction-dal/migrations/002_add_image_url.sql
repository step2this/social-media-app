-- Add image_url column to auctions table
-- Migration: 002_add_image_url

ALTER TABLE auctions
ADD COLUMN image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN auctions.image_url IS 'S3 URL for auction image (optional)';
