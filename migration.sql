-- Migration for Stack Shack Nutrition - Multi-Payment Gateway Support
-- Run this in your Supabase SQL Editor.

ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS active_payment_gateway TEXT DEFAULT 'razorpay',
ADD COLUMN IF NOT EXISTS razorpay_environment TEXT DEFAULT 'test',
ADD COLUMN IF NOT EXISTS phonepe_client_id TEXT,
ADD COLUMN IF NOT EXISTS phonepe_client_secret TEXT,
ADD COLUMN IF NOT EXISTS phonepe_client_version TEXT DEFAULT '1',
ADD COLUMN IF NOT EXISTS phonepe_environment TEXT DEFAULT 'sandbox';
