import { providers, utils, BigNumber } from 'ethers'

/**
 * removeLiquidity: Removes the `removeLPTokensWei` amount of LP tokens from
 * liquidity and also the calculated amount of `ether` and `CD` tokens
 */
export const removeLiquidity = async (signer, removeLPTokensWei) => {
	// Create a new instance of the exchange contract
	const exchangeContract = new Contract(
		EXCHANGE_CONTRACT_ADDRESS,
		EXCHANGE_CONTRACT_ABI,
		signer
	)
	const tx = await exchangeContract.removeLiquidity(removeLPTokensWei)
	await tx.wait()
}

/**
 * getTokensAfterRemove: Calculates the amount of `Eth` and `CD` tokens
 * that would be returned back to user after he removes `removeLPTokenWei` amount
 * of LP tokens from the contract
 */
export const getTokensAfterRemove = async (
	provider,
	removeLPTokenWei,
	_ethBalance,
	cryptoDevTokenReserve
) => {
	try {
		// Create a new instance of the exchange contract
		const exchangeContract = new Contract(
			EXCHANGE_CONTRACT_ADDRESS,
			EXCHANGE_CONTRACT_ABI,
			provider
		)
		// Get the total supply of `Crypto Dev` LP tokens
		const _totalSupply = await exchangeContract.totalSupply()
		// Here we are using the BigNumber methods of multiplication and division
		// The amount of Eth that would be sent back to the user after he withdraws the LP token
		// is calculated based on a ratio,
		// Ratio is -> (amount of Eth that would be sent back to the user / Eth reserve) = (LP tokens withdrawn) / (total supply of LP tokens)
		// By some maths we get -> (amount of Eth that would be sent back to the user) = (Eth Reserve * LP tokens withdrawn) / (total supply of LP tokens)
		// Similarly we also maintain a ratio for the `CD` tokens, so here in our case
		// Ratio is -> (amount of CD tokens sent back to the user / CD Token reserve) = (LP tokens withdrawn) / (total supply of LP tokens)
		// Then (amount of CD tokens sent back to the user) = (CD token reserve * LP tokens withdrawn) / (total supply of LP tokens)
		const _removeEther = _ethBalance.mul(removeLPTokenWei).div(_totalSupply)
		const _removeCD = cryptoDevTokenReserve
			.mul(removeLPTokenWei)
			.div(_totalSupply)
		return {
			_removeEther,
			_removeCD,
		}
	} catch (err) {
		console.error(err)
	}
}

import { Contract } from 'ethers'
import {
	EXCHANGE_CONTRACT_ABI,
	EXCHANGE_CONTRACT_ADDRESS,
	TOKEN_CONTRACT_ABI,
	TOKEN_CONTRACT_ADDRESS,
} from '../constants'

/*
    getAmountOfTokensReceivedFromSwap:  Returns the number of Eth/Crypto Dev tokens that can be received 
    when the user swaps `_swapAmountWei` amount of Eth/Crypto Dev tokens.
*/
export const getAmountOfTokensReceivedFromSwap = async (
	_swapAmountWei,
	provider,
	ethSelected,
	ethBalance,
	reservedCD
) => {
	// Create a new instance of the exchange contract
	const exchangeContract = new Contract(
		EXCHANGE_CONTRACT_ADDRESS,
		EXCHANGE_CONTRACT_ABI,
		provider
	)
	let amountOfTokens
	// If `Eth` is selected this means our input value is `Eth` which means our input amount would be
	// `_swapAmountWei`, the input reserve would be the `ethBalance` of the contract and output reserve
	// would be the `Crypto Dev` token reserve
	if (ethSelected) {
		amountOfTokens = await exchangeContract.getAmountOfTokens(
			_swapAmountWei,
			ethBalance,
			reservedCD
		)
	} else {
		// If `Eth` is not selected this means our input value is `Crypto Dev` tokens which means our input amount would be
		// `_swapAmountWei`, the input reserve would be the `Crypto Dev` token reserve of the contract and output reserve
		// would be the `ethBalance`
		amountOfTokens = await exchangeContract.getAmountOfTokens(
			_swapAmountWei,
			reservedCD,
			ethBalance
		)
	}

	return amountOfTokens
}

/*
  swapTokens: Swaps `swapAmountWei` of Eth/Crypto Dev tokens with `tokenToBeReceivedAfterSwap` amount of Eth/Crypto Dev tokens.
*/
export const swapTokens = async (
	signer,
	swapAmountWei,
	tokenToBeReceivedAfterSwap,
	ethSelected
) => {
	// Create a new instance of the exchange contract
	const exchangeContract = new Contract(
		EXCHANGE_CONTRACT_ADDRESS,
		EXCHANGE_CONTRACT_ABI,
		signer
	)
	const tokenContract = new Contract(
		TOKEN_CONTRACT_ADDRESS,
		TOKEN_CONTRACT_ABI,
		signer
	)
	let tx
	// If Eth is selected call the `ethToCryptoDevToken` function else
	// call the `cryptoDevTokenToEth` function from the contract
	// As you can see you need to pass the `swapAmount` as a value to the function because
	// it is the ether we are paying to the contract, instead of a value we are passing to the function
	if (ethSelected) {
		tx = await exchangeContract.ethToCryptoDevToken(
			tokenToBeReceivedAfterSwap,
			{
				value: swapAmountWei,
			}
		)
	} else {
		// User has to approve `swapAmountWei` for the contract because `Crypto Dev` token
		// is an ERC20
		tx = await tokenContract.approve(
			EXCHANGE_CONTRACT_ADDRESS,
			swapAmountWei.toString()
		)
		await tx.wait()
		// call cryptoDevTokenToEth function which would take in `swapAmountWei` of `Crypto Dev` tokens and would
		// send back `tokenToBeReceivedAfterSwap` amount of `Eth` to the user
		tx = await exchangeContract.cryptoDevTokenToEth(
			swapAmountWei,
			tokenToBeReceivedAfterSwap
		)
	}
	await tx.wait()
}
