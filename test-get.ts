import { adminGetSettingsAction } from './src/app/actions';
import { db } from './src/lib/db';

async function test() {
  console.log(await db.getSettings());
}
test();
