import { describe, it, expect } from 'vitest'

import { multicallProvider } from './index'
import { providers } from 'ethers'
import { erc20ABI, getContract } from '@wagmi/core'

const { AlchemyProvider, InfuraProvider, FallbackProvider } = providers

const alchemyProvider = new AlchemyProvider(1, process.env.alchemyKey)
const infuraProvider = new InfuraProvider(1, process.env.infuraKey)
const provider = new FallbackProvider([alchemyProvider, infuraProvider])

const wrappedProvider = multicallProvider(provider)

const dai = getContract({
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  abi: erc20ABI,
  signerOrProvider: provider,
})
const mDai = getContract({
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
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
