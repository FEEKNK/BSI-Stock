CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2),
  barcode VARCHAR(100),
  description TEXT,
  threshold INTEGER DEFAULT 5,
  sizes JSONB DEFAULT '{}'::jsonb,
  total_stock INTEGER DEFAULT 0,
  product_code VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dispensing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  size VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 1,
  dispensed_date DATE NOT NULL,
  hn VARCHAR(50),
  patient_name VARCHAR(255),
  type VARCHAR(10) DEFAULT 'OUT',
  seller VARCHAR(255),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  global_threshold INTEGER DEFAULT 30,
  notifications_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO settings (id, global_threshold, notifications_enabled) 
VALUES (1, 30, true)
ON CONFLICT (id) DO NOTHING;
