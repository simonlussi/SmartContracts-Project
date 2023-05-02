import React, { useState, useEffect } from 'react'
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
	const [provider, setProvider] = useState<ethers.providers.Web3Provider>(null);
	const [signer, setSigner] = useState(null);
	const [contract, setContract] = useState<ethers.Contract>(null);
	const [contractOwner, setContractOwner] = useState(null);
	const [isContractOwner, setIsContractOwner] = useState(false);
	const [contractSymbol, setContractSymbol] = useState<string>(null);
	const [contractDecimals, setContractDecimals] = useState<number>(null);
	const [contractBalance, setContractBalance] = useState<string>(null);
	const [spenderAllowance, setSpenderAllowance] = useState<string>(null);
	const [contractTotalSupply, setContractTotalSupply] = useState<string>(null);

	// Info and Warning function - will cause the component to re-render
	const removeToast = (id: number) => {
    setToasts((toasts) => toasts.filter((e) => e.id !== id));
	}
	const setWarning = (_errorMessage: string): void => {
		setToasts((toasts) => [...toasts, { id: Math.random(), Component: AddToast, title: 'Warning!', text: _errorMessage, variant: 'danger', delay: 10000}]);
	}
	const setInfo = (_infoMessage: string): void => {
		setToasts((toasts) => [...toasts, { id: Math.random(), Component: AddToast, title: 'Info!', text: _infoMessage, variant: 'light', delay: 5000}]);
	}
	const setSuccess = (_infoMessage: string): void => {
		setToasts((toasts) => [...toasts, { id: Math.random(), Component: AddToast, title: 'Success!', text: _infoMessage, variant: 'success', delay: 5000}]);
	}

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
					await _provider.send('wallet_switchEthereumChain',[{ chainId: `0x${chainId.toString(16)}` }]);
					const _chainId = (await _provider.getNetwork()).chainId;
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
						const _chainId = (await _provider.getNetwork()).chainId;
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

	// Getting the wallet
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
		setInfo(`Meta Mask wallet connected with account: ${_account}`);
		updateEthers();
	}

	// Detecting a network change, this can be triggerred by the connect function or due to user, if the network is not mumbai, sends a warning and trash all state vars
	const chainChangedHandler = (_chainId: any) => {
		if (BigNumber.from(_chainId).toNumber() !== chainId) {
			setWarning('Incorrect network, please re-connect wallet');
			setAccount(null);
			setBalance(null);
			setProvider(null);
			setSigner(null);
			setContract(null);
			setContractOwner(null);
			setIsContractOwner(false);
			setContractSymbol(null);
			setContractDecimals(null);
			setContractBalance(null);
			setSpenderAllowance(null);
			setContractTotalSupply(null);
		}
	}

	// listen for account changes (if no listener set (=> re-render))
	if (!window.ethereum._events.accountsChanged) {
		window.ethereum.on('accountsChanged', (data: any) => { setInfo('Change of account detected!'); accountChangedHandler(data); });
	}
	// listen for change of Network (if no listener set (=> re-render))
	if (!window.ethereum._events.chainChanged) {
		window.ethereum.on('chainChanged', (data: any) => { setInfo('Change of network detected!'); chainChangedHandler(data); });
	}

	const updateEthers = async () => {
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
			
			// Get Token Data from contract
			const _contractSymbol = await _contract.symbol();
			setContractSymbol(_contractSymbol);
			const _contractDecimals = await _contract.decimals();
			setContractDecimals(_contractDecimals);
			const _contractOwner = await _contract.owner();
			setContractOwner(_contractOwner);
			setIsContractOwner(_contractOwner.toLowerCase() === _account.toLowerCase());
			// Saving contract will set up listeners
			setContract(_contract);
			
			// Get BUSD Balance
			const _contractBalance = await _contract.balanceOf(_account);
			setContractBalance(ethers.utils.formatUnits(_contractBalance, _contractDecimals));

			//Get BUSD Total Supply
			const _contractTotalSupply = await _contract.totalSupply();
			setContractTotalSupply(ethers.utils.formatUnits(_contractTotalSupply, _contractDecimals));

		} catch (error) {
			setWarning(error.message);
		}
	}

	const allowanceHandler = async (event: any) => {
		event.preventDefault();
		if (ethers.utils.isAddress(event.target.spenderAddress.value) && ethers.utils.isAddress(event.target.ownerAddress.value)) {
			const _spenderAllowance = await contract.allowance(event.target.ownerAddress.value, event.target.spenderAddress.value);
			console.log(_spenderAllowance);
			setSpenderAllowance(`Allowance of ${_spenderAllowance.div(BigNumber.from(10).pow(BigNumber.from(contractDecimals))).toNumber()} for spender ${event.target.spenderAddress.value}`);
		} else {
			setSpenderAllowance(null)
			setWarning('Invalid address');
		}
		event.target.ownerAddress.value = null;
		event.target.spenderAddress.value = null;
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
		event.target.amount.value = null;
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
		event.target.amount.value = null;
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
		event.target.spenderAddress.value = null;
		event.target.amount.value = null;
	}
	
	const transferHandler = async (event: any) => {
		if (ethers.utils.isAddress(event.target.recipientAddress.value) && event.target.amount.value > 0) {
			event.preventDefault();
			const _transfer = await contract.transfer(event.target.recipientAddress.value, BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(contractDecimals))));
			console.log(_transfer);
			setInfo(`Transfer trx "${_transfer.hash}" awaiting confirmation...`);
		} else {
			setWarning('Invalid address or amount');
		}
		event.target.recipientAddress.value = null;
		event.target.amount.value = null;
	}
	
	const transferFromHandler = async (event: any) => {
		if (ethers.utils.isAddress(event.target.spenderAddress.value) && ethers.utils.isAddress(event.target.recipientAddress.value) && event.target.amount.value > 0) {
			event.preventDefault();
			const _transferFrom = await contract.transferFrom(event.target.spenderAddress.value, event.target.recipientAddress.value, BigNumber.from(event.target.amount.value).mul(BigNumber.from(10).pow(BigNumber.from(contractDecimals))));
			console.log(_transferFrom);
			setInfo(`Transfer from trx "${_transferFrom.hash}" awaiting confirmation...`);
		} else {
			setWarning('Invalid address or amount');
		}
		event.target.recipientAddress.value = null;
		event.target.spenderAddress.value = null;
		event.target.amount.value = null;
	}

	const transferOwnershipHandler = async (event: any) => {
		if (ethers.utils.isAddress(event.target.newOwnerAddress.value)) {
			event.preventDefault();
			const _transferOwnership = await contract.transferOwnership(event.target.newOwnerAddress.value);
			console.log(_transferOwnership);
			setInfo(`Transfer ownership trx "${_transferOwnership.hash}" awaiting confirmation...`);
		} else {
			setWarning('Invalid address');
		}
		event.target.newOwnerAddress.value = null;
	}

	const renounceOwnershipHandler = async () => {
		const _renounceOwnership = await contract.renounceOwnership();
		console.log(_renounceOwnership);
		setInfo(`Renounce ownership trx "${_renounceOwnership.hash}" awaiting confirmation...`);
	}

	useEffect(() => {
		if (provider) {
			if (!updateInterval) {
				const _updateInterval = setInterval(() => { setInfo('Refreshing data...'); updateEthers(); }, 60000);
				setUpdateInterval(_updateInterval);
			}
		} else {
			if (updateInterval) {
				clearInterval(updateInterval);
				setUpdateInterval(null);
			}
		}
	}, [provider])

	useEffect(() => {
		if (contract && !contractTotalSupply) {
			contract.removeAllListeners();
			// Setup Contract Listeners
			contract.once('Transfer', (recipientAddress, senderAddress, Amount) => {
				console.log(contractDecimals);
				if (senderAddress.toLowerCase() === account.toLowerCase() || recipientAddress.toLowerCase() === account.toLowerCase()) {
					setSuccess(`Transferred amount BUSD ${Amount.div(BigNumber.from(10).pow(BigNumber.from(contractDecimals))).toNumber()} from "${senderAddress}" to "${recipientAddress}"`);
					setInfo('Refreshing...');
					updateEthers();
				}
			});
			contract.once('Approval', (ownerAddress, spenderAddress, Amount) => {
				if (ownerAddress.toLowerCase() === account.toLowerCase() || spenderAddress.toLowerCase() === account.toLowerCase()) {
					setSuccess(`Appoved allowance amount BUSD ${Amount.div(BigNumber.from(10).pow(BigNumber.from(contractDecimals))).toNumber()} from owner "${ownerAddress}" to "${spenderAddress}"`);
					setInfo('Refreshing...');
					updateEthers();
				}
			});
			contract.once('OwnershipTransferred', (oldOwnerAddress, newOwnerAddress, Amount) => {
				if (oldOwnerAddress.toLowerCase() === account.toLowerCase() || newOwnerAddress.toLowerCase() === account.toLowerCase()) {
					setSuccess(`Contract ownership transferred from "${oldOwnerAddress}" to "${newOwnerAddress}"`);
					setInfo('Refreshing...');
					updateEthers();
				}
			});
		}
	}, [contract]);
	
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
					{ provider ? (
						<Button variant="outline-primary" size="lg" onClick={() => { setInfo('Refreshing...'); updateEthers(); }}>
							Refresh
						</Button>
					) : (
						<Button variant="outline-primary" size="lg" onClick={connectWalletHandler}>
							Connect Meta Mask Wallet
						</Button>
					)}
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
									<input id="ownerAddress" type="text" placeholder="Owner address" className="bg-black border border-white"/>
									<input id="spenderAddress" type="text" placeholder="Spender address" className="bg-black border border-white"/>
									<Button type="submit" variant="outline-primary" size="sm"> Check spender allowance</Button>
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
