import mongoose, { SimpleMethods } from '../utils/database';
import express from 'express';
import { BigNumber } from 'ethers';

// Data Model
export interface Data {
  owner: typeof mongoose.Schema.Types.EtherAddress;
  spender: typeof mongoose.Schema.Types.EtherAddress;
  amount: BigNumber;
}

type DataMethods = SimpleMethods;
type DataModel = mongoose.Model<Data, {}, DataMethods>; // eslint-disable-line @typescript-eslint/ban-types

const schema = new mongoose.Schema<Data, DataModel, DataMethods>({
  owner: { type: mongoose.Schema.Types.EtherAddress, required: true },
  spender: { type: mongoose.Schema.Types.EtherAddress, required: true },
  amount: { type: mongoose.Schema.Types.EtherBigNumber, required: true },
});

const model = mongoose.model<Data, DataModel>('allowance', schema);

// Functions
async function getData(
  owner: typeof mongoose.Schema.Types.EtherAddress,
  spender: typeof mongoose.Schema.Types.EtherAddress,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<(mongoose.Document<unknown, any, Data> & Data & { _id: mongoose.Types.ObjectId } & DataMethods) | null> {
  const data = await model.findOne({
    owner,
    spender,
  });
  return data;
}

async function updateAllowance(
  owner: typeof mongoose.Schema.Types.EtherAddress,
  spender: typeof mongoose.Schema.Types.EtherAddress,
  amount: BigNumber,
): Promise<void> {
  await model.findOneAndUpdate(
    {
      owner: owner,
      spender: spender,
    },
    {
      $set: {
        owner: owner,
        spender: spender,
        amount: amount,
      },
    },
    {
      upsert: true,
    },
  );
}

async function deleteData(): Promise<void> {
  await model.deleteMany();
}

const router = express.Router();

router.get('/', async (req: express.Request, res: express.Response): Promise<void | express.Response> => {
  const owner = (req.query['owner']?.toString() || '').toLowerCase();
  const spender = (req.query['spender']?.toString() || '').toLowerCase();
  const allowance = await getData(
    owner as unknown as typeof mongoose.Schema.Types.EtherAddress,
    spender as unknown as typeof mongoose.Schema.Types.EtherAddress,
  );
  if (!allowance) res.status(200).json(BigNumber.from(0));
  else res.status(200).json(allowance.amount);
});

export { getData, updateAllowance, deleteData, router };
