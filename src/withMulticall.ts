import { Address, Chain, getContract } from '@wagmi/core'
import { ethers } from 'ethers'
import type { Deferrable } from 'ethers/lib/utils'
import { multicall3ABI } from './multicall3Abi'

type DeferrableTransactionRequest = Deferrable<ethers.providers.TransactionRequest>
type BlockTag = ethers.providers.BlockTag
type BaseProvider = ethers.providers.BaseProvider

const defaultOptions = {
  timeWindow: 50,
  batchSize: 25,
  logs: false,
}

const createScheduler = (timeWindow: number, callback: VoidFunction) => {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return {
    reset() {
      if (!timeout) return
      clearTimeout(timeout)
      timeout = null
    },
    init() {
      if (!timeout) timeout = setTimeout(callback, timeWindow)
    },
  }
}

export const enchanceMulticall =
  <Provider extends BaseProvider & { chains?: Chain[] }>(
    _provider: ({ chainId }: { chainId?: number }) => Provider,
    options: Partial<typeof defaultOptions> = defaultOptions,
  ) =>
  ({ chainId }: { chainId?: number }): Provider => {
    const provider = _provider({ chainId })
    if (!chainId) return provider

    const multicallAddress = provider.chains?.[chainId]?.contracts?.multicall3?.address
    if (!multicallAddress) return provider

    const { timeWindow, batchSize, logs } = { ...defaultOptions, ...options }

    const { aggregate3 } = getContract({
      address: multicallAddress,
      abi: multicall3ABI,
      signerOrProvider: provider,
    })

    let queue: DeferrableTransactionRequest[] = []

    const scheduler = createScheduler(timeWindow, () => {
      if (logs) console.info('End of batching time window, running multicall')
      run(queue)
      queue = []
    })

    const callbacks = new WeakMap<
      object,
      (r: Awaited<ReturnType<typeof aggregate3>>[number]) => void
    >()

    const run = async (txs: DeferrableTransactionRequest[]) => {
      const calls = txs.map((tx) => ({
        target: tx.to as Address,
        callData: tx.data as `0x${string}`,
        allowFailure: true,
      }))
      const results = await aggregate3(calls)
      results.forEach((res, i) => callbacks.get(txs[i])?.(res))
    }

    provider.call = async (
      transaction: DeferrableTransactionRequest,
      blockTag?: string | number | Promise<BlockTag>,
    ): Promise<string> => {
      queue.push(transaction)

      if (queue.length > batchSize) {
        if (logs) console.info('Batch limit achieved, running multicall')
        scheduler.reset()
        run(queue)
        queue = []
      }

      scheduler.init()

      return new Promise((resolve) =>
        callbacks.set(transaction, ({ returnData, success }) => {
          callbacks.delete(transaction)
          if (!success) {
            if (logs) console.info('Multicall failed, retring in direct call')
            return resolve(provider.call(transaction, blockTag))
          }
          return resolve(returnData)
        }),
      )
    }

    return provider
  }
