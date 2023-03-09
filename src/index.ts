import { Address, getContract } from '@wagmi/core'
import { ethers } from 'ethers'
import type { Deferrable } from 'ethers/lib/utils'
import { multicall3ABI } from './multicall3Abi'

type DeferrableTransactionRequest = Deferrable<ethers.providers.TransactionRequest>
type BlockTag = ethers.providers.BlockTag
type BaseProvider = ethers.providers.BaseProvider
type WebSocketProvider = ethers.providers.WebSocketProvider

type CallQueue = Record<BlockTag, DeferrableTransactionRequest[]>
type Aggregate3Result = { success: boolean; returnData: Address }

export type MulticallProviderOptions = {
  timeWindow: number
  batchSize: number
  logs: boolean
  multicall3: Address
}
const defaultOptions = {
  timeWindow: 50,
  batchSize: 50,
  logs: false,
  multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11',
} satisfies MulticallProviderOptions

const scheduler = <Id = BlockTag>(timeWindow: number, callback: (id: Id) => void) => {
  const timeouts: Map<Id, ReturnType<typeof setTimeout>> = new Map()
  return {
    stop(id: Id) {
      if (!timeouts.has(id)) return
      clearTimeout(timeouts.get(id))
      timeouts.delete(id)
    },
    start(id: Id) {
      if (timeouts.has(id)) return
      timeouts.set(
        id,
        setTimeout(() => callback(id), timeWindow),
      )
    },
  }
}

const cloneClassInstance = <T>(instance: T): T =>
  Object.assign(Object.create(Object.getPrototypeOf(instance)), instance)

export const multicallProvider = <TProvider extends BaseProvider | WebSocketProvider>(
  provider: TProvider,
  options: Partial<MulticallProviderOptions> = defaultOptions,
) => {
  const { timeWindow, batchSize, multicall3, logs } = { ...defaultOptions, ...options }

  const { aggregate3 } = getContract({
    address: multicall3,
    abi: multicall3ABI,
    signerOrProvider: provider,
  })

  const multicall = async (
    txs: DeferrableTransactionRequest[],
    overrides?: Parameters<typeof aggregate3>[1],
  ) => {
    const calls = txs.map((tx) => ({
      target: tx.to as Address,
      callData: tx.data as `0x${string}`,
      allowFailure: true,
    }))
    if (logs)
      console.info(
        `Multicalling the following addresses`,
        overrides?.blockTag && `[blockTag: ${overrides?.blockTag}]`,
        calls.map((m) => m.target),
      )
    const results = await aggregate3(calls, overrides)
    results.forEach((res, i) => callbacks.get(txs[i])?.(res))
  }

  const queue: CallQueue = {}

  const schedule = scheduler(timeWindow, (blockTag) => {
    if (logs) console.info('End of batching time window, running multicall')
    schedule.stop(blockTag)
    multicall(queue[blockTag], { blockTag })
    queue[blockTag] = []
  })

  const callbacks = new Map<object, (r: Aggregate3Result) => void>()

  const wrappedProvider = cloneClassInstance(provider)

  wrappedProvider.call = async (transaction, blockTag = 'latest'): Promise<string> => {
    if (transaction.gasPrice || transaction.value || transaction.from)
      return provider.call(transaction, blockTag)

    const _blockTag = await provider._getBlockTag(blockTag)
    queue[_blockTag] ??= []
    queue[_blockTag].push(transaction)

    if (queue[_blockTag].length >= batchSize) {
      if (logs) console.info('Batch limit achieved, sending multicall')
      schedule.stop(_blockTag)
      multicall(queue[_blockTag], { blockTag: _blockTag })
      queue[_blockTag] = []
    }

    schedule.start(_blockTag)

    return new Promise((resolve, reject) =>
      callbacks.set(transaction, ({ returnData, success }) => {
        callbacks.delete(transaction)
        // if (!success) reject(returnData)
        return resolve(returnData)
      }),
    )
  }
  return wrappedProvider
}
