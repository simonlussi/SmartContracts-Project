import React, { useState, useRef } from 'react';
import { ethers, BigNumber } from 'ethers';
import BUSDJson from '../contracts/BUSD.json';
import logo from '../assets/images/logo-white-small.png';
import Button from 'react-bootstrap/Button';
import Notifications, { NotificationsElement } from './components/Notifications';
import ChartComponent from './components/Chart';

type Address = `/^(0x)?[0-9a-fA-F]{40}$/`;

interface StaticWeb3Data {
  provider: ethers.providers.Web3Provider;
  signer: ethers.providers.JsonRpcSigner;
  contract: ethers.Contract;
  updateInterval: NodeJS.Timer;
  account: Address;
}

interface Web3Data {
  contractSymbol: string;
  contractDecimals: number;
  balance: string;
  contractOwner: Address;
  isContractOwner: boolean;
  contractBalance: string;
  contractTotalSupply: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Web3EventsData {
  allEvents: any[];
  userEvents: any[];
  userApprovalEvents: any[];
  approvalLastBlock: number;
  transferLastBlock: number;
  volumes: any[];
  transfers: any[];
}

export default function App() {
  // constants
  const contractAddress = '0x15A40d37e6f8A478DdE2cB18c83280D472B2fC35';
  const contractABI = BUSDJson.abi;
  const chainId = 80001;

  // variables
  const notificationsRef = useRef<NotificationsElement>(null);

  const [staticData, setStaticData] = useState<StaticWeb3Data>({
    provider: null,
    signer: null,
    contract: null,
    updateInterval: null,
    account: null,
  });
  const [data, setData] = useState<Web3Data>({
    contractSymbol: null,
    contractDecimals: null,
    balance: null,
    contractOwner: null,
    isContractOwner: null,
    contractBalance: null,
    contractTotalSupply: null,
  });
  const [events, setEvents] = useState<Web3EventsData>({
    allEvents: [],
    userEvents: [],
    userApprovalEvents: [],
    transferLastBlock: 0,
    approvalLastBlock: 0,
    volumes: [],
    transfers: [],
  });
  const [spenderAllowance, setSpenderAllowance] = useState<string>(null);

  // connect function
  const connectWalletHandler = async () => {
    if (window.ethereum && window.ethereum.isMetaMask) {
      const _provider = new ethers.providers.Web3Provider(window.ethereum, 'any');

      // checking the chain
      const _chainId = (await _provider.getNetwork()).chainId;
      if (_chainId === chainId) {
        getWalletAccount(_provider);
      } else {
        try {
          await _provider.send('wallet_switchEthereumChain', [{ chainId: `0x${chainId.toString(16)}` }]);
          const _chainId = (await _provider.getNetwork()).chainId;
          if (_chainId === chainId) {
            getWalletAccount(_provider);
          } else {
            notificationsRef?.current.setWarning('Error switching active chain to Mumbai!');
          }
        } catch (error) {
          try {
            await _provider.send('wallet_addEthereumChain', [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Mumbai',
                rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
                nativeCurrency: {
                  name: 'Polygon',
                  symbol: 'MATIC',
                  decimals: 18,
                },
              },
            ]);
            const _chainId = (await _provider.getNetwork()).chainId;
            if (_chainId === chainId) {
              getWalletAccount(_provider);
            } else {
              notificationsRef?.current.setWarning('Error switching active chain to Mumbai!');
            }
          } catch (err) {
            notificationsRef?.current.setWarning(`Error switching active chain to Mumbai: ${err.message}`);
          }
        }
      }
    } else {
      notificationsRef?.current.setWarning('Please install MetaMask browser extension to interact: https://metamask.io/download/');
    }
  };

  // Getting the wallet
  const getWalletAccount = (_provider: ethers.providers.Web3Provider) => {
    _provider
      .send('eth_requestAccounts', [])
      .then((result: string[]) => {
        accountChangedHandler(result[0]);
      })
      .catch((error: Error) => {
        notificationsRef?.current.setWarning(error.message);
      });
  };

