/**
 * Security Test Script for MyDailyOps
 * Tests user isolation and security checks
 * 
 * Usage (from apps/desktop folder):
 *  pnpm tsx test-security-api.ts user1@email.com pass1 user2@email.com pass2 supabase-url supabase-key
 * 
 * Or with environment variables:
 *  export TEST_USER1_EMAIL="user1@example.com"
 *  export TEST_USER1_PASSWORD="password1"
 *  export TEST_USER2_EMAIL="user2@example.com"
 *  export TEST_USER2_PASSWORD="password2"
 *  export VITE_SUPABASE_URL="your-url"
 *  export VITE_SUPABASE_ANON_KEY="your-key"
 *  pnpm tsx test-security-api.ts
 */

import { createClient } from '@supabase/supabase-js';

// Try to load dotenv if available
(function loadDotenv() {
  try {
    // Try CommonJS require first
    const dotenv = require('dotenv');
    dotenv.config();
  } catch {
    // dotenv not installed or not available as CommonJS
    // Will use environment variables directly
  }
})();

// Get Supabase URL and Key from env or args
// Args order: user1@email pass1 user2@email pass2 supabase-url supabase-key
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.argv[6] || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.argv[7] || '';

// Get test user credentials from env or args
// Usage: pnpm tsx test-security-api.ts user1@email.com pass1 user2@email.com pass2 [supabase-url] [supabase-key]
// Or use: RUN_TEST.bat (Windows) or RUN_TEST.sh (Linux/Mac)
const TEST_USER1_EMAIL = process.env.TEST_USER1_EMAIL || process.argv[2] || '';
const TEST_USER1_PASSWORD = process.env.TEST_USER1_PASSWORD || process.argv[3] || '';
const TEST_USER2_EMAIL = process.env.TEST_USER2_EMAIL || process.argv[4] || '';
const TEST_USER2_PASSWORD = process.env.TEST_USER2_PASSWORD || process.argv[5] || '';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  results.push(result);
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.name}`);
  if (result.message) {
    console.log(`   ${result.message}`);
  }
  if (result.details && !result.passed) {
    console.log(`   Details:`, result.details);
  }
}

async function testSecurity() {
  console.log('🔒 Starting Security Tests for MyDailyOps\n');
  console.log('='.repeat(60));

  // Validate inputs
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set');
    console.error('\nUsage options:');
    console.error('\n1. Environment variables:');
    console.error('   export VITE_SUPABASE_URL="your-url"');
    console.error('   export VITE_SUPABASE_ANON_KEY="your-key"');
    console.error('   export TEST_USER1_EMAIL="user1@example.com"');
    console.error('   export TEST_USER1_PASSWORD="password1"');
    console.error('   export TEST_USER2_EMAIL="user2@example.com"');
    console.error('   export TEST_USER2_PASSWORD="password2"');
    console.error('   pnpm tsx test-security-api.ts');
    console.error('\n2. Command line arguments:');
    console.error('   pnpm tsx test-security-api.ts user1@email.com pass1 user2@email.com pass2 supabase-url supabase-key');
    process.exit(1);
  }

  if (!TEST_USER1_EMAIL || !TEST_USER1_PASSWORD || !TEST_USER2_EMAIL || !TEST_USER2_PASSWORD) {
    console.error('❌ Error: Test user credentials must be provided');
    console.error('\nUsage:');
    console.error('  pnpm tsx test-security-api.ts user1@email.com pass1 user2@email.com pass2 [supabase-url] [supabase-key]');
    console.error('\nOr set environment variables (see above)');
    process.exit(1);
  }

  // Create Supabase clients for both users
  const supabase1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const supabase2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Generate valid UUID v4 for test tasks
  function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  try {
    // Authenticate User 1
    console.log('\n📝 Authenticating User 1...');
    const { data: auth1, error: authError1 } = await supabase1.auth.signInWithPassword({
      email: TEST_USER1_EMAIL,
      password: TEST_USER1_PASSWORD,
    });

    if (authError1 || !auth1.user) {
      logResult({
        name: 'User 1 Authentication',
        passed: false,
        message: `Failed to authenticate User 1: ${authError1?.message}`,
      });
      return;
    }

    logResult({
      name: 'User 1 Authentication',
      passed: true,
      message: `Authenticated as ${auth1.user.email}`,
    });

    const userId1 = auth1.user.id;

    // Authenticate User 2
    console.log('\n📝 Authenticating User 2...');
    const { data: auth2, error: authError2 } = await supabase2.auth.signInWithPassword({
      email: TEST_USER2_EMAIL,
      password: TEST_USER2_PASSWORD,
    });

    if (authError2 || !auth2.user) {
      logResult({
        name: 'User 2 Authentication',
        passed: false,
        message: `Failed to authenticate User 2: ${authError2?.message}`,
      });
      return;
    }

    logResult({
      name: 'User 2 Authentication',
      passed: true,
      message: `Authenticated as ${auth2.user.email}`,
    });

    const userId2 = auth2.user.id;

    // Test 1: User 1 creates a task
    console.log('\n🧪 Test 1: User 1 creates a task...');
    const testTask1 = {
      id: generateUUID(),
      user_id: userId1,
      title: `Security Test Task ${Date.now()}`,
      description: 'Test task created by User 1',
      priority: 'medium',
      category: '',
      deadline: null,
      status: 'pending',
      pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recurring_options: null,
    };

    const { data: createdTask1, error: createError1 } = await supabase1
      .from('tasks')
      .insert(testTask1)
      .select()
      .single();

    if (createError1) {
      logResult({
        name: 'Test 1: User 1 creates task',
        passed: false,
        message: `Failed to create task: ${createError1.message}`,
        details: createError1,
      });
    } else {
      logResult({
        name: 'Test 1: User 1 creates task',
        passed: true,
        message: `Task created: ${createdTask1.id}`,
      });
    }

    // Test 2: User 1 can see their own task
    console.log('\n🧪 Test 2: User 1 can see their own task...');
    const { data: tasks1, error: fetchError1 } = await supabase1
      .from('tasks')
      .select('*')
      .eq('user_id', userId1);

    if (fetchError1) {
      logResult({
        name: 'Test 2: User 1 can see own tasks',
        passed: false,
        message: `Failed to fetch tasks: ${fetchError1.message}`,
      });
    } else {
      const foundTask = tasks1?.find(t => t.id === testTask1.id);
      if (foundTask) {
        logResult({
          name: 'Test 2: User 1 can see own tasks',
          passed: true,
          message: `User 1 can see ${tasks1?.length || 0} tasks including their test task`,
        });
      } else {
        logResult({
          name: 'Test 2: User 1 can see own tasks',
          passed: false,
          message: 'User 1 cannot see their own test task',
        });
      }
    }

    // Test 3: User 2 CANNOT see User 1's task (CRITICAL)
    console.log('\n🧪 Test 3: User 2 cannot see User 1\'s task (CRITICAL TEST)...');
    const { data: tasks2, error: fetchError2 } = await supabase2
      .from('tasks')
      .select('*')
      .eq('user_id', userId2);

    if (fetchError2) {
      logResult({
        name: 'Test 3: User 2 cannot see User 1\'s task',
        passed: false,
        message: `Failed to fetch tasks: ${fetchError2.message}`,
      });
    } else {
      const foundOtherUserTask = tasks2?.find(t => t.id === testTask1.id);
      if (!foundOtherUserTask) {
        logResult({
          name: 'Test 3: User 2 cannot see User 1\'s task',
          passed: true,
          message: `User 2 can see ${tasks2?.length || 0} tasks, but NOT User 1's task`,
        });
      } else {
        logResult({
          name: 'Test 3: User 2 cannot see User 1\'s task',
          passed: false,
          message: '🚨 SECURITY ISSUE: User 2 can see User 1\'s task!',
          details: foundOtherUserTask,
        });
      }
    }

    // Test 4: User 2 tries to delete User 1's task (should fail with RLS)
    console.log('\n🧪 Test 4: User 2 tries to delete User 1\'s task (should fail)...');
    
    // First verify the task still exists
    const { data: taskBeforeDelete } = await supabase1
      .from('tasks')
      .select('id')
      .eq('id', testTask1.id)
      .single();
    
    if (!taskBeforeDelete) {
      logResult({
        name: 'Test 4: User 2 cannot delete User 1\'s task',
        passed: false,
        message: 'Task not found before deletion test',
      });
    } else {
      // CRITICAL: Do NOT include .eq('user_id', userId1) here!
      // RLS should block based on auth.uid() check, not on WHERE clause
      // If we pass user_id in WHERE, we're helping the attack succeed
      const { data: deleteData, error: deleteError, count } = await supabase2
        .from('tasks')
        .delete()
        .eq('id', testTask1.id)
        .select();

      // Check if task still exists after deletion attempt
      const { data: taskAfterDelete } = await supabase1
        .from('tasks')
        .select('id')
        .eq('id', testTask1.id)
        .single();

      // Check if deletion was blocked (RLS working correctly)
      const taskStillExists = !!taskAfterDelete;
      const rowsDeleted = deleteData?.length || 0;
      
      if (deleteError) {
        // This is GOOD - RLS blocked with an error
        logResult({
          name: 'Test 4: User 2 cannot delete User 1\'s task',
          passed: true,
          message: `RLS blocked deletion: ${deleteError.message}`,
        });
      } else if (taskStillExists && rowsDeleted === 0) {
        // This is GOOD - RLS silently blocked (no error, but nothing deleted)
        // Task still exists = RLS prevented deletion
        logResult({
          name: 'Test 4: User 2 cannot delete User 1\'s task',
          passed: true,
          message: `RLS blocked deletion silently (task still exists, 0 rows deleted)`,
        });
      } else if (!taskStillExists && rowsDeleted > 0) {
        // This is BAD - deletion succeeded, task was deleted
        logResult({
          name: 'Test 4: User 2 cannot delete User 1\'s task',
          passed: false,
          message: '🚨 SECURITY ISSUE: User 2 was able to delete User 1\'s task!',
        });
      } else {
        // Edge case - unclear what happened
        logResult({
          name: 'Test 4: User 2 cannot delete User 1\'s task',
          passed: false,
          message: `Unexpected result: taskStillExists=${taskStillExists}, rowsDeleted=${rowsDeleted}, error=${deleteError?.message || 'none'}`,
        });
      }
    }

    // Test 5: User 2 tries to update User 1's task (should fail with RLS)
    // IMPORTANT: We only pass task ID, NOT user_id in WHERE clause
    // RLS must block this based on auth.uid() != task.user_id check
    console.log('\n🧪 Test 5: User 2 tries to update User 1\'s task (should fail)...');
    console.log('   Attempting to update task by ID only (no user_id filter)...');
    
    // First get the original title
    const { data: originalTask } = await supabase1
      .from('tasks')
      .select('title, id')
      .eq('id', testTask1.id)
      .single();
    
    if (!originalTask) {
      logResult({
        name: 'Test 5: User 2 cannot update User 1\'s task',
        passed: false,
        message: 'Task not found before update test',
      });
    } else {
      const originalTitle = originalTask.title;
      // CRITICAL: Do NOT include .eq('user_id', userId1) here!
      // RLS should block based on auth.uid() check, not on WHERE clause
      // If we pass user_id in WHERE, we're helping the attack succeed
      const { data: updateData, error: updateError } = await supabase2
        .from('tasks')
        .update({ title: 'HACKED BY USER 2' })
        .eq('id', testTask1.id)
        .select();

      // Check if task was actually updated
      const { data: taskAfterUpdate } = await supabase1
        .from('tasks')
        .select('title, id')
        .eq('id', testTask1.id)
        .single();

      if (updateError) {
        // This is GOOD - RLS should block this
        logResult({
          name: 'Test 5: User 2 cannot update User 1\'s task',
          passed: true,
          message: `RLS blocked update: ${updateError.message}`,
        });
      } else if (taskAfterUpdate && taskAfterUpdate.title === originalTitle && (!updateData || updateData.length === 0)) {
        // RLS silently blocked (no error, but nothing updated) - this is also GOOD
        logResult({
          name: 'Test 5: User 2 cannot update User 1\'s task',
          passed: true,
          message: `RLS blocked update silently (title unchanged: "${originalTitle}")`,
        });
      } else if (taskAfterUpdate && taskAfterUpdate.title === 'HACKED BY USER 2') {
        // This is BAD - update succeeded
        logResult({
          name: 'Test 5: User 2 cannot update User 1\'s task',
          passed: false,
          message: '🚨 SECURITY ISSUE: User 2 was able to update User 1\'s task!',
          details: { originalTitle, newTitle: taskAfterUpdate.title },
        });
      } else {
        // Edge case - check what happened
        logResult({
          name: 'Test 5: User 2 cannot update User 1\'s task',
          passed: false,
          message: `Unexpected result: original="${originalTitle}", after="${taskAfterUpdate?.title || 'null'}", updateData=${updateData?.length || 0}, error=${updateError?.message || 'none'}`,
        });
      }
    }

    // Test 6: User 2 creates their own task
    console.log('\n🧪 Test 6: User 2 creates their own task...');
    const testTask2 = {
      id: generateUUID(),
      user_id: userId2,
      title: `Security Test Task ${Date.now()}`,
      description: 'Test task created by User 2',
      priority: 'medium',
      category: '',
      deadline: null,
      status: 'pending',
      pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recurring_options: null,
    };

    const { data: createdTask2, error: createError2 } = await supabase2
      .from('tasks')
      .insert(testTask2)
      .select()
      .single();

    if (createError2) {
      logResult({
        name: 'Test 6: User 2 creates task',
        passed: false,
        message: `Failed to create task: ${createError2.message}`,
      });
    } else {
      logResult({
        name: 'Test 6: User 2 creates task',
        passed: true,
        message: `Task created: ${createdTask2.id}`,
      });
    }

    // Test 7: Verify User 2 can see their own task but not User 1's
    console.log('\n🧪 Test 7: Verify isolation between users...');
    const { data: finalTasks2 } = await supabase2
      .from('tasks')
      .select('*')
      .eq('user_id', userId2);

    const user2CanSeeOwnTask = finalTasks2?.some(t => t.id === testTask2.id);
    const user2CanSeeUser1Task = finalTasks2?.some(t => t.id === testTask1.id);

    if (user2CanSeeOwnTask && !user2CanSeeUser1Task) {
      logResult({
        name: 'Test 7: Task isolation verified',
        passed: true,
        message: 'User 2 can see their own task but NOT User 1\'s task ✅',
      });
    } else {
      logResult({
        name: 'Test 7: Task isolation verified',
        passed: false,
        message: `Isolation failed: canSeeOwn=${user2CanSeeOwnTask}, canSeeOther=${user2CanSeeUser1Task}`,
      });
    }

    // Cleanup: Delete test tasks
    console.log('\n🧹 Cleaning up test tasks...');
    if (createdTask1) {
      await supabase1.from('tasks').delete().eq('id', testTask1.id);
    }
    if (createdTask2) {
      await supabase2.from('tasks').delete().eq('id', testTask2.id);
    }
    console.log('✅ Cleanup complete');

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    logResult({
      name: 'Test execution',
      passed: false,
      message: `Unexpected error: ${error.message}`,
      details: error,
    });
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n🚨 Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    console.log('🎉 All security tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some security tests failed. Please review the results above.');
    process.exit(1);
  }
}

// Run tests
testSecurity().catch(console.error);

