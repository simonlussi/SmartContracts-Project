import React, { useState, useCallback } from 'react'
import { ethers, BigNumber } from 'ethers';
import BUSDJson from '../contracts/BUSD.json';
import logo from '../assets/images/logo-white-small.png';
import Button from 'react-bootstrap/Button';
import ToastContainer from 'react-bootstrap/ToastContainer';
import AddToast from './components/AddToast';

export default function App()  {

	// constants
	const contractAddress = '0x15A40d37e6f8A478DdE2cB18c83280D472B2fC35';
	const contractABI = BUSDJson.abi;
	const chainId = 80001;

	// varaibles
	const [updateInterval, setUpdateInterval] = useState(null);
	const [toasts, setToasts] = useState([]);
	const [account, setAccount] = useState<string>(null);
	const [balance, setBalance] = useState<string>(null);
	const [connectButtonText, setConnectButtonText] = useState<string>('Connect MetaMask Wallet');
	const [provider, setProvider] = useState<ethers.providers.Web3Provider>(null);
	const [signer, setSigner] = useState(null);
	const [contract, setContract] = useState(null);
	const [contractOwner, setContractOwner] = useState(null);
	const [isContractOwner, setIsContractOwner] = useState(false);
	const [contractSymbol, setContractSymbol] = useState<string>(null);
	const [contractDecimals, setContractDecimals] = useState<number>(null);
	const [contractBalance, setContractBalance] = useState<string>(null);
	const [spenderAllowance, setSpenderAllowance] = useState<string>(null);
	const [contractTotalSupply, setContractTotalSupply] = useState<string>(null);

	// Info and Warning function
	const removeToast = (id: number) => {
    setToasts((toasts) => toasts.filter((e) => e.id !== id));
	}
	const setWarning = (_errorMessage: string): void => {
		setToasts((toasts) => [...toasts, { id: Math.random(), Component: AddToast, title: 'Error', text: _errorMessage, variant: 'danger', delay: 10000}]);
  	
	}
	const setInfo = (_infoMessage: string): void => {
		setToasts((toasts) => [...toasts, { id: Math.random(), Component: AddToast, title: 'Info', text: _infoMessage, variant: 'light', delay: 5000}]);
	}

	// connect function
	const connectWalletHandler = async () => {
		if (window.ethereum && window.ethereum.isMetaMask) {

			const _provider = new ethers.providers.Web3Provider(window.ethereum);
			setProvider(_provider);
			
			// checking the chain
			const _chainId = (await _provider.getNetwork()).chainId;
			if (_chainId === chainId) {
				getWalletAccount(_provider);
			} else {
				try {
					await _provider.send('wallet_switchEthereumChain',[{ chainId: `0x${chainId.toString(16)}` }]);
					const _chainId = (await provider.getNetwork()).chainId;
					if (_chainId === chainId) {
						getWalletAccount(_provider);
					} else {
						setWarning('Error switching active chain to Mumbai!');
					}
				} catch (error) {
					try {
						await _provider.send('wallet_addEthereumChain', [{
							chainId: `0x${chainId.toString(16)}`,
							chainName: 'Mumbai',
							rpcUrls: [`https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`],
							nativeCurrency: {
								name: 'Polygon',
								symbol: 'MATIC',
								decimals: 18
							}
						}]);
						const _chainId = (await provider.getNetwork()).chainId;
						if (_chainId === chainId) {
							getWalletAccount(_provider);
						} else {
							setWarning('Error switching active chain to Mumbai!');
						}
					} catch (err) {
						setWarning(`Error switching active chain to Mumbai: ${err.message}`);
					}
				}
			}
		} else {
			setWarning('Please install MetaMask browser extension to interact: https://metamask.io/download/');
		}
	}

	const getWalletAccount = (_provider: ethers.providers.Web3Provider) => {
		_provider.send('eth_requestAccounts', [])
			.then((result: string[]) => {
				accountChangedHandler(result[0]);
			})
			.catch((error: Error) => {
				setWarning(error.message);
			});
	}

	// update account, will cause component re-render
	const accountChangedHandler = (_account: string) => {
		if (typeof _account === 'object'){
			_account = (_account as any)[0];
		}
		setAccount(_account);
		updateEthers();
		setConnectButtonText('Refresh');
		if (updateInterval) {
			clearInterval(updateInterval);
			setUpdateInterval(null);
		}
		const _updateInterval = setInterval(() => { 
			setInfo('refreshing...'); 
			updateEthers();
		}, 60000);
		setUpdateInterval(_updateInterval)
		setInfo(`Meta Mask wallet connected. Account: ${_account}`)
	}

	const chainChangedHandler = (_chainId: any) => {
		if (_chainId !== chainId) {
			setWarning('Incorrect network, please re-connect wallet');
			if (updateInterval) {
				clearInterval(updateInterval);
				setUpdateInterval(null);
			}
			setConnectButtonText('Connect MetaMask Wallet');
			setAccount(null);
			setProvider(null);
			setSigner(null);
			setContract(null);
		}
	}

	// listen for account changes
	window.ethereum.on('accountsChanged', accountChangedHandler);
	// listen for change of Network
	window.ethereum.on('chainChanged', chainChangedHandler);

	const updateEthers = useCallback(async () => {
		
		try {
			// Initialize wallet
			const _provider = new ethers.providers.Web3Provider(window.ethereum);
			setProvider(_provider);
			const _signer = _provider.getSigner();
			setSigner(_signer);
			
			// Get account
			const _accounts = await _provider.send('eth_requestAccounts', []);
			const _account = _accounts[0];
			setAccount(_account)
			
			// Get MATIC balance
			const _balance = await _provider.getBalance(_account);
			setBalance(ethers.utils.formatEther(_balance));
			
			// Get BUSD contract
			const _contract = new ethers.Contract(contractAddress, contractABI, _signer);
			setContract(_contract);
			
			// Setup Contract Listeners
			_contract.on('Transfer', (senderAddress, recipientAddress, Amount) => {
				if (senderAddress === _account || recipientAddress === _account) {
					setInfo(`Transferred amount BUSD ${Amount.div(BigNumber.from(10).pow(BigNumber.from(_contractDecimals))).toNumber()} from "${senderAddress}" to "${recipientAddress}"`);
					updateEthers();
				}
			});
			_contract.on('Approval', (ownerAddress, spenderAddress, Amount) => {
				if (ownerAddress === _account || spenderAddress === _account) {
					setInfo(`Appoved allowance amount BUSD ${Amount.div(BigNumber.from(10).pow(BigNumber.from(_contractDecimals))).toNumber()} from owner "${ownerAddress}" to "${spenderAddress}"`);
					updateEthers();
				}
			});

			// Get Token Data from contract
			const _contractSymbol = await _contract.symbol();
			setContractSymbol(_contractSymbol);
			const _contractDecimals = await _contract.decimals();
			setContractDecimals(_contractDecimals);
			const _contractOwner = await _contract.owner();
			setContractOwner(_contractOwner);
			setIsContractOwner(_contractOwner === _account);
			
			// Get BUSD Balance
			const _contractBalance = await _contract.balanceOf(_account);
			setContractBalance(ethers.utils.formatUnits(_contractBalance, _contractDecimals));

			//Get BUSD Total Supply
			const _contractTotalSupply = await _contract.totalSupply();
			setContractTotalSupply(ethers.utils.formatUnits(_contractTotalSupply, _contractDecimals));

		} catch (error) {
			setWarning(error.message);
		}
	}, [account]);

	const allowanceHandler = async (event: any) => {
		event.preventDefault();
		if (ethers.utils.isAddress(event.target.spenderAddress.value)) {
			const _spenderAllowance = await contract.allowance(account, event.target.spenderAddress.value);
			console.log(_spenderAllowance);
			setSpenderAllowance(`Allowance of ${_spenderAllowance.div(BigNumber.from(10).pow(BigNumber.from(contractDecimals))).toNumber()} for spender ${event.target.spenderAddress.value}`);
		} else {
			setSpenderAllowance(null)
			setWarning('Invalid address');
		}
	}

	const mintHandler = async (event: any) => {
		event.preventDefault();
		if (event.target.amount.value > 0) {
			const _mint = await contract.mint(BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(contractDecimals))));
			console.log(_mint);
			setInfo(`Mint trx "${_mint.hash}" awaiting confirmation...`);
		} else {
			setWarning('Invalid amount');
		}
	}
	
	const burnHandler = async (event: any) => {
		event.preventDefault();
		if (event.target.amount.value > 0) {
			const _burn = await contract.burn(BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(contractDecimals))));
			console.log(_burn);
			setInfo(`Burn trx "${_burn.hash}" awaiting confirmation...`);
		} else {
			setWarning('Invalid amount');
		}
	}

	const approveHandler = async (event: any) => {
		event.preventDefault();
		if (ethers.utils.isAddress(event.target.spenderAddress.value) && event.target.amount.value > 0) {
			const _approve = await contract.approve(event.target.spenderAddress.value, BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(contractDecimals))));
			console.log(_approve);
			setInfo(`Approve trx "${_approve.hash}" awaiting confirmation...`);
		} else {
			setWarning('Invalid address or amount')
		}
	}
	
	const transferHandler = async (event: any) => {
		if (ethers.utils.isAddress(event.target.recipientAddress.value)) {
			event.preventDefault();
			const _transfer = await contract.approve(event.target.recipientAddress.value, BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(contractDecimals))));
			console.log(_transfer);
			setInfo(`Transfer trx "${_transfer.hash}" awaiting confirmation...`);
		} else {
			setWarning(`Invalid address: ${event.target.recipientAddress.value}`)
		}
	}
	
	const transferFromHandler = async (event: any) => {
		if (ethers.utils.isAddress(event.target.spenderAddress.value) && ethers.utils.isAddress(event.target.recipientAddress.value)) {
			event.preventDefault();
			const _transferFrom = await contract.approve(event.target.spenderAddress.value, event.target.recipientAddress.value, BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(contractDecimals))));
			console.log(_transferFrom);
			setInfo(`Transfer from trx "${_transferFrom.hash}" awaiting confirmation...`);
		} else {
			setWarning(`Invalid address: ${event.target.spenderAddress.value} or ${event.target.recipientAddress.value}`)
		}
	}

	const transferOwnershipHandler = async (event: any) => {
		if (ethers.utils.isAddress(event.target.newOwnerAddress.value)) {
			event.preventDefault();
			const _transferOwnership = await contract.transferOwnership(event.target.newOwnerAddress.value);
			console.log(_transferOwnership);
			setInfo(`Transfer ownership trx "${_transferOwnership.hash}" awaiting confirmation...`);
		} else {
			setWarning(`Invalid address: ${event.target.newOwnerAddress.value}`)
		}
	}

	const renounceOwnershipHandler = async () => {
		const _renounceOwnership = await contract.renounceOwnership();
		console.log(_renounceOwnership);
		setInfo(`Renounce ownership trx "${_renounceOwnership.hash}" awaiting confirmation...`);
	}
	
	return (
		<>
			<div className="logo flex flex-row content-center fixed top-2">
				<img src={logo} className="h-14 mr-2" />
				<div className="text-primary text-4xl h-full flex-1 self-center">SmartContracts Project</div>
			</div>
			<ToastContainer position="top-end">
        {toasts.map(({ id, Component, title, text, variant, delay }, index) => (
          <Component key={id} handleRemove={() => removeToast(id)} title={title} text={text} variant={variant} delay={delay} />
        ))}
      </ToastContainer>
			<div className="overflow-scroll fixed top-24 bottom-0 w-screen">
				<div className="text-center">
					<Button variant="outline-primary" size="lg" onClick={() => { 
						if (connectButtonText === 'Refresh') {
							setInfo('refreshing...');
							updateEthers();
						} else {
							setInfo('connection wallet...');
							connectWalletHandler();
						}
					}}>
						{connectButtonText}
					</Button>
				</div>
				<div className="grid grid-cols-2">
					<div className="text-white mt-4 text-right mr-4">Account Address :</div>
					<div className="text-white mt-4">{account}</div>
					{ account && (
						<>
							<div className="text-white mt-4 text-right mr-4">Wallet Balance :</div>
							<div className="text-white mt-4 w-1/2">MATIC {Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(balance))}</div>
							
							<div className="text-white mt-4 text-right mr-4">Contract Balance :</div>
							<div className="text-white mt-4 w-1/2">{contractSymbol} {Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(contractBalance))}</div>
							
							<div className="text-white mt-4 text-right mr-4">Contract Total Supply :</div>
							<div className="text-white mt-4 w-1/2">{contractSymbol} {Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(contractTotalSupply))}</div>
							
							<div className="text-white mt-4 text-right mr-4 text-md">Check Spender allowance:</div>
							<div className="text-white mt-4 w-1/2">
								<form onSubmit={allowanceHandler} className="flex flex-col">
									<input id="spenderAddress" type="text" placeholder="Spender address" className="bg-black border border-white"/>
									<Button type="submit" variant="outline-primary" size="sm"> Check sprender allowance</Button>
								</form>
								{ spenderAllowance && (
									<div>{spenderAllowance}</div>
								)}
							</div>

							<div className="text-white mt-4 text-right mr-4 text-md">Mint Token:</div>
							<div className="text-white mt-4 w-1/2">
								<form onSubmit={mintHandler} className="flex flex-col">
									<input id="amount" type="text" placeholder="Amount" className="bg-black border border-white"/>
									<Button type="submit" variant="outline-primary" size="sm"> Mint</Button>
								</form>
							</div>

							<div className="text-white mt-4 text-right mr-4 text-md">Burn Token:</div>
							<div className="text-white mt-4 w-1/2">
								<form onSubmit={burnHandler} className="flex flex-col">
									<input id="amount" type="text" placeholder="Amount" className="bg-black border border-white"/>
									<Button type="submit" variant="outline-primary" size="sm"> Burn</Button>
								</form>
							</div>

							<div className="text-white mt-4 text-right mr-4 text-md">Approve Spender:</div>
							<div className="text-white mt-4 w-1/2">
								<form onSubmit={approveHandler} className="flex flex-col">
									<input id="spenderAddress" type="text" placeholder="Spender address" className="bg-black border border-white"/>
									<input id="amount" type="text" placeholder="Amount" className="bg-black border border-white"/>
									<Button type="submit" variant="outline-primary" size="sm"> Approve Spender for Amount</Button>
								</form>
							</div>

							<div className="text-white mt-4 text-right mr-4 text-md">Transfer Token:</div>
							<div className="text-white mt-4 w-1/2">
								<form onSubmit={transferHandler} className="flex flex-col">
									<input id="recipientAddress" type="text" placeholder="Recipient address" className="bg-black border border-white"/>
									<input id="amount" type="text" placeholder="Amount" className="bg-black border border-white"/>
									<Button type="submit" variant="outline-primary" size="sm"> Transfer Amount</Button>
								</form>
							</div>

							<div className="text-white mt-4 text-right mr-4 text-md">Transfer Token From:</div>
							<div className="text-white mt-4 w-1/2">
								<form onSubmit={transferFromHandler} className="flex flex-col">
									<input id="spenderAddress" type="text" placeholder="Spender address" className="bg-black border border-white"/>
									<input id="recipientAddress" type="text" placeholder="Recipient address" className="bg-black border border-white"/>
									<input id="amount" type="text" placeholder="Amount" className="bg-black border border-white"/>
									<Button type="submit" variant="outline-primary" size="sm"> Transfer amount from Spender</Button>
								</form>
							</div>

							{ isContractOwner ? (
								<>
									<div className="text-white mt-4 text-right mr-4 text-md">Transfer Contract Ownership:</div>
									<div className="text-white mt-4 w-1/2">
										<form onSubmit={transferOwnershipHandler} className="flex flex-col">
											<input id="newOwnerAddress" type="text" placeholder="New owner address" className="bg-black border border-white"/>
											<Button type="submit" variant="outline-primary" size="sm"> Transfer Contract Ownership</Button>
										</form>
									</div>
								</>
							) : (
								<>
									<div className="text-white mt-4 text-right mr-4 text-md line-through">Transfer Contract Ownership:</div>
									<div className="text-white mt-4 w-1/2">This function is only available to the contract owner ({contractOwner})</div>
								</>
							)}

							{ isContractOwner ? (
								<>
									<div className="text-white mt-4 text-right mr-4 text-md">Renounce Contract Ownership:</div>
									<div className="text-white mt-4 w-1/2">
										<Button onClick={renounceOwnershipHandler} variant="outline-primary" size="sm"> Renounce Contract Ownership</Button>
									</div>
								</>
							) : (
								<>
									<div className="text-white mt-4 text-right mr-4 text-md line-through">Renounce Contract Ownership:</div>
									<div className="text-white mt-4 w-1/2">This function is only available to the contract owner ({contractOwner})</div>
								</>
							)}
							
						</>
					)}
				</div>
			</div>
		</>
	);
}
