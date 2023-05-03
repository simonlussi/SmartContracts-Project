import React, { useState, useRef } from 'react';
import { ethers, BigNumber } from 'ethers';
import BUSDJson from '../contracts/BUSD.json';
import logo from '../assets/images/logo-white-small.png';
import Button from 'react-bootstrap/Button';
import Notifications, { NotificationsElement } from './components/Notifications';

type Address = `/^(0x)?[0-9a-fA-F]{40}$/`;

interface StaticWeb3Data {
  provider: ethers.providers.Web3Provider;
  signer: ethers.providers.JsonRpcSigner;
  contract: ethers.Contract;
  contractSymbol: string;
  contractDecimals: number;
  updateInterval: NodeJS.Timer;
  account: Address;
}

interface Web3Data {
  balance: string;
  contractOwner: Address;
  isContractOwner: boolean;
  contractBalance: string;
  contractTotalSupply: string;
}

interface Web3EventsData {
  transfer: any[];
  approval: any[];
}

export default function App() {
  // constants
  const contractAddress = '0x15A40d37e6f8A478DdE2cB18c83280D472B2fC35';
  const contractTransactionHash = '0x42b975256af426d6dc691d37dd95821d3120f4db38e52239f40627c56761f7e3';
  const contractABI = BUSDJson.abi;
  const chainId = 80001;

  // variables
  const notificationsRef = useRef<NotificationsElement>(null);

  const [staticData, setStaticData] = useState<StaticWeb3Data>({
    provider: null,
    signer: null,
    contract: null,
    contractSymbol: null,
    contractDecimals: null,
    updateInterval: null,
    account: null,
  });
  const [data, setData] = useState<Web3Data>({
    balance: null,
    contractOwner: null,
    isContractOwner: null,
    contractBalance: null,
    contractTotalSupply: null,
  });
  const [events, setEvents] = useState<Web3EventsData>({
    approval: [],
    transfer: []
  })
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
            notificationsRef.current.setWarning('Error switching active chain to Mumbai!');
          }
        } catch (error) {
          try {
            await _provider.send('wallet_addEthereumChain', [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: 'Mumbai',
                rpcUrls: [`https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`],
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
              notificationsRef.current.setWarning('Error switching active chain to Mumbai!');
            }
          } catch (err) {
            notificationsRef.current.setWarning(`Error switching active chain to Mumbai: ${err.message}`);
          }
        }
      }
    } else {
      notificationsRef.current.setWarning('Please install MetaMask browser extension to interact: https://metamask.io/download/');
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
        notificationsRef.current.setWarning(error.message);
      });
  };

  // update account, will cause component re-render
  const accountChangedHandler = (_account: string) => {
    notificationsRef.current.setInfo(`Meta Mask wallet connected with account: ${_account}`);
    updateEthers(true);
  };

  // Detecting a network change, this can be triggerred by the connect function or due to user, if the network is not mumbai, sends a warning and trash all state vars
  const chainChangedHandler = (_chainId: string | BigNumber) => {
    if (BigNumber.from(_chainId).toNumber() !== chainId) {
      notificationsRef.current.setWarning('Incorrect network, please re-connect wallet');
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
        contractSymbol: null,
        contractDecimals: null,
        updateInterval: null,
        account: null,
      });
      setData({
        balance: null,
        contractOwner: null,
        isContractOwner: null,
        contractBalance: null,
        contractTotalSupply: null,
      });
      setEvents({
        approval: [],
        transfer: []
      });
    }
  };

  // listen for account changes (if no listener set (=> re-render))
  if (!window.ethereum._events.accountsChanged) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    window.ethereum.on('accountsChanged', (data: any) => {
      notificationsRef.current.setInfo('Change of account detected!');
      accountChangedHandler(data);
    });
  }
  // listen for change of Network (if no listener set (=> re-render))
  if (!window.ethereum._events.chainChanged) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    window.ethereum.on('chainChanged', (data: any) => {
      notificationsRef.current.setInfo('Change of network detected!');
      chainChangedHandler(data);
    });
  }

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

      // Get Token Data from contract
      const _contractSymbol = await _contract.symbol();
      const _contractDecimals = await _contract.decimals();
      const _contractOwner = await _contract.owner();
      const _isContractOwner = _contractOwner.toLowerCase() === _account.toLowerCase();

      // Get BUSD Balance
      const _contractBalance = ethers.utils.formatUnits(await _contract.balanceOf(_account), _contractDecimals);

      //Get BUSD Total Supply
      const _contractTotalSupply = ethers.utils.formatUnits(await _contract.totalSupply(), _contractDecimals);

      if (updateStatic) {
        if (staticData.updateInterval) {
          clearInterval(staticData.updateInterval);
        }
        const _updateInterval = setInterval(() => {
          notificationsRef.current.setInfo('Refreshing data...');
          updateEthers();
        }, 60000);
        if (staticData.contract) {
          staticData.contract.removeAllListeners();
        }
        _contract.on('Transfer', (recipientAddress, senderAddress, Amount) => {
          console.log(_contractDecimals);
          if (senderAddress.toLowerCase() === _account.toLowerCase() || recipientAddress.toLowerCase() === _account.toLowerCase()) {
            notificationsRef.current.setSuccess(
              `Transferred amount BUSD ${Amount.div(
                BigNumber.from(10).pow(BigNumber.from(_contractDecimals)),
              ).toNumber()} from "${senderAddress}" to "${recipientAddress}"`,
            );
            notificationsRef.current.setInfo('Refreshing...');
            updateEthers();
          }
        });
        _contract.on('Approval', (ownerAddress, spenderAddress, Amount) => {
          if (ownerAddress.toLowerCase() === _account.toLowerCase() || spenderAddress.toLowerCase() === _account.toLowerCase()) {
            notificationsRef.current.setSuccess(
              `Appoved allowance amount BUSD ${Amount.div(
                BigNumber.from(10).pow(BigNumber.from(_contractDecimals)),
              ).toNumber()} from owner "${ownerAddress}" to "${spenderAddress}"`,
            );
            notificationsRef.current.setInfo('Refreshing...');
            updateEthers();
          }
        });
        /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
        _contract.on('OwnershipTransferred', (oldOwnerAddress, newOwnerAddress, Amount) => {
          if (oldOwnerAddress.toLowerCase() === _account.toLowerCase() || newOwnerAddress.toLowerCase() === _account.toLowerCase()) {
            notificationsRef.current.setSuccess(`Contract ownership transferred from "${oldOwnerAddress}" to "${newOwnerAddress}"`);
            notificationsRef.current.setInfo('Refreshing...');
            updateEthers();
          }
        });
        setStaticData({
          provider: _provider,
          signer: _signer,
          contract: _contract,
          contractSymbol: _contractSymbol,
          contractDecimals: _contractDecimals,
          updateInterval: _updateInterval,
          account: _account,
        });
      }

      setData({
        balance: _balance,
        contractOwner: _contractOwner,
        isContractOwner: _isContractOwner,
        contractBalance: _contractBalance,
        contractTotalSupply: _contractTotalSupply,
      });

      // Events
      const _transferFromBlockNumber = events.transfer.length > 0 ? events.transfer[events.transfer.length - 1].blockNumber : (await _provider.getTransaction(contractTransactionHash)).blockNumber;
      const _approvalFromBlockNumber = events.approval.length > 0 ? events.approval[events.approval.length - 1].blockNumber : (await _provider.getTransaction(contractTransactionHash)).blockNumber;
      const _transferFilter = _contract.filters.Transfer();
      const _approvalFilter = _contract.filters.Approval();
      const _transfer = await _contract.queryFilter(_transferFilter, _transferFromBlockNumber, 'latest');
      const _approval = await _contract.queryFilter(_approvalFilter, _approvalFromBlockNumber, 'latest');
      setEvents({
        transfer: [...events.transfer, ..._transfer],
        approval: [...events.approval,..._approval]
      });
      
    } catch (error) {
      notificationsRef.current.setWarning(error.message);
    }
  };


  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const allowanceHandler = async (event: any) => {
    event.preventDefault();
    if (ethers.utils.isAddress(event.target.spenderAddress.value) && ethers.utils.isAddress(event.target.ownerAddress.value)) {
      const _spenderAllowance = await staticData.contract.allowance(event.target.ownerAddress.value, event.target.spenderAddress.value);
      setSpenderAllowance(
        `Allowance of ${_spenderAllowance
          .div(BigNumber.from(10).pow(BigNumber.from(staticData.contractDecimals)))
          .toNumber()} for spender ${event.target.spenderAddress.value}`,
      );
    } else {
      setSpenderAllowance(null);
      notificationsRef.current.setWarning('Invalid address');
    }
    event.target.ownerAddress.value = null;
    event.target.spenderAddress.value = null;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const mintHandler = async (event: any) => {
    event.preventDefault();
    if (event.target.amount.value > 0) {
      const _mint = await staticData.contract.mint(
        BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(staticData.contractDecimals))),
      );
      console.log(_mint);
      notificationsRef.current.setInfo(`Mint trx "${_mint.hash}" awaiting confirmation...`);
    } else {
      notificationsRef.current.setWarning('Invalid amount');
    }
    event.target.amount.value = null;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const burnHandler = async (event: any) => {
    event.preventDefault();
    if (event.target.amount.value > 0) {
      const _burn = await staticData.contract.burn(
        BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(staticData.contractDecimals))),
      );
      console.log(_burn);
      notificationsRef.current.setInfo(`Burn trx "${_burn.hash}" awaiting confirmation...`);
    } else {
      notificationsRef.current.setWarning('Invalid amount');
    }
    event.target.amount.value = null;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const approveHandler = async (event: any) => {
    event.preventDefault();
    if (ethers.utils.isAddress(event.target.spenderAddress.value) && event.target.amount.value > 0) {
      const _approve = await staticData.contract.approve(
        event.target.spenderAddress.value,
        BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(staticData.contractDecimals))),
      );
      console.log(_approve);
      notificationsRef.current.setInfo(`Approve trx "${_approve.hash}" awaiting confirmation...`);
    } else {
      notificationsRef.current.setWarning('Invalid address or amount');
    }
    event.target.spenderAddress.value = null;
    event.target.amount.value = null;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const transferHandler = async (event: any) => {
    if (ethers.utils.isAddress(event.target.recipientAddress.value) && event.target.amount.value > 0) {
      event.preventDefault();
      const _transfer = await staticData.contract.transfer(
        event.target.recipientAddress.value,
        BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(staticData.contractDecimals))),
      );
      console.log(_transfer);
      notificationsRef.current.setInfo(`Transfer trx "${_transfer.hash}" awaiting confirmation...`);
    } else {
      notificationsRef.current.setWarning('Invalid address or amount');
    }
    event.target.recipientAddress.value = null;
    event.target.amount.value = null;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const transferFromHandler = async (event: any) => {
    if (
      ethers.utils.isAddress(event.target.spenderAddress.value) &&
      ethers.utils.isAddress(event.target.recipientAddress.value) &&
      event.target.amount.value > 0
    ) {
      event.preventDefault();
      const _transferFrom = await staticData.contract.transferFrom(
        event.target.spenderAddress.value,
        event.target.recipientAddress.value,
        BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(staticData.contractDecimals))),
      );
      console.log(_transferFrom);
      notificationsRef.current.setInfo(`Transfer from trx "${_transferFrom.hash}" awaiting confirmation...`);
    } else {
      notificationsRef.current.setWarning('Invalid address or amount');
    }
    event.target.recipientAddress.value = null;
    event.target.spenderAddress.value = null;
    event.target.amount.value = null;
  };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const transferOwnershipHandler = async (event: any) => {
    if (ethers.utils.isAddress(event.target.newOwnerAddress.value)) {
      event.preventDefault();
      const _transferOwnership = await staticData.contract.transferOwnership(event.target.newOwnerAddress.value);
      console.log(_transferOwnership);
      notificationsRef.current.setInfo(`Transfer ownership trx "${_transferOwnership.hash}" awaiting confirmation...`);
    } else {
      notificationsRef.current.setWarning('Invalid address');
    }
    event.target.newOwnerAddress.value = null;
  };

  const renounceOwnershipHandler = async () => {
    const _renounceOwnership = await staticData.contract.renounceOwnership();
    console.log(_renounceOwnership);
    notificationsRef.current.setInfo(`Renounce ownership trx "${_renounceOwnership.hash}" awaiting confirmation...`);
  };

  return (
    <>
      <div className='logo fixed top-2 flex flex-row content-center'>
        <img src={logo} className='mr-2 h-14' />
        <div className='text-primary h-full flex-1 self-center text-4xl'>SmartContracts Project</div>
      </div>
      <Notifications ref={notificationsRef} />
      <div className='fixed bottom-0 top-24 w-screen overflow-scroll'>
        <div className='text-center'>
          {staticData.provider ? (
            <Button
              variant='outline-primary'
              size='lg'
              onClick={() => {
                notificationsRef.current.setInfo('Refreshing...');
                updateEthers();
              }}
            >
              Refresh
            </Button>
          ) : (
            <Button variant='outline-primary' size='lg' onClick={connectWalletHandler}>
              Connect Meta Mask Wallet
            </Button>
          )}
        </div>
        <div className='grid grid-cols-2'>
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
                {staticData.contractSymbol}{' '}
                {Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                  parseFloat(data.contractBalance),
                )}
              </div>

              <div className='mr-4 mt-4 text-right text-white'>Contract Total Supply :</div>
              <div className='mt-4 w-1/2 text-white'>
                {staticData.contractSymbol}{' '}
                {Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                  parseFloat(data.contractTotalSupply),
                )}
              </div>

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
                      <input id='newOwnerAddress' type='text' placeholder='New owner address' className='border border-white bg-black' />
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
                  <div className='mt-4 w-1/2 text-white'>This function is only available to the contract owner ({data.contractOwner})</div>
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
                  <div className='mt-4 w-1/2 text-white'>This function is only available to the contract owner ({data.contractOwner})</div>
                </>
              )}
            </>
          )}
        </div>
        <div className='text-center'>
          {staticData.provider && (
            <Button
              variant='outline-primary'
              size='lg'
              onClick={() => {
                console.log(events);
              }}
            >
              Log events
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
