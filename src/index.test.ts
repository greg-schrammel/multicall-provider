import { describe, it, expect } from 'vitest'

import { multicallProvider } from './index'
import { providers } from 'ethers'
import { erc20ABI, getContract } from '@wagmi/core'

const provider = new providers.AlchemyProvider(420, process.env.alchemyKey)
const wrappedProvider = multicallProvider(provider)

const dai = getContract({
  address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  abi: erc20ABI,
  signerOrProvider: provider,
})
const mDai = getContract({
  address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  abi: erc20ABI,
  signerOrProvider: wrappedProvider,
})

describe('multicallProvider', () => {
  it('yields same results as standard single calls', async () => {
    const results = await Promise.all([dai.symbol(), dai.name(), dai.decimals()])
    const multicallResults = await Promise.all([mDai.symbol(), mDai.name(), mDai.decimals()])
    expect(results).toEqual(multicallResults)
  })
})
