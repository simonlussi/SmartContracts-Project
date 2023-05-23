import mongoose, { SimpleMethods } from '../utils/database';
import express from 'express';
import { BigNumber } from 'ethers';
import { CONTRACT_TRANSACTION_HASH, MAX_BLOCKS, MAX_QUERIES_PER_SECOND, MAX_QUERIES_PER_MINUTE, ZERO_ADDRESS } from '../utils/constants';
import { sleep, provider, contract } from '../utils/helpers';
import { updateBalance } from './balance';
import { updateTotalSupply } from './contract';

// Data Model
interface Data {
  sender: typeof mongoose.Schema.Types.EtherAddress;
  recipient: typeof mongoose.Schema.Types.EtherAddress;
  amount: BigNumber;
  blockNumber: number;
  blockTimestamp: number;
}

type DataMethods = SimpleMethods;
type DataModel = mongoose.Model<Data, {}, DataMethods>; // eslint-disable-line @typescript-eslint/ban-types

const schema = new mongoose.Schema<Data, DataModel, DataMethods>({
  sender: { type: mongoose.Schema.Types.EtherAddress, required: true },
  recipient: { type: mongoose.Schema.Types.EtherAddress, required: true },
  amount: { type: mongoose.Schema.Types.EtherBigNumber, required: true },
  blockNumber: { type: Number, required: true },
  blockTimestamp: { type: Number, required: true },
});

const model = mongoose.model<Data, DataModel>('transfer', schema);

// Functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getData(): Promise<Array<mongoose.Document<unknown, any, Data> & Data & { _id: mongoose.Types.ObjectId } & DataMethods>> {
  const data = await model.find({}).sort('blockNumber');
  return data;
}

