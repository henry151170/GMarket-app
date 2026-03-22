-- Fix for reset_expenses function to include structural_expenses
create or replace function reset_expenses()
returns boolean
language plpgsql
security definer
as $$
begin
    -- 1. Delete associated journal entries (both types)
    delete from cash_journal 
    where type IN ('expense', 'structural_expense');

    -- 2. Delete all expenses
    delete from expenses;
    
    return true;
end;
$$;
