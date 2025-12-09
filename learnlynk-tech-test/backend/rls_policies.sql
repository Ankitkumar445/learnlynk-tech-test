-- LearnLynk Tech Test - Task 2: RLS Policies on leads

alter table public.leads enable row level security;

-- Example helper: assume JWT has tenant_id, user_id, role.
-- You can use: current_setting('request.jwt.claims', true)::jsonb

-- TODO: write a policy so:
-- - counselors see leads where they are owner_id OR in one of their teams
-- - admins can see all leads of their tenant

-- Example skeleton for SELECT (replace with your own logic):

create policy "leads_select_policy"
on public.leads
for select
using (
  -- TODO: add real RLS logic here, refer to README instructions

  -- 1. Tenant Isolation (Mandatory)
  tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
  
  AND (
    -- 2. Admin: Can see all leads in tenant
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
    
    OR
    
    -- 3. Counselor Logic
    (
      (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'counselor'
      AND (
        -- A) They own the lead
        owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'user_id')::uuid
        
        OR
        
        -- B) Lead belongs to a team member (Teammate Access)
        -- Checks if the lead's owner is in the same team as the current user
        exists (
          select 1 
          from user_teams ut_me
          join user_teams ut_other on ut_me.team_id = ut_other.team_id
          where ut_me.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'user_id')::uuid
          and ut_other.user_id = leads.owner_id
        )
      )
    )
  )
);

-- TODO: add INSERT policy that:
-- - allows counselors/admins to insert leads for their tenant
-- - ensures tenant_id is correctly set/validated

create policy "leads_insert_policy"
on public.leads
for insert
with check (
  -- Role Validation: Only admins or counselors can insert
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('admin', 'counselor')
  
  -- Tenant Validation: Must match the user's tenant
  AND tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
);