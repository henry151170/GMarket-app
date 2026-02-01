-- COPIA DESDE AQUI --

CREATE TABLE IF NOT EXISTS other_incomes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  category TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE other_incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own other incomes" ON other_incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own other incomes" ON other_incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own other incomes" ON other_incomes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own other incomes" ON other_incomes FOR DELETE USING (auth.uid() = user_id);

-- COPIA HASTA AQUI --
