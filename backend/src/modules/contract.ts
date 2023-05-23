import express from 'express';
import { BigNumber } from 'ethers';
import mongoose, { EtherMethods, addAndSave, substractAndSave } from '../utils/database';
import { CONTRACT_NAME, CONTRACT_SYMBOL, CONTRACT_DECIMALS, ZERO_ADDRESS } from '../utils/constants';
import { contract } from '../utils/helpers';

// Data Model
interface Data {
  name: string;
  symbol: string;
  owner: typeof mongoose.Schema.Types.EtherAddress;
  decimals: number;
  totalSupply: BigNumber;
}

type DataMethods = EtherMethods;
type DataModel = mongoose.Model<Data, {}, DataMethods>; // eslint-disable-line @typescript-eslint/ban-types

const schema = new mongoose.Schema<Data, DataModel, DataMethods>(
  {
    name: { type: String, required: true, default: CONTRACT_NAME },
    symbol: { type: String, required: true, default: CONTRACT_SYMBOL },
    owner: { type: mongoose.Schema.Types.EtherAddress, required: true },
    decimals: { type: Number, required: true, default: CONTRACT_DECIMALS },
    totalSupply: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { capped: { max: 1 } },
);

schema.methods.addAndSave = addAndSave;
schema.methods.substractAndSave = substractAndSave;

const model = mongoose.model<Data, DataModel>('contract', schema);

// Functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getData(): Promise<mongoose.Document<unknown, any, Data> & Data & { _id: mongoose.Types.ObjectId } & DataMethods> {
  let data = await model.findOne();
  if (!data) {
    data = await new model({
      name: CONTRACT_NAME,
      symbol: CONTRACT_SYMBOL,
      owner: ZERO_ADDRESS,
      decimals: CONTRACT_DECIMALS,
      totalSupply: BigNumber.from(0),
    }).save();
  }
  return data;
}

// Does not update totalSupply as we want to update it through events
async function updateData(): Promise<void> {
  console.info('Updating Contract data...');
  const data = await getData();
  const name = await contract.name();
  const symbol = await contract.symbol();
  const owner = await contract.owner();
  const decimals = await contract.decimals();
  data.name = name;
  data.symbol = symbol;
  data.owner = owner;
  data.decimals = decimals;
  await data.save();
}

// Updates the total supply based on a Transfer Event
async function updateTotalSupply(deltaAmount: BigNumber): Promise<void> {
  const data = await getData();
  await data.addAndSave(deltaAmount, 'totalSupply');
}

async function deleteData(): Promise<void> {
  await model.deleteMany();
}

// API Routes
const router = express.Router();

router.get('/', async (req: express.Request, res: express.Response): Promise<void | express.Response> => {
  res.status(200).json(await getData());
});

export { getData, updateData, updateTotalSupply, deleteData, router };
