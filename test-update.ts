import { db } from './src/lib/db';
import { supabase } from './src/lib/supabase';

async function test() {
  const res = await supabase.from('settings').update({ active_payment_gateway: 'razorpay' }).eq('id', 'global-settings').select();
  console.log(res);
}
test();