  // update account, will cause component re-render
  const accountChangedHandler = (_account: string) => {
    notificationsRef?.current.setInfo(`Meta Mask wallet connected with account: ${_account}`);
    updateEthers(true);
  };

  // Detecting a network change, this can be triggerred by the connect function or due to user, if the network is not mumbai, sends a warning and trash all state vars
  const chainChangedHandler = (_chainId: string | BigNumber) => {
    if (BigNumber.from(_chainId).toNumber() !== chainId) {
      notificationsRef?.current.setWarning('Incorrect network, please re-connect wallet');
      if (staticData.updateInterval) {
        clearInterval(staticData.updateInterval);
      }
      if (staticData.contract) {
        staticData.contract.removeAllListeners();
      }
      setStaticData({
        provider: null,
        signer: null,
        contract: null,
        updateInterval: null,
        account: null,
      });
      setData({
        contractSymbol: null,
        contractDecimals: null,
        balance: null,
        contractOwner: null,
        isContractOwner: null,
        contractBalance: null,
        contractTotalSupply: null,
      });
      setEvents({
        allEvents: [],
        userEvents: [],
        userApprovalEvents: [],
        transferLastBlock: 0,
        approvalLastBlock: 0,
        volumes: [],
        transfers: [],
      });
    }
  };

