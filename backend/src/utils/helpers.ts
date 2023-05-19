import { ethers } from 'ethers';
import { RPC_PROVIDER, CONTRACT_ADDRESS, CONTRACT_ABI } from './constants';

const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDER);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

export {
  sleep,
  provider,
  contract,
};