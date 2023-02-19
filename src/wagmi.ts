import { ethers } from 'ethers'
import { Chain } from '@wagmi/core'
import { multicallProvider as _multicallProvider, MulticallProviderOptions } from './index'

export const multicallProvider =
  <Provider extends ethers.providers.BaseProvider & { chains?: Chain[] }>(
    _provider: ({ chainId }: { chainId?: number }) => Provider,
    options?: Partial<MulticallProviderOptions>,
  ) =>
  ({ chainId }: { chainId?: number }): Provider => {
    const provider = _provider({ chainId })
    const chain = provider.chains?.find((c) => c.id === chainId)
    const multicallAddress = chain?.contracts?.multicall3?.address
    return _multicallProvider(provider, {
      ...options,
      ...(multicallAddress && { multicall3: multicallAddress }),
    })
  }
