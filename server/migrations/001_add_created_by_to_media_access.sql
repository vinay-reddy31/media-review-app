-- Migration: Add createdBy field to media_access table
-- This field tracks who shared the media with the user

ALTER TABLE media_access 
ADD COLUMN IF NOT EXISTS created_by VARCHAR;

-- Add comment to document the field
COMMENT ON COLUMN media_access.created_by IS 'Keycloak user ID of who shared this media';
