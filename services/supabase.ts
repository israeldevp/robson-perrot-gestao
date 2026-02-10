
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bmwklyiwlyoeoevlfewv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtd2tseWl3bHlvZW9ldmxmZXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk5ODksImV4cCI6MjA4NjI5NTk4OX0.rteqNjxg9tkRPIcKTuMAimVJXeHmAPjIuXduYa2WNOc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