  // listen for account changes (if no listener set (=> re-render))
  if (!window.ethereum._events.accountsChanged) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    window.ethereum.on('accountsChanged', (data: any) => {
      notificationsRef?.current.setInfo('Change of account detected!');
      accountChangedHandler(data);
    });
  }
  // listen for change of Network (if no listener set (=> re-render))
  if (!window.ethereum._events.chainChanged) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    window.ethereum.on('chainChanged', (data: any) => {
      notificationsRef?.current.setInfo('Change of network detected!');
      chainChangedHandler(data);
    });
  }

  const fetchBackend = async (path: string, params: { name: string; value: string }[], method = 'GET') => {
    const searchParams = new URLSearchParams();
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 15 * 1000);
    if (params.length > 0) {
      params.forEach((param) => {
        searchParams.append(param.name, param.value);
      });
    }
    try {
      const response = await fetch(`${process.env.BACKEND_URL}${path}?${searchParams}`, {
        signal: controller.signal,
        method,
      });
      if (!response.ok) {
        notificationsRef?.current.setWarning('The request to the backend was unsuccessfull');
        return null;
      }
      return await response.json();
    } catch (error) {
      notificationsRef?.current.setWarning('The request to the backend was unsuccessfull');
      return null;
    } finally {
      clearTimeout(timeout);
    }
  };

  const updateEthers = async (updateStatic = false) => {
    try {
      // Initialize wallet
      const _provider = new ethers.providers.Web3Provider(window.ethereum);
      const _signer = _provider.getSigner();

      // Get account
      const _accounts = await _provider.send('eth_requestAccounts', []);
      const _account = _accounts[0];

      // Get MATIC balance
      const _balance = ethers.utils.formatEther(await _provider.getBalance(_account));

      // Get BUSD contract
      const _contract = new ethers.Contract(contractAddress, contractABI, _signer);

      //Get BUSD data from backend
      const _contractData = await fetchBackend('/contract', [], 'GET');
      const _contractBalance = await fetchBackend('/balance', [{ name: 'owner', value: _account }]);
      if (updateStatic) {
        setStaticData({
          provider: _provider,
          signer: _signer,
          contract: _contract,
          updateInterval: null,
          account: _account,
        });
      }

      setData({
        contractSymbol: _contractData.symbol,
        contractDecimals: _contractData.decimals,
        balance: _balance,
        contractOwner: _contractData.owner,
        isContractOwner: _contractData.owner.toLowerCase() === _account.toLowerCase(),
        contractBalance: ethers.utils.formatUnits(_contractBalance, _contractData.decimals),
        contractTotalSupply: ethers.utils.formatUnits(_contractData.totalSupply, _contractData.decimals),
      });

      // Events
      const _transfer = (await fetchBackend('/transfer', [], 'GET')).map((x: any) => ({ ...x, type: 'Transfer' }));
      const _approval = (await fetchBackend('/approval', [], 'GET')).map((x: any) => ({ ...x, type: 'Approval' }));

      const _allEvents = [..._transfer, ..._approval];
      _allEvents.sort((a, b) => a.blockTimestamp - b.blockTimestamp);
      const _userEvents = _allEvents.filter(
        (event) =>
          (event.type === 'Approval' && (event.owner === _account.toLowerCase() || event.spender === _account.toLowerCase())) ||
          (event.type === 'Transfer' && (event.sender === _account.toLowerCase() || event.recipient === _account.toLowerCase())),
      );
      const _userApprovalEvents = _userEvents.filter(
        (event) => event.type === 'Approval' && event.owner.toLowerCase() === _account.toLowerCase(),
      );

      _transfer.sort((a: any, b: any) => a.blockTimestamp - b.blockTimestamp);
      const _dailyVolumes = _transfer.reduce((acc: any, curr: any) => {
        const date = new Intl.DateTimeFormat('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(
          new Date(curr.blockTimestamp * 1000),
        );
        if (!acc[date]) acc[date] = curr.amount;
        else acc[date] = BigNumber.from(acc[date]).add(BigNumber.from(curr.amount));
        return acc;
      }, {});

      const _dailyTransfers = _transfer.reduce((acc: any, curr: any) => {
        const date = new Intl.DateTimeFormat('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(
          new Date(curr.blockTimestamp * 1000),
        );
        if (!acc[date]) acc[date] = 1;
        else acc[date] = acc[date] + 1;
        return acc;
      }, {});

      let startTime = _transfer[0].blockTimestamp * 1000;
      const endTime = _transfer[_transfer.length - 1].blockTimestamp * 1000;

      while (startTime < endTime) {
        const date = new Intl.DateTimeFormat('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(startTime));
        if (!_dailyVolumes[date]) _dailyVolumes[date] = 0;
        if (!_dailyTransfers[date]) _dailyTransfers[date] = 0;
        startTime = startTime + 24 * 60 * 60 * 1000;
      }

      const _dailyVolumesChartData = Object.keys(_dailyVolumes)
        .reduce((acc: any, curr: any) => {
          acc.push({
            time: curr,
            value: parseFloat(ethers.utils.formatUnits(BigNumber.from(_dailyVolumes[curr]), _contractData.decimals)),
          });
          return acc;
        }, [])
        .sort((a: any, b: any) => (new Date(a.time) < new Date(b.time) ? -1 : 1));

      const _dailyTransfersChartData = Object.keys(_dailyTransfers)
        .reduce((acc: any, curr: any) => {
          acc.push({ time: curr, value: _dailyTransfers[curr] });
          return acc;
        }, [])
        .sort((a: any, b: any) => (new Date(a.time) < new Date(b.time) ? -1 : 1));

      setEvents({
        allEvents: [...events.allEvents, ..._allEvents],
        userEvents: [...events.userEvents, ..._userEvents],
        userApprovalEvents: [...events.userApprovalEvents, ..._userApprovalEvents],
        transferLastBlock: _transfer.length > 0 ? _transfer[_transfer.length - 1].blockNumber : events.transferLastBlock,
        approvalLastBlock: _approval.length > 0 ? _approval[_approval.length - 1].blockNumber : events.approvalLastBlock,
        volumes: _dailyVolumesChartData,
        transfers: _dailyTransfersChartData,
      });

      if (updateStatic) {
        if (staticData.updateInterval) {
          clearInterval(staticData.updateInterval);
        }
        const _updateInterval = setInterval(() => {
          notificationsRef?.current.setInfo('Refreshing data...');
          updateEthers();
        }, 60000);
        setStaticData({
          provider: _provider,
          signer: _signer,
          contract: _contract,
          updateInterval: _updateInterval,
          account: _account,
        });
      }
    } catch (error) {
      notificationsRef?.current.setWarning(error.message);
    }
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const allowanceHandler = async (event: any) => {
    event.preventDefault();
    if (ethers.utils.isAddress(event.target.spenderAddress.value) && ethers.utils.isAddress(event.target.ownerAddress.value)) {
      const _spenderAllowance = await fetchBackend(
        '/allowance',
        [
          { name: 'owner', value: event.target.ownerAddress.value },
          { name: 'spender', value: event.target.spenderAddress.value },
        ],
        'GET',
      );
      setSpenderAllowance(
        `Allowance of ${ethers.utils.formatUnits(_spenderAllowance, data.contractDecimals)} for spender ${
          event.target.spenderAddress.value
        }`,
      );
    } else {
      setSpenderAllowance(null);
      notificationsRef?.current.setWarning('Invalid address');
    }
    event.target.ownerAddress.value = null;
    event.target.spenderAddress.value = null;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const mintHandler = async (event: any) => {
    event.preventDefault();
    if (event.target.amount.value > 0) {
      try {
        const _mint = await staticData.contract.mint(
          BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(data.contractDecimals))),
        );
        notificationsRef?.current.setInfo(`Mint trx "${_mint.hash}" awaiting confirmation...`);
      } catch (error) {
        notificationsRef?.current.setWarning(error.message);
      }
    } else {
      notificationsRef?.current.setWarning('Invalid amount');
    }
    event.target.amount.value = null;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const burnHandler = async (event: any) => {
    event.preventDefault();
    if (event.target.amount.value > 0) {
      try {
        const _burn = await staticData.contract.burn(
          BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(data.contractDecimals))),
        );
        notificationsRef?.current.setInfo(`Burn trx "${_burn.hash}" awaiting confirmation...`);
      } catch (error) {
        notificationsRef?.current.setWarning(error.message);
      }
    } else {
      notificationsRef?.current.setWarning('Invalid amount');
    }
    event.target.amount.value = null;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const approveHandler = async (event: any) => {
    event.preventDefault();
    if (ethers.utils.isAddress(event.target.spenderAddress.value) && event.target.amount.value > 0) {
      try {
        const _approve = await staticData.contract.approve(
          event.target.spenderAddress.value,
          BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(data.contractDecimals))),
        );
        notificationsRef?.current.setInfo(`Approve trx "${_approve.hash}" awaiting confirmation...`);
      } catch (error) {
        notificationsRef?.current.setWarning(error.message);
      }
    } else {
      notificationsRef?.current.setWarning('Invalid address or amount');
    }
    event.target.spenderAddress.value = null;
    event.target.amount.value = null;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const transferHandler = async (event: any) => {
    event.preventDefault();
    if (ethers.utils.isAddress(event.target.recipientAddress.value) && event.target.amount.value > 0) {
      try {
        const _transfer = await staticData.contract.transfer(
          event.target.recipientAddress.value,
          BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(data.contractDecimals))),
        );
        notificationsRef?.current.setInfo(`Transfer trx "${_transfer.hash}" awaiting confirmation...`);
      } catch (error) {
        notificationsRef?.current.setWarning(error.message);
      }
    } else {
      notificationsRef?.current.setWarning('Invalid address or amount');
    }
    event.target.recipientAddress.value = null;
    event.target.amount.value = null;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const transferFromHandler = async (event: any) => {
    event.preventDefault();
    if (
      ethers.utils.isAddress(event.target.spenderAddress.value) &&
      ethers.utils.isAddress(event.target.recipientAddress.value) &&
      event.target.amount.value > 0
    ) {
      try {
        const _transferFrom = await staticData.contract.transferFrom(
          event.target.spenderAddress.value,
          event.target.recipientAddress.value,
          BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(data.contractDecimals))),
        );
        notificationsRef?.current.setInfo(`Transfer from trx "${_transferFrom.hash}" awaiting confirmation...`);
      } catch (error) {
        notificationsRef?.current.setWarning(error.message);
      }
    } else {
      notificationsRef?.current.setWarning('Invalid address or amount');
    }
    event.target.recipientAddress.value = null;
    event.target.spenderAddress.value = null;
    event.target.amount.value = null;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const transferOwnershipHandler = async (event: any) => {
    event.preventDefault();
    if (ethers.utils.isAddress(event.target.newOwnerAddress.value)) {
      try {
        const _transferOwnership = await staticData.contract.transferOwnership(event.target.newOwnerAddress.value);
        notificationsRef?.current.setInfo(`Transfer ownership trx "${_transferOwnership.hash}" awaiting confirmation...`);
      } catch (error) {
        notificationsRef?.current.setWarning(error.message);
      }
    } else {
      notificationsRef?.current.setWarning('Invalid address');
    }
    event.target.newOwnerAddress.value = null;
  };

  const renounceOwnershipHandler = async () => {
    try {
      const _renounceOwnership = await staticData.contract.renounceOwnership();
      notificationsRef?.current.setInfo(`Renounce ownership trx "${_renounceOwnership.hash}" awaiting confirmation...`);
    } catch (error) {
      notificationsRef?.current.setWarning(error.message);
    }
  };

  const resetDatabaseHandler = async () => {
    await fetchBackend('/all', [], 'DELETE');
    notificationsRef?.current.setSuccess('The database has been deleted');
  };

  return (
    <>
      <div className='logo fixed top-2 flex flex-row content-center'>
        <img src={logo} className='mr-2 h-14' />
        <div className='text-primary h-full flex-1 self-center text-4xl'>SmartContracts Project</div>
      </div>
      <Notifications ref={notificationsRef} />
      <div className='fixed bottom-0 top-24 w-screen overflow-scroll text-center'>
        <div className='text-center'>
          {staticData.updateInterval ? (
            <>
              <Button
                variant='outline-primary'
                size='lg'
                onClick={() => {
                  notificationsRef?.current.setInfo('Refreshing...');
                  updateEthers();
                }}
              >
                Refresh
              </Button>
              <br />
              <Button
                variant='outline-danger'
                size='lg'
                onClick={() => {
                  notificationsRef?.current.setWarning('Deleting database...');
                  resetDatabaseHandler();
                }}
              >
                Delete backend database
              </Button>
            </>
          ) : (
            <Button variant='outline-primary' size='lg' className='mt-4' onClick={connectWalletHandler}>
              Connect Meta Mask Wallet
            </Button>
          )}
        </div>
        <div className='grid grid-cols-2 text-left'>
          <div className='mr-4 mt-4 text-right text-white'>Account Address :</div>
          <div className='mt-4 text-white'>{staticData.account}</div>
          {staticData.account && (
            <>
              <div className='mr-4 mt-4 text-right text-white'>Wallet Balance :</div>
              <div className='mt-4 w-1/2 text-white'>
                MATIC {Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(data.balance))}
              </div>

              <div className='mr-4 mt-4 text-right text-white'>Contract Balance :</div>
              <div className='mt-4 w-1/2 text-white'>
                {data.contractSymbol}{' '}
                {Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                  parseFloat(data.contractBalance),
                )}
              </div>

              <div className='mr-4 mt-4 text-right text-white'>Contract Total Supply :</div>
              <div className='mt-4 w-1/2 text-white'>
                {data.contractSymbol}{' '}
                {Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                  parseFloat(data.contractTotalSupply),
                )}
              </div>

              {staticData.updateInterval && (
                <>
                  <div className='text-md mr-4 mt-4 text-right text-white'>Check Spender allowance:</div>
                  <div className='mt-4 w-1/2 text-white'>
                    <form onSubmit={allowanceHandler} className='flex flex-col'>
                      <input id='ownerAddress' type='text' placeholder='Owner address' className='border border-white bg-black' />
                      <input id='spenderAddress' type='text' placeholder='Spender address' className='border border-white bg-black' />
                      <Button type='submit' variant='outline-primary' size='sm'>
                        {' '}
                        Check spender allowance
                      </Button>
                    </form>
                    {spenderAllowance && <div>{spenderAllowance}</div>}
                  </div>

                  <div className='text-md mr-4 mt-4 text-right text-white'>Mint Token:</div>
                  <div className='mt-4 w-1/2 text-white'>
                    <form onSubmit={mintHandler} className='flex flex-col'>
                      <input id='amount' type='text' placeholder='Amount' className='border border-white bg-black' />
                      <Button type='submit' variant='outline-primary' size='sm'>
                        {' '}
                        Mint
                      </Button>
                    </form>
                  </div>

                  <div className='text-md mr-4 mt-4 text-right text-white'>Burn Token:</div>
                  <div className='mt-4 w-1/2 text-white'>
                    <form onSubmit={burnHandler} className='flex flex-col'>
                      <input id='amount' type='text' placeholder='Amount' className='border border-white bg-black' />
                      <Button type='submit' variant='outline-primary' size='sm'>
                        {' '}
                        Burn
                      </Button>
                    </form>
                  </div>

                  <div className='text-md mr-4 mt-4 text-right text-white'>Approve Spender:</div>
                  <div className='mt-4 w-1/2 text-white'>
                    <form onSubmit={approveHandler} className='flex flex-col'>
                      <input id='spenderAddress' type='text' placeholder='Spender address' className='border border-white bg-black' />
                      <input id='amount' type='text' placeholder='Amount' className='border border-white bg-black' />
                      <Button type='submit' variant='outline-primary' size='sm'>
                        {' '}
                        Approve Spender for Amount
                      </Button>
                    </form>
                  </div>

                  <div className='text-md mr-4 mt-4 text-right text-white'>Transfer Token:</div>
                  <div className='mt-4 w-1/2 text-white'>
                    <form onSubmit={transferHandler} className='flex flex-col'>
                      <input id='recipientAddress' type='text' placeholder='Recipient address' className='border border-white bg-black' />
                      <input id='amount' type='text' placeholder='Amount' className='border border-white bg-black' />
                      <Button type='submit' variant='outline-primary' size='sm'>
                        {' '}
                        Transfer Amount
                      </Button>
                    </form>
                  </div>

                  <div className='text-md mr-4 mt-4 text-right text-white'>Transfer Token From:</div>
                  <div className='mt-4 w-1/2 text-white'>
                    <form onSubmit={transferFromHandler} className='flex flex-col'>
                      <input id='spenderAddress' type='text' placeholder='Spender address' className='border border-white bg-black' />
                      <input id='recipientAddress' type='text' placeholder='Recipient address' className='border border-white bg-black' />
                      <input id='amount' type='text' placeholder='Amount' className='border border-white bg-black' />
                      <Button type='submit' variant='outline-primary' size='sm'>
                        {' '}
                        Transfer amount from Spender
                      </Button>
                    </form>
                  </div>

                  {data.isContractOwner ? (
                    <>
                      <div className='text-md mr-4 mt-4 text-right text-white'>Transfer Contract Ownership:</div>
                      <div className='mt-4 w-1/2 text-white'>
                        <form onSubmit={transferOwnershipHandler} className='flex flex-col'>
                          <input
                            id='newOwnerAddress'
                            type='text'
                            placeholder='New owner address'
                            className='border border-white bg-black'
                          />
                          <Button type='submit' variant='outline-primary' size='sm'>
                            {' '}
                            Transfer Contract Ownership
                          </Button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className='text-md mr-4 mt-4 text-right text-white line-through'>Transfer Contract Ownership:</div>
                      <div className='mt-4 w-1/2 text-white'>
                        This function is only available to the contract owner ({data.contractOwner})
                      </div>
                    </>
                  )}

                  {data.isContractOwner ? (
                    <>
                      <div className='text-md mr-4 mt-4 text-right text-white'>Renounce Contract Ownership:</div>
                      <div className='mt-4 w-1/2 text-white'>
                        <Button onClick={renounceOwnershipHandler} variant='outline-primary' size='sm'>
                          {' '}
                          Renounce Contract Ownership
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className='text-md mr-4 mt-4 text-right text-white line-through'>Renounce Contract Ownership:</div>
                      <div className='mt-4 w-1/2 text-white'>
                        This function is only available to the contract owner ({data.contractOwner})
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
        {events.userApprovalEvents.length > 0 && (
          <>
            <div className='grid grid-cols-2'>
              <div></div>
              <div className='text-primary mt-8 text-left text-xl'>All allowances for current Account</div>
            </div>
            {Object.entries(
              events.userApprovalEvents.reduce((accumulator, event) => {
                if (!accumulator[event.spender]) {
                  accumulator[event.spender] = BigNumber.from(0);
                }
                accumulator[event.spender] = accumulator[event.spender].add(event.amount);
                return accumulator;
              }, {}),
            )
              .filter((allowance: [string, BigNumber]) => allowance[1].gt(BigNumber.from(0)))
              .map((allowance: [string, number]) => (
                <div key={allowance[0]} className='grid grid-cols-2'>
                  <div className='mr-4 mt-4 text-right text-white'>
                    Amount: {ethers.utils.formatUnits(allowance[1], data.contractDecimals)}
                  </div>
                  <div className='mt-4 text-left text-white'>Spender : {allowance[0]}</div>
                </div>
              ))}
          </>
        )}
        {events.userEvents.length > 0 && (
          <>
            <div className='grid grid-cols-2'>
              <div></div>
              <div className='text-primary mt-8 text-left text-xl'>Last 10 Events for the current Account</div>
            </div>
            {events.userEvents.slice(-Math.min(10, events.userEvents.length)).map((event) => (
              <div key={event._id} className='grid grid-cols-2'>
                <div className='mr-4 mt-4 text-right text-white'>Event : {event.type}</div>
                <div className='mt-4 text-left text-white'>
                  {event.type === 'Transfer' ? 'Sender : ' + event.sender : 'Owner : ' + event.owner}
                </div>
                <div className='mr-4 text-right text-white'>Amount: {ethers.utils.formatUnits(event.amount, data.contractDecimals)}</div>
                <div className='text-left text-white'>
                  {event.type === 'Transfer' ? 'Recipient : ' + event.recipient : 'Spender : ' + event.spender}
                </div>
              </div>
            ))}
          </>
        )}
        {events.allEvents.length > 0 && (
          <>
            <div className='grid grid-cols-2'>
              <div></div>
              <div className='text-primary mt-8 text-left text-xl'>Last 10 Events</div>
            </div>
            {events.allEvents.slice(-Math.min(10, events.allEvents.length)).map((event) => (
              <div key={event._id} className='grid grid-cols-2'>
                <div className='mr-4 mt-4 text-right text-white'>Event : {event.type}</div>
                <div className='mt-4 text-left text-white'>
                  {event.type === 'Transfer' ? 'Sender : ' + event.sender : 'Owner : ' + event.owner}
                </div>
                <div className='mr-4 text-right text-white'>Amount: {ethers.utils.formatUnits(event.amount, data.contractDecimals)}</div>
                <div className='text-left text-white'>
                  {event.type === 'Transfer' ? 'Recipient : ' + event.recipient : 'Spender : ' + event.spender}
                </div>
              </div>
            ))}
            <div className='grid grid-cols-2'>
              <div></div>
              <div className='text-primary mt-8 text-left text-xl'>Daily Volumes and number of Transfers</div>
            </div>
            <div className='flex justify-center'>
              <ChartComponent volumes={events.volumes} transfers={events.transfers} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
