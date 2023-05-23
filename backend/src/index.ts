import express from 'express';
import cors from 'cors';
import mongoose from './utils/database';
import { sleep } from './utils/helpers';
import { UPDATE_INTERVALL_MINUTES } from './utils/constants';
import { router as allowanceRouter, deleteData as deleteAllowanceData } from './modules/allowance';
import { router as approvalRouter, deleteData as deleteApprovalData, updateData as updateApprovalData } from './modules/approval';
import { router as balanceRouter, deleteData as deleteBalanceData } from './modules/balance';
import { router as contractRouter, deleteData as deleteContractData, updateData as updateContractData } from './modules/contract';
import { router as transferRouter, deleteData as deleteTransferData, updateData as updateTransferData } from './modules/transfer';

let dataUpdateTimeout: NodeJS.Timeout;

const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
};

// launch API and set up routes
const app: express.Application = express();
app.use(cors(corsOptions));
app.use('/allowance', allowanceRouter);
app.use('/approval', approvalRouter);
app.use('/balance', balanceRouter);
app.use('/contract', contractRouter);
app.use('/transfer', transferRouter);
app.delete('/all', async (req: express.Request, res: express.Response): Promise<void | express.Response> => {
  await deleteAllowanceData();
  await deleteApprovalData();
  await deleteBalanceData();
  await deleteContractData();
  await deleteTransferData();
  res.status(200).json('OK');
  // Clear the timeout for the next update and start the update immediately
  if (dataUpdateTimeout) {
    clearTimeout(dataUpdateTimeout);
  }
  updateData();
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});

// Function to update Data
const updateData = async () => {
  console.info('Updating Data...');
  // 1- Update the contract static data (name, symbol, owner, decimals)
  await updateContractData();
  // 2- Update the transfer events (which updates the balances and the totalSupply)
  await updateTransferData();
  // 2- Update the approval events (which updates the allowances)
  await updateApprovalData();
  console.info('Data updated!');
  // Set the timeout for the next update
  console.log(`Next data update in ${UPDATE_INTERVALL_MINUTES} minutes`);
  dataUpdateTimeout = setTimeout(updateData, UPDATE_INTERVALL_MINUTES * 60 * 1000);
};

// Main function
const main = async () => {
  // Wait for the database
  while (mongoose.connection.readyState !== 1) {
    console.info('Database connection not ready, wait 5 seconds...');
    await sleep(5000);
  }

  // Updates database upon backend start
  await updateData();
  console.log(`Next data update in ${UPDATE_INTERVALL_MINUTES} minutes`);

  // Launch data update immediately
  updateData();
};

main();
