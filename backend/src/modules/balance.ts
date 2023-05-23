import mongoose, { EtherMethods, addAndSave, substractAndSave } from '../utils/database';
import express from 'express';
import { BigNumber } from 'ethers';

// Data Model
interface Data {
  owner: typeof mongoose.Schema.Types.EtherAddress;
  amount: BigNumber;
}

type DataMethods = EtherMethods;
type DataModel = mongoose.Model<Data, {}, DataMethods>; // eslint-disable-line @typescript-eslint/ban-types

const schema = new mongoose.Schema<Data, DataModel, DataMethods>({
  owner: { type: mongoose.Schema.Types.EtherAddress, required: true, unique: true },
  amount: { type: mongoose.Schema.Types.EtherBigNumber, required: true, default: BigNumber.from(0) },
});

schema.methods.addAndSave = addAndSave;
schema.methods.substractAndSave = substractAndSave;

const model = mongoose.model<Data, DataModel>('balance', schema);

// Functions
async function getData(
  owner: typeof mongoose.Schema.Types.EtherAddress,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<(mongoose.Document<unknown, any, Data> & Data & { _id: mongoose.Types.ObjectId } & DataMethods) | null> {
  const data = await model.findOne({
    owner,
  });
  return data;
}

async function updateBalance(account: typeof mongoose.Schema.Types.EtherAddress, deltaAmount: BigNumber): Promise<void> {
  // If sender is not zero address it is a normal transfer (otherwise it is a mint)
  let balance = await model.findOne({
    owner: account,
  });
  if (!balance) {
    balance = await new model({
      owner: account,
      amount: deltaAmount,
    }).save();
  } else {
    await balance.addAndSave(deltaAmount, 'amount');
  }
}

async function deleteData(): Promise<void> {
  await model.deleteMany();
}

// API Routes
const router = express.Router();

router.get('/', async (req: express.Request, res: express.Response): Promise<void | express.Response> => {
  const owner = (req.query['owner']?.toString() || '').toLowerCase();
  const balance = await getData(owner as unknown as typeof mongoose.Schema.Types.EtherAddress);
  if (!balance) res.status(200).json(BigNumber.from(0));
  else res.status(200).json(balance.amount);
});

export { getData, updateBalance, deleteData, router };
