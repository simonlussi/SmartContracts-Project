import mongoose, { AnyObject } from 'mongoose';
import { BigNumber } from 'ethers';

const mongoURI = 'mongodb://smart-contracts-database/smart-contracts';
mongoose.set('autoIndex', true);
mongoose.Promise = Promise;

if (mongoose.connection.readyState !== 1) {
  console.info('Connecting to MongoDB');
  mongoose.connect(mongoURI);

  mongoose.connection.on('error', function mongoConnectionError(err) {
    if (err.message.code === 'ETIMEDOUT') {
      console.warn('Mongo connection timeout!', err);
      setTimeout(() => {
        mongoose.createConnection(mongoURI);
      }, 1000);
      return;
    }
    console.error('Could not connect to MongoDB!');
    return console.error(err);
  });

  mongoose.connection.once('open', function mongoAfterOpen() {
    console.info('Mongo DB connected.');
  });
} else {
  console.info('Mongo already connected.');
}

class EtherAddress extends mongoose.SchemaType {
  constructor(key: string, options: AnyObject) {
    super(key, options, 'EtherAddress');
  }
  cast(val: string): string {
    if (!/^(0x)?[0-9a-fA-F]{40}$/.test(val)) {
      throw new Error('EtherAddress: ' + val + ' is not a valid address');
    }
    return val.toLowerCase();
  }
}

class EtherBigNumber extends mongoose.SchemaType {
  constructor(key: string, options: AnyObject) {
    super(key, options, 'EtherBigNumber');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cast(val: any) {
    if (!val._isBigNumber) {
      throw new Error('EtherBigNumber: ' + val + ' is not a BigNumber');
    }
    return val;
  }
}

export interface EtherMethods {
  addAndSave(v: BigNumber, field: string): Promise<void>;
  substractAndSave(v: BigNumber, field: string): Promise<void>;
  save(): void;
}

export interface SimpleMethods {
  save(): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const addAndSave = async function (this: any, v: BigNumber, field: string) {
  this[field] = BigNumber.from(this[field]).add(BigNumber.from(v));
  return this.save();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const substractAndSave = async function (this: any, v: BigNumber, field: string) {
  this[field] = BigNumber.from(this[field]).sub(BigNumber.from(v));
  return this.save();
};

mongoose.Schema.Types.EtherAddress = EtherAddress;
mongoose.Schema.Types.EtherBigNumber = EtherBigNumber;

export default mongoose;