// Fetches all the Transfer since the last block found and updates the database (Transfer, Balance, Contract.TotalSupply)
async function updateData(): Promise<void> {
  console.info('Updating Transfer Events...');
  const data = await getData();
  const filter = contract.filters.Transfer();
  let initialBlockNumber =
    data && data.length > 0
      ? data[data.length - 1].blockNumber + 1
      : (await provider.getBlock((await provider.getTransaction(CONTRACT_TRANSACTION_HASH)).blockNumber as number)).number;
  const currentBlockNumber = (await provider.getBlock('latest')).number;
  let queriesResults: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  // Initiate
  let iterate = true;
  let numberOfQueriesPerSecond = 0;
  let numberOfQueriesPerMinute = 0;
  let startMinute = new Date().getTime();
  while (iterate) {
    try {
      const start = new Date().getTime();
      const queries = [] as Promise<any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
      const firstBlockNumber = initialBlockNumber;
      for (
        let i = initialBlockNumber;
        i <= currentBlockNumber && numberOfQueriesPerMinute < MAX_QUERIES_PER_MINUTE && numberOfQueriesPerSecond < MAX_QUERIES_PER_SECOND;
        i += MAX_BLOCKS
      ) {
        const startBlockNumber = i;
        const endBlockNumber = Math.min(currentBlockNumber, i + MAX_BLOCKS - 1);
        queries.push(
          contract.queryFilter(filter, startBlockNumber, endBlockNumber).catch((error) => {
            throw error;
          }),
        );
        numberOfQueriesPerSecond++;
        numberOfQueriesPerMinute++;
        initialBlockNumber = endBlockNumber + 1;
      }
      const lastBlockNumber = initialBlockNumber - 1;

      if (queries.length > 0) {
        console.info(`Fetching Transfer Events from block ${firstBlockNumber} to block ${lastBlockNumber}`);
        queriesResults = [...queriesResults, ...(await Promise.all(queries))];
        queriesResults = queriesResults.flat(1);
      }

      if (initialBlockNumber >= currentBlockNumber) {
        iterate = false;
      }
      while (new Date().getTime() < start + 1000) {
        await sleep(1000);
      }
      numberOfQueriesPerSecond = 0;
      if (numberOfQueriesPerMinute >= MAX_QUERIES_PER_MINUTE) {
        while (new Date().getTime() < startMinute + 1000 * 60) {
          await sleep(5000);
        }
        numberOfQueriesPerMinute = 0;
        startMinute = new Date().getTime();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log(`An error occured, waiting 30 seconds before resuming. Error: ${error.message}`);
      await sleep(30000);
    }
  }
  console.info(`Fetched ${queriesResults.length} Transfer Events`);
  console.info('Fetching block information for all Transfer Events');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = async (i: number, queryResult: any): Promise<void> => {
    // Saves The Transfer Event while querying for block Timestamp
    return new model({
      sender: queryResult.args[0].toLowerCase(),
      recipient: queryResult.args[1].toLowerCase(),
      amount: queryResult.args[2],
      blockNumber: queryResult.blockNumber,
      blockTimestamp: (await queryResult.getBlock()).timestamp,
    })
      .save()
      .then();
  };
  // Goes through all the results and save the event in the database
  // Initiate
  iterate = true;
  numberOfQueriesPerSecond = 0;
  numberOfQueriesPerMinute = 0;
  startMinute = new Date().getTime();
  let dbQueriesResults: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  let iterator = 0;
  while (iterate) {
    try {
      const start = new Date().getTime();
      const dbQueries = [] as Promise<any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
      const startIterator = iterator;
      for (
        let i = iterator;
        i < queriesResults.length && numberOfQueriesPerMinute < MAX_QUERIES_PER_MINUTE && numberOfQueriesPerSecond < MAX_QUERIES_PER_SECOND;
        i += 1
      ) {
        dbQueries.push(
          dbQuery(i, queriesResults[i]).catch((error) => {
            throw error;
          }),
        );
        numberOfQueriesPerSecond++;
        numberOfQueriesPerMinute++;
        iterator = i;
      }

      if (dbQueries.length > 0) {
        console.info(`Fetching Block Information for Transfer Events ${startIterator + 1} to ${iterator + 1}`);
        dbQueriesResults = [...dbQueriesResults, ...(await Promise.all(dbQueries))];
        dbQueriesResults = dbQueriesResults.flat(1);
      }
      if (iterator >= queriesResults.length - 1) {
        iterate = false;
      }
      while (new Date().getTime() < start + 1000) {
        await sleep(1000);
      }
      numberOfQueriesPerSecond = 0;
      if (numberOfQueriesPerMinute >= MAX_QUERIES_PER_MINUTE) {
        while (new Date().getTime() < startMinute + 1000 * 60) {
          await sleep(5000);
        }
        numberOfQueriesPerMinute = 0;
        startMinute = new Date().getTime();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log(`An error occured, waiting 30 seconds before resuming. Error: ${error.message}`);
      await sleep(30000);
    }
  }
  console.info('Updated all Transfer Events!');

  console.info('Updating Balances and Total Supply...');
  // Initiate a dictionnary with all accounts with Transfer and set the amount to zéro
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zeroBalances = queriesResults.reduce((acc: any, curr: any) => {
    acc[curr.args[0].toLowerCase()] = BigNumber.from(0);
    acc[curr.args[1].toLowerCase()] = BigNumber.from(0);
    return acc;
  }, {});

  // Calculates the balance deltas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deltaBalances = queriesResults.reduce((acc: any, curr: any) => {
    acc[curr.args[0].toLowerCase()] = acc[curr.args[0].toLowerCase()].sub(curr.args[2]);
    acc[curr.args[1].toLowerCase()] = acc[curr.args[1].toLowerCase()].add(curr.args[2]);
    return acc;
  }, zeroBalances);

  // updates the balances and totalSupply
  const accounts = Object.keys(deltaBalances).filter((x) => x !== ZERO_ADDRESS);
  const accountQueries = [] as Promise<any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (let i = 0; i < accounts.length; i++) {
    accountQueries.push(updateBalance(accounts[i] as unknown as typeof mongoose.Schema.Types.EtherAddress, deltaBalances[accounts[i]]));
  }
  if (Object.keys(deltaBalances).includes(ZERO_ADDRESS)) {
    accountQueries.push(updateTotalSupply(deltaBalances[ZERO_ADDRESS].mul(BigNumber.from(-1))));
  }
  await Promise.all(accountQueries);
  console.info('Updated all Balances and Total Supply!');
}

async function deleteData(): Promise<void> {
  await model.deleteMany();
}

// API Routes
const router = express.Router();

router.get('/', async (req: express.Request, res: express.Response): Promise<void | express.Response> => {
  res.status(200).json(await getData());
});

export { Data, getData, updateData, deleteData, router };
