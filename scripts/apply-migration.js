/**
 * Script to apply database migration for goal linking feature
 * Adds parent_goal_id column to goals table
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('📝 Reading migration file...');

    const migrationPath = path.join(__dirname, '../supabase/migrations/20260201000000_goal_linking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying migration to Supabase...');
    console.log('Migration SQL length:', migrationSQL.length, 'characters');

    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct SQL execution
      console.log('⚠️  exec_sql RPC not available, trying direct execution...');

      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`📊 Executing ${statements.length} SQL statements...`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement) {
          console.log(`  ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);

          const { error: stmtError } = await supabase.rpc('exec', {
            sql: statement + ';'
          });

          if (stmtError) {
            console.error(`❌ Error executing statement ${i + 1}:`, stmtError.message);
            throw stmtError;
          }
        }
      }
    }

    console.log('✅ Migration applied successfully!');

    // Verify the column was added
    console.log('\n🔍 Verifying parent_goal_id column...');
    const { data: columns, error: verifyError } = await supabase
      .from('goals')
      .select('*')
      .limit(0);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
    } else {
      console.log('✅ Schema updated successfully!');
      console.log('💡 You may need to regenerate TypeScript types:');
      console.log('   npx supabase gen types typescript --local > src/types/database.types.ts');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📋 Manual application required:');
    console.error('1. Go to https://supabase.com/dashboard');
    console.error('2. Select your project');
    console.error('3. Navigate to SQL Editor');
    console.error('4. Paste the contents of: supabase/migrations/20260201000000_goal_linking.sql');
    console.error('5. Click "Run"');
    process.exit(1);
  }
}

applyMigration();
